// Lot 3 — date de prise d'effet et jour de paiement demandés avec le locataire.
// Sans locataire : dossier enregistrable et terminable sans ces valeurs, jamais de date provisoire.
// Avec locataire (dès le départ ou ajouté plus tard) : les deux valeurs exigées dans le même parcours.
const path = require('path');
const { test, suite, assert, crypto } = require('./harness.cjs');

const HAB = 3990;
const clients = (r) => r.load('lib/actions/clients.ts');
const leases = (r) => r.load('lib/actions/leases.ts');
const intakes = (r) => r.load('lib/actions/intakes.ts');
const bailOf = (tx, id) => tx.bail.findUnique({ where: { id }, include: { parties: { select: { id: true, profilType: true } } } });
const day = (d) => (d ? d.toISOString().slice(0, 10) : null);
const noTenant = (tx, f, data = {}) => tx.bail.update({ where: { id: f.bail.id }, data: { parties: { set: [{ id: f.owner.id }] }, status: 'DRAFT', ...data } });
const paid = (r, f) => {
  const id = 'pi_test_' + crypto.randomBytes(5).toString('hex');
  r.state.stripe.intents[id] = { id, status: 'succeeded', amount: HAB, amount_received: HAB, currency: 'eur', metadata: { intakeLinkId: f.intake.id, token: f.intake.token }, latest_charge: { id: 'ch', created: 1794000000 } };
  return id;
};
const userPaid = (r, user) => {
  const id = 'pi_test_' + crypto.randomBytes(5).toString('hex');
  r.state.stripe.intents[id] = { id, status: 'succeeded', amount: HAB, amount_received: HAB, currency: 'eur', metadata: { userId: user.id, source: 'client_bail_creation' }, latest_charge: { id: 'ch', created: 1794000000 } };
  return id;
};
/** Formulaire propriétaire complet (pièces fictives), avec ou sans locataire / dates. */
async function ownerPayload(tx, f, over = {}) {
  const person = await tx.person.findFirst({ where: { clientId: f.owner.id } });
  await tx.document.createMany({ data: [
    { kind: 'ID_IDENTITY', fileKey: 'documents/test-id', personId: person.id },
    { kind: 'DIAGNOSTICS', fileKey: 'documents/test-diag', propertyId: f.property.id },
    { kind: 'TITLE_DEED', fileKey: 'documents/test-titre', propertyId: f.property.id },
  ] });
  return {
    clientId: f.owner.id, type: 'PERSONNE_PHYSIQUE', email: person.email,
    persons: [{ firstName: 'Test', lastName: 'Proprietaire', email: person.email, phone: '+33612345678', fullAddress: '1 rue de Test, 75001 Paris', nationality: 'Française', profession: 'Test', familyStatus: 'CELIBATAIRE', birthPlace: 'Paris', birthDate: new Date('1980-01-01') }],
    propertyFullAddress: 'TEST — bien synthétique', propertySurfaceM2: '40', propertyType: 'APPARTEMENT', propertyLegalStatus: 'PLEIN_PROPRIETE', propertyLatitude: '', propertyLongitude: '',
    bailType: 'BAIL_NU_3_ANS', bailFamily: 'HABITATION', bailRentAmount: '600', bailMonthlyCharges: '50', bailSecurityDeposit: '600',
    ...over,
  };
}
const leaseData = (f, over = {}) => ({ propertyId: f.property.id, leaseType: 'HABITATION', bailType: 'BAIL_NU_3_ANS', rentAmount: '600', monthlyCharges: '50', securityDeposit: '600', status: 'DRAFT', ...over });
const free = (tx, f) => tx.bail.update({ where: { id: f.bail.id }, data: { status: 'TERMINATED', endDate: new Date('2026-01-01') } });

