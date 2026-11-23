// Module serveur interne (lit la base) : état des diagnostics d'un bien, pour la fiche admin,
// l'espace notaire, l'e-mail au propriétaire et les notifications.
import { DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assessContextFor } from "./context";
import {
  buildItems,
  isToFix,
  mergeReadings,
  overallOfItems,
  type AnalysisRecord,
  type DecisionRecord,
  type DiagnosticItemView,
  type DiagnosticsOverall,
  type FileRecord,
} from "./items";
import { ANALYSIS_STALE_MS, type DiagnosticExtraction, type EnergyLetter } from "./schema";

export interface DiagnosticFileView {
  id: string;
  kind: string;
  fileKey: string;
  mimeType: string | null;
  label: string | null;
}

export interface DiagnosticStateView {
  files: DiagnosticFileView[];
  /** Fichiers et justificatifs, par identifiant (pour les ouvrir depuis une ligne). */
  documents: Record<string, DiagnosticFileView>;
  /** none : rien lu ; running : lecture de tous les fichiers en cours ; failed / stalled : dernière lecture en échec. */
  reading: "none" | "running" | "failed" | "stalled" | "ready";
  error: string | null;
  /** Dernière lecture réussie de tous les fichiers. */
  lastRead: { at: string; byName: string | null; costUsd: number | null; model: string } | null;
  /** Des fichiers ont été ajoutés ou retirés depuis la dernière lecture (et aucune n'est en cours). */
  filesChanged: boolean;
  items: DiagnosticItemView[];
  overall: DiagnosticsOverall;
  counts: { toFix: number; toCheck: number; valid: number };
  notFound: string[];
  dpeToApply: { dpeClass: EnergyLetter; gesClass: EnergyLetter | null; dpeDate: string } | null;
  extraction: DiagnosticExtraction | null;
}

const PROPERTY_SELECT = {
  id: true,
  fullAddress: true,
  postalCode: true,
  housenumber: true,
  surfaceM2: true,
  dpeClass: true,
  gesClass: true,
  dpeDate: true,
  constructionPeriod: true,
} as const;

