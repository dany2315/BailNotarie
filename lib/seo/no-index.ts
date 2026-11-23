import type { Metadata } from "next";

/**
 * Pages privées et de tunnel : jamais indexées. Même consigne que l'en-tête
 * X-Robots-Tag posé dans next.config.ts, pour que la balise de la page ne le
 * contredise pas.
 */
export const NO_INDEX_METADATA: Metadata = {
  robots: { index: false, follow: true },
};
