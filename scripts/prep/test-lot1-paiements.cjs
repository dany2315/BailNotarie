// Lot 1 — paiements : vérification serveur, erreurs et interruptions, webhook, réutilisation, reprise.
// Stripe est simulé (harness.cjs) : aucun appel réel, aucun débit.
const path = require('path');
const { test, suite, assert, crypto } = require('./harness.cjs');

const HAB = 3990, COM = 5990;
const route = async (r, token) =>
  r.load('app/api/stripe/create-payment-intent/route.ts').POST(
    new Request('http://localhost:3000/api/stripe/create-payment-intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }),
  );
const bailRoute = async (r) =>
  r.load('app/api/stripe/create-payment-intent-bail/route.ts').POST(new Request('http://localhost:3000/api/stripe/create-payment-intent-bail', { method: 'POST' }));
const pay = (r) => r.load('lib/payments/dossier-payment.ts');
const hook = (r) => r.load('lib/payments/webhook.ts');
const audits = (tx, bailId) => tx.bailAuditLog.count({ where: { bailId, eventType: 'PAYMENT_RECEIVED' } });
const unpaid = (tx, f) => tx.bail.update({ where: { id: f.bail.id }, data: { paidAt: null, stripePaymentIntentId: null } });

/** Ordre de paiement simulé, créé pour le lien (intake) du scénario. */
function intent(r, f, over = {}) {
  const id = over.id || 'pi_test_' + crypto.randomBytes(5).toString('hex');
  const it = {
    id, status: 'succeeded', amount: HAB, amount_received: HAB, currency: 'eur', client_secret: id + '_secret', receipt_email: 'payeur@example.invalid',
    metadata: { intakeLinkId: f.intake.id, token: f.intake.token },
    latest_charge: { id: 'ch_test', created: Math.floor(new Date('2026-11-12T09:30:00Z').getTime() / 1000) },
    ...over,
  };
  if (it.status !== 'succeeded') { it.amount_received = 0; it.latest_charge = null; }
  r.state.stripe.intents[id] = it;
  return it;
}
const userIntent = (r, f, user, over = {}) => intent(r, f, { metadata: { userId: user.id, source: 'client_bail_creation' }, ...over });
const linkIntake = (tx, f, id) => tx.intakeLink.update({ where: { id: f.intake.id }, data: { stripePaymentIntentId: id } });
const event = (it, type, created, id) => JSON.stringify({ id: id || 'evt_' + crypto.randomBytes(5).toString('hex'), type, created: Math.floor(new Date(created).getTime() / 1000), data: { object: { ...it, latest_charge: typeof it.latest_charge === 'object' && it.latest_charge ? it.latest_charge.id : it.latest_charge } } });
const SIG = 'valid:whsec_test';

suite('Lot 1 — paiements', path.join(__dirname, '../../reports/prep/tests-lot1-paiements.json'), async () => {
  /* ---------- Préparation du paiement : aucune seconde tentative sur un état incertain ---------- */

  await test('Anomalie 3 de l’audit — paiement « processing » + erreur de mise à jour : aucun nouvel ordre, référence conservée', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailFamily: 'COMMERCIAL' } });
    const it = intent(r, f, { status: 'processing' });
    await linkIntake(tx, f, it.id);
    r.state.stripe.failUpdate = true;
    const res = await route(r, f.intake.token);
    const body = await res.json();
    assert.equal(r.state.stripe.created, 0, 'un second ordre de paiement a été créé');
    assert.equal(body.state, 'processing');
    assert.equal(body.clientSecret, undefined, 'le client ne doit pas pouvoir repayer');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).stripePaymentIntentId, it.id);
    assert.equal(r.state.suppressed['stripe.update'] ?? 0, 0, 'un paiement en cours ne doit pas être modifié');
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } })).status, 'PROCESSING');
  });

  await test('Ordre non payé + changement de montant + erreur de mise à jour : 503, aucun nouvel ordre, référence conservée', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailFamily: 'COMMERCIAL' } });
    const it = intent(r, f, { status: 'requires_payment_method' });
    await linkIntake(tx, f, it.id);
    r.state.stripe.failUpdate = true;
    const res = await route(r, f.intake.token);
    assert.equal(res.status, 503);
    assert.equal(r.state.stripe.created, 0);
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).stripePaymentIntentId, it.id);
  });

  await test('Stripe injoignable (erreur réseau) : état inconnu, aucun nouvel ordre, référence conservée', async (tx, r, f) => {
    const it = intent(r, f, { status: 'requires_payment_method' });
    await linkIntake(tx, f, it.id);
    await route(r, f.intake.token); // premier passage : la ligne de suivi existe
    r.state.stripe.failRetrieve = true;
    const res = await route(r, f.intake.token);
    assert.equal(res.status, 503);
    assert.equal((await res.json()).state, 'unknown');
    assert.equal(r.state.stripe.created, 0);
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).stripePaymentIntentId, it.id);
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } })).status, 'UNKNOWN');
  });

  await test('Paiement confirmé + Stripe injoignable ensuite : la ligne reste « confirmé »', async (tx, r, f) => {
    const it = intent(r, f);
    await linkIntake(tx, f, it.id);
    assert.equal((await (await route(r, f.intake.token)).json()).alreadyPaid, true);
    r.state.stripe.failRetrieve = true;
    await route(r, f.intake.token);
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } })).status, 'SUCCEEDED');
  });

  await test('Ordre non payé, même montant : repris tel quel, rien de créé', async (tx, r, f) => {
    const it = intent(r, f, { status: 'requires_payment_method' });
    await linkIntake(tx, f, it.id);
    const body = await (await route(r, f.intake.token)).json();
    assert.equal(body.clientSecret, it.client_secret);
    assert.equal(r.state.stripe.created, 0);
  });

  await test('Passage d’habitation à commercial : même ordre, montant mis à jour', async (tx, r, f) => {
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailFamily: 'COMMERCIAL' } });
    const it = intent(r, f, { status: 'requires_payment_method' });
    await linkIntake(tx, f, it.id);
    const body = await (await route(r, f.intake.token)).json();
    assert.equal(body.clientSecret, it.client_secret);
    assert.equal(r.state.stripe.intents[it.id].amount, COM);
    assert.equal(r.state.stripe.created, 0);
  });

  await test('Paiement déjà réussi : poursuite sans repayer ; mauvais montant : blocage 409 sans nouvel ordre', async (tx, r, f) => {
    const it = intent(r, f);
    await linkIntake(tx, f, it.id);
    const ok = await (await route(r, f.intake.token)).json();
    assert.equal(ok.alreadyPaid, true);
    assert.equal(ok.paymentIntentId, it.id);
    await tx.bail.update({ where: { id: f.bail.id }, data: { bailFamily: 'COMMERCIAL' } });
    assert.equal((await route(r, f.intake.token)).status, 409);
    assert.equal(r.state.stripe.created, 0);
  });

  await test('Ordre annulé : une nouvelle tentative est créée (une seule)', async (tx, r, f) => {
    const it = intent(r, f, { status: 'canceled' });
    await linkIntake(tx, f, it.id);
    const body = await (await route(r, f.intake.token)).json();
    assert(body.clientSecret);
    assert.equal(r.state.stripe.created, 1);
    const stored = (await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).stripePaymentIntentId;
    assert.notEqual(stored, it.id);
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: stored } })).intakeLinkId, f.intake.id);
  });

  await test('Référence inconnue de Stripe : nouvel ordre créé et enregistré sur le dossier', async (tx, r, f) => {
    await linkIntake(tx, f, 'pi_inexistant');
    const body = await (await route(r, f.intake.token)).json();
    assert(body.clientSecret);
    assert.equal(r.state.stripe.created, 1);
  });

  await test('Double clic / requêtes simultanées : même clé d’idempotence, un seul ordre de paiement', async (tx, r, f) => {
    const first = await (await route(r, f.intake.token)).json();
    // Seconde requête partie avant que la première n'ait enregistré la référence (course simulée).
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { stripePaymentIntentId: null } });
    const second = await (await route(r, f.intake.token)).json();
    assert.equal(r.state.stripe.created, 1, 'deux ordres de paiement créés');
    assert.equal(first.clientSecret, second.clientSecret);
    assert.equal(new Set(r.state.stripe.keys).size, 1);
    assert.equal(await tx.dossierPayment.count({ where: { intakeLinkId: f.intake.id } }), 1);
  });

  await test('Course perdue : l’ordre en trop est annulé, celui du dossier est renvoyé', async (tx, r, f) => {
    // Pendant la création, une autre requête pose déjà un ordre de paiement sur le dossier.
    const winner = intent(r, f, { status: 'requires_payment_method' });
    const original = r.stripe.paymentIntents.create;
    r.stripe.paymentIntents.create = async (...args) => { const created = await original(...args); await linkIntake(tx, f, winner.id); return created; };
    const body = await (await route(r, f.intake.token)).json();
    assert.equal(body.clientSecret, winner.client_secret);
    assert.equal(r.state.suppressed['stripe.cancel'], 1);
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).stripePaymentIntentId, winner.id);
  });

  await test('Sans session, ou dossier déjà envoyé : refus sans rien créer', async (tx, r, f) => {
    r.state.user = null;
    assert.equal((await route(r, f.intake.token)).status, 401);
    r.state.user = f.ownerUser;
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { status: 'SUBMITTED' } });
    assert.equal((await route(r, f.intake.token)).status, 400);
    assert.equal(r.state.stripe.created, 0);
  });

  /* ---------- Vérification serveur commune ---------- */

  await test('Vérification : non réglé, mauvais montant, mauvaise devise, mauvais dossier, mauvais compte → refus', async (tx, r, f) => {
    const { verifyFeePayment } = pay(r);
    const expect = { amountCents: HAB, intakeLinkId: f.intake.id, intakeToken: f.intake.token };
    await assert.rejects(() => verifyFeePayment(intent(r, f, { status: 'processing' }).id, expect), /pas été confirmé/);
    await assert.rejects(() => verifyFeePayment(intent(r, f, { amount: 100, amount_received: 100 }).id, expect), /Montant/);
    await assert.rejects(() => verifyFeePayment(intent(r, f, { amount_received: 100 }).id, expect), /Montant/);
    await assert.rejects(() => verifyFeePayment(intent(r, f, { currency: 'usd' }).id, expect), /Devise/);
    await assert.rejects(() => verifyFeePayment(intent(r, f, { metadata: { intakeLinkId: 'autre', token: 'autre' } }).id, expect), /ne correspond pas à ce dossier/);
    await assert.rejects(() => verifyFeePayment(userIntent(r, f, f.tenantUser).id, { amountCents: HAB, userId: f.ownerUser.id }), /votre compte/);
    await assert.rejects(() => verifyFeePayment(intent(r, f).id, { amountCents: HAB }), /ne correspond pas/);
    await assert.rejects(() => verifyFeePayment('pi_inconnu', expect), /introuvable/);
    r.state.stripe.failRetrieve = true;
    await assert.rejects(() => verifyFeePayment(intent(r, f).id, expect), /n'a pas pu être vérifié/);
    r.state.stripe.failRetrieve = false;
    assert.equal((await verifyFeePayment(intent(r, f).id, expect)).status, 'succeeded');
  });

  await test('Rattachement : bail payé une fois, date réelle Stripe, une seule ligne d’historique ; rejeu sans effet', async (tx, r, f) => {
    const { attachPaymentToBail } = pay(r);
    const it = intent(r, f);
    const actor = { id: null, name: 'Test' };
    const first = await attachPaymentToBail(r.db, { intent: it, bailId: f.bail.id, actor });
    assert.equal(first.firstConfirmation, true);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.paidAt.toISOString(), '2026-11-12T09:30:00.000Z', 'la date de paiement doit être celle de Stripe');
    assert.equal(bail.stripePaymentIntentId, it.id);
    const row = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } });
    assert.equal(row.bailId, f.bail.id);
    assert.equal(row.stripePaidAt.toISOString(), '2026-11-12T09:30:00.000Z');
    assert(row.confirmedAt && row.confirmedAt.getTime() !== row.stripePaidAt.getTime(), 'date réelle et date d’enregistrement doivent rester distinctes');
    const replay = await attachPaymentToBail(r.db, { intent: it, bailId: f.bail.id, actor });
    assert.equal(replay.firstConfirmation, false);
    assert.equal(await audits(tx, f.bail.id), 1, 'doublon dans l’historique');
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).paidAt.toISOString(), '2026-11-12T09:30:00.000Z');
  });

  await test('Paiement déjà utilisé pour un autre dossier : refus (suivi récent et référence ancienne)', async (tx, r, f) => {
    const { attachPaymentToBail } = pay(r);
    const actor = { id: null, name: 'Test' };
    const other = await tx.bail.create({ data: { propertyId: f.property.id, rentAmount: 500, effectiveDate: new Date('2027-01-01'), status: 'AWAITING_TENANT', parties: { connect: [{ id: f.owner.id }] } } });
    const it = intent(r, f);
    await attachPaymentToBail(r.db, { intent: it, bailId: f.bail.id, actor });
    await assert.rejects(() => attachPaymentToBail(r.db, { intent: it, bailId: other.id, actor }), /déjà été utilisé/);
    assert.equal((await tx.bail.findUnique({ where: { id: other.id } })).paidAt, null);
    // Bail payé avant ce suivi : la référence n'est portée que par le bail.
    const legacy = intent(r, f);
    await tx.bail.update({ where: { id: other.id }, data: { paidAt: new Date('2026-06-01'), stripePaymentIntentId: legacy.id } });
    await unpaid(tx, f);
    await tx.dossierPayment.deleteMany({ where: { bailId: f.bail.id } });
    await assert.rejects(() => attachPaymentToBail(r.db, { intent: legacy, bailId: f.bail.id, actor }), /déjà été utilisé/);
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).paidAt, null);
  });

  await test('Bail déjà payé par un autre paiement : le second n’écrase rien et reste signalé à l’équipe', async (tx, r, f) => {
    const { attachPaymentToBail } = pay(r);
    const actor = { id: null, name: 'Test' };
    const a = intent(r, f), b = intent(r, f);
    await attachPaymentToBail(r.db, { intent: a, bailId: f.bail.id, actor });
    const second = await attachPaymentToBail(r.db, { intent: b, bailId: f.bail.id, actor });
    assert.equal(second.firstConfirmation, false);
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).stripePaymentIntentId, a.id);
    const row = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: b.id } });
    assert.equal(row.bailId, null);
    assert.match(row.lastError, /déjà payé/);
    assert.equal(await audits(tx, f.bail.id), 1);
  });

  /* ---------- Actions serveur appelables directement ---------- */

  await test('createLease appelée directement avec le paiement d’un autre compte, non réglé ou inventé : refus, rien de payé', async (tx, r, f) => {
    r.state.user = f.ownerUser;
    const leases = r.load('lib/actions/leases.ts');
    const data = { propertyId: f.property.id, leaseType: 'HABITATION', bailType: 'BAIL_NU_3_ANS', rentAmount: '600', monthlyCharges: '50', securityDeposit: '600', effectiveDate: '2027-02-01', paymentDay: '5', status: 'DRAFT' };
    await tx.bail.update({ where: { id: f.bail.id }, data: { status: 'TERMINATED', endDate: new Date('2026-01-01') } });
    const before = await tx.bail.count();
    await assert.rejects(() => leases.createLease(data, userIntent(r, f, f.tenantUser).id), /votre compte/);
    await assert.rejects(() => leases.createLease(data, userIntent(r, f, f.ownerUser, { status: 'processing' }).id), /pas été confirmé/);
    await assert.rejects(() => leases.createLease(data, 'pi_invente'), /introuvable/);
    await assert.rejects(() => leases.createLease(data, intent(r, f).id), /votre compte/);
    assert.equal(await tx.bail.count(), before, 'un bail a été créé malgré le refus');
  });

  await test('createLease avec paiement valide : bail payé, historique unique ; rejeu du même paiement : refus sans second bail', async (tx, r, f) => {
    r.state.user = f.ownerUser;
    const leases = r.load('lib/actions/leases.ts');
    const data = { propertyId: f.property.id, leaseType: 'HABITATION', bailType: 'BAIL_NU_3_ANS', rentAmount: '600', monthlyCharges: '50', securityDeposit: '600', effectiveDate: '2027-02-01', paymentDay: '5', status: 'DRAFT' };
    await tx.bail.update({ where: { id: f.bail.id }, data: { status: 'TERMINATED', endDate: new Date('2026-01-01') } });
    const it = userIntent(r, f, f.ownerUser);
    const created = await leases.createLease(data, it.id);
    const bail = await tx.bail.findUnique({ where: { id: created.id } });
    assert(bail.paidAt);
    assert.equal(bail.stripePaymentIntentId, it.id);
    assert.equal(await audits(tx, bail.id), 1);
    const count = await tx.bail.count();
    await tx.bail.update({ where: { id: created.id }, data: { status: 'TERMINATED', endDate: new Date('2026-01-01') } });
    await assert.rejects(() => leases.createLease(data, it.id), /déjà été utilisé/);
    assert.equal(await tx.bail.count(), count, 'un second bail a été créé avec le même paiement');
  });

  await test('Espace client : rouvrir l’écran de paiement reprend le même ordre ; déjà payé non rattaché : poursuite sans repayer', async (tx, r, f) => {
    r.state.user = f.ownerUser;
    const a = await (await bailRoute(r)).json();
    const b = await (await bailRoute(r)).json();
    assert.equal(a.clientSecret, b.clientSecret);
    assert.equal(r.state.stripe.created, 1);
    const id = Object.keys(r.state.stripe.intents)[0];
    r.state.stripe.intents[id].status = 'processing';
    const c = await (await bailRoute(r)).json();
    assert.equal(c.state, 'processing');
    assert.equal(c.clientSecret, undefined);
    Object.assign(r.state.stripe.intents[id], { status: 'succeeded', amount_received: HAB });
    const d = await (await bailRoute(r)).json();
    assert.equal(d.alreadyPaid, true);
    assert.equal(d.paymentIntentId, id);
    assert.equal(r.state.stripe.created, 1);
    r.state.user = null;
    assert.equal((await bailRoute(r)).status, 401);
  });

  /* ---------- Formulaire propriétaire (submitOwnerForm appelée directement) ---------- */

  const ownerPayload = async (tx, f) => {
    const person = await tx.person.findFirst({ where: { clientId: f.owner.id } });
    // Pièces obligatoires du formulaire (fichiers fictifs : aucun envoi S3).
    await tx.document.createMany({ data: [
      { kind: 'ID_IDENTITY', fileKey: 'documents/test-id', personId: person.id },
      { kind: 'DIAGNOSTICS', fileKey: 'documents/test-diag', propertyId: f.property.id },
      { kind: 'TITLE_DEED', fileKey: 'documents/test-titre', propertyId: f.property.id },
    ] });
    return {
      clientId: f.owner.id, type: 'PERSONNE_PHYSIQUE', email: person.email,
      persons: [{ firstName: 'Test', lastName: 'Proprietaire', email: person.email, phone: '+33612345678', fullAddress: '1 rue de Test, 75001 Paris', nationality: 'Française', profession: 'Test', familyStatus: 'CELIBATAIRE', birthPlace: 'Paris', birthDate: new Date('1980-01-01') }],
      propertyFullAddress: 'TEST — bien synthétique', propertySurfaceM2: '40', propertyType: 'APPARTEMENT', propertyLegalStatus: 'PLEIN_PROPRIETE', propertyLatitude: '', propertyLongitude: '',
      bailType: 'BAIL_NU_3_ANS', bailFamily: 'HABITATION', bailRentAmount: '600', bailMonthlyCharges: '50', bailSecurityDeposit: '600', bailEffectiveDate: '2026-12-01', bailPaymentDay: '5',
    };
  };
  const submitOwner = (r, payload, id) => r.load('lib/actions/clients.ts').submitOwnerForm(payload, id);

  await test('submitOwnerForm appelée directement avec un identifiant inventé, non réglé, d’un autre dossier ou d’un autre montant : refus, dossier non payé', async (tx, r, f) => {
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    await assert.rejects(() => submitOwner(r, payload, 'pi_invente'), /introuvable/);
    await assert.rejects(() => submitOwner(r, payload, intent(r, f, { status: 'processing' }).id), /pas été confirmé/);
    await assert.rejects(() => submitOwner(r, payload, intent(r, f, { metadata: { intakeLinkId: 'autre', token: 'autre' } }).id), /ne correspond pas à ce dossier/);
    await assert.rejects(() => submitOwner(r, payload, intent(r, f, { amount: 100, amount_received: 100 }).id), /Montant/);
    await assert.rejects(() => submitOwner(r, { ...payload, bailFamily: 'COMMERCIAL', bailType: 'COMMERCIAL_3_6_9' }, intent(r, f).id), /Montant|commercial|requis|invalid/i);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.paidAt, null);
    assert.equal(bail.stripePaymentIntentId, null);
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING');
    assert.equal(await audits(tx, f.bail.id), 0);
  });

  await test('submitOwnerForm avec paiement vérifié : bail payé à la date Stripe, une ligne d’historique, formulaire envoyé', async (tx, r, f) => {
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    const it = intent(r, f);
    await submitOwner(r, payload, it.id);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.paidAt.toISOString(), '2026-11-12T09:30:00.000Z');
    assert.equal(bail.stripePaymentIntentId, it.id);
    assert.equal(await audits(tx, f.bail.id), 1);
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'SUBMITTED');
    const row = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } });
    assert.equal(row.bailId, f.bail.id);
    assert.equal(row.intakeLinkId, f.intake.id);
  });

  await test('Reprise — paiement réussi et bail créé, puis panne avant la fin de l’envoi : le nouvel essai reprend le même bail, sans doublon ni second paiement', async (tx, r, f) => {
    const payload = await ownerPayload(tx, f);
    r.state.user = f.ownerUser;
    // État laissé par la panne : le bail existe et porte le paiement, mais le formulaire n'est pas marqué
    // envoyé et le lien n'a pas encore reçu la référence du bail.
    const it = intent(r, f);
    await pay(r).attachPaymentToBail(r.db, { intent: it, bailId: f.bail.id, link: { intakeLinkId: f.intake.id }, actor: { id: null, name: 'Propriétaire (formulaire)' } });
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { bailId: null, stripePaymentIntentId: it.id } });
    const bails = await tx.bail.count();
    // Le client revient : la page de paiement le laisse poursuivre sans repayer…
    const back = await (await route(r, f.intake.token)).json();
    assert.equal(back.alreadyPaid, true);
    assert.equal(r.state.stripe.created, 0);
    // … et le nouvel envoi termine le dossier sur le même bail.
    await submitOwner(r, payload, it.id);
    assert.equal(await tx.bail.count(), bails, 'un second bail a été créé à la reprise');
    const intake = await tx.intakeLink.findUnique({ where: { id: f.intake.id } });
    assert.equal(intake.status, 'SUBMITTED');
    assert.equal(intake.bailId, f.bail.id);
    assert.equal(await audits(tx, f.bail.id), 1, 'doublon « paiement reçu » à la reprise');
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).paidAt.toISOString(), '2026-11-12T09:30:00.000Z');
  });

  await test('Formulaire propriétaire sans locataire : le paiement reste possible (statut « en attente du locataire »)', async (tx, r, f) => {
    const payload = await ownerPayload(tx, f);
    await tx.bail.update({ where: { id: f.bail.id }, data: { parties: { set: [{ id: f.owner.id }] }, status: 'DRAFT' } });
    r.state.user = f.ownerUser;
    await submitOwner(r, payload, intent(r, f).id);
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert(bail.paidAt);
    assert.equal(bail.status, 'AWAITING_TENANT');
  });

  /* ---------- Webhook ---------- */

  await test('Webhook : signature invalide ou absente → 400 ; secret non configuré → 500 ; rien d’écrit', async (tx, r, f) => {
    const it = intent(r, f);
    const raw = event(it, 'payment_intent.succeeded', '2026-11-12T09:30:05Z');
    assert.equal((await hook(r).handleStripeWebhook(raw, 'faux')).status, 400);
    assert.equal((await hook(r).handleStripeWebhook(raw, null)).status, 400);
    delete r.state.env.STRIPE_WEBHOOK_SECRET;
    assert.equal((await hook(r).handleStripeWebhook(raw, SIG)).status, 500);
    assert.equal(await tx.stripeWebhookEvent.count(), 0);
    assert.equal(await tx.dossierPayment.count({ where: { stripePaymentIntentId: it.id } }), 0);
  });

  await test('Webhook — page fermée après un paiement réussi, formulaire pas encore envoyé : preuve conservée, rien d’autre ne bouge', async (tx, r, f) => {
    await unpaid(tx, f);
    const it = intent(r, f);
    await linkIntake(tx, f, it.id);
    const res = await hook(r).handleStripeWebhook(event(it, 'payment_intent.succeeded', '2026-11-12T09:30:05Z'), SIG);
    assert.equal(res.status, 200);
    const row = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } });
    assert.equal(row.status, 'SUCCEEDED');
    assert.equal(row.intakeLinkId, f.intake.id);
    assert.equal(row.bailId, null, 'le paiement doit attendre l’envoi du formulaire');
    assert.equal(row.stripePaidAt.toISOString(), '2026-11-12T09:30:05.000Z');
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.paidAt, null);
    assert.equal(bail.status, 'PENDING_VALIDATION', 'le webhook ne change pas le statut');
    assert.equal((await tx.intakeLink.findUnique({ where: { id: f.intake.id } })).status, 'PENDING', 'le webhook n’envoie pas le formulaire');
    assert.equal(await tx.dossierNotaireAssignment.count({ where: { bailId: f.bail.id } }), 0);
    assert.deepEqual(Object.keys(r.state.suppressed).filter((k) => !k.startsWith('stripe.')), [], 'aucune notification ni e-mail');
    // Le client revient : il poursuit sans repayer.
    r.state.user = f.ownerUser;
    const back = await (await route(r, f.intake.token)).json();
    assert.equal(back.alreadyPaid, true);
    assert.equal(r.state.stripe.created, 0);
  });

  await test('Webhook — formulaire déjà envoyé : paiement rattaché une fois ; événement rejoué : aucun doublon', async (tx, r, f) => {
    await unpaid(tx, f);
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { status: 'SUBMITTED' } });
    const it = intent(r, f);
    const raw = event(it, 'payment_intent.succeeded', '2026-11-12T09:30:05Z', 'evt_unique');
    assert.equal((await hook(r).handleStripeWebhook(raw, SIG)).body.outcome, 'rattaché au bail');
    const bail = await tx.bail.findUnique({ where: { id: f.bail.id } });
    assert.equal(bail.paidAt.toISOString(), '2026-11-12T09:30:05.000Z');
    assert.equal(bail.status, 'PENDING_VALIDATION');
    const again = await hook(r).handleStripeWebhook(raw, SIG);
    assert.equal(again.body.duplicate, true);
    // Même paiement annoncé par un autre événement (renvoi Stripe avec un nouvel identifiant).
    await hook(r).handleStripeWebhook(event(it, 'payment_intent.succeeded', '2026-11-12T09:31:00Z'), SIG);
    assert.equal(await audits(tx, f.bail.id), 1);
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).paidAt.toISOString(), '2026-11-12T09:30:05.000Z');
    assert.equal(await tx.dossierNotaireAssignment.count({ where: { bailId: f.bail.id } }), 0, 'le webhook n’envoie pas au notaire');
  });

  await test('Webhook — événements dans le désordre : « en cours » reçu après « réussi » ne fait pas régresser', async (tx, r, f) => {
    const it = intent(r, f);
    await hook(r).handleStripeWebhook(event(it, 'payment_intent.succeeded', '2026-11-12T09:30:05Z'), SIG);
    const older = await hook(r).handleStripeWebhook(event({ ...it, status: 'processing' }, 'payment_intent.processing', '2026-11-12T09:30:00Z'), SIG);
    assert.match(older.body.outcome, /ignoré/);
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it.id } })).status, 'SUCCEEDED');
    // Échec plus récent que « en cours », puis « en cours » plus ancien : l'état le plus récent est gardé.
    const it2 = intent(r, f, { status: 'requires_payment_method', last_payment_error: { message: 'Carte refusée' } });
    await hook(r).handleStripeWebhook(event(it2, 'payment_intent.payment_failed', '2026-11-12T10:00:10Z'), SIG);
    await hook(r).handleStripeWebhook(event({ ...it2, status: 'processing' }, 'payment_intent.processing', '2026-11-12T10:00:00Z'), SIG);
    const row2 = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it2.id } });
    assert.equal(row2.status, 'FAILED');
    assert.equal(row2.lastError, 'Carte refusée');
    // Une confirmation arrive ensuite : toujours prise en compte.
    await hook(r).handleStripeWebhook(event({ ...it2, status: 'succeeded', amount_received: HAB }, 'payment_intent.succeeded', '2026-11-12T10:05:00Z'), SIG);
    assert.equal((await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: it2.id } })).status, 'SUCCEEDED');
  });

  await test('Webhook — montant inattendu ou paiement étranger : jamais rattaché', async (tx, r, f) => {
    await unpaid(tx, f);
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { status: 'SUBMITTED' } });
    const wrong = intent(r, f, { amount: 100, amount_received: 100 });
    const res = await hook(r).handleStripeWebhook(event(wrong, 'payment_intent.succeeded', '2026-11-12T09:30:05Z'), SIG);
    assert.match(res.body.outcome, /non rattaché/);
    assert.equal((await tx.bail.findUnique({ where: { id: f.bail.id } })).paidAt, null);
    const foreign = intent(r, f, { metadata: {} });
    const res2 = await hook(r).handleStripeWebhook(event(foreign, 'payment_intent.succeeded', '2026-11-12T09:30:05Z'), SIG);
    assert.equal(res2.body.ignored, 'paiement étranger');
    assert.equal(await tx.dossierPayment.count({ where: { stripePaymentIntentId: foreign.id } }), 0);
  });

  await test('Webhook — panne pendant le traitement : l’événement renvoyé par Stripe est repris jusqu’au bout', async (tx, r, f) => {
    await unpaid(tx, f);
    await tx.intakeLink.update({ where: { id: f.intake.id }, data: { status: 'SUBMITTED' } });
    const it = intent(r, f);
    const raw = event(it, 'payment_intent.succeeded', '2026-11-12T09:30:05Z', 'evt_panne');
    // Événement reçu puis panne avant la fin : la ligne existe sans « traité le ».
    await tx.stripeWebhookEvent.create({ data: { id: 'evt_panne', type: 'payment_intent.succeeded', paymentIntentId: it.id } });
    const res = await hook(r).handleStripeWebhook(raw, SIG);
    assert.equal(res.body.outcome, 'rattaché au bail');
    assert((await tx.stripeWebhookEvent.findUnique({ where: { id: 'evt_panne' } })).processedAt);
    assert.equal(await audits(tx, f.bail.id), 1);
  });

  /* ---------- Envoi au notaire ---------- */

  await test('Dossier non payé : envoi au notaire refusé', async (tx, r, f) => {
    await unpaid(tx, f);
    const res = await r.load('lib/actions/admin-bail.ts').validateAndSendToNotary({ bailId: f.bail.id });
    assert.equal(res.success, false);
    assert.match(res.error, /payés/);
    assert.equal(await tx.dossierNotaireAssignment.count({ where: { bailId: f.bail.id } }), 0);
  });
});