/** État des diagnostics d'un bien (null si les tables n'existent pas encore sur cette base). */
export async function loadDiagnosticState(propertyId: string, commercial: boolean): Promise<DiagnosticStateView | null> {
  try {
    const [property, documents, analyses, decisions] = await Promise.all([
      prisma.property.findUnique({ where: { id: propertyId }, select: PROPERTY_SELECT }),
      prisma.document.findMany({
        where: { propertyId, kind: DocumentKind.DIAGNOSTICS },
        select: { id: true, kind: true, fileKey: true, mimeType: true, label: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.diagnosticAnalysis.findMany({ where: { propertyId }, orderBy: { createdAt: "asc" }, take: 60 }),
      prisma.diagnosticDecision.findMany({ where: { propertyId, revokedAt: null }, orderBy: { createdAt: "asc" } }),
    ]);
    if (!property) return null;
    // Justificatifs (pièces « Autre » du bien) : seulement pour savoir s'ils existent encore.
    const proofIds = decisions.map((decision) => decision.documentId).filter((id): id is string => !!id);
    const proofs = proofIds.length
      ? await prisma.document.findMany({
          where: { id: { in: proofIds } },
          select: { id: true, kind: true, fileKey: true, mimeType: true, label: true, createdAt: true },
        })
      : [];

    const files: FileRecord[] = documents.map((doc) => ({ id: doc.id, label: doc.label, createdAt: doc.createdAt }));
    const now = Date.now();
    const isRunning = (analysis: (typeof analyses)[number]) =>
      analysis.status === "RUNNING" && now - analysis.createdAt.getTime() <= ANALYSIS_STALE_MS;
    const readingItems = analyses.filter((analysis) => analysis.item && isRunning(analysis)).map((analysis) => analysis.item!);
    const fullReadings = analyses.filter((analysis) => !analysis.item);
    const latestFull = fullReadings[fullReadings.length - 1] ?? null;
    const lastSucceeded = [...fullReadings].reverse().find((analysis) => analysis.status === "SUCCEEDED") ?? null;

    const records: AnalysisRecord[] = analyses.map((analysis) => ({
      id: analysis.id,
      item: analysis.item,
      status: analysis.status,
      extracted: analysis.extracted,
      documentIds: analysis.documentIds,
      createdAt: analysis.createdAt,
    }));
    const decisionRecords: DecisionRecord[] = decisions.map((decision) => ({
      id: decision.id,
      item: decision.item,
      kind: decision.kind,
      note: decision.note,
      basis: decision.basis,
      date: decision.date,
      documentId: decision.documentId,
      createdByName: decision.createdByName,
      createdAt: decision.createdAt,
    }));

    const merged = mergeReadings(records, files, decisionRecords);
    const built = buildItems(
      merged,
      assessContextFor(property, commercial),
      decisionRecords,
      [...files, ...proofs.map((doc) => ({ id: doc.id, label: doc.label, createdAt: doc.createdAt, proof: true }))],
      readingItems,
    );

    // Fichiers lus = ceux de la dernière lecture complète réussie + ceux lus seuls ensuite.
    const read = new Set<string>(lastSucceeded?.documentIds ?? []);
    for (const analysis of analyses) {
      // Fichier ajouté pour un diagnostic : lu, ou en cours de lecture.
      if (analysis.item && (analysis.status === "SUCCEEDED" || isRunning(analysis)) && (!lastSucceeded || analysis.createdAt > lastSucceeded.createdAt)) {
        analysis.documentIds.forEach((id) => read.add(id));
      }
    }
    const current = documents.map((doc) => doc.id);
    const reading: DiagnosticStateView["reading"] = !latestFull
      ? merged.extraction
        ? "ready"
        : "none"
      : isRunning(latestFull)
        ? "running"
        : latestFull.status === "RUNNING"
          ? "stalled"
          : latestFull.status === "FAILED"
            ? "failed"
            : "ready";
    const filesChanged =
      reading !== "running" && (current.some((id) => !read.has(id)) || [...read].some((id) => !current.includes(id) && (lastSucceeded?.documentIds ?? []).includes(id)));

    const view = (doc: { id: string; kind: string; fileKey: string; mimeType: string | null; label: string | null }): DiagnosticFileView => ({
      id: doc.id,
      kind: doc.kind,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType ?? null,
      label: doc.label ?? null,
    });
    return {
      files: documents.map(view),
      documents: Object.fromEntries([...documents, ...proofs].map((doc) => [doc.id, view(doc)])),
      reading,
      error: latestFull?.status === "FAILED" ? latestFull.error : null,
      lastRead: lastSucceeded
        ? {
            at: lastSucceeded.createdAt.toISOString(),
            byName: lastSucceeded.createdByName,
            costUsd: analyses.filter((a) => a.createdAt >= lastSucceeded.createdAt).reduce((sum, a) => sum + (a.costUsd ?? 0), 0) || null,
            model: lastSucceeded.model,
          }
        : null,
      filesChanged: filesChanged && documents.length > 0,
      items: built.items,
      overall: overallOfItems(built.items),
      counts: {
        toFix: built.items.filter((item) => isToFix(item.status)).length,
        toCheck: built.items.filter((item) => item.status === "check").length,
        valid: built.items.filter((item) => item.status === "valid").length,
      },
      notFound: built.notFound,
      dpeToApply: built.dpeToApply,
      extraction: merged.extraction,
    };
  } catch (error) {
    console.error("[diagnostics] état du bien", propertyId, error);
    return null;
  }
}

/** Bail commercial ? (même règle que la fiche dossier) — d'après le bail le plus récent du bien. */
export async function isCommercialProperty(propertyId: string): Promise<boolean> {
  const bail = await prisma.bail.findFirst({ where: { propertyId }, orderBy: { createdAt: "desc" }, select: { bailFamily: true } });
  return bail?.bailFamily === "COMMERCIAL";
}
