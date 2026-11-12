/**
 * Une ligne par diagnostic, prête à afficher (fiche admin, espace notaire, e-mail au propriétaire).
 * Fonctions pures : les lectures de l'IA sont fusionnées, les règles appliquées (assess.ts),
 * puis les décisions de l'équipe (conforme, non concerné, date saisie).
 *
 * Fusion des lectures : la dernière lecture de tous les fichiers sert de base ; un nouveau fichier
 * ajouté pour un diagnostic (ERP, plomb…) est lu seul et remplace ce diagnostic s'il y est trouvé.
 */
import { assessDiagnostics, formatDay, type AssessContext, type DiagnosticCheck } from "./assess";
import { DIAGNOSTIC_SECTIONS, isDiagnosticItemKey, type DiagnosticExtraction, type DiagnosticItemKey, type EnergyLetter } from "./schema";

/** À remplacer · Manquant · À vérifier · Valide · Non concerné. */
export type ItemStatus = "replace" | "missing" | "check" | "valid" | "na";
/** Le premier est le bouton principal de la ligne. */
export type ItemAction = "upload" | "conforme" | "na" | "erp" | "date";

/** Diagnostics dont on peut saisir la date à la main si le nouveau fichier n'est pas lu (pas de classe ni de résultat à lire). */
export const DATE_ONLY_ITEMS: DiagnosticItemKey[] = ["erp", "electricite", "gaz", "amiante"];

export interface AnalysisRecord {
  id: string;
  item: string | null;
  status: string;
  extracted: unknown;
  documentIds: string[];
  createdAt: Date;
}

export interface DecisionRecord {
  id: string;
  item: string;
  kind: "CONFORME" | "NON_CONCERNE" | "DATE";
  note: string | null;
  basis: string | null;
  date: Date | null;
  documentId: string | null;
  createdByName: string | null;
  createdAt: Date;
}

export interface FileRecord {
  id: string;
  label: string | null;
  createdAt: Date;
  /** Justificatif (pièce « Autre »), pas un fichier de diagnostics. */
  proof?: boolean;
}

export interface ItemDecisionView {
  id: string;
  kind: DecisionRecord["kind"];
  note: string | null;
  byName: string | null;
  at: string;
  /** Justificatif (pièce du bien), s'il existe encore. */
  documentId: string | null;
}

export interface DiagnosticItemView {
  id: string;
  label: string;
  status: ItemStatus;
  text: string;
  /** Constat d'origine, quand une décision de l'équipe s'applique. */
  finding: string | null;
  /** Phrase pour le propriétaire (ce qui bloque). */
  message: string | null;
  /** Question pour le propriétaire (ce qui manque). */
  question: string | null;
  actions: ItemAction[];
  /** D'où vient l'information : fichier lu, nouveau fichier, date saisie. */
  origin: string | null;
  decision: ItemDecisionView | null;
  /** Date saisie à la main qui s'applique (annulable). */
  manualDateId: string | null;
  /** Constat au moment d'une décision (enregistré avec elle). */
  basis: string;
  /** Nouveau fichier en cours de lecture pour ce diagnostic. */
  reading: boolean;
  /** Nouveau fichier ajouté pour ce diagnostic, mais diagnostic non trouvé dedans. */
  unreadFile: { documentId: string; label: string | null } | null;
}

