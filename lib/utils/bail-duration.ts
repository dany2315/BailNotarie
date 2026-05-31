import { BailType } from "@prisma/client";

/**
 * Renvoie la date de fin d'un bail en fonction de sa date de début et de son type.
 * - Bail nu 3 ans → +3 ans
 * - Bail nu 6 ans (SCI) → +6 ans
 * - Bail meublé 1 an → +1 an
 * - Bail meublé 9 mois (étudiant) → +9 mois
 *
 * Retourne null si les arguments sont invalides ou manquants.
 */
export function computeBailEndDate(
  startDate: string | Date | null | undefined,
  bailType: BailType | string | null | undefined
): Date | null {
  if (!startDate || !bailType) return null;
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  if (Number.isNaN(start.getTime())) return null;

  const end = new Date(start);
  switch (bailType) {
    case BailType.BAIL_NU_3_ANS:
      end.setFullYear(end.getFullYear() + 3);
      break;
    case BailType.BAIL_NU_6_ANS:
      end.setFullYear(end.getFullYear() + 6);
      break;
    case BailType.BAIL_MEUBLE_1_ANS:
      end.setFullYear(end.getFullYear() + 1);
      break;
    case BailType.BAIL_MEUBLE_9_MOIS:
      end.setMonth(end.getMonth() + 9);
      break;
    default:
      return null;
  }
  return end;
}

/** Convertit une Date en chaîne "YYYY-MM-DD" pour les inputs <input type="date">. */
export function dateToIsoDay(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Formatage long en français (ex: "5 mars 2027"). */
export function formatDateFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
