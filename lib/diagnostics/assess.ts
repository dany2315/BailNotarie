/**
 * Règles appliquées aux données lues dans les diagnostics. Fonctions pures : le modèle d'IA
 * recopie ce qui est écrit, c'est ce code qui dit quoi faire.
 *
 * Seuls les diagnostics obligatoires pour une mise en location sont contrôlés, et seulement leur
 * présence et leur validité (pas ce qu'ils constatent dans le logement), plus la lettre du DPE
 * recalculée à partir de ses valeurs :
 * - logement (loi du 6 juillet 1989, art. 3-3) : DPE (10 ans), ERP (moins de 6 mois), plomb / CREP
 *   si construit avant 1949 (sans limite sans plomb, 6 ans avec plomb),
 *   électricité et gaz si l'installation a plus de 15 ans (6 ans) ;
 * - local commercial : DPE (10 ans), ERP (moins de 6 mois), amiante / DTA si permis de construire
 *   antérieur au 1er juillet 1997.
 * Termites, mérules, assainissement et repérage amiante du logement ne concernent que la vente.
 *
 * Chaque point est rangé selon ce qu'il faut faire :
 * - « blocking » : la location est impossible en l'état (message pour le propriétaire fourni) ;
 * - « ask »      : l'information manque (question pour le propriétaire fournie) ;
 * - « team »     : l'équipe s'en charge (refaire l'ERP, reporter le DPE, vérifier un fichier) ;
 * - « ok »       : conforme ;
 * - « na »       : non exigé pour ce bien (raison donnée).
 * Les décisions de l'équipe (conforme, non concerné) sont appliquées ensuite, dans items.ts.
 */
import { assessDpe, dpeValidUntil } from "@/lib/utils/dpe";
import { ENERGY_LETTERS, type DiagnosticExtraction, type EnergyLetter } from "./schema";

export type CheckTone = "ok" | "warn" | "missing";
export type CheckGroup = "blocking" | "ask" | "team" | "ok" | "na";
export type TeamAction = "erp" | "file";

export interface DiagnosticCheck {
  id: string;
  label: string;
  tone: CheckTone;
  group: CheckGroup;
  /** Ce que l'équipe lit (court). */
  text: string;
  /** « blocking » : la phrase à dire ou à écrire au propriétaire. */
  message?: string;
  /** « ask » : la question à poser au propriétaire. */
  question?: string;
  /** « team » : ce que l'équipe peut faire depuis la fiche. */
  action?: TeamAction;
  /** Diagnostic absent des fichiers (et non la date ou le contenu qui pose problème). */
  absent?: boolean;
  /** DPE absent de la base officielle de l'ADEME (numéro absent ou introuvable) : « à vérifier ». */
  rejected?: boolean;
}

export type DiagnosticOverall = "conforme" | "a_verifier" | "non_conforme";

export interface DiagnosticAssessment {
  overall: DiagnosticOverall;
  checks: DiagnosticCheck[];
  /** Données utiles que le modèle n'a pas trouvées. */
  notFound: string[];
  /** DPE lu, à reporter automatiquement dans la fiche du bien (absent ou différent), sinon null. */
  dpeToApply: { dpeClass: EnergyLetter; gesClass: EnergyLetter | null; dpeDate: string } | null;
}

export interface AssessContext {
  commercial: boolean;
  property: {
    fullAddress?: string | null;
    postalCode?: string | null;
    housenumber?: string | null;
    surfaceM2?: number | null;
    dpeClass?: string | null;
    gesClass?: string | null;
    dpeDate?: Date | string | null;
    /** Époque saisie sur la fiche (codes de l'encadrement des loyers), si le diagnostic ne la donne pas. */
    constructionPeriod?: string | null;
  } | null;
  now?: Date;
}

