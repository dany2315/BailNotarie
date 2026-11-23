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

  /* ---------- m2 : date de prise d'effet dans le passé refusée ---------- */

  const jour = (decalage) => new Date(Date.now() + decalage * 86400000).toISOString().slice(0, 10);

  await test('m2 — règle : hier refusé ; aujourd’hui et demain acceptés ; date déjà enregistrée inchangée acceptée', async (tx, r) => {
    const { effectiveDateInPast, todayInFrance } = r.load('lib/bail/dates.ts');
    const auj = todayInFrance();
    const veille = new Date(new Date(auj + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
    assert.equal(effectiveDateInPast(veille), true, 'la veille est acceptée');
    assert.equal(effectiveDateInPast(auj), false, 'aujourd’hui est refusé');
    assert.equal(effectiveDateInPast(jour(30)), false);
    assert.equal(effectiveDateInPast('2021-05-01', new Date('2021-05-01T00:00:00Z')), false, 'date ancienne inchangée refusée');
    assert.equal(effectiveDateInPast('2021-06-01', new Date('2021-05-01T00:00:00Z')), true, 'nouvelle date passée acceptée');
  });

  await test('m2 — fiche de l’équipe : nouvelle date passée refusée ; un autre champ se modifie sur un bail déjà commencé', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailType: 'BAIL_NU_3_ANS', effectiveDate: new Date('2025-02-01T00:00:00Z'), endDate: new Date('2028-02-01T00:00:00Z') } });
    r.state.user = f.admin;
    const refus = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { effectiveDate: '2025-03-01' } });
    assert.equal(refus.success, false);
    assert.match(refus.error, /ne peut pas être dans le passé/);
    assert.equal(ymd((await tx.bail.findUnique({ where: { id: f.bail.id } })).effectiveDate), '2025-02-01', 'la date a changé malgré le refus');
    const loyer = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '620' } });
    assert(loyer.success, loyer.error);
    const avenir = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { effectiveDate: jour(20) } });
    assert(avenir.success, avenir.error);
  });

  await test('m2 — formulaire propriétaire, étape « Locataire » : date passée refusée, rien n’est créé', async (tx, r, f) => {
    const handlers = r.load('lib/actions/intake-handlers.ts');
    const avant = await tx.client.count();
    await assert.rejects(
      () => handlers.handleOwnerTenantStep(f.intake, { tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: '2024-01-15', bailPaymentDay: '5' }, f.owner.id),
      /ne peut pas être dans le passé/,
    );
    assert.equal(await tx.client.count(), avant, 'un locataire a été créé');
  });

  await test('m2 — nouveau client complet de l’équipe : date passée refusée avant toute création', async (tx, r) => {
    const clients = r.load('lib/actions/clients.ts');
    const avant = await tx.client.count();
    await assert.rejects(
      () => clients.createFullClient({ type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', firstName: 'Léa', lastName: 'Martin', email: crypto.randomUUID() + '@example.invalid', propertyFullAddress: 'TEST — 1 rue de l’Essai', bailRentAmount: '650', bailMonthlyCharges: '50', bailSecurityDeposit: '650', bailEffectiveDate: '2023-04-01' }),
      /ne peut pas être dans le passé/,
    );
    assert.equal(await tx.client.count(), avant, 'un client a été créé');
  });

  /* ---------- Lot du 17/11 au soir : m1, m3, m4, m5, m7, m10, m13, m14, m15, m17 ---------- */

  await test('m1 — jour de paiement : 1 à 28 accepté, 0, 29, 31 refusés ; 30 déjà enregistré reste accepté', async (tx, r) => {
    const { paymentDayInvalid } = r.load('lib/bail/dates.ts');
    for (const ok of ['1', '15', 28, '']) assert.equal(paymentDayInvalid(ok), false, `${ok} refusé`);
    for (const ko of ['0', '29', 31, 'abc', '5.5']) assert.equal(paymentDayInvalid(ko), true, `${ko} accepté`);
    assert.equal(paymentDayInvalid(30, 30), false, 'valeur déjà enregistrée refusée');
    assert.equal(paymentDayInvalid(31, 30), true);
  });

  await test('m1 — fiche de l’équipe : 31 refusé avec le message ; 30 déjà enregistré ne bloque pas un autre champ', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { paymentDay: 30 } });
    r.state.user = f.admin;
    const refus = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { paymentDay: '31' } });
    assert.equal(refus.success, false);
    assert.match(refus.error, /entre 1 et 28/);
    const loyer = await terms(r).updateBailTermsAdmin({ bailId: f.bail.id, values: { rentAmount: '640', paymentDay: '30' } });
    assert(loyer.success, loyer.error);
  });

  await test('m1 — formulaire propriétaire, étape « Locataire » : jour 31 refusé, rien n’est créé', async (tx, r, f) => {
    const handlers = r.load('lib/actions/intake-handlers.ts');
    const avant = await tx.client.count();
    await assert.rejects(
      () => handlers.handleOwnerTenantStep(f.intake, { tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: jour(10), bailPaymentDay: '31' }, f.owner.id),
      /entre 1 et 28/,
    );
    assert.equal(await tx.client.count(), avant);
    const { ownerFormSchema } = r.load('lib/zod/client.ts');
    const issue = ownerFormSchema.safeParse({ bailPaymentDay: '29' }).error?.issues.find((i) => i.path.join('.') === 'bailPaymentDay');
    assert.match(issue?.message ?? '', /entre 1 et 28/, 'le formulaire n’affiche pas le message');
  });

  await test('m3 — date de naissance : future et mineur refusés, majeur accepté (formulaire et fiche de l’équipe)', async (tx, r, f) => {
    const { birthDateIssue } = r.load('lib/utils/person-checks.ts');
    const an = new Date().getUTCFullYear();
    assert.match(birthDateIssue(`${an + 1}-01-01`), /futur/);
    assert.match(birthDateIssue(`${an - 10}-06-15`), /majeure/);
    assert.equal(birthDateIssue(`${an - 40}-06-15`), null);
    const { tenantFormSchema } = r.load('lib/zod/client.ts');
    const res = tenantFormSchema.safeParse({ clientId: f.tenant.id, email: 'x@example.invalid', type: 'PERSONNE_PHYSIQUE', persons: [{ firstName: 'A', lastName: 'B', email: 'x@example.invalid', birthDate: `${an - 12}-03-02` }] });
    assert(res.error?.issues.some((i) => /majeure/.test(i.message)), 'mineur accepté par le formulaire');
    r.state.user = f.admin;
    const person = await tx.person.findFirst({ where: { clientId: f.tenant.id, isPrimary: true } });
    const refus = await r.load('lib/actions/admin-bail.ts').updatePartyFieldAdmin({ entity: 'person', id: person.id, field: 'birthDate', value: `${an + 2}-01-01` });
    assert.equal(refus.success, false);
    assert.match(refus.error, /futur/);
  });

  await test('m4 — téléphones : « +33 6 12 » et « +33 12 » refusés, numéros réels acceptés', async (tx, r) => {
    const { isValidPhoneNumberSafe } = r.load('lib/utils/phone-validation.ts');
    for (const ko of ['+33 6 12', '+33 12', '+3361234567890', '12']) assert.equal(isValidPhoneNumberSafe(ko), false, `${ko} accepté`);
    for (const ok of ['+33612345678', '06 12 34 56 78', '+33 1 23 45 67 89', '+447911123456', '0033612345678', '']) assert.equal(isValidPhoneNumberSafe(ok), true, `${ok} refusé`);
  });

  await test('m5 — syndic : e-mail et téléphone contrôlés par le formulaire', async (tx, r) => {
    const { ownerFormSchema } = r.load('lib/zod/client.ts');
    const issues = ownerFormSchema.safeParse({ propertySyndicEmail: 'pas-un-mail', propertySyndicPhone: '+33 6 12' }).error.issues.map((i) => i.path.join('.') + ' ' + i.message);
    assert(issues.some((i) => /propertySyndicEmail E-mail du syndic invalide/.test(i)), issues.join(' | '));
    assert(issues.some((i) => /propertySyndicPhone Numéro de téléphone du syndic invalide/.test(i)), issues.join(' | '));
  });

  await test('m7 — de « marié » à « célibataire » : le régime est effacé, même s’il est encore envoyé', async (tx, r, f) => {
    f.tenantIntake = await tx.intakeLink.create({ data: { token: crypto.randomUUID(), target: 'TENANT', clientId: f.tenant.id, propertyId: f.property.id, bailId: f.bail.id, status: 'PENDING' } });
    const person = await tx.person.findFirst({ where: { clientId: f.tenant.id, isPrimary: true } });
    const handlers = r.load('lib/actions/intake-handlers.ts');
    const base = { firstName: 'Test', lastName: 'Locataire', email: person.email, isPrimary: true };
    await handlers.handleTenantClientInfoStep(await intakeTenant(tx, f), { type: 'PERSONNE_PHYSIQUE', email: person.email, persons: [{ ...base, familyStatus: 'MARIE', matrimonialRegime: 'COMMUNAUTE_UNIVERSELLE' }] }, f.tenant.id);
    assert.equal((await tx.person.findUnique({ where: { id: person.id } })).matrimonialRegime, 'COMMUNAUTE_UNIVERSELLE');
    await handlers.handleTenantClientInfoStep(await intakeTenant(tx, f), { type: 'PERSONNE_PHYSIQUE', email: person.email, persons: [{ ...base, familyStatus: 'CELIBATAIRE', matrimonialRegime: 'COMMUNAUTE_UNIVERSELLE' }] }, f.tenant.id);
    const after = await tx.person.findUnique({ where: { id: person.id } });
    assert.equal(after.familyStatus, 'CELIBATAIRE');
    assert.equal(after.matrimonialRegime, null, 'régime conservé');
    await tx.person.update({ where: { id: person.id }, data: { familyStatus: 'MARIE', matrimonialRegime: 'SEPARATION_DE_BIENS' } });
    r.state.user = f.admin;
    const res = await r.load('lib/actions/admin-bail.ts').updatePartyFieldAdmin({ entity: 'person', id: person.id, field: 'familyStatus', value: 'DIVORCE' });
    assert(res.success, res.error);
    assert.equal((await tx.person.findUnique({ where: { id: person.id } })).matrimonialRegime, null, 'régime conservé par la fiche de l’équipe');
  });

  await test('m10 — e-mail vide : « L’email est requis » ; e-mail mal formé : « Email invalide »', async (tx, r, f) => {
    const { tenantFormSchema } = r.load('lib/zod/client.ts');
    const msg = (email) => tenantFormSchema.safeParse({ clientId: f.tenant.id, email: 'x@example.invalid', type: 'PERSONNE_PHYSIQUE', persons: [{ firstName: 'A', lastName: 'B', email: 'x@example.invalid' }, { firstName: 'C', lastName: 'D', email }] })
      .error?.issues.find((i) => i.path.join('.') === 'persons.1.email')?.message;
    assert.equal(msg(''), "L'email est requis");
    assert.equal(msg('pas-un-mail'), 'Email invalide');
  });

  await test('m13 + m14 — libellés en clair et orthographe', async (tx, r) => {
    const { FAMILY_STATUS_LABELS } = r.load('lib/utils/person-labels.ts');
    const { getPropertyTypeLabel } = r.load('lib/utils/property-labels.ts');
    const { getPropertyLegalStatusLabel } = r.load('lib/utils/legaleStatus-label.ts');
    const { getBailTypeLabel } = r.load('lib/utils/bails-labels.ts');
    assert.equal(FAMILY_STATUS_LABELS.CELIBATAIRE, 'Célibataire');
    assert.equal(getPropertyTypeLabel('BOUTIQUE'), 'Boutique');
    assert.equal(getPropertyTypeLabel('APPARTEMENT'), 'Appartement');
    assert.equal(getPropertyLegalStatusLabel('PLEIN_PROPRIETE'), 'Pleine propriété');
    assert.equal(getBailTypeLabel('BAIL_NU_3_ANS'), 'Bail nu 3 ans');
    assert.equal(getBailTypeLabel('BAIL_NU_6_ANS'), 'Bail nu 6 ans');
  });

  await test('m15 — messages en français : champ absent, connexion, code expiré', async (tx, r, f) => {
    const { tenantFormSchema } = r.load('lib/zod/client.ts');
    const issues = tenantFormSchema.safeParse({ clientId: f.tenant.id, email: 'x@example.invalid', type: 'PERSONNE_MORALE', entreprise: { registration: '123 456 789 00012' }, persons: [] }).error.issues;
    const messages = issues.map((i) => i.message);
    assert(!messages.some((m) => /Invalid input|expected/.test(m)), messages.join(' | '));
    assert(messages.includes('Le numéro de téléphone est requis'), messages.join(' | '));
    const { authErrorMessage } = r.load('lib/auth-error-message.ts');
    assert.match(authErrorMessage({ code: 'OTP_EXPIRED' }, 'x'), /a expiré/);
    assert.match(authErrorMessage({ code: 'INVALID_EMAIL_OR_PASSWORD' }, 'x'), /mot de passe incorrect/);
    assert.equal(authErrorMessage({ code: 'INCONNU', message: 'Something went wrong' }, 'Repli'), 'Repli');
  });

  await test('m17 — fichier de la messagerie : téléchargé sous son nom d’origine', async (tx, r) => {
    const { buildDocumentFileName } = r.load('lib/utils/document-filename.ts');
    assert.equal(buildDocumentFileName({ id: 'cmabc123456', kind: 'OTHER', label: 'reponse-proprio.pdf', fileKey: 'chat/1731850000000-k3j2-reponse-proprio.pdf', owner: 'Jean Martin', address: '1 rue X' }), 'reponse-proprio.pdf');
    assert.notEqual(buildDocumentFileName({ id: 'cmabc123456', kind: 'KBIS', fileKey: 'a.pdf', owner: 'SAS Essai' }), 'a.pdf');
  });

  await test('m6 — surface : 0 et négatif refusés ; au-delà de 10 000 m², avertissement sans blocage', async (tx, r, f) => {
    const { surfaceIssue, surfaceWarning } = r.load('lib/utils/surface.ts');
    for (const ko of ['-7', '0', 0, 'abc']) assert(surfaceIssue(ko), `${ko} accepté`);
    for (const ok of ['42', '42,5', 100000, '']) assert.equal(surfaceIssue(ok), null, `${ok} refusé`);
    assert(surfaceWarning('100000'));
    assert.equal(surfaceWarning('9000'), null);
    const { ownerFormSchema } = r.load('lib/zod/client.ts');
    const issue = ownerFormSchema.safeParse({ propertySurfaceM2: '-7' }).error.issues.find((i) => i.path.join('.') === 'propertySurfaceM2');
    assert.match(issue?.message ?? '', /supérieure à 0/);
    const handlers = r.load('lib/actions/intake-handlers.ts');
    const avant = (await tx.property.findUnique({ where: { id: f.property.id } })).surfaceM2;
    await assert.rejects(() => handlers.handleOwnerPropertyStep(f.intake, { propertySurfaceM2: '-7' }, f.owner.id), /supérieure à 0/);
    assert.equal(String((await tx.property.findUnique({ where: { id: f.property.id } })).surfaceM2), String(avant));
  });

  /* ---------- Lot m18 à m43 (18/11) ---------- */

  await test('m40 — refus d’accès : 401, 403 ou 404, plus 500', async (tx, r, f) => {
    const { errorStatus } = r.load('lib/api/error-response.ts');
    assert.equal(errorStatus(new Error('Unauthorized')), 401);
    assert.equal(errorStatus(new Error('Non authentifié')), 401);
    assert.equal(errorStatus(new Error('Forbidden - Accès réservé aux clients')), 403);
    assert.equal(errorStatus(new Error('Non autorisé')), 403);
    assert.equal(errorStatus(new Error('Demande introuvable')), 404);
    assert.equal(errorStatus(new Error('connexion perdue')), 500);
    const route = r.load('app/api/clients/[id]/route.ts');
    r.state.user = f.ownerUser;
    const res = await route.GET(new Request('http://localhost:3000/api/clients/' + f.owner.id), { params: Promise.resolve({ id: f.owner.id }) });
    assert.equal(res.status, 403, 'un client qui lit une fiche client');
    r.state.user = null;
    const anonyme = await route.GET(new Request('http://localhost:3000/api/clients/' + f.owner.id), { params: Promise.resolve({ id: f.owner.id }) });
    assert.equal(anonyme.status, 401, JSON.stringify(await anonyme.clone().json()));
  });

  await test('m41 — préparation de la connexion : même réponse pour un client, un notaire, l’équipe ou une adresse inconnue', async (tx, r, f) => {
    const notaire = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    // Client sans compte de connexion : le compte est créé, la réponse ne change pas.
    const sansCompte = await tx.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE', persons: { create: { firstName: 'Sans', lastName: 'Compte', email: crypto.randomUUID() + '@example.invalid', isPrimary: true } } }, include: { persons: true } });
    const prepare = r.load('app/api/auth/client/prepare-login/route.ts');
    const call = async (email) => { const res = await prepare.POST(new Request('http://localhost:3000/x', { method: 'POST', body: JSON.stringify({ email }) })); return res.status + ' ' + JSON.stringify(await res.json()); };
    const answers = [await call(f.ownerUser.email), await call(notaire.email), await call(f.admin.email), await call('inconnu-' + crypto.randomUUID() + '@example.invalid'), await call(sansCompte.persons[0].email)];
    assert.equal(new Set(answers).size, 1, answers.join(' | '));
    assert.equal(answers[0], '200 {"success":true}');
    assert(await tx.user.findUnique({ where: { email: sansCompte.persons[0].email } }), 'le compte du client n’a pas été préparé');
    for (const kind of ['client', 'notaire']) {
      const check = r.load(`app/api/auth/${kind}/check-user/route.ts`);
      const one = async (email) => JSON.stringify(await (await check.POST(new Request('http://localhost:3000/x', { method: 'POST', body: JSON.stringify({ email }) }))).json());
      assert.equal(new Set([await one(notaire.email), await one(f.ownerUser.email), await one('inconnu@example.invalid')]).size, 1, kind);
    }
  });

  await test('m43 — ordre de paiement d’un bail : refusé à un notaire et à l’équipe, accordé au propriétaire', async (tx, r, f) => {
    const notaire = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    const route = r.load('app/api/stripe/create-payment-intent-bail/route.ts');
    const post = () => route.POST(new Request('http://localhost:3000/x', { method: 'POST', body: '{}' }));
    for (const user of [notaire, f.admin, f.tenantUser]) {
      r.state.user = user;
      assert.equal((await post()).status, 403, user.role);
    }
    assert.equal(await tx.dossierPayment.count({ where: { userId: { in: [notaire.id, f.admin.id, f.tenantUser.id] } } }), 0, 'paiement enregistré pour un non-propriétaire');
    r.state.user = f.ownerUser;
    const ok = await post();
    assert.equal(ok.status, 200);
    assert((await ok.json()).clientSecret);
  });

  await test('m32 — réponse du client à une demande du notaire : notification et e-mail au notaire', async (tx, r, f) => {
    const notaire = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true, name: 'Me Essai' } });
    const assignment = await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notaire.id, assignedById: f.admin.id } });
    const req = await tx.complementRequest.create({ data: { bailId: f.bail.id, clientId: f.owner.id, target: 'OWNER', origin: 'NOTAIRE', recipientEmail: 'test@example.invalid', createdByName: 'Me Essai', createdById: notaire.id } });
    const item = await tx.complementRequestItem.create({ data: { requestId: req.id, kind: 'DOCUMENT', label: 'Autre document', documentKind: 'OTHER', reason: 'ILLEGIBLE', bailId: f.bail.id, status: 'PROVIDED', providedAt: new Date() } });
    await tx.document.create({ data: { kind: 'OTHER', label: 'reponse.pdf', fileKey: 'documents/test-rep-' + crypto.randomBytes(3).toString('hex'), bailId: f.bail.id, complementItemId: item.id, uploadedById: f.ownerUser.id } });
    r.state.user = f.ownerUser;
    const avant = r.state.suppressed.email || 0;
    const sent = await r.load('lib/actions/complement-requests.ts').submitComplementRequest({ requestId: req.id });
    assert(sent.success, sent.error);
    assert.equal((r.state.suppressed.email || 0) - avant, 1, 'aucun e-mail au notaire');
    assert(r.state.suppressed.createNotificationForUser >= 1, 'pas de notification au notaire');
    assert(assignment.id);
  });
});
