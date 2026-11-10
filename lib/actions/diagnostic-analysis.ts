"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentKind, EnergyClass, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { generateSignedDownloadUrl } from "@/lib/utils/s3-client";
import {
  DiagnosticAnalysisError,
  diagnosticModel,
  isDiagnosticAnalysisConfigured,
  readDiagnostics,
  type DiagnosticFile,
} from "@/lib/diagnostics/openai";
import { ANALYSIS_STALE_MS, ENERGY_LETTERS, type DiagnosticExtraction } from "@/lib/diagnostics/schema";

/** Taille totale envoyée à OpenAI (les fichiers partent encodés en base64). */
const MAX_TOTAL_BYTES = 40 * 1024 * 1024;

const revalidateSchema = z
  .string()
  .max(300)
  .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), { message: "Page invalide" })
  .optional();

const requestSchema = z.object({ bailId: z.string().min(1), revalidate: revalidateSchema });

/**
 * « Analyser les diagnostics » : enregistre une analyse « en cours », répond tout de suite,
 * puis lit les fichiers avec OpenAI après la réponse (la fiche se met à jour d'elle-même).
 */
export async function requestDiagnosticAnalysis(data: unknown): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = requestSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, revalidate } = parsed.data;

  if (!isDiagnosticAnalysisConfigured()) {
    return { success: false, error: "Analyse indisponible : la clé OpenAI n'est pas configurée sur ce serveur." };
  }

  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { id: true, propertyId: true } });
  if (!bail?.propertyId) return { success: false, error: "Dossier ou bien introuvable" };

  const documents = await prisma.document.findMany({
    where: { propertyId: bail.propertyId, kind: DocumentKind.DIAGNOSTICS },
    select: { id: true, fileKey: true, mimeType: true, label: true, size: true },
    orderBy: { createdAt: "asc" },
  });
  if (documents.length === 0) return { success: false, error: "Aucun fichier de diagnostics : ajoutez-le d'abord dans « Le bien »." };
  const totalSize = documents.reduce((total, doc) => total + (doc.size ?? 0), 0);
  if (totalSize > MAX_TOTAL_BYTES) {
    return { success: false, error: "Fichiers trop lourds pour l'analyse (plus de 40 Mo au total)." };
  }

  const running = await prisma.diagnosticAnalysis.findFirst({
    where: { propertyId: bail.propertyId, status: "RUNNING", createdAt: { gt: new Date(Date.now() - ANALYSIS_STALE_MS) } },
    select: { id: true },
  });
  if (running) return { success: false, error: "Une analyse est déjà en cours pour ce bien." };

  const analysis = await prisma.diagnosticAnalysis.create({
    data: {
      propertyId: bail.propertyId,
      bailId: bail.id,
      documentIds: documents.map((doc) => doc.id).sort(),
      status: "RUNNING",
      model: diagnosticModel(),
      createdById: user.id,
      createdByName: user.name || user.email,
    },
    select: { id: true },
  });

  after(() => runDiagnosticAnalysis(analysis.id, documents));

  if (revalidate) revalidatePath(revalidate);
  return { success: true };
}

async function runDiagnosticAnalysis(
  analysisId: string,
  documents: Array<{ id: string; fileKey: string; mimeType: string | null; label: string | null }>,
) {
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
    const result = await readDiagnostics(files);
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
  } catch (error) {
    console.error("[diagnostics] analyse", analysisId, error);
    await prisma.diagnosticAnalysis
      .update({
        where: { id: analysisId },
        data: {
          status: "FAILED",
          error: error instanceof DiagnosticAnalysisError ? error.message : "L'analyse a échoué : réessayez.",
          durationMs: Date.now() - started,
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
  }
}

const applySchema = z.object({ analysisId: z.string().min(1), revalidate: revalidateSchema });

/** « Reporter dans la fiche du bien » : classe énergie, GES et date du DPE lus par l'analyse. */
export async function applyDiagnosticDpe(data: unknown): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { analysisId, revalidate } = parsed.data;

  const analysis = await prisma.diagnosticAnalysis.findUnique({
    where: { id: analysisId },
    select: { status: true, propertyId: true, extracted: true },
  });
  if (!analysis || analysis.status !== "SUCCEEDED") return { success: false, error: "Analyse introuvable" };
  const dpe = (analysis.extracted as unknown as DiagnosticExtraction | null)?.dpe;
  const letters = ENERGY_LETTERS as readonly string[];
  if (!dpe?.energyClass || !letters.includes(dpe.energyClass) || !dpe.date || !/^\d{4}-\d{2}-\d{2}$/.test(dpe.date)) {
    return { success: false, error: "Classe ou date du DPE non lue : saisissez-les à la main." };
  }

  await prisma.property.update({
    where: { id: analysis.propertyId },
    data: {
      dpeClass: dpe.energyClass as EnergyClass,
      gesClass: dpe.gesClass && letters.includes(dpe.gesClass) ? (dpe.gesClass as EnergyClass) : null,
      dpeDate: new Date(`${dpe.date}T00:00:00Z`),
      updatedById: user.id,
    },
  });

  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/properties/${analysis.propertyId}`);
  return { success: true };
}
