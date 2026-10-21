/**
 * Encadrement des loyers : libellés et calculs purs (utilisables côté client).
 *
 * Le loyer de base (hors charges) ne peut dépasser le loyer de référence majoré
 * × surface habitable, sauf complément de loyer justifié par des
 * caractéristiques exceptionnelles du logement.
 */

export const PERIOD_LABELS: Record<string, string> = {
  BEFORE_1946: "Avant 1946",
  FROM_1946_TO_1970: "1946 à 1970",
  FROM_1971_TO_1990: "1971 à 1990",
  AFTER_1990: "Après 1990",
  FROM_1991_TO_2005: "1991 à 2005",
  AFTER_2005: "Après 2005",
};

export const ROOMS_LABELS: Record<number, string> = { 1: "1 pièce", 2: "2 pièces", 3: "3 pièces", 4: "4 pièces et plus" };

type Ring = number[][];
export type CapGeometry = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };

/** Point dans un anneau (lancer de rayon). */
function inRing([x, y]: [number, number], ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inPolygon(point: [number, number], rings: Ring[]): boolean {
  if (!rings.length || !inRing(point, rings[0])) return false;
  // Les anneaux suivants sont des trous.
  return !rings.slice(1).some((hole) => inRing(point, hole));
}

/** Le point (longitude, latitude) est-il dans le contour ? */
export function pointInGeometry(point: [number, number], geometry: CapGeometry): boolean {
  if (geometry.type === "Polygon") return inPolygon(point, geometry.coordinates);
  return geometry.coordinates.some((polygon) => inPolygon(point, polygon));
}

export function inBbox([x, y]: [number, number], bbox: number[]): boolean {
  return bbox.length === 4 && x >= bbox[0] && x <= bbox[2] && y >= bbox[1] && y <= bbox[3];
}

/** Bail meublé : catégorie « meublée » de l'arrêté. */
export function isFurnishedBail(bailType: string | null | undefined): boolean {
  return bailType === "BAIL_MEUBLE_1_ANS" || bailType === "BAIL_MEUBLE_9_MOIS";
}

/** Arrondi au centime pour l'affichage des loyers maximaux. */
export const toCents = (value: number) => Math.round(value * 100) / 100;
