// Corrections issues de la recette au navigateur du 16-17/11/2026 (numéros de reports/recette-complete/DEFAUTS-ET-SOLUTIONS.md).
const path = require('path');
const { test, suite, assert, crypto } = require('./harness.cjs');

const access = (r) => r.load('lib/document-access.ts');
const messages = (r) => r.load('lib/actions/bail-messages.ts');
const clientSpace = (r) => r.load('lib/actions/client-space.ts');

/** Notaire assigné, et un fil par partie : notaire ↔ propriétaire, notaire ↔ locataire, chacun avec un fichier. */
async function messagerie(tx, f) {
  const notaire = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
  await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notaire.id, assignedById: f.admin.id } });
  const doc = (label, by) => tx.document.create({ data: { kind: 'OTHER', label, fileKey: 'documents/test-msg-' + crypto.randomBytes(4).toString('hex'), bailId: f.bail.id, uploadedById: by } });
  const docProprio = await doc('fil-proprietaire.pdf', notaire.id);
  const docLocataire = await doc('fil-locataire.pdf', notaire.id);
  const docReponse = await doc('reponse-proprietaire.pdf', f.ownerUser.id);
  await tx.bailMessage.create({ data: { bailId: f.bail.id, senderId: notaire.id, content: 'Au propriétaire', recipientPartyId: f.owner.id, documentId: docProprio.id } });
  await tx.bailMessage.create({ data: { bailId: f.bail.id, senderId: f.ownerUser.id, content: 'Réponse du propriétaire', documentId: docReponse.id } });
  await tx.bailMessage.create({ data: { bailId: f.bail.id, senderId: notaire.id, content: 'Au locataire', recipientPartyId: f.tenant.id, documentId: docLocataire.id } });
  const piece = await tx.document.create({ data: { kind: 'OTHER', label: 'piece-du-bail.pdf', fileKey: 'documents/test-piece-' + crypto.randomBytes(4).toString('hex'), bailId: f.bail.id, uploadedById: f.admin.id } });
  return { notaire, docProprio, docLocataire, docReponse, piece };
}