const toDate = (value: string | Date | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDay = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const day = formatDay;

const isoDay = (value: Date | string | null | undefined) => {
  const date = toDate(value as any);
  return date ? date.toISOString().slice(0, 10) : null;
};

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

/** Un document qui expire dans moins de 30 jours est signalé : la signature peut tomber après. */
const SOON_MS = 30 * 24 * 3600 * 1000;

// Seuils du DPE (arrêté du 31 mars 2021, métropole) : au-delà du dernier plafond, G.
const ENERGY_THRESHOLDS: Array<[number, EnergyLetter]> = [[70, "A"], [110, "B"], [180, "C"], [250, "D"], [330, "E"], [420, "F"]];
const EMISSIONS_THRESHOLDS: Array<[number, EnergyLetter]> = [[6, "A"], [11, "B"], [30, "C"], [50, "D"], [70, "E"], [100, "F"]];
const DPE_REFORM = new Date("2021-07-01T00:00:00Z");
// Depuis le 1er juillet 2024, seuils différents sous 40 m² : pas de recalcul plutôt qu'une fausse alerte.
const SMALL_SURFACE_RULE = new Date("2024-07-01T00:00:00Z");

const letterFor = (value: number, thresholds: Array<[number, EnergyLetter]>): EnergyLetter =>
  thresholds.find(([limit]) => value <= limit)?.[1] ?? "G";

/** Lettre énergie recalculée à partir des deux valeurs : la plus mauvaise des deux. */
export function expectedDpeLetter(extraction: DiagnosticExtraction): EnergyLetter | null {
  const { energyKwhM2, emissionsKgM2 } = extraction.dpe;
  const date = toDate(extraction.dpe.date);
  const surface = extraction.property.surfaceM2;
  if (energyKwhM2 == null || emissionsKgM2 == null || !date || date < DPE_REFORM) return null;
  if (date >= SMALL_SURFACE_RULE && (surface == null || surface < 40)) return null;
  const energy = letterFor(energyKwhM2, ENERGY_THRESHOLDS);
  const emissions = letterFor(emissionsKgM2, EMISSIONS_THRESHOLDS);
  return ENERGY_LETTERS.indexOf(energy) >= ENERGY_LETTERS.indexOf(emissions) ? energy : emissions;
}

/**
 * Construit avant une année donnée ? Oui / non / inconnu, d'après le diagnostic puis la fiche du bien.
 * Le modèle donne la dernière année d'une période (« avant 1948 » → 1947).
 */
function builtBefore(limit: number, year: number | null, period: string | null | undefined): boolean | null {
  if (year != null) return year < limit;
  const ranges: Record<string, [number, number]> = {
    BEFORE_1946: [0, 1945],
    FROM_1946_TO_1970: [1946, 1970],
    FROM_1971_TO_1990: [1971, 1990],
    AFTER_1990: [1991, 9999],
    FROM_1991_TO_2005: [1991, 2005],
    AFTER_2005: [2006, 9999],
  };
  const range = period ? ranges[period] : null;
  if (!range) return null;
  if (range[1] < limit) return true;
  if (range[0] >= limit) return false;
  return null;
}

/** Fin de validité d'un diagnostic à durée fixe. */
function validity(date: Date, months: number, now: Date): { state: "valid" | "soon" | "expired"; until: Date } {
  const until = addMonths(date, months);
  if (until < now) return { state: "expired", until };
  if (until.getTime() - now.getTime() < SOON_MS) return { state: "soon", until };
  return { state: "valid", until };
}

export function assessDiagnostics(extraction: DiagnosticExtraction, context: AssessContext): DiagnosticAssessment {
  const now = context.now ?? new Date();
  const checks: DiagnosticCheck[] = [];
  const notFound: string[] = [];
  const fiche = context.property;
  const year = extraction.property.constructionYear;
  const { dpe } = extraction;
  const place = context.commercial ? "local" : "logement";
  let dpeToApply: DiagnosticAssessment["dpeToApply"] = null;

  const blocking = (id: string, label: string, text: string, message: string, absent = false) =>
    checks.push({ id, label, tone: "missing", group: "blocking", text, message, absent });
  const ask = (id: string, label: string, text: string, question: string) =>
    checks.push({ id, label, tone: "warn", group: "ask", text, question, absent: true });
  const team = (id: string, label: string, text: string, action: TeamAction, absent = false) =>
    checks.push({ id, label, tone: "warn", group: "team", text, action, absent });
  const ok = (id: string, label: string, text: string, tone: CheckTone = "ok") => checks.push({ id, label, tone, group: "ok", text });
  const na = (id: string, label: string, text: string) => checks.push({ id, label, tone: "ok", group: "na", text });

  // 1. DPE (logement et local) : présence et validité (10 ans, durée plus courte pour les DPE d'avant juillet 2021),
  // et classe interdite à la location pour un logement (G depuis 2025, F à partir de 2028).
  // Classe, GES et dates : ceux du fichier lu (repris dans la fiche du bien). La base officielle de l'ADEME sert
  // seulement à prévenir l'équipe et le notaire : classe différente, autre bien, numéro absent ou introuvable.
  const official = dpe.ademe?.status === "found" ? dpe.ademe : null;
  const dpeClass = dpe.energyClass;
  const gesClass = dpe.gesClass;
  const dpeDate = dpe.date;
  if (!dpe.found) {
    blocking("dpe", "DPE", "Absent", `Il nous manque le DPE du ${place} : merci de nous l'envoyer, ou de le faire réaliser par un diagnostiqueur certifié.`, true);
  } else if (!dpeDate) {
    team("dpe", "DPE", "Date non lue : à vérifier dans le fichier", "file");
  } else {
    const validUntil = dpeValidUntil(dpeDate);
    const summary = dpeClass ? `Classe ${dpeClass}${gesClass ? `, GES ${gesClass}` : ""} · ` : "";
    if (validUntil && validUntil < now) {
      blocking(
        "dpe",
        "DPE",
        `${summary}expiré le ${day(validUntil)}`,
        `Votre DPE n'est plus valable depuis le ${day(validUntil)} : il faut en faire réaliser un nouveau par un diagnostiqueur certifié.`,
      );
    } else if (dpeClass && !context.commercial && assessDpe(dpeClass, dpeDate, now).blocking) {
      blocking(
        "dpe",
        "DPE",
        assessDpe(dpeClass, dpeDate, now).message || `Classe ${dpeClass} : logement interdit à la location`,
        `Votre logement est classé ${dpeClass} au DPE : il ne peut plus être loué. Des travaux de rénovation énergétique sont nécessaires avant de signer un bail.`,
      );
    } else if (validUntil) {
      const soon = validUntil.getTime() - now.getTime() < SOON_MS;
      ok("dpe", "DPE", `${summary}${soon ? "expire" : "valable jusqu'"}${soon ? " le" : "au"} ${day(validUntil)}`, soon ? "warn" : "ok");
    } else {
      team("dpe", "DPE", "Date de validité inconnue : à vérifier dans le fichier", "file");
    }

    // Vérifications faites dans la ligne DPE elle-même (pas de ligne à part) : un DPE valable passe « à vérifier ».
    const dpeLine = checks.find((check) => check.id === "dpe");
    const toCheck = (reason: string) => {
      if (!dpeLine || dpeLine.group !== "ok") return;
      dpeLine.group = "team";
      dpeLine.tone = "warn";
      dpeLine.action = "file";
      dpeLine.text = `${dpeLine.text} · ${reason}`;
    };
    const ademe = dpe.ademe;
    // Pas dans la base officielle : « à vérifier » (peut-être pas un vrai DPE). Un DPE déjà expiré reste « expiré ».
    if ((ademe?.status === "no_number" || ademe?.status === "not_found") && dpeLine && dpeLine.group !== "blocking") {
      dpeLine.group = "team";
      dpeLine.tone = "warn";
      dpeLine.action = "file";
      dpeLine.rejected = true;
      dpeLine.text =
        ademe.status === "no_number"
          ? "Numéro ADEME absent du document : vérifiez que c'est un vrai DPE"
          : `DPE n° ${ademe.number} introuvable dans la base officielle de l'ADEME : vérifiez que c'est un vrai DPE`;
      dpeLine.question = `Pouvez-vous nous envoyer le DPE officiel du ${place}, avec son numéro ADEME ?`;
    } else if (official && official.postalCode && fiche?.postalCode && official.postalCode !== fiche.postalCode) {
      toCheck(`selon la base de l'ADEME, ce DPE concerne un autre bien (${official.address || official.postalCode})`);
    } else if (
      official &&
      ((official.energyClass && dpe.energyClass && official.energyClass !== dpe.energyClass) ||
        (official.gesClass && dpe.gesClass && official.gesClass !== dpe.gesClass))
    ) {
      toCheck(
        `classe différente dans la base officielle de l'ADEME${
          official.updatedAt ? ` (DPE mis à jour le ${official.updatedAt.split("-").reverse().join("/")})` : ""
        }`,
      );
    } else if (!official) {
      // Lettre de l'étiquette recalculée à partir de la consommation et des émissions (sans valeurs officielles).
      const expected = expectedDpeLetter(extraction);
      if (dpe.energyClass && expected && expected !== dpe.energyClass) toCheck(`les valeurs du DPE donnent la classe ${expected} : vérifiez l'étiquette`);
    }

    // Un DPE non reconnu par l'ADEME n'est pas reporté dans la fiche du bien.
    if (dpeClass && !dpeLine?.rejected) {
      const ficheDate = isoDay(fiche?.dpeDate ?? null);
      if (!fiche?.dpeClass || !ficheDate || fiche.dpeClass !== dpeClass || ficheDate !== dpeDate || (fiche.gesClass ?? null) !== (gesClass ?? null)) {
        dpeToApply = { dpeClass, gesClass, dpeDate };
      }
    }
  }

  // 2. État des risques et pollutions (logement et local) : moins de 6 mois à la signature. L'équipe peut le refaire.
  const erpDate = toDate(extraction.erp.date);
  if (!extraction.erp.found) {
    team("erp", "État des risques (ERP)", "Absent", "erp", true);
  } else if (!erpDate) {
    team("erp", "État des risques (ERP)", "Date non lue : il doit avoir moins de 6 mois à la signature", "erp");
  } else {
    const v = validity(erpDate, 6, now);
    if (v.state === "valid") ok("erp", "État des risques (ERP)", `Valable jusqu'au ${day(v.until)}`);
    else team("erp", "État des risques (ERP)", v.state === "expired" ? `Expiré le ${day(v.until)}` : `Expire le ${day(v.until)}`, "erp");
  }

  if (context.commercial) {
    // 3. Local : amiante (dossier technique amiante) si permis de construire avant le 1er juillet 1997.
    const before1997 = builtBefore(1997, year, fiche?.constructionPeriod);
    const asbestos = extraction.asbestos;
    if (asbestos.found) {
      ok("amiante", "Amiante (DTA)", "Présent");
    } else if (before1997 === true) {
      blocking(
        "amiante",
        "Amiante (DTA)",
        "Absent : obligatoire, local d'avant juillet 1997",
        "Le local a été construit avant juillet 1997 : le dossier technique amiante (DTA) est obligatoire. Merci de nous l'envoyer.",
        true,
      );
    } else if (before1997 === null) {
      ask("amiante", "Amiante (DTA)", "Absent : obligatoire si le permis de construire date d'avant juillet 1997", "Le permis de construire du local date-t-il d'avant juillet 1997 ?");
    } else {
      na("amiante", "Amiante (DTA)", "Permis de construire de juillet 1997 ou après : non exigé");
    }
  } else {
    // 3. Logement : plomb (CREP) si construit avant 1949 ; illimité sans plomb, 6 ans avec ; peintures dégradées = travaux.
    const before1949 = builtBefore(1949, year, fiche?.constructionPeriod);
    const lead = extraction.lead;
    const leadDate = toDate(lead.date);
    if (before1949 === false && !lead.found) {
      na("plomb", "Plomb (CREP)", "Construit en 1949 ou après : non exigé");
    } else if (!lead.found) {
      if (before1949 === true) {
        blocking(
          "plomb",
          "Plomb (CREP)",
          "Absent : obligatoire, logement d'avant 1949",
          "Le logement a été construit avant 1949 : un constat de risque d'exposition au plomb (CREP) est obligatoire. Merci de nous l'envoyer, ou de le faire réaliser.",
          true,
        );
      } else {
        ask("plomb", "Plomb (CREP)", "Absent : obligatoire si le logement date d'avant 1949", "Le logement a-t-il été construit avant 1949 ?");
      }
    } else if (lead.presence === "NON") {
      ok("plomb", "Plomb (CREP)", "Sans plomb : valable sans limite");
    } else if (lead.presence === "OUI" && leadDate) {
      const v = validity(leadDate, 72, now);
      if (v.state === "expired") {
        blocking(
          "plomb",
          "Plomb (CREP)",
          `Avec plomb · expiré le ${day(v.until)}`,
          "Le constat plomb signale du plomb et a plus de 6 ans : il faut le faire refaire par un diagnostiqueur certifié.",
        );
      } else {
        ok("plomb", "Plomb (CREP)", `Avec plomb · ${v.state === "soon" ? "expire le" : "valable jusqu'au"} ${day(v.until)}`, v.state === "soon" ? "warn" : "ok");
      }
    } else {
      team("plomb", "Plomb (CREP)", "Résultat ou date non lu : à vérifier dans le fichier", "file");
    }

    // 4. Électricité et gaz : si l'installation a plus de 15 ans ; valables 6 ans.
    // Seule la validité compte : les anomalies constatées ne sont pas contrôlées.
    const installation = [
      {
        id: "electricite",
        label: "Électricité",
        item: extraction.electricity,
        old: extraction.electricity.installationOver15Years ?? null,
        notRequired: "Installation de moins de 15 ans : non exigé",
        question: "L'installation électrique a-t-elle plus de 15 ans ?",
        required: "L'installation électrique a plus de 15 ans : un diagnostic électricité est obligatoire. Merci de nous l'envoyer, ou de le faire réaliser.",
        redo: "Le diagnostic électricité a plus de 6 ans : il faut le faire refaire par un diagnostiqueur certifié.",
      },
      {
        id: "gaz",
        label: "Gaz",
        item: extraction.gas,
        // Pas d'installation de gaz d'après le DPE : non requis.
        old: extraction.gas.installationPresent === false ? false : null,
        notRequired:
          extraction.gas.installationPresent === false
            ? "Chauffage et eau chaude sans gaz d'après le DPE : non exigé"
            : "Installation de moins de 15 ans : non exigé",
        question: "Le logement a-t-il une installation de gaz de plus de 15 ans ?",
        required: "Le logement a une installation de gaz de plus de 15 ans : un diagnostic gaz est obligatoire. Merci de nous l'envoyer, ou de le faire réaliser.",
        redo: "Le diagnostic gaz a plus de 6 ans : il faut le faire refaire par un diagnostiqueur certifié.",
      },
    ];
    for (const entry of installation) {
      const itemDate = toDate(entry.item.date);
      if (entry.item.found && itemDate) {
        const v = validity(itemDate, 72, now);
        if (v.state === "expired") blocking(entry.id, entry.label, `Expiré le ${day(v.until)}`, entry.redo);
        else ok(entry.id, entry.label, `${v.state === "soon" ? "Expire le" : "Valable jusqu'au"} ${day(v.until)}`, v.state === "soon" ? "warn" : "ok");
      } else if (entry.item.found) {
        team(entry.id, entry.label, "Date non lue : valable 6 ans, à vérifier dans le fichier", "file");
      } else if (entry.old === true) {
        blocking(entry.id, entry.label, "Absent : installation de plus de 15 ans", entry.required, true);
      } else if (entry.old === null) {
        ask(entry.id, entry.label, "Absent : obligatoire si l'installation a plus de 15 ans", entry.question);
      } else {
        na(entry.id, entry.label, entry.notRequired);
      }
    }
  }

  // Données utiles non trouvées (affichées pour que l'équipe sache quoi chercher à la main).
  const wanted: Array<[unknown, string]> = [
    // Année de construction : elle dit si le plomb (avant 1949) ou l'amiante (avant juillet 1997) sont exigés.
    [year ?? (fiche?.constructionPeriod || null), "année de construction"],
  ];
  for (const [value, label] of wanted) if (value == null || value === "") notFound.push(label);

  return { overall: overallOf(checks), checks, notFound, dpeToApply };
}

export function overallOf(checks: Array<Pick<DiagnosticCheck, "group" | "tone">>): DiagnosticOverall {
  if (checks.some((check) => check.group === "blocking")) return "non_conforme";
  if (checks.some((check) => check.group !== "na" && (check.group !== "ok" || check.tone !== "ok"))) return "a_verifier";
  return "conforme";
}
