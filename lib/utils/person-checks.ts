/**
 * Contrôles communs sur les personnes (date de naissance, régime matrimonial), sans accès à la base :
 * utilisables dans le navigateur comme sur le serveur. Décisions de l'utilisateur du 17/11/2026 (m3, m7).
 */

export const BIRTH_DATE_FUTURE = "La date de naissance ne peut pas être dans le futur.";
export const BIRTH_DATE_MINOR = "La personne doit être majeure (18 ans ou plus).";

const parisDay = (now: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);

/** Jour AAAA-MM-JJ d'une date saisie (« 1990-05-12 » ou Date à minuit UTC), null si illisible. */
function birthDay(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) return value.trim().slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/**
 * Ce qui ne va pas dans une date de naissance (null si elle convient ou est vide) : date dans le futur, ou
 * personne de moins de 18 ans (jour de France). Les parties d'un bail sont majeures.
 */
export function birthDateIssue(value: Date | string | null | undefined, now: Date = new Date()): string | null {
  const day = birthDay(value);
  if (!day) return null;
  const today = parisDay(now);
  if (day > today) return BIRTH_DATE_FUTURE;
  const adultFrom = `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`;
  if (day > adultFrom) return BIRTH_DATE_MINOR;
  return null;
}

/** Même contrôle, qui lève l'erreur à afficher. */
export function assertBirthDate(value: Date | string | null | undefined): void {
  const issue = birthDateIssue(value);
  if (issue) throw new Error(issue);
}

/**
 * Régime matrimonial à enregistrer : seulement pour une personne mariée. Une personne qui n'est plus mariée
 * (célibataire, pacsée, divorcée…) n'en garde pas, même si l'écran l'envoie encore (champ masqué).
 */
export function regimeIfMarried<T>(familyStatus: string | null | undefined, regime: T | null | undefined): T | null {
  return familyStatus === "MARIE" ? regime || null : null;
}
