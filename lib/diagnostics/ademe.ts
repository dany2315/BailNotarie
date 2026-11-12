// Module serveur : recherche d'un DPE dans les bases publiques de l'ADEME (observatoire DPE, données ouvertes).
// Tout DPE établi depuis le 1er juillet 2021 y est enregistré sous son numéro (13 caractères) ; les DPE plus
// anciens ont tous expiré au plus tard le 31/12/2024. Seul le numéro du DPE est envoyé (donnée publique).
import type { AdemeCheck, EnergyLetter } from "./schema";
import { ENERGY_LETTERS } from "./schema";

const API = "https://data.ademe.fr/data-fair/api/v1/datasets";
/** Logements existants, logements neufs, bâtiments tertiaires (locaux commerciaux). */
const DATASETS = ["dpe03existant", "dpe02neuf", "dpe01tertiaire"] as const;
const FIELDS = [
  "numero_dpe",
  "date_etablissement_dpe",
  "date_fin_validite_dpe",
  "etiquette_dpe",
  "etiquette_ges",
  "adresse_ban",
  "code_postal_ban",
  "date_derniere_modification_dpe",
].join(",");

const letter = (value: unknown): EnergyLetter | null =>
  typeof value === "string" && (ENERGY_LETTERS as readonly string[]).includes(value) ? (value as EnergyLetter) : null;
const isoDay = (value: unknown): string | null => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);

/** Numéro tel qu'imprimé (espaces, minuscules) → format de la base. */
export function normalizeAdemeNumber(value: string | null | undefined): string | null {
  const clean = (value || "").replace(/[\s.-]/g, "").toUpperCase();
  return /^[0-9A-Z]{13}$/.test(clean) ? clean : null;
}

/**
 * Résultat de la recherche : trouvé (avec les valeurs officielles), introuvable, numéro absent du document,
 * ou base injoignable (dans ce cas rien n'est signalé : la lecture du fichier reste utilisée).
 */
export async function checkDpeAtAdeme(rawNumber: string | null | undefined): Promise<AdemeCheck> {
  const checkedAt = new Date().toISOString();
  const number = normalizeAdemeNumber(rawNumber);
  if (!number) return { status: "no_number", number: rawNumber || null, checkedAt };
  try {
    for (const dataset of DATASETS) {
      const url = `${API}/${dataset}/lines?qs=${encodeURIComponent(`numero_dpe:"${number}"`)}&select=${FIELDS}&size=1`;
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`ADEME ${dataset} ${response.status}`);
      const payload: any = await response.json();
      const row = payload?.results?.[0];
      if (row && row.numero_dpe === number) {
        return {
          status: "found",
          number,
          checkedAt,
          dataset,
          energyClass: letter(row.etiquette_dpe),
          gesClass: letter(row.etiquette_ges),
          date: isoDay(row.date_etablissement_dpe),
          validUntil: isoDay(row.date_fin_validite_dpe),
          address: typeof row.adresse_ban === "string" ? row.adresse_ban : null,
          postalCode: typeof row.code_postal_ban === "string" ? row.code_postal_ban : row.code_postal_ban != null ? String(row.code_postal_ban) : null,
          updatedAt: isoDay(row.date_derniere_modification_dpe),
        };
      }
    }
    return { status: "not_found", number, checkedAt };
  } catch (error) {
    console.error("[diagnostics] base ADEME", error);
    return { status: "error", number, checkedAt };
  }
}
