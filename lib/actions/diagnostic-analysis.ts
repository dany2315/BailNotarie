"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getActorName } from "@/lib/actions/bail-audit-log";
import { requestFullReading } from "@/lib/diagnostics/run";
import { loadDiagnosticState } from "@/lib/diagnostics/state";
import { DATE_ONLY_ITEMS } from "@/lib/diagnostics/items";
import { isDiagnosticItemKey } from "@/lib/diagnostics/schema";

type Result = { success: true } | { success: false; error: string };

const revalidateSchema = z
  .string()
  .max(300)
  .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), { message: "Page invalide" })
  .optional();

/** Dossier modifiable pour les diagnostics : tant que le bail n'est pas signé (le notaire voit les mises à jour). */
async function openBail(bailId: string) {
  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { id: true, status: true, propertyId: true, bailFamily: true } });
  if (!bail?.propertyId) return { error: "Dossier ou bien introuvable" } as const;
  if (bail.status === "SIGNED" || bail.status === "TERMINATED") return { error: "Bail signé : les diagnostics ne se modifient plus" } as const;
  return { bail: { ...bail, propertyId: bail.propertyId } } as const;
}

function refresh(bailId: string, propertyId: string, revalidate?: string) {
  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/baux/${bailId}`);
  revalidatePath(`/interface/properties/${propertyId}`);
  revalidatePath("/notaire/dossiers");
}

const requestSchema = z.object({ bailId: z.string().min(1), revalidate: revalidateSchema });

/** « Relire les fichiers » : nouvelle lecture de tous les diagnostics du bien, en tâche de fond. */
export async function requestDiagnosticAnalysis(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = requestSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, revalidate } = parsed.data;
  const open = await openBail(bailId);
  if ("error" in open) return { success: false, error: open.error! };

  const result = await requestFullReading(open.bail.propertyId, { bailId, actor: { id: user.id, name: getActorName(user) } });
  if (result.error) return { success: false, error: result.error };
  refresh(bailId, open.bail.propertyId, revalidate);
  return { success: true };
}

const decideSchema = z
  .object({
    bailId: z.string().min(1),
    item: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
    kind: z.enum(["CONFORME", "NON_CONCERNE", "DATE"]),
    /** Motif : obligatoire pour « conforme » et « non concerné ». */
    note: z.string().trim().max(500).optional(),
    /** Constat affiché au moment de la décision. */
    basis: z.string().max(400).optional(),
    /** DATE : date d'établissement du nouveau diagnostic (AAAA-MM-JJ). */
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    /** Justificatif déjà envoyé sur le stockage (même circuit que les pièces). */
    proof: z
      .object({
        fileKey: z
          .string()
          .min(10)
          .max(500)
          .refine((key) => key.startsWith("documents/") && !key.includes(".."), { message: "Clé de fichier invalide" }),
        fileName: z.string().min(1).max(300),
        mimeType: z.string().max(200).optional(),
        size: z.number().int().nonnegative().max(50 * 1024 * 1024).optional(),
      })
      .optional(),
    revalidate: revalidateSchema,
  })
  .refine((d) => d.kind === "DATE" || (d.note?.length ?? 0) >= 3, { message: "Indiquez le motif (quelques mots)", path: ["note"] })
  .refine((d) => d.kind !== "DATE" || !!d.date, { message: "Indiquez la date du diagnostic", path: ["date"] });

/**
 * « Marquer conforme » (avec ou sans justificatif), « Non concerné », ou date d'un nouveau fichier non lu.
 * La décision est gardée avec son auteur et son motif ; le notaire la voit.
 */
export async function decideDiagnosticItem(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = decideSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, item, kind, note, basis, date, proof, revalidate } = parsed.data;
  const open = await openBail(bailId);
  if ("error" in open) return { success: false, error: open.error! };
  const propertyId = open.bail.propertyId;

  const state = await loadDiagnosticState(propertyId, open.bail.bailFamily === "COMMERCIAL");
  const line = state?.items.find((entry) => entry.id === item);
  if (!line) return { success: false, error: "Ce point n'existe plus : la page a peut-être changé, rechargez-la." };

  let documentId: string | null = null;
  if (kind === "DATE") {
    if (!isDiagnosticItemKey(item) || !DATE_ONLY_ITEMS.includes(item) || !line.unreadFile) {
      return { success: false, error: "Date à saisir seulement pour un nouveau fichier non lu" };
    }
    const when = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(when.getTime()) || when > new Date() || when.getUTCFullYear() < 2000) return { success: false, error: "Date invalide" };
    documentId = line.unreadFile.documentId;
  } else if (line.basis !== basis) {
    return { success: false, error: "Le constat a changé entre-temps : vérifiez la ligne à nouveau." };
  }

  if (proof) {
    const usedElsewhere = await prisma.document.findFirst({ where: { fileKey: proof.fileKey }, select: { id: true } });
    if (usedElsewhere) return { success: false, error: "Justificatif invalide" };
    const doc = await prisma.document.create({
      data: {
        kind: DocumentKind.OTHER,
        label: `Justificatif ${line.label} · ${proof.fileName}`,
        fileKey: proof.fileKey,
        mimeType: proof.mimeType || null,
        size: proof.size ?? null,
        uploadedById: user.id,
        propertyId,
      },
      select: { id: true },
    });
    documentId = doc.id;
  }

  await prisma.diagnosticDecision.create({
    data: {
      propertyId,
      item,
      kind,
      note: note || null,
      basis: kind === "DATE" ? null : basis ?? null,
      date: kind === "DATE" ? new Date(`${date}T00:00:00Z`) : null,
      documentId,
      createdById: user.id,
      createdByName: getActorName(user),
    },
  });
  refresh(bailId, propertyId, revalidate);
  return { success: true };
}

const revokeSchema = z.object({ bailId: z.string().min(1), decisionId: z.string().min(1), revalidate: revalidateSchema });

/** « Annuler » une décision : elle ne s'applique plus, mais reste dans l'historique. */
export async function revokeDiagnosticDecision(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = revokeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, decisionId, revalidate } = parsed.data;
  const open = await openBail(bailId);
  if ("error" in open) return { success: false, error: open.error! };

  const decision = await prisma.diagnosticDecision.findUnique({ where: { id: decisionId }, select: { propertyId: true, revokedAt: true } });
  if (!decision || decision.propertyId !== open.bail.propertyId) return { success: false, error: "Décision introuvable" };
  if (!decision.revokedAt) {
    await prisma.diagnosticDecision.update({ where: { id: decisionId }, data: { revokedAt: new Date(), revokedByName: getActorName(user) } });
  }
  refresh(bailId, open.bail.propertyId, revalidate);
  return { success: true };
}
