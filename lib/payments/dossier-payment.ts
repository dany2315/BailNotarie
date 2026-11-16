import { createHash } from "crypto";
import type Stripe from "stripe";
import { BailAuditEventType, DossierPaymentStatus, Prisma } from "@prisma/client";
import { stripe } from "@/lib/stripe";
import { createBailAuditLog } from "@/lib/actions/bail-audit-log";

/**
 * Paiement des frais de dossier : la seule porte d'entrée pour vérifier un paiement Stripe et marquer un
 * bail payé.
 *
 * Règles :
 *  - un bail n'est marqué payé qu'après vérification auprès de Stripe (réglé, bon montant, bonne devise,
 *    créé pour ce dossier ou ce compte) — jamais parce qu'un identifiant a été fourni ;
 *  - un paiement ne sert qu'à un seul dossier, même si deux requêtes arrivent en même temps ;
 *  - enregistrer deux fois la même confirmation ne change rien (pas de seconde ligne d'historique, date
 *    de paiement conservée) ;
 *  - tant que l'état d'un paiement n'est pas connu avec certitude, aucun nouvel ordre de paiement n'est créé.
 */

type Db = Prisma.TransactionClient;

export const FEE_CURRENCY = "eur";

/** État d'un ordre de paiement Stripe, ramené à ce qui compte pour le dossier. */
export function paymentStatusOf(intent: Pick<Stripe.PaymentIntent, "status">): DossierPaymentStatus {
  switch (intent.status) {
    case "succeeded":
      return DossierPaymentStatus.SUCCEEDED;
    case "processing":
    case "requires_capture":
      return DossierPaymentStatus.PROCESSING;
    case "canceled":
      return DossierPaymentStatus.CANCELED;
    default:
      // requires_payment_method, requires_confirmation, requires_action : rien n'est encore payé.
      return DossierPaymentStatus.PENDING;
  }
}

export type IntentLookup =
  | { kind: "found"; intent: Stripe.PaymentIntent }
  /** Stripe répond que cette référence n'existe pas : elle ne correspond à aucun paiement. */
  | { kind: "missing" }
  /** Stripe n'a pas pu répondre (réseau, panne, limite) : l'état du paiement est inconnu. */
  | { kind: "unknown"; message: string };

/** Lit l'ordre de paiement chez Stripe, en distinguant « n'existe pas » de « impossible à vérifier ». */
export async function lookupIntent(paymentIntentId: string): Promise<IntentLookup> {
  try {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
    return { kind: "found", intent };
  } catch (error: any) {
    if (error?.code === "resource_missing" || error?.statusCode === 404) return { kind: "missing" };
    return { kind: "unknown", message: String(error?.message || "Stripe injoignable") };
  }
}

/** Date réelle du paiement donnée par Stripe (date du débit), ou null si Stripe ne la donne pas. */
export function stripePaidAt(intent: Stripe.PaymentIntent): Date | null {
  const charge = intent.latest_charge;
  if (charge && typeof charge === "object" && typeof charge.created === "number") return new Date(charge.created * 1000);
  return null;
}

export type PaymentExpectation = {
  /** Montant attendu en centimes, calculé par le serveur d'après le type de bail. */
  amountCents: number;
  /** Paiement du formulaire propriétaire : lien (intake) pour lequel l'ordre de paiement a été créé. */
  intakeLinkId?: string;
  intakeToken?: string;
  /** Paiement depuis l'espace client : utilisateur pour lequel l'ordre de paiement a été créé. */
  userId?: string;
};

