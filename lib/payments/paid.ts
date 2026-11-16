/**
 * « Ce dossier est-il payé ? » — la règle unique, partagée par les listes, compteurs, badges, l'espace
 * client et l'envoi au notaire.
 *
 * Un dossier est payé si :
 *  - Stripe a confirmé le paiement (« paidAt » renseigné), ou
 *  - c'est un ancien dossier dont l'équipe a retrouvé et confirmé le paiement à la main
 *    (« historicalPayment » confirmé). La date réelle du paiement peut alors être inconnue : elle n'est
 *    jamais inventée, et l'affichage le dit.
 *
 * Fichier sans dépendance serveur : utilisable dans les composants client.
 */

type MaybeDate = Date | string | null | undefined;

export type PaidSource = {
  paidAt?: MaybeDate;
  historicalPayment?: { status: string; paymentDate?: MaybeDate; verifiedAt?: MaybeDate } | null;
};

export type PaymentKind = "stripe" | "historical" | "none";

export function paymentKind(bail: PaidSource): PaymentKind {
  if (bail.paidAt) return "stripe";
  if (bail.historicalPayment?.status === "CONFIRMED") return "historical";
  return "none";
}

export function isBailPaid(bail: PaidSource): boolean {
  return paymentKind(bail) !== "none";
}

/** Date réelle du paiement si elle est connue (jamais la date de vérification par l'équipe). */
export function knownPaymentDate(bail: PaidSource): Date | null {
  const value = bail.paidAt ?? (bail.historicalPayment?.status === "CONFIRMED" ? bail.historicalPayment.paymentDate : null);
  return value ? new Date(value) : null;
}

/** Ancien dossier confirmé à la main, sans date de paiement connue. */
export function isHistoricalWithoutDate(bail: PaidSource): boolean {
  return paymentKind(bail) === "historical" && !knownPaymentDate(bail);
}

export const HISTORICAL_PAID_LABEL = "Paiement historique confirmé — date du paiement inconnue";

/** Filtres Prisma équivalents (à utiliser à la place de « paidAt: { not: null } » / « paidAt: null »). */
export const PAID_WHERE = {
  OR: [{ paidAt: { not: null } }, { historicalPayment: { is: { status: "CONFIRMED" as const } } }],
};

export const UNPAID_WHERE = {
  paidAt: null,
  NOT: { historicalPayment: { is: { status: "CONFIRMED" as const } } },
};

/** À ajouter aux « select » Prisma des baux dont on affiche l'état de paiement. */
export const HISTORICAL_PAYMENT_SELECT = {
  select: { status: true, paymentDate: true, verifiedAt: true, verifiedByName: true, proofReference: true, note: true },
} as const;