suite('Lot 3 — dates conditionnées au locataire', path.join(__dirname, '../../reports/prep/tests-lot3-dates.json'), async () => {
  /* ---------- Formulaire propriétaire ---------- */

  await test('Sans locataire et sans dates : le formulaire se termine et se paie, les deux valeurs restent vides', async (tx, r, f) => {
    // Ancien brouillon : date provisoire (jour de création), pas de jour de paiement.
    const created = (await tx.bail.findUnique({ where: { id: f.bail.id } })).createdAt;
    await noTenant(tx, f, { effectiveDate: created, paymentDay: null });
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    await clients(r).submitOwnerForm(payload, paid(r, f));
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(bail.effectiveDate, null, 'une date a été écrite sans locataire (date fictive)');
    assert.equal(bail.paymentDay, null);
    assert.equal(bail.status, 'AWAITING_TENANT');
    assert(bail.paidAt, 'le paiement sans locataire doit rester possible');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'SUBMITTED');
  });

  await test('Sans locataire mais avec des dates saisies : elles sont conservées telles quelles', async (tx, r, f) => {
    await noTenant(tx, f);
    const payload = await ownerPayload(tx, f, { bailEffectiveDate: '2027-01-15', bailPaymentDay: '7' });
    r.state.user = f.ownerUser;
    await clients(r).submitOwnerForm(payload, paid(r, f));
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(day(bail.effectiveDate), '2027-01-15');
    assert.equal(bail.paymentDay, 7);
  });

  await test('Locataire indiqué sans date ni jour de paiement : envoi refusé, rien n’est enregistré ni payé', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null });
    const payload = await ownerPayload(tx, f, { tenantEmail: crypto.randomUUID() + '@example.invalid' });
    r.state.user = f.ownerUser;
    await assert.rejects(() => clients(r).submitOwnerForm(payload, paid(r, f)), /date de prise d'effet|jour de paiement/i);
    await assert.rejects(() => clients(r).submitOwnerForm({ ...payload, bailEffectiveDate: '2027-01-15' }, paid(r, f)), /jour de paiement/i);
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(bail.paidAt, null);
    assert.equal(bail.status, 'DRAFT');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING');
  });

  await test('Locataire déjà rattaché au bail (sans e-mail dans l’envoi) et dates absentes : refusé aussi', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { effectiveDate: null, paymentDay: null, status: 'DRAFT' } });
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    await assert.rejects(() => clients(r).submitOwnerForm(payload, paid(r, f)), /Avec un locataire/);
    assert.equal((await bailOf(tx, f.bail.id)).paidAt, null);
  });

  await test('Locataire indiqué avec les deux valeurs : enregistré, formulaire envoyé', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null });
    const payload = await ownerPayload(tx, f, { tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: '2027-02-01', bailPaymentDay: '5' });
    r.state.user = f.ownerUser;
    await clients(r).submitOwnerForm(payload, paid(r, f));
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(day(bail.effectiveDate), '2027-02-01');
    assert.equal(bail.paymentDay, 5);
    assert.equal(bail.status, 'AWAITING_TENANT_FORM');
    assert(bail.parties.some((p) => p.profilType === 'LOCATAIRE'));
  });

  await test('Étape « Locataire » du formulaire : e-mail sans les deux valeurs refusé (aucun locataire créé, aucun e-mail) ; avec, enregistré', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null });
    r.state.user = f.ownerUser;
    const email = crypto.randomUUID() + '@example.invalid';
    const people = await tx.person.count();
    await assert.rejects(() => intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'tenant', payload: { tenantEmail: email } }), /Avec un locataire/);
    await assert.rejects(() => intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'tenant', payload: { tenantEmail: email, bailEffectiveDate: '2027-03-01' } }), /Avec un locataire/);
    assert.equal(await tx.person.count(), people, 'un locataire a été créé malgré le refus');
    assert.equal(r.state.suppressed.triggerTenantFormEmail ?? 0, 0, 'un e-mail est parti malgré le refus');
    await intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'tenant', payload: { tenantEmail: email, bailEffectiveDate: '2027-03-01', bailPaymentDay: '10' } });
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(day(bail.effectiveDate), '2027-03-01');
    assert.equal(bail.paymentDay, 10);
    assert(bail.parties.some((p) => p.profilType === 'LOCATAIRE'), 'le locataire devait être rattaché');
  });

  await test('Étape « Locataire » sans e-mail : rien d’exigé, le brouillon reste enregistrable', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null });
    r.state.user = f.ownerUser;
    await intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'tenant', payload: { tenantEmail: '' } });
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(bail.effectiveDate, null);
    assert.equal(bail.parties.length, 1);
  });

  await test('Nouveau brouillon créé par le formulaire : aucune date provisoire (ni date du jour, ni jour 1)', async (tx, r, f) => {
    // Lien propriétaire sans bail : l'étape « bail » crée le brouillon.
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { bailId: null } });
    r.state.user = f.ownerUser;
    await intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'bail', payload: { bailType: 'BAIL_NU_3_ANS', bailFamily: 'HABITATION', bailRentAmount: '600' } });
    const link = await tx.intakeLink.findUnique({ where: { id: f.intake.id } });
    assert(link.bailId, 'le brouillon devait être créé');
    const bail = await bailOf(tx, link.bailId);
    assert.equal(bail.effectiveDate, null, 'date provisoire écrite à la création du brouillon');
    assert.equal(bail.paymentDay, null);
  });

  await test('Règles du formulaire : sans locataire aucune date exigée ; avec locataire, les deux, à l’étape « Locataire »', async (tx, r) => {
    const rules = r.load('lib/rules/dossier-rules.ts');
    const base = { bailFamily: 'HABITATION', bailType: 'BAIL_NU_3_ANS', bailRentAmount: '600', bailMonthlyCharges: '50', bailSecurityDeposit: '600' };
    const dates = (issues) => issues.filter((i) => i.path === 'bailEffectiveDate' || i.path === 'bailPaymentDay');
    assert.equal(dates(rules.ownerFieldIssues(base, {})).length, 0);
    const withEmail = dates(rules.ownerFieldIssues({ ...base, tenantEmail: 'a@example.invalid' }, {}));
    assert.equal(withEmail.length, 2);
    assert(withEmail.every((i) => i.step === 'tenant' && i.level === 'blocking'));
    assert.equal(dates(rules.ownerFieldIssues(base, { hasTenant: true })).length, 2);
    assert.equal(dates(rules.ownerFieldIssues({ ...base, tenantEmail: 'a@example.invalid', bailEffectiveDate: '2027-01-01', bailPaymentDay: '5' }, {})).length, 0);
  });

  /* ---------- Espace client ---------- */

  await test('Espace client — bail créé sans locataire et sans dates : créé et payé, valeurs vides', async (tx, r, f) => {
    await free(tx, f);
    r.state.user = f.ownerUser;
    const created = await leases(r).createLease(leaseData(f), userPaid(r, f.ownerUser));
    const bail = await bailOf(tx, created.id);
    assert.equal(bail.effectiveDate, null);
    assert.equal(bail.paymentDay, null);
    assert.equal(bail.status, 'AWAITING_TENANT');
    assert(bail.paidAt);
  });

  await test('Espace client — locataire choisi sans date ou sans jour de paiement : refusé, aucun bail créé', async (tx, r, f) => {
    await free(tx, f);
    r.state.user = f.ownerUser;
    const before = await tx.bail.count();
    await assert.rejects(() => leases(r).createLease(leaseData(f, { tenantId: f.tenant.id }), userPaid(r, f.ownerUser)), /requis|requise/i);
    await assert.rejects(() => leases(r).createLease(leaseData(f, { tenantId: f.tenant.id, effectiveDate: '2027-02-01' }), userPaid(r, f.ownerUser)), /jour de paiement/i);
    assert.equal(await tx.bail.count(), before);
  });

  await test('Espace client — locataire choisi avec les deux valeurs : créé', async (tx, r, f) => {
    await free(tx, f);
    r.state.user = f.ownerUser;
    const created = await leases(r).createLease(leaseData(f, { tenantId: f.tenant.id, effectiveDate: '2027-02-01', paymentDay: '5' }), userPaid(r, f.ownerUser));
    const bail = await bailOf(tx, created.id);
    assert.equal(day(bail.effectiveDate), '2027-02-01');
    assert.equal(bail.paymentDay, 5);
    assert.equal(bail.status, 'AWAITING_TENANT_FORM');
  });

  await test('Espace client — brouillon enregistré sans dates : pas de date provisoire, et il se rouvre sans date', async (tx, r, f) => {
    await free(tx, f);
    r.state.user = f.ownerUser;
    const { bailId } = await leases(r).saveBailDraft({ propertyId: f.property.id, rentAmount: '600', monthlyCharges: '50' });
    assert.equal((await bailOf(tx, bailId)).effectiveDate, null);
    const draft = await leases(r).getDraftBailForClient(bailId, f.owner.id);
    assert.equal(draft.effectiveDate, null);
    const drafts = await leases(r).getClientBailDrafts(f.owner.id);
    assert.equal(drafts.find((d) => d.id === bailId).effectiveDate, null);
  });

  await test('Ancien brouillon à date provisoire : présenté sans date, la base n’est pas modifiée', async (tx, r, f) => {
    const created = (await tx.bail.findUnique({ where: { id: f.bail.id } })).createdAt;
    await noTenant(tx, f, { effectiveDate: created, paymentDay: null });
    r.state.user = f.ownerUser;
    const draft = await leases(r).getDraftBailForClient(f.bail.id, f.owner.id);
    assert.equal(draft.effectiveDate, null, 'la date provisoire est présentée comme une saisie');
    assert.equal(day((await bailOf(tx, f.bail.id)).effectiveDate), day(created), 'la date enregistrée ne doit pas être effacée par une simple lecture');
    const dates = r.load('lib/bail/dates.ts');
    assert.equal(dates.effectiveDateGiven({ effectiveDate: created, paymentDay: null, createdAt: created, status: 'DRAFT' }), false);
    assert.equal(dates.effectiveDateGiven({ effectiveDate: created, paymentDay: 5, createdAt: created, status: 'DRAFT' }), true);
    assert.equal(dates.effectiveDateGiven({ effectiveDate: created, paymentDay: null, createdAt: created, status: 'SIGNED' }), true);
  });

  /* ---------- Ajout ultérieur du locataire ---------- */

  await test('Ajout du locataire plus tard, bail sans dates : les deux valeurs sont exigées dans la même action', async (tx, r, f) => {
    await noTenant(tx, f, { status: 'AWAITING_TENANT', effectiveDate: null, paymentDay: null, paidAt: new Date() });
    r.state.user = f.ownerUser;
    const email = crypto.randomUUID() + '@example.invalid';
    assert.equal((await leases(r).getBailTenantDates(f.bail.id)).needed, true);
    const people = await tx.person.count();
    const links = await tx.intakeLink.count();
    await assert.rejects(() => leases(r).createTenantForLease({ bailId: f.bail.id, email }), /Avec un locataire/);
    await assert.rejects(() => leases(r).createTenantForLease({ bailId: f.bail.id, email, effectiveDate: '2027-04-01' }), /Avec un locataire/);
    assert.equal(await tx.person.count(), people, 'locataire créé malgré le refus');
    assert.equal(await tx.intakeLink.count(), links);
    await leases(r).createTenantForLease({ bailId: f.bail.id, email, effectiveDate: '2027-04-01', paymentDay: '8' });
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(day(bail.effectiveDate), '2027-04-01');
    assert.equal(bail.paymentDay, 8);
    assert.equal(bail.status, 'AWAITING_TENANT_FORM');
    assert(bail.parties.some((p) => p.profilType === 'LOCATAIRE'));
    assert.equal((await leases(r).getBailTenantDates(f.bail.id)).needed, false);
  });

  await test('Ajout du locataire plus tard, bail qui a déjà ses dates : l’e-mail suffit, les dates ne changent pas', async (tx, r, f) => {
    await noTenant(tx, f, { status: 'AWAITING_TENANT', paidAt: new Date() });
    r.state.user = f.ownerUser;
    const info = await leases(r).getBailTenantDates(f.bail.id);
    assert.equal(info.needed, false);
    assert.equal(info.effectiveDate, '2026-12-01');
    await leases(r).createTenantForLease({ bailId: f.bail.id, email: crypto.randomUUID() + '@example.invalid' });
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(day(bail.effectiveDate), '2026-12-01');
    assert.equal(bail.paymentDay, 5);
  });

  await test('Dates du bail : seul le propriétaire du bien (ou l’équipe) peut les lire', async (tx, r, f) => {
    r.state.user = f.tenantUser;
    await assert.rejects(() => leases(r).getBailTenantDates(f.bail.id));
    r.state.user = null;
    await assert.rejects(() => leases(r).getBailTenantDates(f.bail.id));
  });

  /* ---------- Date de fin : toujours calculée (type de bail + date de prise d'effet) ---------- */

  await test('Date de fin calculée automatiquement dans chaque parcours ; aucune date de fin sans date de prise d’effet', async (tx, r, f) => {
    // 1. Formulaire propriétaire avec locataire : bail nu 3 ans → fin 3 ans après la prise d'effet.
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null, endDate: new Date('2030-01-01') });
    const payload = await ownerPayload(tx, f, { tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: '2027-02-01', bailPaymentDay: '5' });
    r.state.user = f.ownerUser;
    await clients(r).submitOwnerForm(payload, paid(r, f));
    assert.equal(day((await bailOf(tx, f.bail.id)).endDate), '2030-02-01');
  });

  await test('Date de fin — formulaire sans locataire ni date : pas de date de fin (une ancienne valeur n’est pas gardée)', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null, endDate: new Date('2030-01-01') });
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    await clients(r).submitOwnerForm(payload, paid(r, f));
    assert.equal((await bailOf(tx, f.bail.id)).endDate, null);
  });

  await test('Date de fin — étape « Locataire » et ajout ultérieur du locataire : calculée par le serveur', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null, endDate: null, bailType: 'BAIL_MEUBLE_1_ANS' });
    r.state.user = f.ownerUser;
    await intakes(r).savePartialIntake({ token: f.intake.token, stepId: 'tenant', payload: { tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: '2027-03-01', bailPaymentDay: '10' } });
    assert.equal(day((await bailOf(tx, f.bail.id)).endDate), '2028-03-01', 'bail meublé 1 an : fin un an après');
    // Ajout du locataire plus tard, depuis l'espace client.
    const other = await tx.bail.create({ data: { propertyId: f.property.id, rentAmount: 500, bailType: 'BAIL_NU_3_ANS', status: 'AWAITING_TENANT', paidAt: new Date(), parties: { connect: [{ id: f.owner.id }] } } });
    await leases(r).createTenantForLease({ bailId: other.id, email: crypto.randomUUID() + '@example.invalid', effectiveDate: '2027-04-01', paymentDay: '8' });
    assert.equal(day((await bailOf(tx, other.id)).endDate), '2030-04-01');
  });

  await test('Date de fin — espace client : calculée même si l’écran ne l’envoie pas ; vide sans date de début', async (tx, r, f) => {
    await free(tx, f);
    r.state.user = f.ownerUser;
    const withTenant = await leases(r).createLease(leaseData(f, { tenantId: f.tenant.id, effectiveDate: '2027-02-01', paymentDay: '5' }), userPaid(r, f.ownerUser));
    assert.equal(day((await bailOf(tx, withTenant.id)).endDate), '2030-02-01');
    await tx.bail.update({ where: { id: withTenant.id }, data: { status: 'TERMINATED', endDate: new Date('2026-01-01') } });
    const without = await leases(r).createLease(leaseData(f), userPaid(r, f.ownerUser));
    assert.equal((await bailOf(tx, without.id)).endDate, null);
  });

  /* ---------- Pièces : toujours exigées ---------- */

  await test('Documents : l’envoi du formulaire propriétaire reste refusé sans les pièces obligatoires (avec ou sans locataire)', async (tx, r, f) => {
    await noTenant(tx, f, { effectiveDate: null, paymentDay: null });
    const payload = await ownerPayload(tx, f);
    await tx.document.deleteMany({ where: { OR: [{ propertyId: f.property.id }, { person: { clientId: f.owner.id } }] } });
    r.state.user = f.ownerUser;
    await assert.rejects(() => clients(r).submitOwnerForm(payload, paid(r, f)), /Pièces manquantes/);
    await assert.rejects(() => clients(r).submitOwnerForm({ ...payload, tenantEmail: crypto.randomUUID() + '@example.invalid', bailEffectiveDate: '2027-02-01', bailPaymentDay: '5' }, paid(r, f)), /Pièces manquantes/);
    const bail = await bailOf(tx, f.bail.id);
    assert.equal(bail.paidAt, null, 'dossier marqué payé sans les pièces');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING');
  });

  /* ---------- Étapes qui exigent un dossier complet, et lectures avec une date absente ---------- */

  await test('Dossier sans date d’effet : compté comme incomplet, envoi au notaire refusé', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { effectiveDate: null, paymentDay: null, paidAt: new Date() } });
    const missing = await leases(r).getBailMissingData(f.bail.id);
    assert(missing.bail.missingFields.includes('effectiveDate'));
    assert(missing.bail.missingFields.includes('paymentDay'));
    const res = await r.load('lib/actions/admin-bail.ts').validateAndSendToNotary({ bailId: f.bail.id });
    assert.equal(res.success, false);
    assert.equal(await tx.dossierNotaireAssignment.count({ where: { bailId: f.bail.id } }), 0);
  });

  await test('Plafond de loyer sans date d’effet : résultat indicatif signalé, jamais « vérifié »', async (tx, r, f) => {
    const cap = r.load('lib/rent-cap.ts');
    const input = (effectiveDate) => ({
      property: { id: f.property.id, inseeCode: '75101', surfaceM2: 40, type: 'APPARTEMENT', latitude: null, longitude: null, mainRooms: 2, constructionPeriod: null, rentCapZone: null, dpeClass: 'C' },
      bail: { rentAmount: 600, bailType: 'BAIL_NU_3_ANS', bailFamily: 'HABITATION', effectiveDate, rentSupplementReason: null, rentCapExemption: null },
    });
    assert.equal((await cap.assessRentCap(input(null))).effectiveDateMissing, true);
    assert.equal((await cap.assessRentCap(input(new Date('2026-10-01')))).effectiveDateMissing, false);
  });

  await test('Écrans et listes : un bail sans date se lit sans erreur (équipe, propriétaire, locataire, notaire)', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { effectiveDate: null, paymentDay: null } });
    assert((await leases(r).getLease(f.bail.id)).id);
    assert((await leases(r).getLeases({ pageSize: 500 })).data.some((b) => b.id === f.bail.id));
    await r.load('lib/actions/admin-dashboard.ts').getAdminDashboard?.();
    r.state.user = f.ownerUser;
    const detail = await r.load('lib/actions/client-space.ts').getClientBailDetails(f.bail.id, f.owner.id);
    assert.equal(detail.effectiveDate ?? null, null);
    const availability = r.load('lib/utils/bail-availability.ts');
    assert(availability.newBailAvailability([{ id: 'x', status: 'SIGNED', paidAt: new Date(), endDate: null, effectiveDate: null, bailType: 'BAIL_NU_3_ANS' }]));
    const notaire = await tx.user.create({ data: { email: crypto.randomUUID() + '@example.invalid', role: 'NOTAIRE', emailVerified: true } });
    await tx.dossierNotaireAssignment.create({ data: { clientId: f.owner.id, propertyId: f.property.id, bailId: f.bail.id, notaireId: notaire.id, assignedById: f.admin.id } });
    const agreement = r.load('lib/bail/agreement-terms.ts');
    assert.equal(agreement.agreementTerms({ bailFamily: 'HABITATION', bailType: 'BAIL_NU_3_ANS', rentAmount: 600, monthlyCharges: 50, securityDeposit: 600, effectiveDate: null, endDate: null }).effectiveDate, null);
  });

  await test('Accord du locataire : une date d’effet saisie après son accord le rend à renouveler', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { effectiveDate: null, paymentDay: null } });
    await r.load('lib/bail/tenant-agreement.ts').recordTenantAgreement(r.db, f.bail.id, f.tenant.id, new Date('2026-11-10T10:00:00Z'));
    const res = await r.load('lib/actions/admin-bail-edit.ts').updateBailTermsAdmin({ bailId: f.bail.id, values: { effectiveDate: '2027-01-01', paymentDay: '5' } });
    assert(res.success, res.error);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.tenantConfirmedTermsAt, null);
    assert(bail.tenantReconfirmationRequestedAt);
  });
});
