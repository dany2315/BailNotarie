// Lot 4 — compléments : réponse = proposition, acceptation avec journal, conflit, annulation, archivage.
const path = require('path');
const { test, suite, assert, crypto } = require('./harness.cjs');

const mod = (r) => r.load('lib/actions/complement-requests.ts');
const access = (r) => r.load('lib/document-access.ts');
const bailOf = (tx, f) => tx.bail.findUnique({ where: { id: f.bail.id } });
const itemOf = (tx, id) => tx.complementRequestItem.findUnique({ where: { id } });
const CHARGES = { bailMonthlyCharges: '70', bailSecurityDeposit: '600' };

/** Demande de l'équipe au propriétaire, avec une ligne (information « charges et dépôt » ou pièce). */
async function request(tx, f, kind = 'FIELD', over = {}) {
  const req = await tx.complementRequest.create({ data: { bailId: f.bail.id, clientId: f.owner.id, target: 'OWNER', recipientEmail: 'test@example.invalid', createdByName: 'TEST', createdById: f.admin.id } });
  const item = await tx.complementRequestItem.create({
    data: {
      requestId: req.id, kind, label: kind === 'FIELD' ? 'Charges et dépôt de garantie' : 'Autre document',
      documentKind: kind === 'DOCUMENT' ? 'OTHER' : null, fieldKey: kind === 'FIELD' ? 'bail.charges' : null,
      reason: kind === 'FIELD' ? 'TO_CONFIRM' : 'ILLEGIBLE', bailId: f.bail.id, ...over,
    },
  });
  return { req, item };
}
const answer = async (r, f, item, values = CHARGES) => { r.state.user = f.ownerUser; const res = await mod(r).answerComplementField({ itemId: item.id, answer: values }); r.state.user = f.admin; return res; };
/** Pièce : un ancien fichier actif du bail, et le nouveau envoyé par le client pour la ligne. */
async function withDocs(tx, f, item, olds = 1) {
  const old = [];
  for (let i = 0; i < olds; i++) old.push(await tx.document.create({ data: { kind: 'OTHER', label: 'ancien-' + i + '.pdf', fileKey: 'documents/test-old-' + i + '-' + crypto.randomBytes(3).toString('hex'), bailId: f.bail.id, uploadedById: f.ownerUser.id } }));
  const fresh = await tx.document.create({ data: { kind: 'OTHER', label: 'nouveau.pdf', fileKey: 'documents/test-new-' + crypto.randomBytes(3).toString('hex'), bailId: f.bail.id, complementItemId: item.id, uploadedById: f.ownerUser.id } });
  await tx.complementRequestItem.update({ where: { id: item.id }, data: { status: 'PROVIDED', providedAt: new Date(), replacesDocumentIds: old.slice(0, 1).map((d) => d.id) } });
  return { old, fresh };
}