/** Message montré au client quand le paiement ne peut pas être retenu ; null si tout correspond. */
export function intentMismatch(intent: Stripe.PaymentIntent, expected: PaymentExpectation): string | null {
  if (intent.status !== "succeeded") return "Le paiement n'a pas été confirmé. Veuillez réessayer.";
  if (intent.currency !== FEE_CURRENCY) return "Devise de paiement incorrecte.";
  if (intent.amount !== expected.amountCents || (intent.amount_received ?? intent.amount) < expected.amountCents) {
    return "Montant de paiement incorrect.";
  }
  const meta = intent.metadata ?? {};
  if (expected.intakeLinkId || expected.intakeToken) {
    const sameIntake =
      (expected.intakeLinkId !== undefined && meta.intakeLinkId === expected.intakeLinkId) ||
      (expected.intakeToken !== undefined && meta.token === expected.intakeToken);
    if (!sameIntake) return "Ce paiement ne correspond pas à ce dossier.";
  } else if (expected.userId) {
    if (meta.userId !== expected.userId) return "Ce paiement ne correspond pas à votre compte.";
  } else {
    // Sans dossier ni compte attendu, rien ne prouve que ce paiement est le bon.
    return "Ce paiement ne correspond pas à ce dossier.";
  }
  return null;
}

/**
 * Vérifie auprès de Stripe qu'un paiement est réglé et qu'il est bien celui de ce dossier.
 * Lève une erreur lisible par le client sinon. Ne modifie rien.
 */
export async function verifyFeePayment(paymentIntentId: string, expected: PaymentExpectation): Promise<Stripe.PaymentIntent> {
  const lookup = await lookupIntent(paymentIntentId);
  if (lookup.kind === "missing") throw new Error("Paiement introuvable.");
  if (lookup.kind === "unknown") {
    throw new Error("Le paiement n'a pas pu être vérifié pour le moment. Votre paiement n'est pas perdu : réessayez dans quelques instants.");
  }
  const mismatch = intentMismatch(lookup.intent, expected);
  if (mismatch) throw new Error(mismatch);
  return lookup.intent;
}

type PaymentLink = { intakeLinkId?: string | null; userId?: string | null };

/**
 * Enregistre (ou met à jour) la ligne de suivi d'un ordre de paiement d'après son état chez Stripe.
 * Un paiement confirmé ne redescend jamais à un état antérieur.
 */
export async function recordIntent(db: Db, intent: Stripe.PaymentIntent, link: PaymentLink = {}, at: Date = new Date()) {
  const status = paymentStatusOf(intent);
  const paidAt = status === DossierPaymentStatus.SUCCEEDED ? stripePaidAt(intent) : null;
  const meta = intent.metadata ?? {};
  const intakeLinkId = link.intakeLinkId ?? meta.intakeLinkId ?? null;
  const userId = link.userId ?? meta.userId ?? null;

  const existing = await db.dossierPayment.findUnique({ where: { stripePaymentIntentId: intent.id } });
  if (!existing) {
    return db.dossierPayment.upsert({
      where: { stripePaymentIntentId: intent.id },
      create: {
        stripePaymentIntentId: intent.id,
        status,
        amountCents: intent.amount,
        currency: intent.currency,
        intakeLinkId,
        userId,
        stripePaidAt: paidAt,
        confirmedAt: status === DossierPaymentStatus.SUCCEEDED ? at : null,
      },
      // Créée entre-temps par une autre requête : on ne retire rien de ce qu'elle a posé.
      update: {},
    });
  }
  // Confirmé une fois pour toutes : seules les informations manquantes sont complétées.
  const settled = existing.status === DossierPaymentStatus.SUCCEEDED;
  return db.dossierPayment.update({
    where: { id: existing.id },
    data: {
      ...(settled ? {} : { status, amountCents: intent.amount, currency: intent.currency, lastError: null }),
      ...(existing.intakeLinkId ? {} : intakeLinkId ? { intakeLinkId } : {}),
      ...(existing.userId ? {} : userId ? { userId } : {}),
      ...(status === DossierPaymentStatus.SUCCEEDED && !existing.confirmedAt ? { confirmedAt: at } : {}),
      ...(paidAt && !existing.stripePaidAt ? { stripePaidAt: paidAt } : {}),
    },
  });
}

export class PaymentAlreadyUsedError extends Error {
  constructor() {
    super("Ce paiement a déjà été utilisé.");
    this.name = "PaymentAlreadyUsedError";
  }
}

export type AttachOutcome = {
  /** true la première fois que ce bail est marqué payé ; false si c'était déjà fait (rejeu). */
  firstConfirmation: boolean;
  paidAt: Date;
};

