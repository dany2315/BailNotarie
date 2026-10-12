/**
 * Règles du DPE (logement), à partir de la classe et de la date saisies.
 *
 * Validité : 10 ans pour un DPE établi depuis le 01/07/2021 ; un DPE établi
 * entre le 01/01/2018 et le 30/06/2021 a expiré le 31/12/2024 ; entre le
 * 01/01/2013 et le 31/12/2017, le 31/12/2022 ; avant 2013, il n'est plus valable.
 *
 * Décence énergétique : G interdit à la location depuis le 01/01/2025,
 * F à partir du 01/01/2028, E à partir du 01/01/2034.
 */

export const ENERGY_CLASSES = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type EnergyClassValue = (typeof ENERGY_CLASSES)[number];

/** Couleurs de l'étiquette (texte lisible sur chaque fond). */
export const ENERGY_CLASS_STYLE: Record<EnergyClassValue, string> = {
  A: "bg-green-800 text-white",
  B: "bg-green-700 text-white",
  C: "bg-lime-400 text-lime-950",
  D: "bg-yellow-300 text-yellow-950",
  E: "bg-orange-300 text-orange-950",
  F: "bg-orange-600 text-white",
  G: "bg-red-700 text-white",
};

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** Date de fin de validité d'un DPE, ou null si sa date est inconnue. */
export function dpeValidUntil(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  if (d >= utc(2021, 7, 1)) return utc(d.getUTCFullYear() + 10, d.getUTCMonth() + 1, d.getUTCDate());
  if (d >= utc(2018, 1, 1)) return utc(2024, 12, 31);
  if (d >= utc(2013, 1, 1)) return utc(2022, 12, 31);
  return d; // Avant 2013 : déjà expiré.
}

export interface DpeAssessment {
  /** Rien de saisi, DPE expiré ou logement interdit à la location : bloquant. */
  blocking: boolean;
  /** Message principal (en rouge si bloquant, en orange si avertissement). */
  message: string | null;
  warning: string | null;
  validUntil: Date | null;
  expired: boolean;
}

/** Ce que la fiche affiche pour le DPE d'un bien (à la date du jour). */
export function assessDpe(
  dpeClass: string | null | undefined,
  dpeDate: Date | string | null | undefined,
  now: Date = new Date(),
): DpeAssessment {
  const validUntil = dpeValidUntil(dpeDate);
  const expired = !!validUntil && validUntil < now;
  if (!dpeClass) {
    return { blocking: true, message: "Classe DPE à saisir (lue dans le diagnostic)", warning: null, validUntil, expired };
  }
  if (!dpeDate) {
    return { blocking: true, message: "Date du DPE à saisir pour vérifier sa validité", warning: null, validUntil, expired };
  }
  if (expired) {
    return { blocking: true, message: "DPE expiré : un nouveau diagnostic est nécessaire", warning: null, validUntil, expired };
  }
  const year = now.getUTCFullYear();
  if (dpeClass === "G") {
    return { blocking: true, message: "Classe G : logement interdit à la location depuis le 01/01/2025", warning: null, validUntil, expired };
  }
  if (dpeClass === "F") {
    return {
      blocking: year >= 2028,
      message: year >= 2028 ? "Classe F : logement interdit à la location depuis le 01/01/2028" : null,
      warning: year < 2028 ? "Classe F : location interdite à partir du 01/01/2028, loyer gelé" : null,
      validUntil,
      expired,
    };
  }
  if (dpeClass === "E") {
    return {
      blocking: year >= 2034,
      message: year >= 2034 ? "Classe E : logement interdit à la location depuis le 01/01/2034" : null,
      warning: year < 2034 ? "Classe E : location interdite à partir du 01/01/2034" : null,
      validUntil,
      expired,
    };
  }
  return { blocking: false, message: null, warning: null, validUntil, expired };
}
