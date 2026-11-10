/**
 * Règles appliquées aux données lues dans les diagnostics. Fonctions pures : le modèle d'IA
 * recopie ce qui est écrit, c'est ce code qui dit quoi faire.
 *
 * Seuls les diagnostics obligatoires pour une mise en location sont contrôlés, avec leur validité :
 * - logement (loi du 6 juillet 1989, art. 3-3) : DPE (10 ans), ERP (moins de 6 mois), plomb / CREP
 *   si construit avant 1949 (illimité sans plomb, 6 ans avec plomb ; peintures dégradées = travaux),
 *   électricité et gaz si l'installation a plus de 15 ans (6 ans) ;
 * - local commercial : DPE (10 ans), ERP (moins de 6 mois), amiante / DTA si permis de construire
 *   antérieur au 1er juillet 1997.
 * Termites, mérules, assainissement et repérage amiante du logement ne concernent que la vente.
 *
 * Chaque point est rangé selon ce que l'équipe doit faire :
 * - « blocking » : la location est impossible en l'état → prévenir le propriétaire (message fourni) ;
 * - « ask »      : l'information manque → question au propriétaire (réponse notée ensuite) ;
 * - « team »     : l'équipe s'en charge (refaire l'ERP, reporter le DPE, vérifier un fichier) ;
 * - « ok »       : conforme.
 */
import { assessDpe, dpeValidUntil } from "@/lib/utils/dpe";
import { ENERGY_LETTERS, type DiagnosticAnswers, type DiagnosticExtraction, type EnergyLetter, type QuestionKey } from "./schema";

export type CheckTone = "ok" | "warn" | "missing";
export type CheckGroup = "blocking" | "ask" | "team" | "ok";
export type TeamAction = "erp" | "dpe-fiche" | "file";

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
  question?: { key: QuestionKey; text: string };
  /** « team » : ce que l'équipe peut faire depuis la fiche. */
  action?: TeamAction;
}

export type DiagnosticOverall = "conforme" | "a_verifier" | "non_conforme";

