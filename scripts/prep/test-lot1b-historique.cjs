// Lot 1 — paiements historiques : périmètre fermé, vérification individuelle, règle commune « payé ».
const path = require('path');
const { test, suite, assert } = require('./harness.cjs');

const actions = (r) => r.load('lib/actions/historical-payments.ts');
const paid = (r) => r.load('lib/payments/paid.ts');
const leases = (r) => r.load('lib/actions/leases.ts');
const list = (tx, f) => tx.historicalPaymentReview.create({ data: { bailId: f.bail.id } });
const withReview = (tx, f) => tx.bail.findUnique({ where: { id: f.bail.id }, include: { historicalPayment: true } });

suite('Lot 1 — paiements historiques', path.join(__dirname, '../../reports/prep/tests-lot1b-historique.json'), async () => {
  await test('Dossier hors liste (nouveau dossier compris) : impossible de le confirmer à la main', async (tx, r, f) => {
    const res = await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement du 12/03' });
    assert.equal(res.success, false);
    assert.match(res.error, /ne fait pas partie/);
    assert.equal(await tx.historicalPaymentReview.count({ where: { bailId: f.bail.id } }), 0, 'la liste ne doit pas s’étendre');
    assert.equal(paid(r).isBailPaid(await withReview(tx, f)), false);
  });

  await test('Dossier listé non confirmé : reste non payé partout, envoi au notaire refusé', async (tx, r, f) => {
    await list(tx, f);
    const bail = await withReview(tx, f);
    assert.equal(paid(r).isBailPaid(bail), false);
    const res = await r.load('lib/actions/admin-bail.ts').validateAndSendToNotary({ bailId: f.bail.id });
    assert.equal(res.success, false);
    assert.match(res.error, /payés/);
    assert.equal(await tx.bail.count({ where: { id: f.bail.id, ...paid(r).UNPAID_WHERE } }), 1);
    assert.equal(await tx.bail.count({ where: { id: f.bail.id, ...paid(r).PAID_WHERE } }), 0);
  });

  await test('Confirmation sans date connue : payé, aucune date inventée, identité et preuve enregistrées', async (tx, r, f) => {
    await list(tx, f);
    const res = await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Stripe ch_3Pabc — relevé de mars', note: 'Rapproché avec la comptabilité' });
    assert(res.success, res.error);
    const bail = await withReview(tx, f);
    assert.equal(bail.paidAt, null, 'aucune date de paiement ne doit être écrite sur le bail');
    assert.equal(bail.historicalPayment.status, 'CONFIRMED');
    assert.equal(bail.historicalPayment.paymentDate, null);
    assert.equal(bail.historicalPayment.verifiedById, f.admin.id);
    assert(bail.historicalPayment.verifiedAt);
    assert.match(bail.historicalPayment.proofReference, /ch_3Pabc/);
    const p = paid(r);
    assert.equal(p.isBailPaid(bail), true);
    assert.equal(p.paymentKind(bail), 'historical');
    assert.equal(p.knownPaymentDate(bail), null);
    assert.equal(p.isHistoricalWithoutDate(bail), true);
    assert.equal(await tx.bail.count({ where: { id: f.bail.id, ...p.PAID_WHERE } }), 1);
    assert.equal(await tx.bail.count({ where: { id: f.bail.id, ...p.UNPAID_WHERE } }), 0);
    assert.equal(await tx.bailAuditLog.count({ where: { bailId: f.bail.id, eventType: 'PAYMENT_RECEIVED' } }), 0, 'pas de « paiement reçu » daté d’aujourd’hui dans l’historique');
  });

  await test('Confirmation avec date connue : la date réelle est conservée à part', async (tx, r, f) => {
    await list(tx, f);
    await tx.bail.update({ where: { id: f.bail.id }, data: { createdAt: new Date('2026-03-01') } });
    const res = await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement SEPA', paymentDate: '2026-03-12' });
    assert(res.success, res.error);
    const bail = await withReview(tx, f);
    assert.equal(bail.paidAt, null);
    assert.equal(paid(r).knownPaymentDate(bail).toISOString().slice(0, 10), '2026-03-12');
    assert.equal(paid(r).isHistoricalWithoutDate(bail), false);
  });

  await test('Preuve obligatoire, date future refusée, rôle administrateur exigé', async (tx, r, f) => {
    await list(tx, f);
    assert.equal((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: ' ' })).success, false);
    assert.equal((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement', paymentDate: '2099-01-01' })).success, false);
    r.state.user = f.ownerUser;
    await assert.rejects(() => actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement' }), /Forbidden|Unauthorized|autoris/i);
    assert.equal((await withReview(tx, f)).historicalPayment.status, 'PENDING');
  });

  await test('Aucun paiement retrouvé : enregistré, le dossier reste non payé', async (tx, r, f) => {
    await list(tx, f);
    assert.equal((await actions(r).rejectHistoricalPayment({ bailId: f.bail.id, note: '' })).success, false);
    const res = await actions(r).rejectHistoricalPayment({ bailId: f.bail.id, note: 'Rien dans Stripe ni en banque' });
    assert(res.success, res.error);
    const bail = await withReview(tx, f);
    assert.equal(bail.historicalPayment.status, 'REJECTED');
    assert.equal(paid(r).isBailPaid(bail), false);
  });

  await test('Confirmation rejouée : sans effet ; dossier déjà payé par Stripe : refus', async (tx, r, f) => {
    await list(tx, f);
    assert((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement A' })).success);
    const first = (await withReview(tx, f)).historicalPayment;
    assert((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Autre preuve' })).success);
    const second = (await withReview(tx, f)).historicalPayment;
    assert.equal(second.proofReference, 'Virement A');
    assert.equal(second.verifiedAt.getTime(), first.verifiedAt.getTime());
    await tx.historicalPaymentReview.update({ where: { bailId: f.bail.id }, data: { status: 'PENDING' } });
    await tx.bail.update({ where: { id: f.bail.id }, data: { paidAt: new Date('2026-05-01') } });
    assert.equal((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement' })).success, false);
  });

  await test('Listes et compteurs de l’équipe : le dossier confirmé compte parmi les payés', async (tx, r, f) => {
    await list(tx, f);
    const before = await leases(r).getLeasePaymentCounts ? await leases(r).getLeasePaymentCounts({}) : null;
    assert((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement A' })).success);
    if (before) {
      const after = await leases(r).getLeasePaymentCounts({});
      assert.equal(after.paid, before.paid + 1);
      assert.equal(after.unpaid, before.unpaid - 1);
      assert.equal(after.total, before.total);
    }
    const paidList = await leases(r).getLeases({ payment: 'paid', pageSize: 500 });
    const row = paidList.data.find((b) => b.id === f.bail.id);
    assert(row, 'le dossier confirmé manque dans le filtre « payés »');
    assert.equal(row.paid, 'historical');
    const unpaidList = await leases(r).getLeases({ payment: 'unpaid', pageSize: 500 });
    assert(!unpaidList.data.some((b) => b.id === f.bail.id));
  });

  await test('Dossier confirmé : le refus d’envoi au notaire ne porte plus sur le paiement', async (tx, r, f) => {
    await list(tx, f);
    assert((await actions(r).confirmHistoricalPayment({ bailId: f.bail.id, proofReference: 'Virement A' })).success);
    const res = await r.load('lib/actions/admin-bail.ts').validateAndSendToNotary({ bailId: f.bail.id });
    if (!res.success) assert.doesNotMatch(res.error, /payés/);
  });
});
