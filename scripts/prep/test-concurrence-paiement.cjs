// Concurrence réelle : deux connexions tentent en même temps de rattacher LE MÊME paiement à deux baux.
// Contrairement aux autres suites, les données synthétiques sont réellement écrites (il faut deux
// transactions distinctes), puis supprimées ; l'empreinte de toutes les tables est comparée avant/après.
const fs = require('fs'), path = require('path');
const { assert, prisma, crypto, runtime, snapshot } = require('./harness.cjs');

const MARK = 'TEST-CONCURRENCE-' + crypto.randomBytes(4).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function seed() {
  const owner = await prisma.client.create({ data: { type: 'PERSONNE_PHYSIQUE', profilType: 'PROPRIETAIRE' } });
  const property = await prisma.property.create({ data: { ownerId: owner.id, fullAddress: MARK, surfaceM2: 30, type: 'APPARTEMENT' } });
  const mk = () => prisma.bail.create({ data: { propertyId: property.id, rentAmount: 500, effectiveDate: new Date('2027-01-01'), status: 'AWAITING_TENANT', parties: { connect: [{ id: owner.id }] } } });
  return { owner, property, bails: [await mk(), await mk()] };
}
async function cleanup(s, intentIds) {
  const bailIds = s.bails.map((b) => b.id);
  await prisma.dossierPayment.deleteMany({ where: { stripePaymentIntentId: { in: intentIds } } });
  await prisma.bailAuditLog.deleteMany({ where: { bailId: { in: bailIds } } });
  await prisma.bail.deleteMany({ where: { id: { in: bailIds } } });
  await prisma.property.delete({ where: { id: s.property.id } });
  await prisma.client.delete({ where: { id: s.owner.id } });
}

(async () => {
  const before = await snapshot();
  const s = await seed();
  const rounds = [], intentIds = [];
  try {
    for (let round = 0; round < 5; round++) {
      await prisma.bail.updateMany({ where: { id: { in: s.bails.map((b) => b.id) } }, data: { paidAt: null, stripePaymentIntentId: null } });
      await prisma.bailAuditLog.deleteMany({ where: { bailId: { in: s.bails.map((b) => b.id) } } });
      const id = 'pi_conc_' + crypto.randomBytes(5).toString('hex'); intentIds.push(id);
      const intent = { id, status: 'succeeded', amount: 3990, amount_received: 3990, currency: 'eur', metadata: { userId: 'u' }, latest_charge: { id: 'ch', created: 1794000000 } };
      const attempt = (bail, holdMs) => prisma.$transaction(async (tx) => {
        const r = runtime(tx);
        const out = await r.load('lib/payments/dossier-payment.ts').attachPaymentToBail(r.db, { intent, bailId: bail.id, actor: { id: null, name: 'Test concurrence' } });
        await sleep(holdMs); // garde la transaction ouverte pour que l'autre arrive pendant ce temps
        return out;
      }, { timeout: 30000, maxWait: 10000 }).then((v) => ({ ok: true, v }), (e) => ({ ok: false, name: e.name, code: e.code, message: String(e.message).slice(0, 120) }));
      const [a, b] = await Promise.all([attempt(s.bails[0], 400), attempt(s.bails[1], 400)]);
      const paid = await prisma.bail.findMany({ where: { id: { in: s.bails.map((x) => x.id) }, paidAt: { not: null } }, select: { id: true } });
      const logs = await prisma.bailAuditLog.count({ where: { bailId: { in: s.bails.map((x) => x.id) }, eventType: 'PAYMENT_RECEIVED' } });
      const row = await prisma.dossierPayment.findUnique({ where: { stripePaymentIntentId: id } });
      rounds.push({ round, winners: [a, b].filter((x) => x.ok).length, loser: [a, b].find((x) => !x.ok) || null, bailsPayes: paid.length, lignesHistorique: logs, rattacheA: row?.bailId ? 'un bail' : 'aucun' });
    }
  } finally {
    await cleanup(s, intentIds);
  }
  const after = await snapshot();
  const ok = rounds.every((r) => r.winners === 1 && r.bailsPayes === 1 && r.lignesHistorique === 1);
  const report = { createdAt: new Date().toISOString(), rounds, unSeulGagnantAChaqueFois: ok, baseRestauree: JSON.stringify(before) === JSON.stringify(after) };
  fs.writeFileSync(path.join(__dirname, '../../reports/prep/tests-concurrence-paiement.json'), JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1));
  await prisma.$disconnect();
  if (!ok || !report.baseRestauree) process.exitCode = 1;
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
