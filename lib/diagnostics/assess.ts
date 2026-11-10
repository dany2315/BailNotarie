/**
 * Règles appliquées aux données lues dans les diagnostics. Fonctions pures : le modèle d'IA
 * recopie ce qui est écrit, c'est ce code qui dit ce qui est conforme, à vérifier ou manquant.
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

/** Mois entiers écoulés entre deux dates. */
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return months;
}

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

export function assessDiagnostics(extraction: DiagnosticExtraction, context: AssessContext): DiagnosticAssessment {
  const now = context.now ?? new Date();
  const checks: DiagnosticCheck[] = [];
  const notFound: string[] = [];
  const year = extraction.property.constructionYear;
  const { dpe } = extraction;
  let dpeToApply: DiagnosticAssessment["dpeToApply"] = null;

  // 1. DPE : présent, lisible, valide, logement louable.
  if (!dpe.found) {
    checks.push({ id: "dpe", label: "DPE", tone: "missing", text: "Absent des fichiers : obligatoire" });
  } else if (!dpe.energyClass || !dpe.date) {
    checks.push({ id: "dpe", label: "DPE", tone: "warn", text: "Classe ou date non lue : à vérifier dans le fichier" });
  } else {
    const validUntil = dpeValidUntil(dpe.date);
    const verdict = assessDpe(dpe.energyClass, dpe.date, now, { commercial: context.commercial });
    const summary = `Classe ${dpe.energyClass}${dpe.gesClass ? ` · GES ${dpe.gesClass}` : ""} · établi le ${day(toDate(dpe.date)!)}${validUntil ? `, valable jusqu'au ${day(validUntil)}` : ""}`;
    const expected = expectedDpeLetter(extraction);
    const mismatch = expected && expected !== dpe.energyClass ? ` · la lettre lue ne correspond pas aux valeurs (calcul : ${expected})` : "";
    checks.push({
      id: "dpe",
      label: "DPE",
      tone: verdict.blocking ? "missing" : verdict.warning || mismatch ? "warn" : "ok",
      text: verdict.blocking ? `${summary} · ${verdict.message}` : `${summary}${verdict.warning ? ` · ${verdict.warning}` : ""}${mismatch}`,
    });

    // Comparaison avec la fiche du bien (saisie par l'équipe ou par le propriétaire).
    const fiche = context.property;
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

  // 2. État des risques et pollutions : obligatoire, de moins de 6 mois à la signature.
  const erpDate = toDate(extraction.erp.date);
  if (!extraction.erp.found) {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "missing", text: "Absent : obligatoire, de moins de 6 mois à la signature" });
  } else if (!erpDate) {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "warn", text: "Date non lue : à vérifier (moins de 6 mois à la signature)" });
  } else if (monthsBetween(erpDate, now) >= 6) {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "warn", text: `Établi le ${day(erpDate)} : plus de 6 mois, à refaire avant la signature` });
  } else {
    checks.push({ id: "erp", label: "État des risques (ERP)", tone: "ok", text: `Établi le ${day(erpDate)} : moins de 6 mois` });
  }

  const presenceText = (base: string, presence: "OUI" | "NON" | null, what: string) =>
    presence === "OUI" ? `${base} · présence de ${what} signalée` : presence === "NON" ? `${base} · rien signalé` : base;
  const foundOn = (date: string | null) => (toDate(date) ? `Établi le ${day(toDate(date)!)}` : "Présent");

  // 3. Amiante : repérage obligatoire à annexer au bail commercial (permis avant le 1er juillet 1997).
  const asbestos = extraction.asbestos;
  if (asbestos.found) {
    checks.push({
      id: "amiante",
      label: "Amiante",
      tone: asbestos.presence === "OUI" ? "warn" : "ok",
      text: presenceText(foundOn(asbestos.date), asbestos.presence, "amiante"),
    });
  } else if (year != null && year >= 1997) {
    checks.push({ id: "amiante", label: "Amiante", tone: "ok", text: `Non requis : construit en ${year}` });
  } else if (context.commercial) {
    checks.push({
      id: "amiante",
      label: "Amiante",
      tone: year != null ? "missing" : "warn",
      text: year != null ? `Construit en ${year} : repérage amiante (DTA) obligatoire` : "Année de construction inconnue : DTA obligatoire si permis avant juillet 1997",
    });
  } else {
    checks.push({
      id: "amiante",
      label: "Amiante",
      tone: "warn",
      text: year != null ? `Construit en ${year} : repérage amiante à tenir à disposition du locataire` : "Année inconnue : repérage à tenir à disposition si permis avant juillet 1997",
    });
  }

  if (!context.commercial) {
    // 4. Plomb (CREP) : logement construit avant 1949.
    const lead = extraction.lead;
    if (lead.found) {
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: lead.presence === "OUI" ? "warn" : "ok", text: presenceText(foundOn(lead.date), lead.presence, "plomb") });
    } else if (year != null && year < 1949) {
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: "missing", text: `Construit en ${year} : CREP obligatoire (avant 1949)` });
    } else if (year == null) {
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: "warn", text: "Année inconnue : CREP obligatoire si construit avant 1949" });
    } else {
      checks.push({ id: "plomb", label: "Plomb (CREP)", tone: "ok", text: `Non requis : construit en ${year}` });
    }

    // 5. Électricité et gaz : installations de plus de 15 ans.
    for (const [id, label, item] of [
      ["electricite", "Électricité", extraction.electricity],
      ["gaz", "Gaz", extraction.gas],
    ] as const) {
      if (item.found) {
        checks.push({ id, label, tone: item.anomalies ? "warn" : "ok", text: `${foundOn(item.date)}${item.anomalies ? " · anomalies signalées" : item.anomalies === false ? " · sans anomalie" : ""}` });
      } else {
        checks.push({
          id,
          label,
          tone: "warn",
          text: id === "gaz" ? "Absent : obligatoire si une installation de gaz a plus de 15 ans" : "Absent : obligatoire si l'installation a plus de 15 ans",
        });
      }
    }

    // 6. Bruit et termites : seulement selon la zone, affichés s'ils sont fournis.
    if (extraction.noise.found) checks.push({ id: "bruit", label: "Bruit", tone: "ok", text: foundOn(extraction.noise.date) });
  }
  if (extraction.termites.found) {
    checks.push({
      id: "termites",
      label: "Termites",
      tone: extraction.termites.presence === "OUI" ? "warn" : "ok",
      text: presenceText(foundOn(extraction.termites.date), extraction.termites.presence, "termites"),
    });
  }

  // 7. Le diagnostic porte-t-il sur ce bien ?
  const fiche = context.property;
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
  const surface = extraction.property.surfaceM2;
  if (surface && fiche?.surfaceM2) {
    const gap = Math.abs(surface - fiche.surfaceM2) / fiche.surfaceM2;
    checks.push({
      id: "surface",
      label: "Surface",
      tone: gap > 0.05 ? "warn" : "ok",
      text:
        gap > 0.05
          ? `${surface.toString().replace(".", ",")} m² dans le diagnostic, ${fiche.surfaceM2.toString().replace(".", ",")} m² sur la fiche`
          : `${surface.toString().replace(".", ",")} m², comme la fiche`,
    });
  }

  if (extraction.readingIssues.length) {
    checks.push({ id: "lecture", label: "Lecture", tone: "warn", text: extraction.readingIssues.join(" · ") });
  }

  // Données utiles non trouvées (affichées pour que l'équipe sache quoi chercher à la main).
  const wanted: Array<[unknown, string]> = [
    [extraction.property.address, "adresse"],
    [extraction.property.surfaceM2, "surface"],
    [extraction.property.constructionYear, "année de construction"],
    [dpe.found ? dpe.energyClass : true, "classe énergie"],
    [dpe.found ? dpe.date : true, "date du DPE"],
    [dpe.found ? dpe.ademeNumber : true, "numéro ADEME"],
    [extraction.diagnostician.name || extraction.diagnostician.company, "diagnostiqueur"],
  ];
  for (const [value, label] of wanted) if (value == null || value === "") notFound.push(label);

  const overall: DiagnosticOverall = checks.some((check) => check.tone === "missing")
    ? "non_conforme"
    : checks.some((check) => check.tone === "warn")
      ? "a_verifier"
      : "conforme";

  return { overall, checks, notFound, dpeToApply };
}
