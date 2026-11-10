/**
 * Données lues dans les diagnostics d'un bien par le modèle d'IA (format de réponse imposé).
 * Le modèle ne décide rien : il recopie ce qui est écrit ; les règles sont dans assess.ts.
 */

/** Au-delà, une analyse « en cours » est considérée comme interrompue (la fonction s'arrête à 5 min). */
export const ANALYSIS_STALE_MS = 6 * 60 * 1000;

export const ENERGY_LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;
export type EnergyLetter = (typeof ENERGY_LETTERS)[number];

export interface DatedDiagnostic {
  /** Diagnostic présent dans les fichiers. */
  found: boolean;
  /** Date d'établissement (AAAA-MM-JJ). */
  date: string | null;
  /** Nom du fichier où il a été trouvé. */
  file: string | null;
}

export interface DiagnosticExtraction {
  property: {
    address: string | null;
    postalCode: string | null;
    type: "APPARTEMENT" | "MAISON" | "LOCAL" | "AUTRE" | null;
    surfaceM2: number | null;
    constructionYear: number | null;
  };
  dpe: DatedDiagnostic & {
    energyClass: EnergyLetter | null;
    gesClass: EnergyLetter | null;
    energyKwhM2: number | null;
    emissionsKgM2: number | null;
    ademeNumber: string | null;
  };
  erp: DatedDiagnostic;
  asbestos: DatedDiagnostic & { presence: "OUI" | "NON" | null };
  lead: DatedDiagnostic & { presence: "OUI" | "NON" | null };
  electricity: DatedDiagnostic & { anomalies: boolean | null };
  /** installationPresent : absent des analyses enregistrées avant le 10/11/2026 (traité comme inconnu). */
  gas: DatedDiagnostic & { anomalies: boolean | null; installationPresent?: boolean | null };
  termites: DatedDiagnostic & { presence: "OUI" | "NON" | null };
  noise: DatedDiagnostic;
  diagnostician: { name: string | null; company: string | null; certification: string | null };
  /** Problèmes de lecture (pages illisibles, document incomplet…). */
  readingIssues: string[];
}

const nullable = (type: string, description: string, extra: Record<string, unknown> = {}) => ({
  type: [type, "null"],
  description,
  ...extra,
});

const dated = (label: string, extra: Record<string, unknown> = {}) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    found: { type: "boolean", description: `${label} présent dans les fichiers` },
    date: nullable("string", `Date d'établissement du ${label}, au format AAAA-MM-JJ`),
    file: nullable("string", `Nom exact du fichier où se trouve le ${label}`),
    ...extra,
  },
  required: ["found", "date", "file", ...Object.keys(extra)],
});

const presence = (what: string) => ({
  presence: { type: ["string", "null"], enum: ["OUI", "NON", null], description: `Présence de ${what} constatée (OUI / NON), null si non indiqué` },
});

const letter = (description: string) => ({ type: ["string", "null"], enum: [...ENERGY_LETTERS, null], description });

/** Schéma JSON strict envoyé au modèle (structured outputs). */
export const DIAGNOSTIC_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    property: {
      type: "object",
      additionalProperties: false,
      properties: {
        address: nullable("string", "Adresse complète du bien diagnostiqué"),
        postalCode: nullable("string", "Code postal du bien (5 chiffres)"),
        type: { type: ["string", "null"], enum: ["APPARTEMENT", "MAISON", "LOCAL", "AUTRE", null], description: "Type de bien" },
        surfaceM2: nullable("number", "Surface habitable (ou surface du local) en m², telle qu'indiquée"),
        constructionYear: nullable("integer", "Année de construction (ou du permis de construire). Si seule une période est indiquée (ex. « avant 1948 », « 1949-1974 »), mets la dernière année de cette période (ex. 1947, 1974)"),
      },
      required: ["address", "postalCode", "type", "surfaceM2", "constructionYear"],
    },
    dpe: dated("DPE (diagnostic de performance énergétique)", {
      energyClass: letter("Lettre de l'étiquette énergie du DPE, lue sur l'étiquette"),
      gesClass: letter("Lettre de l'étiquette climat (GES) du DPE, lue sur l'étiquette"),
      energyKwhM2: nullable("number", "Consommation d'énergie primaire en kWh/m²/an affichée dans l'étiquette énergie"),
      emissionsKgM2: nullable("number", "Émissions en kg CO2/m²/an affichées dans l'étiquette"),
      ademeNumber: nullable("string", "Numéro ADEME du DPE (13 caractères)"),
    }),
    erp: dated("état des risques et pollutions (ERP, ex-ERNMT)"),
    asbestos: dated("repérage amiante (DAPP, DTA ou constat avant vente)", presence("matériaux amiantés")),
    lead: dated("constat de risque d'exposition au plomb (CREP)", {
      presence: {
        type: ["string", "null"],
        enum: ["OUI", "NON", null],
        description:
          "OUI si au moins un revêtement contient du plomb à une concentration égale ou supérieure au seuil (classe 1, 2 ou 3), même non dégradé ; NON si tous les revêtements sont sous le seuil (classe 0) ; null si non indiqué",
      },
    }),
    electricity: dated("état de l'installation intérieure d'électricité", {
      anomalies: nullable("boolean", "Des anomalies sont-elles signalées ?"),
    }),
    gas: dated("état de l'installation intérieure de gaz", {
      anomalies: nullable("boolean", "Des anomalies sont-elles signalées ?"),
      installationPresent: nullable(
        "boolean",
        "Le bien a-t-il une installation de gaz (chauffage, eau chaude ou cuisson au gaz), d'après le DPE ou les autres diagnostics ? true / false, null si on ne peut pas le savoir",
      ),
    }),
    termites: dated("état relatif à la présence de termites", presence("termites")),
    noise: dated("diagnostic bruit (zone d'exposition au bruit d'un aéroport)"),
    diagnostician: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: nullable("string", "Nom du diagnostiqueur"),
        company: nullable("string", "Société du diagnostiqueur"),
        certification: nullable("string", "Organisme et numéro de certification"),
      },
      required: ["name", "company", "certification"],
    },
    readingIssues: {
      type: "array",
      items: { type: "string" },
      description: "Problèmes de lecture rencontrés (pages illisibles, document coupé, diagnostic annoncé mais absent…), en français",
    },
  },
  required: ["property", "dpe", "erp", "asbestos", "lead", "electricity", "gas", "termites", "noise", "diagnostician", "readingIssues"],
} as const;

export const DIAGNOSTIC_SYSTEM_PROMPT = [
  "Tu lis le dossier de diagnostics techniques d'un bien immobilier mis en location en France.",
  "Recopie uniquement ce qui est écrit dans les fichiers. N'invente rien : si une information n'apparaît pas, mets null (ou found = false).",
  "Les dates sont au format AAAA-MM-JJ. Les lettres des étiquettes énergie et climat (A à G) sont dessinées dans des étiquettes graphiques : lis-les sur l'image.",
  "Pour chaque diagnostic trouvé, indique le nom exact du fichier qui le contient.",
  "Un même dossier peut contenir plusieurs diagnostics, et plusieurs fichiers peuvent être fournis.",
].join("\n");
