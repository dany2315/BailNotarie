import { prisma } from "@/lib/prisma";

/**
 * IRL en base (table IrlIndex), tenu à jour chaque jour depuis l'INSEE par la tâche « irl-sync ».
 * Sert au calcul du loyer maximal à la relocation. (Les articles du blog lisent leur propre liste,
 * lib/irl.ts.)
 */

/** Série INSEE de l'indice de référence des loyers (IRL), avec la date de publication au Journal officiel. */
const INSEE_IRL_URL = "https://www.bdm.insee.fr/series/sdmx/data/SERIES_BDM/001515333?lastNObservations=12";

export interface IrlVariation {
  /** Dernier indice publié à la date demandée, ex. « 2026-T3 ». */
  quarter: string;
  value: number;
  publishedAt: Date;
  /** Même trimestre de l'année précédente. */
  previousQuarter: string;
  previousValue: number;
  /** Variation sur un an, ex. 0,0157 pour + 1,57 %. */
  rate: number;
}

/**
 * Variation annuelle de l'IRL applicable à une date : le dernier indice publié à cette date,
 * comparé au même trimestre de l'année précédente (article 17-1 de la loi du 6 juillet 1989).
 */
export async function irlVariationAt(at: Date): Promise<IrlVariation | null> {
  const latest = await prisma.irlIndex.findFirst({
    where: { publishedAt: { lte: at } },
    orderBy: [{ year: "desc" }, { quarterNum: "desc" }],
  });
  if (!latest) return null;
  const previous = await prisma.irlIndex.findUnique({ where: { quarter: `${latest.year - 1}-T${latest.quarterNum}` } });
  if (!previous) return null;
  const value = Number(latest.value);
  const previousValue = Number(previous.value);
  return {
    quarter: latest.quarter,
    value,
    publishedAt: latest.publishedAt,
    previousQuarter: previous.quarter,
    previousValue,
    rate: value / previousValue - 1,
  };
}

/** Libellé d'un trimestre « 2026-T3 » : « 3e trimestre 2026 ». */
export function irlQuarterLabel(quarter: string): string {
  const [year, q] = quarter.split("-T");
  return `${q === "1" ? "1er" : `${q}e`} trimestre ${year}`;
}

/** Ajoute les derniers indices publiés par l'INSEE (aucun indice existant n'est modifié). */
export async function syncIrlFromInsee(): Promise<{ added: string[] }> {
  const response = await fetch(INSEE_IRL_URL, { headers: { Accept: "application/xml" }, cache: "no-store" });
  if (!response.ok) throw new Error(`INSEE : réponse ${response.status}`);
  const xml = await response.text();
  const observations = [...xml.matchAll(/<Obs\s([^>]*)\/>/g)].map((match) =>
    Object.fromEntries([...match[1].matchAll(/(\w+)="([^"]*)"/g)].map((attr) => [attr[1], attr[2]])),
  );
  if (!observations.length) throw new Error("INSEE : aucun indice dans la réponse");

  const added: string[] = [];
  for (const obs of observations) {
    const period = /^(\d{4})-Q([1-4])$/.exec(obs.TIME_PERIOD || "");
    const value = Number(obs.OBS_VALUE);
    const publishedAt = obs.DATE_JO ? new Date(`${obs.DATE_JO}T00:00:00Z`) : null;
    // Seuls les indices définitifs et publiés au Journal officiel sont retenus.
    if (!period || !Number.isFinite(value) || !publishedAt || Number.isNaN(publishedAt.getTime()) || obs.OBS_QUAL !== "DEF") continue;
    const quarter = `${period[1]}-T${period[2]}`;
    const exists = await prisma.irlIndex.findUnique({ where: { quarter }, select: { quarter: true } });
    if (exists) continue;
    await prisma.irlIndex.create({
      data: { quarter, year: Number(period[1]), quarterNum: Number(period[2]), value, publishedAt },
    });
    added.push(quarter);
  }
  return { added };
}