/**
 * Rattache un paiement confirmé à un bail et marque ce bail payé — dans la transaction de l'appelant.
 *
 * Le paiement doit avoir été vérifié (verifyFeePayment) : cette fonction ne revérifie pas son montant.
 * Elle garantit en revanche qu'un paiement ne sert qu'à un seul bail (y compris en cas de requêtes
 * simultanées) et qu'un rejeu ne crée ni seconde ligne d'historique ni nouvelle date de paiement.
 */
export async function attachPaymentToBail(
  db: Db,
  input: { intent: Stripe.PaymentIntent; bailId: string; link?: PaymentLink; actor: { id: string | null; name: string }; at?: Date },
): Promise<AttachOutcome> {
  const { intent, bailId, actor } = input;
  const at = input.at ?? new Date();
  if (paymentStatusOf(intent) !== DossierPaymentStatus.SUCCEEDED) throw new Error("Le paiement n'a pas été confirmé. Veuillez réessayer.");

  await recordIntent(db, intent, input.link, at);

  // Un seul bail par paiement : la référence n'est posée que si elle est libre ou déjà celle de ce bail.
  // Deux requêtes simultanées se suivent sur cette ligne ; la seconde ne trouve plus rien à modifier.
  const claimed = await db.dossierPayment.updateMany({
    where: { stripePaymentIntentId: intent.id, OR: [{ bailId: null }, { bailId }] },
    data: { bailId },
  });
  if (claimed.count === 0) throw new PaymentAlreadyUsedError();
  // Baux payés avant ce suivi : leur référence n'est portée que par le bail.
  const usedElsewhere = await db.bail.findFirst({ where: { stripePaymentIntentId: intent.id, NOT: { id: bailId } }, select: { id: true } });
  if (usedElsewhere) throw new PaymentAlreadyUsedError();

  const realDate = stripePaidAt(intent);
  const marked = await db.bail.updateMany({
    where: { id: bailId, paidAt: null },
    // Date réelle du débit quand Stripe la donne ; sinon la date d'enregistrement (la ligne de suivi garde
    // les deux séparément).
    data: { paidAt: realDate ?? at, stripePaymentIntentId: intent.id },
  });

  if (marked.count === 0) {
    const bail = await db.bail.findUnique({ where: { id: bailId }, select: { paidAt: true, stripePaymentIntentId: true } });
    if (!bail) throw new Error("Dossier introuvable");
    if (bail.stripePaymentIntentId && bail.stripePaymentIntentId !== intent.id) {
      // Bail déjà payé par un autre paiement : celui-ci ne lui est pas rattaché et reste visible de l'équipe.
      await db.dossierPayment.updateMany({
        where: { stripePaymentIntentId: intent.id, bailId },
        data: { bailId: null, lastError: `Dossier ${bailId} déjà payé par un autre paiement : à rembourser ou à réaffecter` },
      });
      return { firstConfirmation: false, paidAt: bail.paidAt as Date };
    }
    // Rejeu de la même confirmation : rien à refaire.
    await db.dossierPayment.updateMany({ where: { stripePaymentIntentId: intent.id, attachedAt: null }, data: { attachedAt: at } });
    return { firstConfirmation: false, paidAt: bail.paidAt as Date };
  }

  await db.dossierPayment.updateMany({ where: { stripePaymentIntentId: intent.id }, data: { attachedAt: at } });
  await createBailAuditLog(
    { bailId, eventType: BailAuditEventType.PAYMENT_RECEIVED, actorId: actor.id, actorName: actor.name, createdAt: realDate ?? at },
    db,
  );
  return { firstConfirmation: true, paidAt: realDate ?? at };
}

/**
 * Clé d'idempotence Stripe d'une création d'ordre de paiement : mêmes paramètres pour le même dossier et
 * la même tentative → Stripe renvoie le même ordre au lieu d'en créer un second (double clic, requêtes
 * simultanées, nouvel essai après coupure réseau).
 */
export function feeIdempotencyKey(scope: string, previousIntentId: string | null, params: unknown): string {
  const digest = createHash("sha256").update(JSON.stringify(params)).digest("hex").slice(0, 24);
  return `dossier-fee:${scope}:${previousIntentId ?? "first"}:${digest}`;
}
