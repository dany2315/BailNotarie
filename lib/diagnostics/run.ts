// Module serveur interne : lectures des diagnostics par l'IA, en tâche de fond (après la réponse).
import { after } from "next/server";
import { DocumentKind, EnergyClass, NotificationType, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSignedDownloadUrl } from "@/lib/utils/s3-client";
import { triggerNotificationEmail } from "@/lib/inngest/helpers";
import { DiagnosticAnalysisError, diagnosticModel, isDiagnosticAnalysisConfigured, readDiagnostics, type DiagnosticFile } from "./openai";
import { ANALYSIS_STALE_MS, ENERGY_LETTERS, itemReadingHint, type DiagnosticItemKey } from "./schema";
import { isCommercialProperty, loadDiagnosticState } from "./state";

/** Taille totale envoyée à OpenAI (les fichiers partent encodés en base64). */
export const MAX_TOTAL_BYTES = 40 * 1024 * 1024;
/** Plusieurs fichiers envoyés à la suite : une seule lecture, après ce délai sans nouvel ajout. */
const QUIET_MS = 8_000;

type DocToRead = { id: string; fileKey: string; mimeType: string | null; label: string | null; size?: number | null };
type Actor = { id: string; name: string } | null;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function diagnosticDocuments(propertyId: string): Promise<DocToRead[]> {
  return prisma.document.findMany({
    where: { propertyId, kind: DocumentKind.DIAGNOSTICS },
    select: { id: true, fileKey: true, mimeType: true, label: true, size: true },
    orderBy: { createdAt: "asc" },
  });
}

async function runningReading(propertyId: string, item: string | null) {
  return prisma.diagnosticAnalysis.findFirst({
    where: { propertyId, item, status: "RUNNING", createdAt: { gt: new Date(Date.now() - ANALYSIS_STALE_MS) } },
    select: { id: true },
  });
}

/**
 * Prépare la lecture de tous les fichiers de diagnostics du bien (analyse « en cours »).
 * Renvoie une erreur lisible si la lecture n'est pas possible.
 */
export async function startFullReading(
  propertyId: string,
  options: { bailId?: string | null; actor: Actor },
): Promise<{ analysisId: string; documents: DocToRead[] } | { error: string }> {
  if (!isDiagnosticAnalysisConfigured()) return { error: "Lecture indisponible : la clé OpenAI n'est pas configurée sur ce serveur." };
  const documents = await diagnosticDocuments(propertyId);
  if (documents.length === 0) return { error: "Aucun fichier de diagnostics : ajoutez-le d'abord dans « Le bien »." };
  if (documents.reduce((total, doc) => total + (doc.size ?? 0), 0) > MAX_TOTAL_BYTES) {
    return { error: "Fichiers trop lourds pour la lecture (plus de 40 Mo au total)." };
  }
  if (await runningReading(propertyId, null)) return { error: "Une lecture est déjà en cours pour ce bien." };
  const analysis = await prisma.diagnosticAnalysis.create({
    data: {
      propertyId,
      bailId: options.bailId ?? null,
      documentIds: documents.map((doc) => doc.id).sort(),
      status: "RUNNING",
      model: diagnosticModel(),
      createdById: options.actor?.id ?? null,
      createdByName: options.actor?.name ?? null,
    },
    select: { id: true },
  });
  return { analysisId: analysis.id, documents };
}

