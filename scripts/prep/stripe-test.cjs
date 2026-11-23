// Paiements Stripe en mode TEST pour la recette (jamais de clé réelle : refus si la clé n'est pas sk_test_).
// Remplace la saisie de la carte dans le cadre Stripe, inaccessible au navigateur de recette.
//
//   node scripts/prep/stripe-test.cjs status  <jeton du formulaire | pi_…>
//   node scripts/prep/stripe-test.cjs pay     <jeton | pi_…> [moyen de paiement de test, défaut pm_card_visa]
//   node scripts/prep/stripe-test.cjs count   <jeton>          nombre d'ordres de paiement Stripe de ce dossier
//   node scripts/prep/stripe-test.cjs webhook <pi_…> [type]    envoie au serveur local un événement signé
process.env.PREP_ENV = 'recette';
const { env } = require('./isolated-env.cjs');
const { client } = require('./db.cjs');
const Stripe = require('stripe');
if (!env.STRIPE_SECRET_KEY.startsWith('sk_test_')) throw Error('clé de test exigée');
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const short = (pi) => ({
  id: pi.id.slice(0, 10) + '…', statut: pi.status, montant: pi.amount, recu: pi.amount_received, devise: pi.currency,
  modeTest: pi.livemode === false, dossier: !!(pi.metadata && (pi.metadata.intakeLinkId || pi.metadata.userId)),
  erreur: pi.last_payment_error ? pi.last_payment_error.code : null,
});

async function resolve(ref) {
  if (ref.startsWith('pi_')) return { id: ref, intake: null };
  const prisma = client();
  try {
    const intake = await prisma.intakeLink.findUnique({ where: { token: ref }, select: { id: true, status: true, stripePaymentIntentId: true, bailId: true } });
    if (!intake) throw Error('formulaire introuvable');
    return { id: intake.stripePaymentIntentId, intake };
  } finally { await prisma.$disconnect(); }
}

(async () => {
  const [mode, ref, extra] = process.argv.slice(2);
  const target = await resolve(ref);
  if (mode === 'count') {
    const list = await stripe.paymentIntents.list({ limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 6 * 3600 } });
    const mine = list.data.filter((pi) => pi.metadata && pi.metadata.intakeLinkId === target.intake.id);
    console.log(JSON.stringify({ ordresDePaiement: mine.length, statuts: mine.map((pi) => pi.status) }));
    return;
  }
  if (!target.id) throw Error('aucun ordre de paiement enregistré sur ce dossier');
  if (mode === 'status') {
    console.log(JSON.stringify({ ...short(await stripe.paymentIntents.retrieve(target.id)), formulaire: target.intake && target.intake.status }));
  } else if (mode === 'pay') {
    try {
      const pi = await stripe.paymentIntents.confirm(target.id, { payment_method: extra || 'pm_card_visa', return_url: 'http://localhost:3210/' });
      console.log(JSON.stringify(short(pi)));
    } catch (e) {
      const pi = e.payment_intent || (await stripe.paymentIntents.retrieve(target.id));
      console.log(JSON.stringify({ refuse: e.code || e.type, ...short(pi) }));
    }
  } else if (mode === 'webhook') {
    const pi = await stripe.paymentIntents.retrieve(target.id);
    const type = extra || 'payment_intent.succeeded';
    const payload = JSON.stringify({ id: 'evt_recette_' + Date.now(), object: 'event', type, created: Math.floor(Date.now() / 1000), livemode: false, data: { object: pi } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_WEBHOOK_SECRET });
    const send = async (signature) => { const res = await fetch('http://localhost:3210/api/stripe/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', 'stripe-signature': signature }, body: payload }); return { http: res.status, reponse: await res.json() }; };
    console.log(JSON.stringify({ signatureInvalide: await send('t=1,v1=faux'), premierEnvoi: await send(header), rejeu: await send(header) }));
  } else throw Error('mode inconnu');
})().catch((e) => { console.error(e.message); process.exit(1); });
