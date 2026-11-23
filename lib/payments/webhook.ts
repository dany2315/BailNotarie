import type Stripe from "stripe";
import { DossierPaymentStatus, IntakeStatus } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { dossierFeeCents } from "@/lib/utils/dossier-fee";
import { attachPaymentToBail, intentMismatch, paymentStatusOf, recordIntent, PaymentAlreadyUsedError } from "@/lib/payments/dossier-payment";

/**
 * Confirmation des paiements par Stripe (webhook), indépendante du navigateur du client : si la page est
 * fermée après un paiement réussi, la preuve du paiement est quand même enregistrée et rattachée au
 * dossier (lien du formulaire ou compte).
 *
 * Ce que le webhook ne fait jamais : envoyer un formulaire inachevé, valider des pièces, changer le statut
 * d'un bail ou l'envoyer au notaire. Si le formulaire n'est pas encore envoyé, le paiement reste « confirmé,
 * en attente de rattachement » ; le client reprend son formulaire sans repayer.
 */

export type WebhookResult = { status: number; body: Record<string, unknown> };

const HANDLED = new Set([
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

/** Acteur des lignes d'historique écrites par le webhook. */
const WEBHOOK_ACTOR = { id: null, name: "Stripe (confirmation automatique)" };

export async function handleStripeWebhook(rawBody: string, signature: string | null): Promise<WebhookResult> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  // Sans secret, impossible de vérifier l'origine : on refuse (Stripe réessaiera une fois le secret configuré).
  if (!secret) return { status: 500, body: { error: "Webhook non configuré" } };
  if (!signature) return { status: 400, body: { error: "Signature manquante" } };

  let event: Stripe.Event;
  try {
    // La signature se vérifie sur le corps brut de la requête, tel que Stripe l'a envoyé.
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return { status: 400, body: { error: "Signature invalide" } };
  }

  if (!HANDLED.has(event.type)) return { status: 200, body: { received: true, ignored: event.type } };
  const intent = event.data.object as Stripe.PaymentIntent;
  const meta = intent.metadata ?? {};
  // Seuls les frais de dossier BailNotarie nous concernent (créés avec un lien de formulaire ou un compte).
  if (!meta.intakeLinkId && !meta.userId) return { status: 200, body: { received: true, ignored: "paiement étranger" } };

  // Un événement n'est traité qu'une fois. S'il avait été reçu mais pas mené au bout (panne), il est repris.
  const inserted = await prisma.stripeWebhookEvent.createMany({
    data: [{ id: event.id, type: event.type, paymentIntentId: intent.id }],
    skipDuplicates: true,
  });
  if (inserted.count === 0) {
    const prior = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id }, select: { processedAt: true } });
    if (prior?.processedAt) return { status: 200, body: { received: true, duplicate: true } };
  }

  const eventAt = new Date(event.created * 1000);
  const outcome = await prisma.$transaction(async (tx) => {
    const status = paymentStatusOf(intent);
    const existing = await tx.dossierPayment.findUnique({ where: { stripePaymentIntentId: intent.id } });

    // Événements reçus dans le désordre : un état plus ancien ne remplace pas un état plus récent, et rien
    // ne remplace un paiement confirmé. Une confirmation, elle, est toujours prise en compte.
    const stale = !!existing?.lastEventAt && existing.lastEventAt > eventAt && status !== DossierPaymentStatus.SUCCEEDED;
    let result = stale ? "ignoré (plus ancien que l'état connu)" : "enregistré";

    if (!stale) {
      const row = await recordIntent(tx, intent, {}, new Date());
      const failure = event.type === "payment_intent.payment_failed" ? intent.last_payment_error?.message ?? "Paiement refusé" : null;
      await tx.dossierPayment.update({
        where: { id: row.id },
        data: {
          lastEventAt: existing?.lastEventAt && existing.lastEventAt > eventAt ? existing.lastEventAt : eventAt,
          // Date réelle du paiement : celle de la confirmation par Stripe.
          ...(status === DossierPaymentStatus.SUCCEEDED && !row.stripePaidAt ? { stripePaidAt: eventAt } : {}),
          ...(row.status !== DossierPaymentStatus.SUCCEEDED && failure
            ? { status: DossierPaymentStatus.FAILED, lastError: failure.slice(0, 500) }
            : {}),
        },
      });
    }

    if (status === DossierPaymentStatus.SUCCEEDED) result = await attachIfSubmitted(tx, intent, eventAt);

    await tx.stripeWebhookEvent.update({ where: { id: event.id }, data: { processedAt: new Date(), outcome: result } });
    return result;
  });

  return { status: 200, body: { received: true, outcome } };
}

/**
 * Paiement confirmé : rattaché au bail seulement si le formulaire du dossier est déjà envoyé et que le bail
 * attend ce paiement. Sinon il reste en attente de rattachement (preuve conservée, rien d'autre ne bouge).
 */
async function attachIfSubmitted(tx: Parameters<typeof attachPaymentToBail>[0], intent: Stripe.PaymentIntent, paidAt: Date): Promise<string> {
  const intakeLinkId = intent.metadata?.intakeLinkId;
  if (!intakeLinkId) return "confirmé, en attente de rattachement (création du bail depuis l'espace client)";

  const intake = await tx.intakeLink.findUnique({
    where: { id: intakeLinkId },
    select: { id: true, status: true, bailId: true, bail: { select: { id: true, bailFamily: true, paidAt: true, stripePaymentIntentId: true } } },
  });
  if (!intake) return "confirmé, dossier introuvable : à rapprocher par l'équipe";
  if (intake.status !== IntakeStatus.SUBMITTED || !intake.bail) return "confirmé, en attente de l'envoi du formulaire";

  const bail = intake.bail;
  if (bail.paidAt && bail.stripePaymentIntentId === intent.id) return "déjà rattaché";
  const mismatch = intentMismatch(intent, { amountCents: dossierFeeCents(bail.bailFamily), intakeLinkId });
  if (mismatch) {
    await tx.dossierPayment.updateMany({ where: { stripePaymentIntentId: intent.id }, data: { lastError: `Non rattaché : ${mismatch}` } });
    return `confirmé, non rattaché : ${mismatch}`;
  }
  try {
    const attached = await attachPaymentToBail(tx, { intent, bailId: bail.id, link: { intakeLinkId }, actor: WEBHOOK_ACTOR, at: paidAt });
    return attached.firstConfirmation ? "rattaché au bail" : "déjà rattaché";
  } catch (error) {
    if (error instanceof PaymentAlreadyUsedError) return "confirmé, déjà utilisé pour un autre dossier";
    throw error;
  }
}