export interface MergedReading {
  extraction: DiagnosticExtraction | null;
  /** Diagnostics remplacés par un nouveau fichier lu seul. */
  sources: Partial<Record<DiagnosticItemKey, { documentId: string; label: string | null; at: Date }>>;
  /** Nouveau fichier ajouté pour ce diagnostic mais où il n'a pas été trouvé. */
  unread: Partial<Record<DiagnosticItemKey, { documentId: string; label: string | null }>>;
  /** Date saisie à la main, appliquée à la place de la lecture. */
  manualDates: Partial<Record<DiagnosticItemKey, DecisionRecord>>;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
/** Nom de fichier lisible : sans le préfixe technique ajouté à l'envoi (horodatage, identifiant). */
export const displayFileName = (name: string) => name.replace(/^\d{10,}-[a-z0-9]{5,}-/i, "");
const short = (date: Date) => date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Lectures réussies (de la plus ancienne à la plus récente), fichiers actuels, dates saisies. */
export function mergeReadings(analyses: AnalysisRecord[], files: FileRecord[], decisions: DecisionRecord[]): MergedReading {
  const fileById = new Map(files.map((file) => [file.id, file]));
  const done = analyses
    .filter((analysis) => analysis.status === "SUCCEEDED" && analysis.extracted)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const fullIndex = done.map((analysis) => analysis.item).lastIndexOf(null);
  const base = fullIndex >= 0 ? done[fullIndex] : null;
  // Fichiers lus seuls après la dernière lecture complète, et toujours présents.
  const later = done
    .slice(fullIndex + 1)
    .filter((analysis) => analysis.item && isDiagnosticItemKey(analysis.item) && analysis.documentIds.every((id) => fileById.has(id)));

  let extraction: DiagnosticExtraction | null = base ? clone(base.extracted as DiagnosticExtraction) : null;
  const sources: MergedReading["sources"] = {};
  const unread: MergedReading["unread"] = {};
  for (const analysis of later) {
    const item = analysis.item as DiagnosticItemKey;
    const section = DIAGNOSTIC_SECTIONS[item];
    const read = analysis.extracted as DiagnosticExtraction;
    const file = fileById.get(analysis.documentIds[0]);
    if (!extraction) extraction = clone(read);
    if ((read as any)[section]?.found) {
      (extraction as any)[section] = clone((read as any)[section]);
      if (item === "gaz" && read.gas.installationPresent == null) (extraction as any).gas.installationPresent = true;
      sources[item] = { documentId: analysis.documentIds[0], label: file?.label ?? null, at: analysis.createdAt };
      delete unread[item];
    } else {
      unread[item] = { documentId: analysis.documentIds[0], label: file?.label ?? null };
    }
  }

  // Date saisie à la main pour un fichier non lu : elle remplace la lecture tant qu'un fichier plus récent n'est pas lu.
  const manualDates: MergedReading["manualDates"] = {};
  if (extraction) {
    const dates = decisions.filter((decision) => decision.kind === "DATE" && decision.date && isDiagnosticItemKey(decision.item));
    for (const decision of dates.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())) {
      const item = decision.item as DiagnosticItemKey;
      if (!DATE_ONLY_ITEMS.includes(item)) continue;
      // Fichier retiré depuis : la date saisie ne s'applique plus.
      if (decision.documentId && !fileById.has(decision.documentId)) continue;
      const source = sources[item];
      if (source && source.at > decision.createdAt) continue;
      const section = DIAGNOSTIC_SECTIONS[item];
      const iso = decision.date!.toISOString().slice(0, 10);
      const previous = (extraction as any)[section] ?? {};
      const label = decision.documentId ? fileById.get(decision.documentId)?.label ?? null : null;
      (extraction as any)[section] = {
        ...previous,
        found: true,
        date: iso,
        file: label,
        ...(item === "gaz" ? { installationPresent: true } : {}),
        ...(item === "amiante" ? { presence: null } : {}),
      };
      manualDates[item] = decision;
      delete unread[item];
    }
  }
  return { extraction, sources, unread, manualDates };
}

function statusOf(check: DiagnosticCheck): ItemStatus {
  switch (check.group) {
    case "blocking":
      return check.absent ? "missing" : "replace";
    case "team":
      if (check.action === "erp") return check.absent ? "missing" : "replace";
      return "check";
    case "ask":
      return "check";
    case "na":
      return "na";
    default:
      return check.tone === "ok" ? "valid" : "check";
  }
}

function actionsOf(check: DiagnosticCheck, status: ItemStatus): ItemAction[] {
  const replaceable = isDiagnosticItemKey(check.id);
  const erp = check.id === "erp" ? (["erp"] as ItemAction[]) : [];
  switch (status) {
    case "replace":
      return ["upload", ...erp, "conforme"];
    case "missing":
      // DPE et ERP sont toujours exigés : pas de « non concerné ».
      return ["upload", ...erp, ...(check.id === "dpe" || check.id === "erp" ? [] : (["na"] as ItemAction[]))];
    case "check":
      // Diagnostic absent dont l'obligation dépend d'une information manquante (année, installation).
      if (check.group === "ask" && replaceable) return ["upload", "na"];
      return replaceable ? ["conforme", "upload"] : ["conforme"];
    default:
      return [];
  }
}

export interface DiagnosticItems {
  items: DiagnosticItemView[];
  notFound: string[];
  dpeToApply: { dpeClass: EnergyLetter; gesClass: EnergyLetter | null; dpeDate: string } | null;
}

