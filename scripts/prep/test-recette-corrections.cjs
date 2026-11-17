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

  /* ---------- M1 + M4 : erreurs lisibles, e-mail du locataire contrôlé ---------- */

  await test('M1 — les erreurs des actions sont renvoyées en français, sans texte technique', async (tx, r) => {
    const { actionErrorMessage, guardAction } = r.load('lib/utils/action-error.ts');
    assert.equal(actionErrorMessage(new Error('Cet email est déjà utilisé.')), 'Cet email est déjà utilisé.');
    const prisma = Object.assign(new Error('Invalid `prisma.bail.findUnique()` invocation: Transaction API error'), { name: 'PrismaClientKnownRequestError', code: 'P2028' });
    assert(!/prisma|invocation/i.test(actionErrorMessage(prisma)), 'texte technique transmis');
    assert.equal(actionErrorMessage({ issues: [{ message: 'Le jour de paiement est requis' }, { message: 'Invalid input: expected string, received undefined' }] }), 'Le jour de paiement est requis');
    const res = await guardAction(async () => { throw new Error('Refus clair'); });
    assert.equal(res.__actionError, 'Refus clair');
  });

  await test('M4 — étape « Locataire » : une adresse mal formée est refusée, rien n’est créé ni envoyé', async (tx, r, f) => {
    const handlers = r.load('lib/actions/intake-handlers.ts');
    const avant = await tx.client.count();
    await assert.rejects(
      () => handlers.handleOwnerTenantStep(f.intake, { tenantEmail: 'pas-un-mail', email: 'proprio@example.invalid', bailEffectiveDate: '2027-02-01', bailPaymentDay: '5' }, f.owner.id),
      /n'est pas valide/,
    );
    assert.equal(await tx.client.count(), avant, 'un locataire a été créé');
    assert.equal(r.state.suppressed.email || 0, 0, 'une invitation a été déclenchée');
  });

  /* ---------- M5 : date de fin toujours calculée depuis la fiche de l'équipe ---------- */

  const terms = (r) => r.load('lib/actions/admin-bail-edit.ts');
  const ymd = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

  await test('M5 — changer le type de bail recalcule la date de fin ; une date de fin envoyée est ignorée', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailType: 'BAIL_NU_3_ANS', effectiveDate: new Date('2027-02-01T00:00:00Z'), endDate: new Date('2030-02-01T00:00:00Z'), securityDeposit: 600 } });
    const res = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { bailType: 'BAIL_MEUBLE_9_MOIS', endDate: '2035-01-01' } });
    assert(res.success, res.error);
    assert.equal(ymd((await tx.bail.findUnique({ where: { id: f.bail.id } })).endDate), '2027-11-01');
  });

  await test('M5 — changer la prise d’effet décale la date de fin', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailType: 'BAIL_NU_3_ANS', effectiveDate: new Date('2027-02-01T00:00:00Z'), endDate: new Date('2030-02-01T00:00:00Z') } });
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { effectiveDate: '2027-04-15' } })).success);
    assert.equal(ymd((await tx.bail.findUnique({ where: { id: f.bail.id } })).endDate), '2030-04-15');
  });

  await test('M5 — une autre modification (loyer) ne touche pas à la date de fin existante', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailType: 'BAIL_NU_3_ANS', effectiveDate: new Date('2027-02-01T00:00:00Z'), endDate: new Date('2030-03-01T00:00:00Z') } });
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '610' } })).success);
    assert.equal(ymd((await tx.bail.findUnique({ where: { id: f.bail.id } })).endDate), '2030-03-01');
  });

  /* ---------- M10 : réassignation d'un notaire ---------- */

  await test('M10 — réassigner remplace le notaire : l’ancien perd l’accès (messages, pièce qu’il avait archivée), les demandes restent au dossier', async (tx, r, f) => {
    const notaire = (n) => tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true, name: 'Notaire ' + n } });
    const a = await notaire('A'), b = await notaire('B');
    const notaires = r.load('lib/actions/notaires.ts');
    r.state.user = f.admin;
    await notaires.assignDossierToNotaire({ bailId: f.bail.id, notaireId: a.id });
    const dossier = await tx.dossierNotaireAssignment.findFirstOrThrow({ where: { bailId: f.bail.id } });
    const demande = await tx.notaireRequest.create({ data: { dossierId: dossier.id, title: 'Demande du notaire A', content: 'test', createdById: a.id } });
    const archivee = await tx.document.create({ data: { kind: 'OTHER', label: 'archivee.pdf', fileKey: 'documents/test-arch-' + crypto.randomBytes(3).toString('hex'), archivedAt: new Date(), archivedById: a.id, archivedBailId: f.bail.id } });
    r.state.user = a;
    assert(await access(r).accessibleDocument(archivee.id, 'read'), 'avant réassignation, le notaire A relit sa pièce archivée');

    r.state.user = f.admin;
    await notaires.assignDossierToNotaire({ bailId: f.bail.id, notaireId: b.id });
    const lignes = await tx.dossierNotaireAssignment.findMany({ where: { bailId: f.bail.id } });
    assert.deepEqual([...new Set(lignes.map((l) => l.notaireId))], [b.id], 'il ne doit rester que le notaire B');
    assert(await tx.notaireRequest.findUnique({ where: { id: demande.id } }), 'la demande déjà faite a été supprimée');

    r.state.user = a;
    await assert.rejects(() => messages(r).getBailMessages(f.bail.id), /Non autorisé/);
    assert.equal(await access(r).accessibleDocument(archivee.id, 'read'), null, 'l’ancien notaire relit encore la pièce archivée');
    r.state.user = b;
    assert.equal((await messages(r).getBailMessages(f.bail.id)).length >= 0, true);
    r.state.user = f.admin;
    await assert.rejects(() => notaires.assignDossierToNotaire({ bailId: f.bail.id, notaireId: b.id }), /déjà assigné/);
  });

  /* ---------- M8 : types de fichiers ---------- */

  await test('M8 — seuls PDF, JPG, JPEG, PNG, HEIC, DOC, DOCX sont acceptés ; la route d’envoi refuse le reste', async (tx, r, f) => {
    const { isAllowedFileName } = r.load('lib/utils/allowed-files.ts');
    for (const ok of ['a.pdf', 'b.JPG', 'c.jpeg', 'd.png', 'e.heic', 'f.HEIF', 'g.doc', 'h.docx']) assert(isAllowedFileName(ok), ok);
    for (const ko of ['a.txt', 'b.zip', 'c.exe', 'd.pdf.exe', 'e', 'f.html']) assert(!isAllowedFileName(ko), ko);
    r.state.user = f.ownerUser;
    const res = await r.load('app/api/blob/generate-upload-token/route.ts').POST(new Request('http://localhost:3000/api/blob/generate-upload-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: 'statuts.zip', contentType: 'application/zip', propertyId: f.property.id }) }));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /Format non accepté/);
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

  /* ---------- M12 : créer un notaire avec une adresse déjà utilisée ---------- */

  await test('M12 — adresse d’un compte client, d’un notaire ou d’une fiche client : refus avec message, aucun rôle changé', async (tx, r, f) => {
    const notaires = r.load('lib/actions/notaires.ts');
    r.state.user = f.admin;
    const res = await notaires.createNotaire({ email: f.tenantUser.email, name: 'Me Essai' });
    assert.match(res.__actionError || '', /compte client/);
    assert.equal((await tx.user.findUnique({ where: { id: f.tenantUser.id } })).role, 'UTILISATEUR', 'le rôle du client a changé');
    const existant = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    assert.match((await notaires.createNotaire({ email: existant.email.toUpperCase(), name: 'Me Essai' })).__actionError || '', /existe déjà/);
    const fiche = (await tx.person.findFirst({ where: { clientId: f.owner.id } })).email;
    assert.match((await notaires.createNotaire({ email: fiche, name: 'Me Essai' })).__actionError || '', /appartient déjà à un client/);
  });

  await test('M12 — une adresse nouvelle crée bien le notaire', async (tx, r, f) => {
    r.state.user = f.admin;
    const email = crypto.randomUUID() + '@example.invalid';
    const res = await r.load('lib/actions/notaires.ts').createNotaire({ email, name: 'Me Nouveau' });
    assert(!res.__actionError, res.__actionError);
    assert.equal((await tx.user.findUnique({ where: { email } })).role, 'NOTAIRE');
  });

  /* ---------- M13 : lien de formulaire créé par l'équipe ---------- */

  await test('M13 — lien locataire : rattaché au bail choisi, au bien et au locataire du bail', async (tx, r, f) => {
    r.state.user = f.admin;
    const lien = await r.load('lib/actions/intakes.ts').createIntakeLink({ target: 'TENANT', leaseId: f.bail.id });
    assert.equal(lien.bailId, f.bail.id);
    assert.equal(lien.propertyId, f.property.id);
    assert.equal(lien.clientId, f.tenant.id);
  });

  await test('M13 — lien propriétaire depuis le bien seul : rattaché au propriétaire du bien', async (tx, r, f) => {
    r.state.user = f.admin;
    const lien = await r.load('lib/actions/intakes.ts').createIntakeLink({ target: 'OWNER', propertyId: f.property.id });
    assert.equal(lien.clientId, f.owner.id);
    assert.equal(lien.bailId, null);
  });

  await test('M13 — refus clairs : locataire sans bail, bail sans locataire, bail d’un autre bien', async (tx, r, f) => {
    r.state.user = f.admin;
    const intakes = r.load('lib/actions/intakes.ts');
    const avant = await tx.intakeLink.count();
    await assert.rejects(() => intakes.createIntakeLink({ target: 'TENANT', propertyId: f.property.id }), /bail du locataire/);
    const seul = await tx.bail.create({ data: { propertyId: f.property.id, rentAmount: 500, monthlyCharges: 0, securityDeposit: 500, paymentDay: 5, status: 'DRAFT', parties: { connect: [{ id: f.owner.id }] } } });
    await assert.rejects(() => intakes.createIntakeLink({ target: 'TENANT', leaseId: seul.id }), /pas encore de locataire/);
    const autre = await tx.property.create({ data: { ownerId: f.owner.id, fullAddress: 'TEST — autre bien', surfaceM2: 20, type: 'APPARTEMENT' } });
    await assert.rejects(() => intakes.createIntakeLink({ target: 'OWNER', propertyId: autre.id, leaseId: f.bail.id }), /ne porte pas sur le bien/);
    assert.equal(await tx.intakeLink.count(), avant, 'un lien a été créé malgré le refus');
  });

  /* ---------- M14 : « Nouveau client complet » créé par l'équipe ---------- */

  await test('M14 — client complet par l’équipe : prénom, nom et e-mail suffisent ; prénom manquant refusé', async (tx, r) => {
    const z = r.load('lib/zod/client.ts');
    const base = { type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', email: 'equipe@example.invalid' };
    const ok = z.createOwnerPhysicalClientSchema.safeParse({ ...base, persons: [{ firstName: 'Léa', lastName: 'Martin', email: 'equipe@example.invalid', isPrimary: true }] });
    assert(ok.success, 'refusé : ' + JSON.stringify(ok.error?.issues?.map((i) => i.path.join('.') + ' ' + i.message)));
    const ko = z.createOwnerPhysicalClientSchema.safeParse({ ...base, persons: [{ lastName: 'Martin', email: 'equipe@example.invalid', isPrimary: true }] });
    assert(!ko.success, 'un prénom manquant est accepté');
    const morale = z.createOwnerLegalClientSchema.safeParse({ type: 'PERSONNE_MORALE', profilType: 'PROPRIETAIRE', email: 'societe@example.invalid', legalName: 'SAS Essai', persons: [{ firstName: 'Léa', lastName: 'Martin' }] });
    assert(!morale.error?.issues?.some((i) => i.path[0] === 'persons'), 'personne de la société refusée : ' + JSON.stringify(morale.error?.issues?.map((i) => i.path.join('.'))));
  });

  /* ---------- M15 : un seul e-mail au locataire quand ses conditions changent ---------- */

  const accordDonne = (tx, f) => tx.bail.update({ where: { id: f.bail.id }, data: { tenantConfirmedTermsAt: new Date('2026-11-10T10:00:00Z'), tenantConfirmedById: f.tenant.id, bailType: 'BAIL_NU_3_ANS', effectiveDate: new Date('2027-02-01T00:00:00Z') } });

  await test('M15 — loyer modifié après l’accord : un seul e-mail déclenché, même après une seconde modification', async (tx, r, f) => {
    await accordDonne(tx, f);
    r.state.user = f.admin;
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '640' } })).success);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert(bail.tenantReconfirmationRequestedAt && !bail.tenantConfirmedTermsAt, 'reconfirmation non demandée');
    assert.equal(r.state.suppressed.triggerTenantReconfirmationEmail || 0, 1, 'e-mail de reconfirmation non déclenché');
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { monthlyCharges: '70' } })).success);
    assert.equal(r.state.suppressed.triggerTenantReconfirmationEmail, 1, 'second e-mail déclenché alors que la demande est déjà en cours');
  });

  await test('M15 — envoi seulement si la demande est toujours en cours', async (tx, r, f) => {
    const { sendTenantReconfirmationEmail } = r.load('lib/bail/tenant-reconfirmation-email.ts');
    const at = new Date('2026-11-17T09:00:00Z');
    await tx.bail.update({ where: { id: f.bail.id }, data: { tenantConfirmedTermsAt: null, tenantReconfirmationRequestedAt: at } });
    const data = { bailId: f.bail.id, requestedAt: at.toISOString(), changedLabels: ['Loyer'] };
    assert.equal((await sendTenantReconfirmationEmail(data)).sent, true, 'non envoyé alors que la demande est en cours');
    assert.equal(r.state.suppressed.email, 1);
    assert.equal((await sendTenantReconfirmationEmail({ ...data, requestedAt: '2026-11-16T09:00:00.000Z' })).sent, false, 'envoyé pour une demande remplacée');
    await tx.bail.update({ where: { id: f.bail.id }, data: { tenantConfirmedTermsAt: new Date(), tenantReconfirmationRequestedAt: null } });
    assert.equal((await sendTenantReconfirmationEmail(data)).sent, false, 'envoyé alors que le locataire a reconfirmé');
    assert.equal(r.state.suppressed.email, 1);
  });

  await test('M15 — sauvegarde sans changement réel : ni reconfirmation ni e-mail', async (tx, r, f) => {
    await accordDonne(tx, f);
    r.state.user = f.admin;
    assert((await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '600' } })).success);
    assert((await tx.bail.findUnique({ where: { id: f.bail.id } })).tenantConfirmedTermsAt, 'accord retiré sans changement');
    assert.equal(r.state.suppressed.triggerTenantReconfirmationEmail || 0, 0);
  });
});