/** Lit les fichiers et enregistre le résultat (ou l'échec). Ne lève jamais d'erreur. */
export async function runReading(analysisId: string, documents: DocToRead[], item: DiagnosticItemKey | null) {
  const started = Date.now();
  try {
    const files: DiagnosticFile[] = [];
    for (const [index, doc] of documents.entries()) {
      const url = await generateSignedDownloadUrl(doc.fileKey, 600);
      const response = await fetch(url);
      if (!response.ok) throw new DiagnosticAnalysisError("Impossible de récupérer un fichier de diagnostics sur le stockage.");
      const extension = doc.fileKey.split(".").pop()?.toLowerCase() || "pdf";
      files.push({
        // Nom distinct par fichier : le modèle indique dans quel fichier il a trouvé chaque diagnostic.
        name: doc.label || `diagnostics-${index + 1}.${extension}`,
        mimeType: doc.mimeType || (extension === "pdf" ? "application/pdf" : `image/${extension === "jpg" ? "jpeg" : extension}`),
        data: Buffer.from(await response.arrayBuffer()),
      });
    }
    const result = await readDiagnostics(files, item ? itemReadingHint(item) : undefined);
    await prisma.diagnosticAnalysis.update({
      where: { id: analysisId },
      data: {
        status: "SUCCEEDED",
        model: result.model,
        extracted: result.extraction as any,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
        durationMs: Date.now() - started,
        completedAt: new Date(),
      },
    });
    const done = await prisma.diagnosticAnalysis.findUnique({ where: { id: analysisId }, select: { propertyId: true } });
    if (done) await syncPropertyDpe(done.propertyId).catch((error) => console.error("[diagnostics] report du DPE", error));
  } catch (error) {
    console.error("[diagnostics] lecture", analysisId, error);
    await prisma.diagnosticAnalysis
      .update({
        where: { id: analysisId },
        data: {
          status: "FAILED",
          error: error instanceof DiagnosticAnalysisError ? error.message : "La lecture a échoué : réessayez.",
          durationMs: Date.now() - started,
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
  }
}

/**
 * Classe énergie, GES et date du DPE lus, reportés dans la fiche du bien (repris dans le bail et les règles du loyer).
 * Sans effet si la fiche indique déjà la même chose.
 */
export async function syncPropertyDpe(propertyId: string): Promise<boolean> {
  const state = await loadDiagnosticState(propertyId, await isCommercialProperty(propertyId));
  const dpe = state?.dpeToApply;
  const letters = ENERGY_LETTERS as readonly string[];
  if (!dpe || !letters.includes(dpe.dpeClass) || !/^\d{4}-\d{2}-\d{2}$/.test(dpe.dpeDate)) return false;
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      dpeClass: dpe.dpeClass as EnergyClass,
      gesClass: dpe.gesClass && letters.includes(dpe.gesClass) ? (dpe.gesClass as EnergyClass) : null,
      dpeDate: new Date(`${dpe.dpeDate}T00:00:00Z`),
    },
  });
  return true;
}

/** Lecture complète, puis une seconde si des fichiers ont changé pendant la première ; notification si automatique. */
async function readAll(propertyId: string, options: { bailId?: string | null; actor: Actor }) {
  for (let round = 0; round < 2; round++) {
    const started = await startFullReading(propertyId, options);
    if ("error" in started) return;
    await runReading(started.analysisId, started.documents, null);
    const now = (await diagnosticDocuments(propertyId)).map((doc) => doc.id).sort();
    if (now.join(",") === started.documents.map((doc) => doc.id).sort().join(",")) break;
  }
  if (!options.actor) await notifyDiagnosticsToReview(propertyId).catch((error) => console.error("[diagnostics] notification", error));
}

/**
 * Un fichier de diagnostics a été ajouté ou retiré : relecture automatique de tous les fichiers du bien,
 * après la réponse et un court délai (plusieurs fichiers envoyés à la suite = une seule lecture).
 * Sans effet hors d'une requête (scripts) ou sans clé OpenAI.
 */
export function queueDiagnosticReading(propertyId: string) {
  if (!isDiagnosticAnalysisConfigured()) return;
  const requestedAt = new Date();
  try {
    after(async () => {
      try {
        await sleep(QUIET_MS);
        // Un autre fichier est arrivé entre-temps : c'est sa lecture qui s'en chargera.
        const newer = await prisma.document.findFirst({
          where: { propertyId, kind: DocumentKind.DIAGNOSTICS, createdAt: { gt: requestedAt } },
          select: { id: true },
        });
        if (newer) return;
        await readAll(propertyId, { actor: null });
      } catch (error) {
        console.error("[diagnostics] lecture automatique", propertyId, error);
      }
    });
  } catch (error) {
    console.error("[diagnostics] lecture automatique non planifiée", error);
  }
}

