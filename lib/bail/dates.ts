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

/** Message commun : date de prise d'effet antérieure à aujourd'hui (décision de l'utilisateur du 17/11/2026, m2). */
export const EFFECTIVE_DATE_IN_PAST = "La date de prise d'effet ne peut pas être dans le passé : choisissez aujourd'hui ou une date à venir.";

/** Jour d'aujourd'hui en France, au format AAAA-MM-JJ (celui des champs de date). */
export function todayInFrance(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * La date de prise d'effet saisie est-elle dans le passé ? Aujourd'hui est accepté.
 *
 * Seule une date nouvelle ou modifiée est refusée : avec `previous` (la date déjà enregistrée), une date
 * inchangée passe toujours, pour ne jamais bloquer un dossier existant dont la date est entre-temps passée
 * (bail déjà en cours, modification d'un autre champ par l'équipe…).
 */
export function effectiveDateInPast(value: MaybeDate, previous?: MaybeDate, now: Date = new Date()): boolean {
  const given = day(value);
  if (!given) return false;
  if (previous !== undefined && given === day(previous)) return false;
  return given < todayInFrance(now);
}

/** Même contrôle, qui lève l'erreur à afficher. */
export function assertEffectiveDateNotPast(value: MaybeDate, previous?: MaybeDate): void {
  if (effectiveDateInPast(value, previous)) throw new Error(EFFECTIVE_DATE_IN_PAST);
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
