/**
 * Surface du bien (décision de l'utilisateur du 17/11/2026, m6) : 0 ou moins est refusé ; au-delà de
 * 10 000 m², un avertissement s'affiche sans bloquer (un entrepôt peut être très grand). Sans accès à la
 * base : utilisable dans le navigateur comme sur le serveur.
 */

export const SURFACE_WARNING_M2 = 10_000;
export const SURFACE_INVALID = "La surface doit être supérieure à 0 m².";
export const SURFACE_WARNING = "Surface très élevée (plus de 10 000 m²) : vérifiez la saisie.";

/** Lit « 42 », « 42,5 » ou 42.5 ; null si vide, NaN si illisible. */
export function surfaceValue(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  if (typeof value === "number") return value;
  return Number(String(value).trim().replace(",", "."));
}

/** Message de refus (null si la surface convient ou est vide). */
export function surfaceIssue(value: unknown): string | null {
  const num = surfaceValue(value);
  if (num === null) return null;
  return Number.isFinite(num) && num > 0 ? null : SURFACE_INVALID;
}

/** Avertissement non bloquant (null sinon). */
export function surfaceWarning(value: unknown): string | null {
  const num = surfaceValue(value);
  return num !== null && Number.isFinite(num) && num > SURFACE_WARNING_M2 ? SURFACE_WARNING : null;
}

/** Contrôle serveur, qui lève l'erreur à afficher. */
export function assertSurface(value: unknown): void {
  const issue = surfaceIssue(value);
  if (issue) throw new Error(issue);
}
