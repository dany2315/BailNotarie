// Retrait du locataire (désistement) : le dossier repasse « En attente du locataire », les dates qui
// dépendaient du locataire sont effacées, et le propriétaire peut être prévenu par e-mail.
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const edit = (r) => r.load('lib/actions/admin-bail-edit.ts');
const plain = (v) => JSON.parse(JSON.stringify(v));

suite('Retrait du locataire', path.join(__dirname, '../../reports/prep/tests-retrait-locataire.json'), async () => {
  await test('Le locataire est retiré, les dates effacées, le statut « En attente du locataire »', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { endDate: new Date('2029-11-30T00:00:00Z') } });
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

    assert.equal((await tx.client.findUnique({ where: { id: f.tenant.id } })) !== null, true, 'fiche du locataire conservée');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: tenantForm.id } })).status, 'REVOKED', 'formulaire locataire désactivé');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING', 'formulaire du propriétaire intact');
    assert.equal((await tx.complementRequest.findUnique({ where: { id: request.id } })).status, 'CANCELLED', 'demande au locataire annulée');
    assert.equal((await tx.complementRequest.findUnique({ where: { id: ownerRequest.id } })).status, 'OPEN', 'demande au propriétaire intacte');

    const log = await tx.bailAuditLog.findFirst({ where: { bailId: f.bail.id, eventType: 'STATUS_CHANGED' }, orderBy: { createdAt: 'desc' } });
    assert.equal(log.fromStatus, 'PENDING_VALIDATION');
    assert.equal(log.toStatus, 'AWAITING_TENANT');
    assert.equal(log.tenantName, 'Test Locataire');
    assert.equal(r.state.suppressed.email || 0, 0, 'aucun e-mail sans décision de l’équipe');
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
    assert.equal((await tx.complementRequest.findUnique({ where: { id: notaryRequest.id } })).status, 'CANCELLED', 'demande du notaire au locataire annulée');
    const log = await tx.bailAuditLog.findFirst({ where: { bailId: f.bail.id, eventType: 'STATUS_CHANGED' }, orderBy: { createdAt: 'desc' } });
    assert.equal(log.fromStatus, 'CLIENT_CONTACTED');
  });

  await test('Refus : dossier sans locataire, ou signé, ou clos', async (tx, r, f) => {
    await edit(r).removeBailTenantAdmin({ bailId: f.bail.id });
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