export interface DiagnosticAssessment {
  overall: DiagnosticOverall;
  checks: DiagnosticCheck[];
  /** Données utiles que le modèle n'a pas trouvées. */
  notFound: string[];
  /** DPE lu à reporter dans la fiche du bien (absent ou différent), sinon null. */
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

const day = (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

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
  const answers: DiagnosticAnswers = extraction.answers ?? {};
  const checks: DiagnosticCheck[] = [];
  const notFound: string[] = [];
  const fiche = context.property;
  const year = extraction.property.constructionYear;
  const { dpe } = extraction;
  const place = context.commercial ? "local" : "logement";
  let dpeToApply: DiagnosticAssessment["dpeToApply"] = null;

  const blocking = (id: string, label: string, text: string, message: string) =>
    checks.push({ id, label, tone: "missing", group: "blocking", text, message });
  const ask = (id: string, label: string, text: string, key: QuestionKey, question: string) =>
    checks.push({ id, label, tone: "warn", group: "ask", text, question: { key, text: question } });
  const team = (id: string, label: string, text: string, action: TeamAction) =>
    checks.push({ id, label, tone: "warn", group: "team", text, action });
  const ok = (id: string, label: string, text: string, tone: CheckTone = "ok") => checks.push({ id, label, tone, group: "ok", text });

  // 1. DPE (logement et local) : valable 10 ans ; logement classé G interdit à la location depuis 2025.
  if (!dpe.found) {
    blocking("dpe", "DPE", "Absent", `Il nous manque le DPE du ${place} : merci de nous l'envoyer, ou de le faire réaliser par un diagnostiqueur certifié.`);
  } else if (!dpe.energyClass || !dpe.date) {
    team("dpe", "DPE", "Classe ou date non lue : à vérifier dans le fichier", "file");
  } else {
    const validUntil = dpeValidUntil(dpe.date);
    const verdict = assessDpe(dpe.energyClass, dpe.date, now, { commercial: context.commercial });
    const summary = `Classe ${dpe.energyClass}${dpe.gesClass ? `, GES ${dpe.gesClass}` : ""}`;
    if (verdict.expired) {
      blocking(
        "dpe",
        "DPE",
        `${summary} · expiré${validUntil ? ` le ${day(validUntil)}` : ""}`,
        `Votre DPE n'est plus valable${validUntil ? ` depuis le ${day(validUntil)}` : ""} : il faut en faire réaliser un nouveau par un diagnostiqueur certifié.`,
      );
    } else if (verdict.blocking) {
      blocking(
        "dpe",
        "DPE",
        `${summary} · ${verdict.message}`,
        `Votre logement est classé ${dpe.energyClass} au DPE : il ne peut plus être loué. Des travaux de rénovation énergétique sont nécessaires avant de signer un bail.`,
      );
    } else {
      ok("dpe", "DPE", `${summary} · valable jusqu'au ${validUntil ? day(validUntil) : "?"}${verdict.warning ? ` · ${verdict.warning}` : ""}`, verdict.warning ? "warn" : "ok");
    }
    const expected = expectedDpeLetter(extraction);
    if (expected && expected !== dpe.energyClass) {
      team("dpe-lettre", "Étiquette DPE", `Lettre lue ${dpe.energyClass}, les valeurs donnent ${expected} : vérifiez l'étiquette`, "file");
    }

    // Report dans la fiche du bien (le DPE y est repris pour le bail et le notaire).
    const ficheDate = isoDay(fiche?.dpeDate ?? null);
    if (!fiche?.dpeClass || !ficheDate || fiche.dpeClass !== dpe.energyClass || ficheDate !== dpe.date || (dpe.gesClass && fiche.gesClass !== dpe.gesClass)) {
      team("fiche", "Fiche du bien", fiche?.dpeClass ? `Indique classe ${fiche.dpeClass} : à corriger` : "DPE pas encore saisi", "dpe-fiche");
      dpeToApply = { dpeClass: dpe.energyClass, gesClass: dpe.gesClass, dpeDate: dpe.date };
    }
  }

  // 2. État des risques et pollutions (logement et local) : moins de 6 mois à la signature. L'équipe peut le refaire.
  const erpDate = toDate(extraction.erp.date);
  if (!extraction.erp.found) {
    team("erp", "État des risques (ERP)", "Absent", "erp");
  } else if (!erpDate) {
    team("erp", "État des risques (ERP)", "Date non lue : il doit avoir moins de 6 mois à la signature", "erp");
  } else {
    const v = validity(erpDate, 6, now);
    if (v.state === "valid") ok("erp", "État des risques (ERP)", `Valable jusqu'au ${day(v.until)}`);
    else team("erp", "État des risques (ERP)", v.state === "expired" ? `Expiré le ${day(v.until)}` : `Expire le ${day(v.until)}`, "erp");
  }

  if (context.commercial) {
    // 3. Local : amiante (dossier technique amiante) si permis de construire avant le 1er juillet 1997.
    const before1997 = builtBefore(1997, year, fiche?.constructionPeriod) ?? answers.before1997 ?? null;
    const asbestos = extraction.asbestos;
    if (asbestos.found) {
      ok(
        "amiante",
        "Amiante (DTA)",
        asbestos.presence === "OUI" ? "Amiante repéré : suivi de son état à prévoir" : "Présent",
        asbestos.presence === "OUI" ? "warn" : "ok",
      );
    } else if (before1997 === true) {
      blocking(
        "amiante",
        "Amiante (DTA)",
        "Absent : obligatoire, local d'avant juillet 1997",
        "Le local a été construit avant juillet 1997 : le dossier technique amiante (DTA) est obligatoire. Merci de nous l'envoyer.",
      );
    } else if (before1997 === null) {
      ask("amiante", "Amiante (DTA)", "Année de construction inconnue", "before1997", "Le permis de construire du local date-t-il d'avant juillet 1997 ?");
    }
  } else {
    // 3. Logement : plomb (CREP) si construit avant 1949 ; illimité sans plomb, 6 ans avec ; peintures dégradées = travaux.
    const before1949 = builtBefore(1949, year, fiche?.constructionPeriod) ?? answers.before1949 ?? null;
    const lead = extraction.lead;
    const leadDate = toDate(lead.date);
    if (before1949 === false) {
      // Construit en 1949 ou après : non requis.
    } else if (!lead.found) {
      if (before1949 === true) {
        blocking(
          "plomb",
          "Plomb (CREP)",
          "Absent : obligatoire, logement d'avant 1949",
          "Le logement a été construit avant 1949 : un constat de risque d'exposition au plomb (CREP) est obligatoire. Merci de nous l'envoyer, ou de le faire réaliser.",
        );
      } else {
        ask("plomb", "Plomb (CREP)", "Année de construction inconnue", "before1949", "Le logement a-t-il été construit avant 1949 ?");
      }
    } else if (lead.degraded) {
      blocking(
        "plomb",
        "Plomb (CREP)",
        "Peintures au plomb dégradées",
        "Le constat plomb signale des peintures dégradées contenant du plomb : des travaux sont obligatoires avant de louer le logement.",
      );
    } else if (lead.presence === "NON") {
      ok("plomb", "Plomb (CREP)", "Pas de plomb : valable sans limite");
    } else if (lead.presence === "OUI" && leadDate) {
      const v = validity(leadDate, 72, now);
      if (v.state === "expired") {
        blocking(
          "plomb",
          "Plomb (CREP)",
          `Plomb signalé · expiré le ${day(v.until)}`,
          "Le constat plomb signale du plomb et a plus de 6 ans : il faut le faire refaire par un diagnostiqueur certifié.",
        );
      } else if (lead.degraded === false) {
        ok("plomb", "Plomb (CREP)", `Plomb non dégradé · valable jusqu'au ${day(v.until)}`, v.state === "soon" ? "warn" : "ok");
      } else {
        // État des peintures non lu (analyse ancienne ou constat incomplet) : l'équipe vérifie la classe 3.
        team("plomb", "Plomb (CREP)", `Plomb signalé, valable jusqu'au ${day(v.until)} : vérifiez qu'aucune peinture n'est dégradée (classe 3)`, "file");
      }
    } else {
      team("plomb", "Plomb (CREP)", "Résultat ou date non lu : à vérifier dans le fichier", "file");
    }

    // 4. Électricité et gaz : si l'installation a plus de 15 ans ; valables 6 ans.
    const installation = [
      {
        id: "electricite",
        label: "Électricité",
        item: extraction.electricity,
        old: extraction.electricity.installationOver15Years ?? answers.electricityOld ?? null,
        key: "electricityOld" as const,
        question: "L'installation électrique a-t-elle plus de 15 ans ?",
        required: "L'installation électrique a plus de 15 ans : un diagnostic électricité est obligatoire. Merci de nous l'envoyer, ou de le faire réaliser.",
        redo: "Le diagnostic électricité a plus de 6 ans : il faut le faire refaire par un diagnostiqueur certifié.",
      },
      {
        id: "gaz",
        label: "Gaz",
        item: extraction.gas,
        // Pas d'installation de gaz d'après le DPE : non requis.
        old: extraction.gas.installationPresent === false ? false : answers.gasOld ?? null,
        key: "gasOld" as const,
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
        else ok(entry.id, entry.label, `Valable jusqu'au ${day(v.until)}${entry.item.anomalies ? " · anomalies signalées" : ""}`, v.state === "soon" ? "warn" : "ok");
      } else if (entry.item.found) {
        team(entry.id, entry.label, "Date non lue : valable 6 ans, à vérifier dans le fichier", "file");
      } else if (entry.old === true) {
        blocking(entry.id, entry.label, "Absent : installation de plus de 15 ans", entry.required);
      } else if (entry.old === null) {
        ask(entry.id, entry.label, "Absent : obligatoire si l'installation a plus de 15 ans", entry.key, entry.question);
      }
      // Installation récente ou pas de gaz : non requis, rien à afficher.
    }
  }

  // 5. Les diagnostics portent-ils sur ce bien ?
  const readPostal = extraction.property.postalCode?.replace(/\s/g, "") || null;
  if (readPostal && fiche?.postalCode) {
    const readNumber = extraction.property.address?.match(/^\s*(\d+)/)?.[1] ?? null;
    const ficheNumber = fiche.housenumber?.match(/\d+/)?.[0] ?? null;
    const same = readPostal === fiche.postalCode && (!readNumber || !ficheNumber || readNumber === ficheNumber);
    const read = extraction.property.address || readPostal;
    if (!same && answers.address === false) {
      blocking(
        "adresse",
        "Adresse",
        `Diagnostics d'un autre bien (${read})`,
        `Les diagnostics reçus concernent un autre bien (${read}) : merci de nous envoyer ceux du bien situé ${fiche.fullAddress || "dans le dossier"}.`,
      );
    } else if (!same && answers.address !== true) {
      ask("adresse", "Adresse", `Le diagnostic indique « ${read} »`, "address", `Ces diagnostics concernent-ils bien le bien situé ${fiche.fullAddress || "dans le dossier"} ?`);
    }
  }
  // Surface habitable : mention obligatoire du bail d'habitation.
  const surface = extraction.property.surfaceM2;
  if (!context.commercial && surface && fiche?.surfaceM2 && answers.surface !== true) {
    const gap = Math.abs(surface - fiche.surfaceM2) / fiche.surfaceM2;
    const fmt = (value: number) => value.toString().replace(".", ",");
    if (gap > 0.05) {
      ask("surface", "Surface habitable", `${fmt(surface)} m² dans le diagnostic, ${fmt(fiche.surfaceM2)} m² sur la fiche`, "surface", `La surface habitable du logement est-elle bien de ${fmt(surface)} m² ?`);
    }
  }

  for (const [index, issue] of extraction.readingIssues.entries()) {
    team(`lecture-${index}`, "Fichier", issue, "file");
  }

  // Données utiles non trouvées (affichées pour que l'équipe sache quoi chercher à la main).
  const wanted: Array<[unknown, string]> = [
    [extraction.property.address, "adresse"],
    [context.commercial ? true : extraction.property.surfaceM2, "surface"],
    [year ?? (fiche?.constructionPeriod || null), "année de construction"],
    [dpe.found ? dpe.ademeNumber : true, "numéro ADEME"],
  ];
  for (const [value, label] of wanted) if (value == null || value === "") notFound.push(label);

  const overall: DiagnosticOverall = checks.some((check) => check.group === "blocking")
    ? "non_conforme"
    : checks.some((check) => check.group !== "ok" || check.tone !== "ok")
      ? "a_verifier"
      : "conforme";

  return { overall, checks, notFound, dpeToApply };
}

/** Texte prêt à envoyer (ou à lire au téléphone) pour ce qui bloque, ou pour les questions. */
export function ownerMessageLines(assessment: DiagnosticAssessment, kind: "blocking" | "ask"): string[] {
  return assessment.checks
    .filter((check) => check.group === kind)
    .map((check) => (kind === "blocking" ? check.message : check.question?.text))
    .filter((line): line is string => !!line);
}
