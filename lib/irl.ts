/**
 * Indice de reference des loyers (IRL), France metropolitaine.
 *
 * Source : Insee, repris par l'ANIL (tableau de l'IRL). Un nouvel indice est
 * publie chaque trimestre (mi-janvier, mi-avril, mi-juillet, mi-octobre) :
 * ajouter la ligne en tete de liste et mettre a jour IRL_LAST_PUBLICATION.
 * Le calculateur de l'article "Revision du loyer" lit uniquement ce fichier.
 */

export type IrlQuarter = 1 | 2 | 3 | 4;

export interface IrlValue {
  year: number;
  quarter: IrlQuarter;
  value: number;
}

/** Date de publication Insee du dernier indice de la liste. */
export const IRL_LAST_PUBLICATION = "2026-07-10";

export const IRL_SERIES: IrlValue[] = [
  { year: 2026, quarter: 2, value: 148.37 },
  { year: 2026, quarter: 1, value: 146.6 },
  { year: 2025, quarter: 4, value: 145.78 },
  { year: 2025, quarter: 3, value: 145.77 },
  { year: 2025, quarter: 2, value: 146.68 },
  { year: 2025, quarter: 1, value: 145.47 },
  { year: 2024, quarter: 4, value: 144.64 },
  { year: 2024, quarter: 3, value: 144.51 },
  { year: 2024, quarter: 2, value: 145.17 },
  { year: 2024, quarter: 1, value: 143.46 },
  { year: 2023, quarter: 4, value: 142.06 },
  { year: 2023, quarter: 3, value: 141.03 },
  { year: 2023, quarter: 2, value: 140.59 },
  { year: 2023, quarter: 1, value: 138.61 },
  { year: 2022, quarter: 4, value: 137.26 },
  { year: 2022, quarter: 3, value: 136.27 },
  { year: 2022, quarter: 2, value: 135.84 },
  { year: 2022, quarter: 1, value: 133.93 },
];

export function getIrl(year: number, quarter: IrlQuarter): number | undefined {
  return IRL_SERIES.find((v) => v.year === year && v.quarter === quarter)?.value;
}

export const LATEST_IRL = IRL_SERIES[0];

/**
 * Couples (nouvel indice, indice un an plus tot) disponibles pour un
 * trimestre de reference, du plus recent au plus ancien.
 */
export function getRevisionPairs(quarter: IrlQuarter) {
  return IRL_SERIES.filter((v) => v.quarter === quarter)
    .map((current) => {
      const previous = getIrl(current.year - 1, quarter);
      return previous === undefined ? null : { year: current.year, current: current.value, previous };
    })
    .filter((p): p is { year: number; current: number; previous: number } => p !== null);
}

/** Variation annuelle d'un indice, en pourcentage. */
export function getAnnualVariation(value: IrlValue): number | undefined {
  const previous = getIrl(value.year - 1, value.quarter);
  if (previous === undefined) return undefined;
  return (value.value / previous - 1) * 100;
}

/** Nouveau loyer hors charges, arrondi au centime. */
export function computeRevisedRent(rent: number, newIndex: number, oldIndex: number): number {
  return Math.round(((rent * newIndex) / oldIndex) * 100) / 100;
}

export function formatIrl(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
