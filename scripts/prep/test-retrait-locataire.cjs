// Retrait du locataire (désistement) : sa fiche est supprimée (sauf autre dossier ou messages), le dossier
// repasse « En attente du locataire », les dates qui dépendaient de lui sont effacées, et le propriétaire
// peut être prévenu par e-mail.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const edit = (r) => r.load('lib/actions/admin-bail-edit.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));

suite('Retrait du locataire', path.join(__dirname, '../../reports/prep/tests-retrait-locataire.json'), async () => {
  await test('Le locataire est retiré et sa fiche supprimée, les dates effacées, « En attente du locataire »', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { endDate: new Date('2029-11-30T00:00:00Z') } });
    const person = await tx.person.findFirst({ where: { clientId: f.tenant.id } });
    const piece = await tx.document.create({ data: { kind: 'ID_IDENTITY', personId: person.id, fileKey: 'documents/test-locataire-retire', mimeType: 'application/pdf' } });
    const tenantForm = await tx.intakeLink.create({ data: { token: 'test-' + f.bail.id, target: 'TENANT', clientId: f.tenant.id, propertyId: f.property.id, bailId: f.bail.id, status: 'PENDING' } });
    const request = await tx.complementRequest.create({
      data: { bailId: f.bail.id, clientId: f.tenant.id, target: 'TENANT', recipientEmail: 'x@example.invalid', createdByName: 'Test' },
    });
    const ownerRequest = await tx.complementRequest.create({
      data: { bailId: f.bail.id, clientId: f.owner.id, target: 'OWNER', recipientEmail: 'y@example.invalid', createdByName: 'Test' },
    });

    const result = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.data.tenantName, 'Test Locataire');
    assert.equal(result.data.owner.greetingName, 'Test Proprietaire');
    assert(result.data.owner.email.endsWith('@example.invalid'));

    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: { select: { id: true } } } });
    assert.equal(bail.status, 'AWAITING_TENANT');
    assert.equal(bail.effectiveDate, null);
    assert.equal(bail.paymentDay, null);
    assert.equal(bail.endDate, null);
    assert.deepEqual(bail.parties.map((p) => p.id), [f.owner.id], 'seul le propriétaire reste');

    assert.equal(result.data.tenantDeleted, true);
    assert.equal(result.data.keptReason, null);
    assert.equal(await tx.client.findUnique({ where: { id: f.tenant.id } }), null, 'fiche du locataire supprimée');
    assert.equal(await tx.user.findUnique({ where: { id: f.tenantUser.id } }), null, 'accès à l’espace client supprimé');
    assert.equal(await tx.document.findUnique({ where: { id: piece.id } }), null, 'pièce supprimée');
    assert.equal(r.state.suppressed['s3.delete'], 1, 'fichier de la pièce effacé');
    assert.equal(await tx.intakeLink.findUnique({ where: { id: tenantForm.id } }), null, 'formulaire locataire supprimé');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING', 'formulaire du propriétaire intact');
    assert.equal(await tx.complementRequest.findUnique({ where: { id: request.id } }), null, 'demande au locataire supprimée avec la fiche');
    assert.equal((await tx.complementRequest.findUnique({ where: { id: ownerRequest.id } })).status, 'OPEN', 'demande au propriétaire intacte');

    const log = await tx.bailAuditLog.findFirst({ where: { bailId: f.bail.id, eventType: 'STATUS_CHANGED' }, orderBy: { createdAt: 'desc' } });
    assert.equal(log.fromStatus, 'PENDING_VALIDATION');
    assert.equal(log.toStatus, 'AWAITING_TENANT');
    assert.equal(log.tenantName, 'Test Locataire');
    assert.equal(r.state.suppressed.email || 0, 0, 'aucun e-mail sans décision de l’équipe');
  });

  await test('Fiche gardée s’il est aussi locataire d’un autre dossier', async (tx, r, f) => {
    const other = await tx.bail.create({ data: { propertyId: f.property.id, rentAmount: 500, status: 'PENDING_VALIDATION', parties: { connect: [{ id: f.owner.id }, { id: f.tenant.id }] } } });
    const result = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.data.tenantDeleted, false);
    assert.match(result.data.keptReason, /autre dossier/);
    assert(await tx.client.findUnique({ where: { id: f.tenant.id } }), 'fiche gardée');
    const otherBail = await tx.bail.findUnique({ where: { id: other.id }, include: { parties: { select: { id: true } } } });
    assert(otherBail.parties.some((p) => p.id === f.tenant.id), 'toujours locataire de l’autre dossier');
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: { select: { id: true } } } });
    assert.deepEqual(bail.parties.map((p) => p.id), [f.owner.id]);
    assert.equal(r.state.suppressed['s3.delete'] || 0, 0, 'aucun fichier effacé');
  });

  await test('Fiche gardée s’il a écrit dans une discussion', async (tx, r, f) => {
    await tx.bailMessage.create({ data: { bailId: f.bail.id, senderId: f.tenantUser.id, content: 'Bonjour' } });
    const result = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.equal(result.data.tenantDeleted, false);
    assert.match(result.data.keptReason, /discussion/);
    assert(await tx.client.findUnique({ where: { id: f.tenant.id } }), 'fiche gardée');
    assert(await tx.user.findUnique({ where: { id: f.tenantUser.id } }), 'compte gardé (ses messages)');
  });

  await test('Le propriétaire est redemandé les dates pour son nouveau locataire', async (tx, r, f) => {
    await edit(r).removeBailTenantAdmin({ bailId: f.bail.id });
    r.state.user = f.ownerUser;
    const dates = plain(await r.load('lib/actions/leases.ts').getBailTenantDates(f.bail.id));
    assert.deepEqual(dates, { effectiveDate: null, paymentDay: null, needed: true });
  });

  await test('Parcours complet : le propriétaire indique son nouveau locataire et les nouvelles dates', async (tx, r, f) => {
    await edit(r).removeBailTenantAdmin({ bailId: f.bail.id });
    r.state.user = f.ownerUser;
    const email = 'nouveau-' + f.bail.id + '@example.invalid';
    await r.load('lib/actions/leases.ts').createTenantForLease({ bailId: f.bail.id, email, effectiveDate: '2027-02-01', paymentDay: 10 });
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: { include: { persons: true } } } });
    assert.equal(bail.status, 'AWAITING_TENANT_FORM', 'le nouveau locataire reçoit son formulaire');
    assert.equal(bail.effectiveDate.toISOString().slice(0, 10), '2027-02-01');
    assert.equal(bail.paymentDay, 10);
    assert(bail.endDate, 'date de fin recalculée');
    const tenant = bail.parties.find((p) => p.profilType === 'LOCATAIRE');
    assert.equal(tenant.persons[0].email, email);
    assert.notEqual(tenant.id, f.tenant.id);
  });

  await test('Prévenir le propriétaire : un e-mail, compté comme demande « locataire à indiquer »', async (tx, r, f) => {
    const removed = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    const sent = plain(await edit(r).notifyOwnerTenantRemovedAdmin({ bailId: f.bail.id, tenantName: removed.data.tenantName, note: 'Bonne recherche' }));
    assert.equal(sent.success, true, JSON.stringify(sent));
    assert.equal(sent.data.email, removed.data.owner.email);
    assert.equal(r.state.suppressed.email, 1, 'un seul e-mail');
    const reminder = await tx.bailReminder.findFirst({ where: { bailId: f.bail.id } });
    assert.equal(reminder.reason, 'TENANT_TO_ADD');
    assert.equal(reminder.target, 'OWNER');
    assert.equal(reminder.clientId, f.owner.id);
    assert.equal(reminder.note, 'Bonne recherche');
  });

  await test('Chez le notaire : retrait possible, le notaire reste assigné', async (tx, r, f) => {
    const notaire = await tx.user.findFirst({ where: { role: 'NOTAIRE' } });
    assert(notaire, 'notaire de test manquant');
    await tx.bail.update({ where: { id: f.bail.id }, data: { status: 'CLIENT_CONTACTED' } });
    const assignment = await tx.dossierNotaireAssignment.create({
      data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notaire.id, assignedById: f.admin.id },
    });
    const notaryRequest = await tx.complementRequest.create({
      data: { bailId: f.bail.id, clientId: f.tenant.id, target: 'TENANT', origin: 'NOTAIRE', recipientEmail: 'z@example.invalid', createdByName: 'Me Test' },
    });
    const result = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    assert.equal(result.success, true, JSON.stringify(result));
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: true } });
    assert.equal(bail.status, 'AWAITING_TENANT');
    assert.equal(bail.parties.length, 1);
    assert.equal((await tx.dossierNotaireAssignment.findUnique({ where: { id: assignment.id } })).notaireId, notaire.id, 'le notaire reste assigné');
    assert.equal(await tx.complementRequest.findUnique({ where: { id: notaryRequest.id } }), null, 'demande du notaire au locataire supprimée avec la fiche');
    const log = await tx.bailAuditLog.findFirst({ where: { bailId: f.bail.id, eventType: 'STATUS_CHANGED' }, orderBy: { createdAt: 'desc' } });
    assert.equal(log.fromStatus, 'CLIENT_CONTACTED');
  });

  await test('Refus : dossier sans locataire, ou signé, ou clos', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { parties: { disconnect: { id: f.tenant.id } } } });
    const again = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
    assert.equal(again.success, false);
    assert.match(again.error, /pas de locataire/);

    for (const status of ['SIGNED', 'TERMINATED', 'DESISTE']) {
      await tx.bail.update({ where: { id: f.bail.id }, data: { status, parties: { connect: { id: f.tenant.id } } } });
      const refused = plain(await edit(r).removeBailTenantAdmin({ bailId: f.bail.id }));
      assert.equal(refused.success, false, status);
      assert.match(refused.error, /signé ou clos/);
      const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: true } });
      assert.equal(bail.parties.length, 2, status + ' : rien n’a bougé');
      assert.equal(bail.status, status);
    }
  });

  await test('Réservé aux administrateurs', async (tx, r, f) => {
    r.state.user = f.ownerUser;
    let refused = false;
    try {
      const result = await edit(r).removeBailTenantAdmin({ bailId: f.bail.id });
      refused = result && result.success === false;
    } catch {
      refused = true;
    }
    assert(refused, 'un propriétaire ne peut pas retirer le locataire');
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id }, include: { parties: true } });
    assert.equal(bail.parties.length, 2);
  });

  await test('Texte de l’e-mail : nom du locataire, adresse, dates à redonner', async (tx, r) => {
    const { relanceEmailContent, RELANCE_SUBJECTS } = r.load('lib/utils/relance-content.ts');
    const c = relanceEmailContent({ reason: 'TENANT_REMOVED', name: 'Marie', address: '12 rue des Lilas', actionUrl: '', tenantName: 'Paul Martin' });
    assert.equal(c.greeting, 'Bonjour Marie,');
    assert(c.paragraphs[0].includes('Paul Martin') && c.paragraphs[0].includes('12 rue des Lilas'));
    assert(/espace client/.test(c.paragraphs.join(' ')));
    assert(/prise d'effet/.test(c.paragraphs[2]) && /jour de paiement/.test(c.paragraphs[2]), 'dates dans le texte');
    assert.equal(c.card, null, 'plus d’encadré');
    assert.equal(c.button, 'Indiquer mon nouveau locataire');
    assert(RELANCE_SUBJECTS.TENANT_REMOVED.length > 10);
  });
});
