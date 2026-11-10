/**
 * Règles appliquées aux données lues dans les diagnostics. Fonctions pures : le modèle d'IA
 * recopie ce qui est écrit, c'est ce code qui dit ce qui est conforme, à vérifier ou manquant.
 *
 * Seuls les diagnostics obligatoires pour une mise en location sont contrôlés, avec leur validité :
 * - logement (loi du 6 juillet 1989, art. 3-3) : DPE (10 ans), ERP (moins de 6 mois), plomb / CREP
 *   si construit avant 1949 (illimité sans plomb, 6 ans avec plomb), électricité et gaz si
 *   l'installation a plus de 15 ans (6 ans) ;
 * - local commercial : DPE (10 ans), ERP (moins de 6 mois), amiante / DTA si permis de construire
 *   antérieur au 1er juillet 1997.
 * Termites, mérules, assainissement et repérage amiante du logement ne concernent que la vente.
 */
import { assessDpe, dpeValidUntil } from "@/lib/utils/dpe";
import { ENERGY_LETTERS, type DiagnosticExtraction, type EnergyLetter } from "./schema";

export type CheckTone = "ok" | "warn" | "missing";

export interface DiagnosticCheck {
  id: string;
  label: string;
  tone: CheckTone;
  text: string;
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

/** Validité d'un diagnostic à durée fixe : texte et ton selon la date de fin. */
function validity(date: Date, months: number, now: Date): { tone: CheckTone; text: string } {
  const until = addMonths(date, months);
  if (until < now) return { tone: "missing", text: `établi le ${day(date)}, expiré le ${day(until)} : à refaire` };
  if (until.getTime() - now.getTime() < SOON_MS) {
    return { tone: "warn", text: `établi le ${day(date)}, expire le ${day(until)} : à refaire si la signature est après` };
  }
  return { tone: "ok", text: `établi le ${day(date)}, valable jusqu'au ${day(until)}` };
}

export function assessDiagnostics(extraction: DiagnosticExtraction, context: AssessContext): DiagnosticAssessment {
  const now = context.now ?? new Date();
  const checks: DiagnosticCheck[] = [];
  const notFound: string[] = [];
  const fiche = context.property;
  const year = extraction.property.constructionYear;
  const { dpe } = extraction;
  let dpeToApply: DiagnosticAssessment["dpeToApply"] = null;

  // 1. DPE (logement et local) : valable 10 ans ; logement classé G interdit à la location depuis 2025.
  if (!dpe.found) {
    checks.push({ id: "dpe", label: "DPE", tone: "missing", text: "Absent des fichiers : obligatoire" });
  } else if (!dpe.energyClass || !dpe.date) {
    checks.push({ id: "dpe", label: "DPE", tone: "warn", text: "Classe ou date non lue : à vérifier dans le fichier" });
  } else {
    const validUntil = dpeValidUntil(dpe.date);
    const verdict = assessDpe(dpe.energyClass, dpe.date, now, { commercial: context.commercial });
    const summary = `Classe ${dpe.energyClass}${dpe.gesClass ? ` · GES ${dpe.gesClass}` : ""} · établi le ${day(toDate(dpe.date)!)}${
      validUntil ? (verdict.expired ? `, expiré le ${day(validUntil)}` : `, valable jusqu'au ${day(validUntil)}`) : ""
    }`;
    const expected = expectedDpeLetter(extraction);
    const mismatch = expected && expected !== dpe.energyClass ? ` · la lettre lue ne correspond pas aux valeurs (calcul : ${expected})` : "";
    checks.push({
      id: "dpe",
      label: "DPE",
      tone: verdict.blocking ? "missing" : verdict.warning || mismatch ? "warn" : "ok",
      text: verdict.blocking ? `${summary} · ${verdict.message}` : `${summary}${verdict.warning ? ` · ${verdict.warning}` : ""}${mismatch}`,
    });

    // Comparaison avec la fiche du bien (le DPE y est repris pour le bail et le notaire).
    const ficheDate = isoDay(fiche?.dpeDate ?? null);
    if (!fiche?.dpeClass || !ficheDate) {
      checks.push({ id: "fiche", label: "Fiche du bien", tone: "warn", text: "DPE pas encore saisi : reportez les valeurs lues" });
      dpeToApply = { dpeClass: dpe.energyClass, gesClass: dpe.gesClass, dpeDate: dpe.date };
    } else if (fiche.dpeClass !== dpe.energyClass || ficheDate !== dpe.date || (dpe.gesClass && fiche.gesClass !== dpe.gesClass)) {
      checks.push({
        id: "fiche",
        label: "Fiche du bien",
        tone: "warn",
        text: `La fiche indique classe ${fiche.dpeClass}${fiche.gesClass ? ` · GES ${fiche.gesClass}` : ""} du ${day(toDate(ficheDate)!)} : à corriger`,
      });
      dpeToApply = { dpeClass: dpe.energyClass, gesClass: dpe.gesClass, dpeDate: dpe.date };
    } else {
      checks.push({ id: "fiche", label: "Fiche du bien", tone: "ok", text: "Même DPE que la fiche du bien" });
    }
  }

  // 2. État des risques et pollutions (logement et local) : moins de 6 mois à la signature.
  const erpDate = toDate(extraction.erp.date);
  if (!extraction.erp.found) {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "missing", text: "Absent : obligatoire, de moins de 6 mois à la signature" });
  } else if (!erpDate) {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "warn", text: "Date non lue : doit avoir moins de 6 mois à la signature" });
  } else {
    const result = validity(erpDate, 6, now);
    checks.push({ id: "erp", label: "État des risques (ERP)", ...result, text: result.text.charAt(0).toUpperCase() + result.text.slice(1) });
  }

  if (context.commercial) {
    // 3. Local : amiante (dossier technique amiante) si permis de construire avant le 1er juillet 1997.
    const before1997 = builtBefore(1997, year, fiche?.constructionPeriod);
    const asbestos = extraction.asbestos;
    if (before1997 === false) {
      // Construit après 1997 : non requis, rien à afficher.
    } else if (asbestos.found) {
      checks.push({
        id: "amiante",
        label: "Amiante (DTA)",
        tone: asbestos.presence === "OUI" ? "warn" : "ok",
        text:
          asbestos.presence === "OUI"
            ? `${asbestos.date ? `Établi le ${day(toDate(asbestos.date)!)}` : "Présent"} · matériaux amiantés signalés : suivi de leur état à vérifier`
            : `${asbestos.date ? `Établi le ${day(toDate(asbestos.date)!)}` : "Présent"}${asbestos.presence === "NON" ? " · pas d'amiante repéré" : ""}`,
      });
    } else {
      checks.push({
        id: "amiante",
        label: "Amiante (DTA)",
        tone: before1997 ? "missing" : "warn",
        text: before1997 ? "Absent : obligatoire pour un local construit avant juillet 1997" : "Année de construction inconnue : obligatoire si permis avant juillet 1997",
      });
    }
  } else {
    // 3. Logement : plomb (CREP) si construit avant 1949 ; illimité sans plomb, 6 ans avec plomb.
    const before1949 = builtBefore(1949, year, fiche?.constructionPeriod);
    const lead = extraction.lead;
    const leadDate = toDate(lead.date);
    if (before1949 === false) {
      // Construit en 1949 ou après : non requis, rien à afficher.
    } else if (!lead.found) {
      checks.push({
        id: "plomb",
        label: "Plomb (CREP)",
        tone: before1949 ? "missing" : "warn",
        text: before1949 ? "Absent : obligatoire pour un logement construit avant 1949" : "Année de construction inconnue : obligatoire si construit avant 1949",
      });
    } else if (lead.presence === "NON") {
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: "ok", text: `${leadDate ? `Établi le ${day(leadDate)}` : "Présent"} · pas de plomb : valable sans limite de durée` });
    } else if (lead.presence === "OUI" && leadDate) {
      const result = validity(leadDate, 72, now);
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: result.tone, text: `Plomb signalé · ${result.text}` });
    } else {
      checks.push({
        id: "plomb",
        label: "Plomb (CREP)",
        tone: "warn",
        text: lead.presence === "OUI" ? "Plomb signalé, date non lue : valable 6 ans, à vérifier" : "Résultat non lu : valable sans limite sans plomb, 6 ans avec plomb",
      });
    }

    // 4. Électricité et gaz : si l'installation a plus de 15 ans ; valables 6 ans.
    for (const [id, label, item] of [
      ["electricite", "Électricité", extraction.electricity],
      ["gaz", "Gaz", extraction.gas],
    ] as const) {
      const itemDate = toDate(item.date);
      if (id === "gaz" && !item.found && extraction.gas.installationPresent === false) {
        checks.push({ id, label, tone: "ok", text: "Pas d'installation de gaz d'après les diagnostics : non requis" });
      } else if (!item.found) {
        checks.push({
          id,
          label,
          tone: "warn",
          text: id === "gaz" ? "Absent : obligatoire s'il y a une installation de gaz de plus de 15 ans" : "Absent : obligatoire si l'installation a plus de 15 ans",
        });
      } else if (!itemDate) {
        checks.push({ id, label, tone: "warn", text: "Date non lue : valable 6 ans, à vérifier" });
      } else {
        const result = validity(itemDate, 72, now);
        const anomalies = item.anomalies ? " · anomalies signalées (n'empêchent pas la location)" : "";
        checks.push({ id, label, tone: result.tone, text: `${result.text.charAt(0).toUpperCase()}${result.text.slice(1)}${anomalies}` });
      }
    }
  }

  // 5. Le diagnostic porte-t-il sur ce bien ?
  const readPostal = extraction.property.postalCode?.replace(/\s/g, "") || null;
  if (readPostal && fiche?.postalCode) {
    const readNumber = extraction.property.address?.match(/^\s*(\d+)/)?.[1] ?? null;
    const ficheNumber = fiche.housenumber?.match(/\d+/)?.[0] ?? null;
    const same = readPostal === fiche.postalCode && (!readNumber || !ficheNumber || readNumber === ficheNumber);
    checks.push({
      id: "adresse",
      label: "Adresse",
      tone: same ? "ok" : "warn",
      text: same ? "Correspond au bien du dossier" : `Le diagnostic porte sur « ${extraction.property.address || readPostal} » : vérifiez que c'est bien ce bien`,
    });
  }
  // Surface habitable : mention obligatoire du bail d'habitation.
  const surface = extraction.property.surfaceM2;
  if (!context.commercial && surface && fiche?.surfaceM2) {
    const gap = Math.abs(surface - fiche.surfaceM2) / fiche.surfaceM2;
    const fmt = (value: number) => value.toString().replace(".", ",");
    checks.push({
      id: "surface",
      label: "Surface habitable",
      tone: gap > 0.05 ? "warn" : "ok",
      text: gap > 0.05 ? `${fmt(surface)} m² dans le diagnostic, ${fmt(fiche.surfaceM2)} m² sur la fiche` : `${fmt(surface)} m², comme la fiche`,
    });
  }

  if (extraction.readingIssues.length) {
    checks.push({ id: "lecture", label: "Lecture", tone: "warn", text: extraction.readingIssues.join(" · ") });
  }

  // Données utiles non trouvées (affichées pour que l'équipe sache quoi chercher à la main).
  const wanted: Array<[unknown, string]> = [
    [extraction.property.address, "adresse"],
    [context.commercial ? true : extraction.property.surfaceM2, "surface"],
    [year ?? (fiche?.constructionPeriod || null), "année de construction"],
    [dpe.found ? dpe.energyClass : true, "classe énergie"],
    [dpe.found ? dpe.date : true, "date du DPE"],
    [dpe.found ? dpe.ademeNumber : true, "numéro ADEME"],
  ];
  for (const [value, label] of wanted) if (value == null || value === "") notFound.push(label);

  const overall: DiagnosticOverall = checks.some((check) => check.tone === "missing")
    ? "non_conforme"
    : checks.some((check) => check.tone === "warn")
      ? "a_verifier"
      : "conforme";

  return { overall, checks, notFound, dpeToApply };
}