/** Lecture complète demandée par l'équipe (« Relire les fichiers »). */
export async function requestFullReading(propertyId: string, options: { bailId: string; actor: Actor }): Promise<{ error?: string }> {
  const started = await startFullReading(propertyId, options);
  if ("error" in started) return { error: started.error };
  after(() => runReading(started.analysisId, started.documents, null));
  return {};
}

/** Nouveau fichier ajouté pour un diagnostic : lu seul, il remplace ce diagnostic s'il y est trouvé. */
export async function startItemReading(
  propertyId: string,
  item: DiagnosticItemKey,
  documentId: string,
  options: { bailId?: string | null; actor: Actor },
): Promise<{ error?: string }> {
  if (!isDiagnosticAnalysisConfigured()) return { error: "Lecture indisponible : la clé OpenAI n'est pas configurée sur ce serveur." };
  const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true, fileKey: true, mimeType: true, label: true, size: true } });
  if (!doc) return { error: "Fichier introuvable" };
  if ((doc.size ?? 0) > MAX_TOTAL_BYTES) return { error: "Fichier trop lourd pour la lecture (plus de 40 Mo)." };
  const analysis = await prisma.diagnosticAnalysis.create({
    data: {
      propertyId,
      bailId: options.bailId ?? null,
      item,
      documentIds: [doc.id],
      status: "RUNNING",
      model: diagnosticModel(),
      createdById: options.actor?.id ?? null,
      createdByName: options.actor?.name ?? null,
    },
    select: { id: true },
  });
  after(() => runReading(analysis.id, [doc], item));
  return {};
}

/**
 * Notification aux administrateurs (dans l'application et par e-mail) quand une lecture automatique
 * trouve des diagnostics à régler. Pas de doublon : rien si la dernière notification du dossier disait la même chose.
 */
export async function notifyDiagnosticsToReview(propertyId: string) {
  const bail = await prisma.bail.findFirst({
    where: { propertyId, status: { notIn: ["SIGNED", "TERMINATED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, property: { select: { label: true, fullAddress: true } } },
  });
  if (!bail) return;
  const state = await loadDiagnosticState(propertyId, await isCommercialProperty(propertyId));
  if (!state) return;
  const toReview = state.items.filter((item) => item.status === "replace" || item.status === "missing" || item.status === "check");
  if (toReview.length === 0) return;
  const lines = toReview.map((item) => `${item.label} : ${item.text}`);

  const last = await prisma.notification.findFirst({
    where: { type: NotificationType.DIAGNOSTICS_TO_REVIEW, targetType: "BAIL", targetId: bail.id },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  if (JSON.stringify((last?.metadata as any)?.items ?? null) === JSON.stringify(lines)) return;

  const admins = await prisma.user.findMany({ where: { role: Role.ADMINISTRATEUR }, select: { id: true, email: true } });
  if (admins.length === 0) return;
  const propertyLabel = bail.property?.fullAddress || bail.property?.label || "un bien";
  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      type: NotificationType.DIAGNOSTICS_TO_REVIEW,
      targetType: "BAIL",
      targetId: bail.id,
      recipientId: admin.id,
      metadata: {
        propertyLabel,
        toFix: state.counts.toFix,
        toCheck: state.counts.toCheck,
        items: lines,
      },
    })),
  });

  // Un seul e-mail pour tous les administrateurs (même circuit que les autres notifications).
  const emails = admins.map((admin) => admin.email).filter((email): email is string => !!email);
  if (emails.length > 0) {
    const counts = [state.counts.toFix ? `${state.counts.toFix} à remplacer` : null, state.counts.toCheck ? `${state.counts.toCheck} à vérifier` : null]
      .filter(Boolean)
      .join(", ");
    await triggerNotificationEmail({
      to: emails,
      userName: null,
      notificationMessage: `Diagnostics à régler — ${propertyLabel}${counts ? ` : ${counts}` : ""}`,
      interfaceUrl: `${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/interface/baux/${bail.id}`,
    }).catch((error) => console.error("[diagnostics] e-mail de notification", error));
  }
}