suite('Lot 4 — compléments et archivage', path.join(__dirname, '../../reports/prep/tests-lot4-complements.json'), async () => {
  /* ---------- Informations : proposition jusqu'à l'acceptation ---------- */

  await test('Réponse du client : gardée comme proposition, le bail n’est pas modifié', async (tx, r, f) => {
    const { req, item } = await request(tx, f);
    const res = await answer(r, f, item);
    assert(res.success, res.error);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 50, 'le bail a été modifié avant acceptation');
    const row = await itemOf(tx, item.id);
    assert.equal(row.status, 'PROVIDED');
    assert.equal(String(row.providedValue.bailMonthlyCharges), '70');
    assert.equal(String(row.baseValue.bailMonthlyCharges), '50');
    assert.deepEqual(row.proposedAnswer, CHARGES);
    assert.equal(row.appliedAt, null);
    assert.equal((await tx.complementRequest.findUnique({ where: { id: req.id } })).status, 'OPEN');
  });

  await test('Le client retrouve sa réponse sur sa page et peut envoyer sa demande, toujours sans modifier le bail', async (tx, r, f) => {
    const { req, item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    r.state.user = f.ownerUser;
    const mine = await mod(r).getMyComplementRequest(req.id);
    assert.equal(String(mine.form.values.bailMonthlyCharges), '70', 'le client doit revoir ce qu’il a répondu');
    const sent = await mod(r).submitComplementRequest({ requestId: req.id });
    assert(sent.success, sent.error);
    assert.equal((await tx.complementRequest.findUnique({ where: { id: req.id } })).status, 'SUBMITTED');
    assert.equal((await bailOf(tx, f)).monthlyCharges, 50);
  });

  await test('Acceptation par l’équipe : valeur écrite, journal avant/après et auteur, demande terminée', async (tx, r, f) => {
    const { req, item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept' });
    assert(res.success, res.error);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 70);
    const row = await itemOf(tx, item.id);
    assert.equal(row.status, 'ACCEPTED');
    assert.equal(String(row.appliedBefore.bailMonthlyCharges), '50');
    assert.equal(String(row.appliedAfter.bailMonthlyCharges), '70');
    assert.equal(row.appliedById, f.admin.id);
    assert(row.appliedAt);
    assert.equal((await tx.complementRequest.findUnique({ where: { id: req.id } })).status, 'ACCEPTED');
  });

  await test('Acceptation d’une condition confirmée par le locataire : son accord est archivé et redemandé', async (tx, r, f) => {
    await r.load('lib/bail/tenant-agreement.ts').recordTenantAgreement(r.db, f.bail.id, f.tenant.id, new Date('2026-11-10T10:00:00Z'));
    const { item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    assert((await bailOf(tx, f)).tenantConfirmedTermsAt, 'une simple proposition ne doit pas toucher à l’accord');
    assert((await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept' })).success);
    const bail = await bailOf(tx, f);
    assert.equal(bail.tenantConfirmedTermsAt, null);
    assert(bail.tenantReconfirmationRequestedAt);
    assert.equal(await tx.bailTenantAgreementHistory.count({ where: { bailId: f.bail.id } }), 1);
  });

  await test('Ligne redemandée (refus) : valeurs du bail inchangées', async (tx, r, f) => {
    const { item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'redo', reason: 'WRONG_VALUE', note: 'Montant à revoir' });
    assert(res.success, res.error);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 50);
    assert.equal((await itemOf(tx, item.id)).status, 'PENDING');
    assert.equal(r.state.suppressed.email, 1, 'e-mail simulé attendu (aucun envoi réel)');
  });

  await test('Annulation : rien n’est appliqué, et une modification faite entre-temps n’est pas écrasée', async (tx, r, f) => {
    const { req, item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    // Modification indépendante par l'équipe pendant que la proposition attend.
    assert((await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '60' } })).success);
    assert((await mod(r).cancelComplementRequest({ requestId: req.id })).success);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 60, 'l’annulation ne doit ni appliquer 70 ni restaurer 50');
    assert.equal((await itemOf(tx, item.id)).appliedAt, null);
  });

  await test('Conflit : le dossier a changé depuis la réponse → rien n’est écrit sans confirmation explicite', async (tx, r, f) => {
    const { item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    assert((await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '60' } })).success);
    const blocked = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept' });
    assert.equal(blocked.success, false);
    assert(Array.isArray(blocked.conflict) && blocked.conflict.length > 0, 'la différence doit être montrée à l’équipe');
    assert.equal((await bailOf(tx, f)).monthlyCharges, 60, 'modification plus récente écrasée en silence');
    assert.equal((await itemOf(tx, item.id)).status, 'PROVIDED');
    const forced = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', confirmConflict: true });
    assert(forced.success, forced.error);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 70);
    assert.equal(String((await itemOf(tx, item.id)).appliedBefore.bailMonthlyCharges), '60', 'le journal doit garder la valeur réellement remplacée');
  });

  await test('« Tout accepter » n’applique pas une information en conflit', async (tx, r, f) => {
    const { req, item } = await request(tx, f);
    assert((await answer(r, f, item)).success);
    assert((await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '60' } })).success);
    const res = await mod(r).acceptComplementRequest({ requestId: req.id });
    assert.equal(res.success, false);
    assert.match(res.error, /une par une/);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 60);
    assert.equal((await tx.complementRequest.findUnique({ where: { id: req.id } })).status, 'OPEN');
  });

  await test('Règles métier à l’acceptation : une réponse devenue invalide n’est pas appliquée', async (tx, r, f) => {
    const { item } = await request(tx, f);
    assert((await answer(r, f, item)).success); // dépôt de 600 € pour un loyer de 600 €
    // Le loyer baisse ensuite : le dépôt proposé dépasse désormais un mois de loyer.
    assert((await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '500', securityDeposit: '500' } })).success);
    const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', confirmConflict: true });
    assert.equal(res.success, false, 'une réponse contraire aux règles a été appliquée');
    const bail = await bailOf(tx, f);
    assert.equal(bail.securityDeposit, 500);
    assert.equal(bail.monthlyCharges, 50);
  });

  await test('Permissions : autre client, client lui-même et notaire non assigné ne peuvent ni répondre ni accepter', async (tx, r, f) => {
    const { item } = await request(tx, f);
    r.state.user = f.tenantUser;
    assert.equal((await mod(r).answerComplementField({ itemId: item.id, answer: CHARGES })).success, false);
    assert((await answer(r, f, item)).success);
    r.state.user = f.ownerUser;
    assert.equal((await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept' })).success, false);
    r.state.user = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    assert.equal((await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept' })).success, false);
    assert.equal((await bailOf(tx, f)).monthlyCharges, 50);
  });

  await test('Réponse qui rendrait une pièce obligatoire : la pièce est demandée, la fiche de la personne n’est pas modifiée', async (tx, r, f) => {
    const person = await tx.person.findFirst({ where: { clientId: f.owner.id } });
    await tx.person.update({ where: { id: person.id }, data: { familyStatus: 'CELIBATAIRE' } });
    const { req, item } = await request(tx, f, 'FIELD', { fieldKey: 'person.family', label: 'Situation familiale', personId: person.id, bailId: null });
    const res = await answer(r, f, item, { 'persons.0.familyStatus': 'MARIE', 'persons.0.matrimonialRegime': 'SEPARATION_DE_BIENS' });
    assert(res.success, res.error);
    const after = await tx.person.findUnique({ where: { id: person.id } });
    assert.equal(after.familyStatus, 'CELIBATAIRE', 'la fiche a été modifiée avant acceptation');
    assert.equal(after.matrimonialRegime, null);
    const lines = await tx.complementRequestItem.findMany({ where: { requestId: req.id } });
    assert(lines.some((l) => l.documentKind === 'CONTRAT_DE_MARIAGE' && l.fieldKey === 'auto:person.family'), 'le contrat de mariage devait être ajouté à la demande');
    assert(res.data.addedDocuments.length >= 1);
  });

  /* ---------- Pièces : archivage choisi par l'équipe ---------- */

  await test('Acceptation avec sélection multiple : anciennes pièces archivées, fichiers conservés, reliées à la nouvelle', async (tx, r, f) => {
    const { item } = await request(tx, f, 'DOCUMENT');
    const { old, fresh } = await withDocs(tx, f, item, 3);
    const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', archiveDocumentIds: [old[0].id, old[1].id] });
    assert(res.success, res.error);
    for (const doc of [old[0], old[1]]) {
      const row = await tx.document.findUnique({ where: { id: doc.id } });
      assert(row, 'la ligne de la pièce archivée doit être conservée');
      assert(row.archivedAt);
      assert.equal(row.archivedById, f.admin.id);
      assert.equal(row.bailId, null, 'pièce archivée encore rattachée aux pièces actives');
      assert.equal(row.archivedFrom.bailId, f.bail.id);
      assert.equal(row.archivedBailId, f.bail.id);
      assert.equal(row.replacedById, fresh.id);
      assert.equal(row.fileKey, doc.fileKey);
    }
    assert.equal(r.state.suppressed['s3.delete'] ?? 0, 0, 'aucun fichier ne doit être supprimé');
    const active = await tx.document.findMany({ where: { bailId: f.bail.id }, select: { id: true } });
    assert.deepEqual(active.map((d) => d.id).sort(), [old[2].id, fresh.id].sort(), 'seules la pièce non choisie et la nouvelle restent actives');
    assert.equal((await itemOf(tx, item.id)).status, 'ACCEPTED');
  });

  await test('Acceptation sans sélection (et « tout accepter ») : les anciennes pièces restent actives, rien n’est supprimé', async (tx, r, f) => {
    const a = await request(tx, f, 'DOCUMENT');
    const docsA = await withDocs(tx, f, a.item, 1);
    assert((await mod(r).reviewComplementItem({ itemId: a.item.id, decision: 'accept' })).success);
    const b = await request(tx, f, 'DOCUMENT');
    const docsB = await withDocs(tx, f, b.item, 1);
    assert((await mod(r).acceptComplementRequest({ requestId: b.req.id })).success);
    for (const doc of [...docsA.old, ...docsB.old]) {
      const row = await tx.document.findUnique({ where: { id: doc.id } });
      assert.equal(row.archivedAt, null);
      assert.equal(row.bailId, f.bail.id);
    }
    assert.equal(r.state.suppressed['s3.delete'] ?? 0, 0);
  });

  await test('Pièce archivée : hors des pièces actives et de la complétude, lisible par l’équipe seulement, jamais supprimée', async (tx, r, f) => {
    const { item } = await request(tx, f, 'DOCUMENT');
    const { old } = await withDocs(tx, f, item, 1);
    assert((await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', archiveDocumentIds: [old[0].id] })).success);
    const id = old[0].id;
    // Équipe : lecture oui, suppression non.
    assert(await access(r).accessibleDocument(id, 'read'));
    assert.equal(await access(r).accessibleDocument(id, 'delete'), null);
    // Client qui l'avait envoyée : plus d'accès (même par le lien de téléchargement du fichier).
    r.state.user = f.ownerUser;
    assert.equal(await access(r).accessibleDocument(id, 'read'), null);
    assert.equal(await access(r).accessibleDocument(id, 'delete'), null);
    assert.equal(await access(r).readableDocumentForFileKey([old[0].fileKey]), null);
    // Locataire et notaire assigné : pas d'accès.
    r.state.user = f.tenantUser;
    assert.equal(await access(r).accessibleDocument(id, 'read'), null);
    const notary = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notary.id, assignedById: f.admin.id } });
    r.state.user = notary;
    assert.equal(await access(r).accessibleDocument(id, 'read'), null);
    // Chemins de suppression existants : la pièce archivée leur échappe.
    r.state.user = f.admin;
    const storage = r.load('lib/document-storage.ts');
    await storage.deleteDocumentFromDB(id);
    await storage.deleteDocumentsFromDB({ id: { in: [id] } });
    await storage.deleteDocumentsFromDB({ bailId: f.bail.id });
    assert(await tx.document.findUnique({ where: { id } }), 'pièce archivée supprimée par un parcours existant');
    // Les pièces actives du bail, elles, ont bien été supprimées par la suppression en lot (comportement inchangé).
    assert.equal(await tx.document.count({ where: { bailId: f.bail.id } }), 0);
    // Listes de l'équipe : absente des pièces du bail, présente dans les archives du dossier.
    assert.equal(await tx.document.count({ where: { archivedBailId: f.bail.id, archivedAt: { not: null } } }), 1);
  });

  await test('Impossible d’archiver la pièce d’un autre dossier, ou la pièce que le client vient d’envoyer', async (tx, r, f) => {
    const { item } = await request(tx, f, 'DOCUMENT');
    const { old, fresh } = await withDocs(tx, f, item, 1);
    const foreign = await tx.document.create({ data: { kind: 'OTHER', fileKey: 'documents/test-foreign', clientId: f.tenant.id } });
    for (const ids of [[foreign.id], [fresh.id], [old[0].id, foreign.id]]) {
      const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', archiveDocumentIds: ids });
      assert.equal(res.success, false);
    }
    assert.equal((await tx.document.findUnique({ where: { id: foreign.id } })).archivedAt, null);
    assert.equal((await tx.document.findUnique({ where: { id: old[0].id } })).archivedAt, null, 'archivage partiel malgré le refus');
    assert.equal((await itemOf(tx, item.id)).status, 'PROVIDED');
  });

  await test('Le notaire assigné archive lui-même les anciennes pièces sur sa propre demande, et peut les rouvrir', async (tx, r, f) => {
    const notary = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', name: 'Maître Test', role: 'NOTAIRE', emailVerified: true } });
    await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notary.id, assignedById: f.admin.id } });
    const { req, item } = await request(tx, f, 'DOCUMENT');
    await tx.complementRequest.update({ where: { id: req.id }, data: { origin: 'NOTAIRE' } });
    const { old, fresh } = await withDocs(tx, f, item, 1);
    r.state.user = notary;
    const res = await mod(r).reviewComplementItem({ itemId: item.id, decision: 'accept', archiveDocumentIds: [old[0].id] });
    assert(res.success, res.error);
    const row = await tx.document.findUnique({ where: { id: old[0].id } });
    assert(row.archivedAt, 'le notaire devait pouvoir archiver sans passer par l’équipe');
    assert.equal(row.archivedById, notary.id);
    assert.equal(row.bailId, null);
    assert.equal(row.replacedById, fresh.id);
    assert.equal(r.state.suppressed['s3.delete'] ?? 0, 0, 'aucun fichier supprimé');
    // Il retrouve la pièce qu'il a archivée et peut la rouvrir ; il ne peut pas la supprimer.
    const mine = await mod(r).getNotaireArchivedDocuments(f.bail.id);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].id, old[0].id);
    assert(await access(r).accessibleDocument(old[0].id, 'read'));
    assert.equal(await access(r).accessibleDocument(old[0].id, 'delete'), null);
    // L'équipe la voit aussi ; le client qui l'avait envoyée, non.
    r.state.user = f.admin;
    assert(await access(r).accessibleDocument(old[0].id, 'read'));
    r.state.user = f.ownerUser;
    assert.equal(await access(r).accessibleDocument(old[0].id, 'read'), null);
  });

  await test('Notaire : pas d’accès aux pièces archivées par l’équipe, ni aux demandes de l’équipe, ni au dossier d’un confrère', async (tx, r, f) => {
    const notary = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notary.id, assignedById: f.admin.id } });
    const other = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    // Pièce archivée par l'équipe sur une demande de l'équipe.
    const team = await request(tx, f, 'DOCUMENT');
    const teamDocs = await withDocs(tx, f, team.item, 1);
    assert((await mod(r).reviewComplementItem({ itemId: team.item.id, decision: 'accept', archiveDocumentIds: [teamDocs.old[0].id] })).success);
    r.state.user = notary;
    assert.equal(await access(r).accessibleDocument(teamDocs.old[0].id, 'read'), null, 'pièce archivée par l’équipe visible du notaire');
    assert.equal((await mod(r).getNotaireArchivedDocuments(f.bail.id)).length, 0);
    // Demande de l'équipe : le notaire ne peut ni l'accepter ni archiver dessus.
    const teamOpen = await request(tx, f, 'DOCUMENT');
    const openDocs = await withDocs(tx, f, teamOpen.item, 1);
    const refused = await mod(r).reviewComplementItem({ itemId: teamOpen.item.id, decision: 'accept', archiveDocumentIds: [openDocs.old[0].id] });
    assert.equal(refused.success, false);
    assert.equal((await tx.document.findUnique({ where: { id: openDocs.old[0].id } })).archivedAt, null);
    // Notaire non assigné : rien, même sur une demande de notaire de ce dossier.
    const own = await request(tx, f, 'DOCUMENT');
    await tx.complementRequest.update({ where: { id: own.req.id }, data: { origin: 'NOTAIRE' } });
    const ownDocs = await withDocs(tx, f, own.item, 1);
    r.state.user = other;
    assert.equal((await mod(r).reviewComplementItem({ itemId: own.item.id, decision: 'accept', archiveDocumentIds: [ownDocs.old[0].id] })).success, false);
    assert.equal((await mod(r).getNotaireArchivedDocuments(f.bail.id)).length, 0);
    assert.equal((await tx.document.findUnique({ where: { id: ownDocs.old[0].id } })).archivedAt, null);
  });

  await test('Suivi de l’équipe : la ligne « pièce reçue » liste les anciennes pièces remplaçables, sans rien cocher d’avance', async (tx, r, f) => {
    const { item } = await request(tx, f, 'DOCUMENT');
    const { old, fresh } = await withDocs(tx, f, item, 2);
    const rows = await mod(r).getBailComplementRequests(f.bail.id);
    const line = rows.flatMap((x) => x.items).find((x) => x.id === item.id);
    assert.deepEqual(line.replaceable.map((d) => d.id).sort(), old.map((d) => d.id).sort());
    assert(!line.replaceable.some((d) => d.id === fresh.id));
    assert.equal(line.replaceable.filter((d) => d.suggested).length, 1);
  });
});