export function buildItems(
  merged: MergedReading,
  context: AssessContext,
  decisions: DecisionRecord[],
  files: FileRecord[],
  readingItems: string[],
): DiagnosticItems {
  if (!merged.extraction) return { items: [], notFound: [], dpeToApply: null };
  const assessment = assessDiagnostics(merged.extraction, context);
  const fileIds = new Set(files.map((file) => file.id));
  const active = decisions.filter((decision) => decision.kind !== "DATE").sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const items = assessment.checks.map((check): DiagnosticItemView => {
    const basis = `${check.id}|${check.text}`;
    const baseStatus = statusOf(check);
    const key = isDiagnosticItemKey(check.id) ? check.id : null;
    const section = key ? DIAGNOSTIC_SECTIONS[key] : null;
    const source = key ? merged.sources[key] : undefined;
    const manual = key ? merged.manualDates[key] : undefined;
    const readFile = section ? ((merged.extraction as any)[section]?.file as string | null) : null;
    const origin = manual
      ? `Date saisie par ${manual.createdByName || "l'équipe"} le ${short(manual.createdAt)}`
      : source
        ? `Nouveau fichier ajouté le ${short(source.at)}${source.label ? ` (${displayFileName(source.label)})` : ""}`
        : // Un seul fichier : inutile de le répéter sur chaque ligne.
          readFile && baseStatus !== "na" && !check.absent && files.filter((file) => !file.proof).length > 1
          ? `Lu dans « ${displayFileName(readFile)} »`
          : null;
    const unreadFile = key && merged.unread[key] ? merged.unread[key]! : null;
    // DPE trouvé dans la base officielle : on le dit, et on signale si le fichier indiquait une autre classe.
    const ademe = key === "dpe" ? merged.extraction?.dpe.ademe : undefined;
    const ademeOrigin =
      ademe?.status === "found"
        ? `Vérifié dans la base officielle de l'ADEME (n° ${ademe.number})${
            ademe.energyClass && merged.extraction?.dpe.energyClass && ademe.energyClass !== merged.extraction.dpe.energyClass
              ? ` : classe officielle ${ademe.energyClass}, le fichier indiquait ${merged.extraction.dpe.energyClass}${ademe.updatedAt ? ` (DPE mis à jour le ${ademe.updatedAt.split("-").reverse().join("/")})` : ""}`
              : ""
          }`
        : null;
    const decision = baseStatus === "valid" || baseStatus === "na" ? null : active.find((d) => d.item === check.id && d.basis === basis) ?? null;
    const view: DiagnosticItemView = {
      id: check.id,
      label: check.label,
      status: baseStatus,
      text: check.text,
      finding: null,
      message: check.message ?? null,
      question: check.question ?? null,
      actions: actionsOf(check, baseStatus),
      origin: ademeOrigin ? (origin ? `${ademeOrigin} · ${origin}` : ademeOrigin) : origin,
      decision: null,
      manualDateId: manual?.id ?? null,
      basis,
      reading: !!key && readingItems.includes(key),
      unreadFile,
    };
    if (unreadFile && key && baseStatus !== "valid") {
      view.actions = DATE_ONLY_ITEMS.includes(key) ? ["date", "upload", "conforme"] : ["conforme", "upload"];
    }
    if (decision) {
      view.status = decision.kind === "CONFORME" ? "valid" : "na";
      view.finding = check.text.replace(/ : vérifiez.*$/, "");
      view.text = decision.kind === "CONFORME" ? "Déclaré conforme" : "Non concerné";
      view.actions = [];
      view.decision = {
        id: decision.id,
        kind: decision.kind,
        note: decision.note,
        byName: decision.createdByName,
        at: decision.createdAt.toISOString(),
        documentId: decision.documentId && fileIds.has(decision.documentId) ? decision.documentId : null,
      };
    }
    return view;
  });

  // Ordre d'affichage : ce qu'il faut faire d'abord, puis le reste (ordre des règles conservé à l'intérieur).
  const rank: Record<ItemStatus, number> = { replace: 0, missing: 1, check: 2, valid: 3, na: 4 };
  items.sort((a, b) => rank[a.status] - rank[b.status]);
  return { items, notFound: assessment.notFound, dpeToApply: assessment.dpeToApply };
}

export type DiagnosticsOverall = "conforme" | "a_verifier" | "non_conforme";

export function overallOfItems(items: DiagnosticItemView[]): DiagnosticsOverall {
  if (items.some((item) => item.status === "replace" || item.status === "missing")) return "non_conforme";
  if (items.some((item) => item.status === "check")) return "a_verifier";
  return "conforme";
}

/** Lignes à envoyer au propriétaire : ce qui bloque, puis les questions. */
export function ownerLines(items: DiagnosticItemView[]): { blocking: string[]; questions: string[] } {
  return {
    blocking: items.filter((item) => (item.status === "replace" || item.status === "missing") && item.message).map((item) => item.message!),
    questions: items.filter((item) => item.status === "check" && item.question).map((item) => item.question!),
  };
}

export { formatDay };