suite('Corrections de la recette au navigateur', path.join(__dirname, '../../reports/prep/tests-recette-corrections.json'), async () => {
  /* ---------- M2 + M3 : confidentialité de la messagerie ---------- */

  await test('M3 — un client ne reçoit par l’API que son propre fil ; le notaire reçoit tout', async (tx, r, f) => {
    await messagerie(tx, f);
    r.state.user = f.tenantUser;
    const locataire = await messages(r).getBailMessages(f.bail.id);
    assert.deepEqual(locataire.map((m) => m.content), ['Au locataire'], 'le locataire ne doit voir que son fil');
    r.state.user = f.ownerUser;
    const proprio = await messages(r).getBailMessages(f.bail.id);
    assert.deepEqual(proprio.map((m) => m.content).sort(), ['Au propriétaire', 'Réponse du propriétaire'].sort());
  });

  await test('M3 — le notaire assigné reçoit les deux fils', async (tx, r, f) => {
    const { notaire } = await messagerie(tx, f);
    r.state.user = notaire;
    assert.equal((await messages(r).getBailMessages(f.bail.id)).length, 3);
  });

  await test('M2 — fichier du fil de l’autre partie : refusé ; fichier de son fil et pièce du bail : lisibles', async (tx, r, f) => {
    const m = await messagerie(tx, f);
    r.state.user = f.tenantUser;
    assert.equal(await access(r).accessibleDocument(m.docProprio.id, 'read'), null, 'le locataire lit un fichier du fil du propriétaire');
    assert.equal(await access(r).accessibleDocument(m.docReponse.id, 'read'), null, 'le locataire lit la réponse du propriétaire');
    assert(await access(r).accessibleDocument(m.docLocataire.id, 'read'), 'le locataire ne lit pas le fichier qui lui est adressé');
    assert(await access(r).accessibleDocument(m.piece.id, 'read'), 'une pièce ordinaire du bail doit rester lisible');
    r.state.user = f.ownerUser;
    assert.equal(await access(r).accessibleDocument(m.docLocataire.id, 'read'), null, 'le propriétaire lit le fichier du fil du locataire');
    assert(await access(r).accessibleDocument(m.docProprio.id, 'read'));
    assert(await access(r).accessibleDocument(m.docReponse.id, 'read'));
  });

  await test('M2 — notaire et équipe lisent tous les fichiers de la messagerie', async (tx, r, f) => {
    const m = await messagerie(tx, f);
    r.state.user = m.notaire;
    for (const d of [m.docProprio, m.docLocataire, m.docReponse]) assert(await access(r).accessibleDocument(d.id, 'read'));
    r.state.user = f.admin;
    for (const d of [m.docProprio, m.docLocataire, m.docReponse]) assert(await access(r).accessibleDocument(d.id, 'read'));
  });

  /* ---------- B2 + B3 : locataire entreprise, adresse de l'invitation ---------- */

  const intakeTenant = (tx, f) => tx.intakeLink.findFirstOrThrow({ where: { id: f.tenantIntake.id }, include: { client: { include: { persons: true, entreprise: true } } } });
  const entreprise = (over = {}) => ({ legalName: 'SAS Essai', registration: '123 456 789 00012', registryConfirmed: false, email: 'autre-adresse@example.invalid', phone: '+33612345678', fullAddress: '3 rue de l’Essai 23000 Guéret', ...over });

  await test('B2 — le schéma du locataire accepte une société sans nom commercial et reprend la raison sociale', async (tx, r, f) => {
    const { tenantFormSchema } = r.load('lib/zod/client.ts');
    const res = tenantFormSchema.safeParse({ clientId: f.tenant.id, email: 'locataire@example.invalid', type: 'PERSONNE_MORALE', entreprise: entreprise(), persons: [] });
    assert(res.success, 'refusé : ' + JSON.stringify(res.error?.issues?.map((i) => i.path.join('.') + ' ' + i.message)));
    assert.equal(res.data.entreprise.name, 'SAS Essai');
  });

  await test('B2 + B3 — enregistrement d’une société locataire : nom repris, e-mail = adresse de l’invitation', async (tx, r, f) => {
    f.tenantIntake = await tx.intakeLink.create({ data: { token: crypto.randomUUID(), target: 'TENANT', clientId: f.tenant.id, propertyId: f.property.id, bailId: f.bail.id, status: 'PENDING' } });
    const invitation = (await tx.person.findFirst({ where: { clientId: f.tenant.id, isPrimary: true } })).email;
    const handlers = r.load('lib/actions/intake-handlers.ts');
    await handlers.handleTenantClientInfoStep(await intakeTenant(tx, f), { type: 'PERSONNE_MORALE', email: 'autre-adresse@example.invalid', entreprise: entreprise(), persons: [] }, f.tenant.id);
    const saved = await tx.entreprise.findUnique({ where: { clientId: f.tenant.id } });
    assert(saved, 'société non enregistrée');
    assert.equal(saved.email, invitation, 'l’e-mail de la société doit être l’adresse de l’invitation');
    assert.equal(saved.name, 'SAS Essai');
  });

  await test('B3 — particulier : l’e-mail de la personne principale reste celui de l’invitation', async (tx, r, f) => {
    f.tenantIntake = await tx.intakeLink.create({ data: { token: crypto.randomUUID(), target: 'TENANT', clientId: f.tenant.id, propertyId: f.property.id, bailId: f.bail.id, status: 'PENDING' } });
    const person = await tx.person.findFirst({ where: { clientId: f.tenant.id, isPrimary: true } });
    const handlers = r.load('lib/actions/intake-handlers.ts');
    await handlers.handleTenantClientInfoStep(await intakeTenant(tx, f), { type: 'PERSONNE_PHYSIQUE', email: 'changee@example.invalid', persons: [{ firstName: 'Test', lastName: 'Locataire', email: 'changee@example.invalid', isPrimary: true }] }, f.tenant.id);
    assert.equal((await tx.person.findUnique({ where: { id: person.id } })).email, person.email);
  });

  await test('M2 — la page du bail du propriétaire ne liste pas les fichiers du fil du locataire', async (tx, r, f) => {
    const m = await messagerie(tx, f);
    r.state.user = f.ownerUser;
    const bail = await clientSpace(r).getClientBailDetails(f.bail.id, f.owner.id);
    const ids = bail.documents.map((d) => d.id);
    assert(!ids.includes(m.docLocataire.id), 'fichier du fil du locataire listé chez le propriétaire');
    assert(ids.includes(m.docProprio.id) && ids.includes(m.docReponse.id) && ids.includes(m.piece.id));
  });
});
