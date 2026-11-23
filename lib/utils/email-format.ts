/**
 * Mise en forme des valeurs affichées dans les e-mails (sans accès à la base, utilisable partout).
 */

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** 1100 → « 1 100 € ». */
export function formatEuros(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  // Espace insécable fine remplacée par une espace normale : certains clients e-mail affichent mal la première.
  return `${Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 2 }).replace(/ /g, " ")} €`;
}

/** Date (ou « AAAA-MM-JJ ») → « 1er décembre 2026 ». Lue en UTC, comme les dates du bail. */
export function formatFrenchDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const day = date.getUTCDate();
  return `${day === 1 ? "1er" : day} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
