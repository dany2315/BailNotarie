/**
 * Date de prise d'effet et jour de paiement du bail — règles communes (sans accès à la base, utilisables
 * dans le navigateur).
 *
 * Ces deux valeurs se demandent une fois le locataire connu. Sans locataire, le dossier s'enregistre et se
 * termine sans elles : elles restent VIDES, jamais remplacées par la date du jour, le premier du mois ou
 * une autre valeur d'attente. Dès qu'un locataire est indiqué (ou ajouté plus tard), les deux sont exigées
 * dans le même parcours.
 */

type MaybeDate = Date | string | null | undefined;

const day = (value: MaybeDate) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * La date d'effet a-t-elle réellement été saisie ?
 *
 * Les brouillons créés avant ce fonctionnement portaient une date provisoire : le jour de leur création,
 * sans jour de paiement. Ces dates-là ne sont pas des saisies et ne sont pas présentées comme telles (elles
 * ne sont pas effacées de la base pour autant).
 */
export function effectiveDateGiven(bail: { effectiveDate?: MaybeDate; paymentDay?: number | null; createdAt?: MaybeDate; status?: string }): boolean {
  if (!bail.effectiveDate) return false;
  if (bail.paymentDay != null) return true;
  // Hors brouillon, la date a été validée par un formulaire envoyé.
  if (bail.status && bail.status !== "DRAFT") return true;
  return day(bail.effectiveDate) !== day(bail.createdAt);
}

export const DATES_REQUIRED_WITH_TENANT = "Avec un locataire, indiquez la date de prise d'effet et le jour de paiement.";

/** Ce qu'il manque quand un locataire est connu (liste vide = rien ne manque). */
export function missingTenantDates(values: { effectiveDate?: MaybeDate; paymentDay?: number | string | null }): Array<"effectiveDate" | "paymentDay"> {
  const missing: Array<"effectiveDate" | "paymentDay"> = [];
  if (!day(values.effectiveDate)) missing.push("effectiveDate");
  const paymentDay = typeof values.paymentDay === "string" ? Number.parseInt(values.paymentDay, 10) : values.paymentDay;
  if (!paymentDay || !Number.isFinite(paymentDay) || paymentDay < 1 || paymentDay > 31) missing.push("paymentDay");
  return missing;
}
