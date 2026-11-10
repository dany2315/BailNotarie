"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { deleteDocumentFromDB } from "@/lib/document-storage";
import { getActorName } from "@/lib/actions/bail-audit-log";
import { queueDiagnosticReading, startItemReading } from "@/lib/diagnostics/run";
import { DIAGNOSTIC_ITEM_KEYS } from "@/lib/diagnostics/schema";
import {
  updateClientCompletionStatus as recalculateClientStatus,
  updatePropertyCompletionStatus as recalculatePropertyStatus,
} from "@/lib/utils/completion-status";

/**
 * Cible d'une pièce, selon les conventions en base : pièce d'identité → la
 * personne ; Kbis / statuts → la société ; pièces du bien → le bien ; contrat
 * de mariage, convention de PACS… → le client ; pièces du bail → le bail.
 * Une seule cible à la fois.
 */
const targetSchema = z
  .object({
    personId: z.string().min(1).optional(),
    entrepriseId: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    propertyId: z.string().min(1).optional(),
    bailId: z.string().min(1).optional(),
  })
  .refine((t) => Object.values(t).filter(Boolean).length === 1, { message: "Une seule cible attendue" });

const schema = z.object({
  target: targetSchema,
  kind: z.nativeEnum(DocumentKind),
  // Clé produite par /api/blob/generate-upload-token (dossier « documents/ »).
  fileKey: z
    .string()
    .min(10)
    .max(500)
    .refine((key) => key.startsWith("documents/") && !key.includes(".."), { message: "Clé de fichier invalide" }),
  fileName: z.string().min(1).max(300),
  mimeType: z.string().max(200).optional(),
  size: z.number().int().nonnegative().max(50 * 1024 * 1024).optional(),
  /** Pièces remplacées : supprimées seulement après l'enregistrement de la nouvelle. */
  replaceIds: z.array(z.string().min(1)).max(20).optional(),
  /** Nouveau fichier ajouté pour un diagnostic précis (ERP, plomb…) : lu seul par l'IA. */
  diagnosticItem: z.enum(DIAGNOSTIC_ITEM_KEYS as [string, ...string[]]).optional(),
  /** Dossier d'où vient l'ajout (rattaché à la lecture). */
  bailId: z.string().min(1).optional(),
  /** Page de l'interface à rafraîchir (celle d'où vient l'envoi). */
  revalidate: z
    .string()
    .max(300)
    .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), { message: "Page invalide" })
    .optional(),
});

export type DocumentTarget = z.infer<typeof targetSchema>;

export async function attachDocumentAdmin(
  data: unknown,
): Promise<{ success: true; documentId: string } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { target, kind, fileKey, fileName, mimeType, size, replaceIds = [], revalidate, diagnosticItem, bailId } = parsed.data;

  // La cible doit exister ; on retient le client ou le bien à recalculer.
  let clientToRecalculate: string | null = null;
  let propertyToRecalculate: string | null = null;
  if (target.personId) {
    const person = await prisma.person.findUnique({ where: { id: target.personId }, select: { clientId: true } });
    if (!person) return { success: false, error: "Personne introuvable" };
    clientToRecalculate = person.clientId;
  } else if (target.entrepriseId) {
    const entreprise = await prisma.entreprise.findUnique({ where: { id: target.entrepriseId }, select: { clientId: true } });
    if (!entreprise) return { success: false, error: "Société introuvable" };
    clientToRecalculate = entreprise.clientId;
  } else if (target.clientId) {
    const client = await prisma.client.findUnique({ where: { id: target.clientId }, select: { id: true } });
    if (!client) return { success: false, error: "Client introuvable" };
    clientToRecalculate = client.id;
  } else if (target.propertyId) {
    const property = await prisma.property.findUnique({ where: { id: target.propertyId }, select: { id: true } });
    if (!property) return { success: false, error: "Bien introuvable" };
    propertyToRecalculate = property.id;
  } else if (target.bailId) {
    const bail = await prisma.bail.findUnique({ where: { id: target.bailId }, select: { id: true } });
    if (!bail) return { success: false, error: "Dossier introuvable" };
  }

  // On ne remplace que des pièces du même type, rattachées à la même cible.
  if (replaceIds.length > 0) {
    const toReplace = await prisma.document.findMany({
      where: { id: { in: replaceIds } },
      select: { id: true, kind: true, personId: true, entrepriseId: true, clientId: true, propertyId: true, bailId: true },
    });
    const sameTarget = (doc: (typeof toReplace)[number]) =>
      doc.kind === kind &&
      (target.personId ? doc.personId === target.personId : true) &&
      (target.entrepriseId ? doc.entrepriseId === target.entrepriseId : true) &&
      (target.clientId ? doc.clientId === target.clientId && !doc.personId && !doc.entrepriseId : true) &&
      (target.propertyId ? doc.propertyId === target.propertyId : true) &&
      (target.bailId ? doc.bailId === target.bailId : true);
    if (toReplace.length !== replaceIds.length || !toReplace.every(sameTarget)) {
      return { success: false, error: "La pièce à remplacer ne correspond pas" };
    }
  }

  const document = await prisma.document.create({
    data: {
      kind,
      label: fileName,
      fileKey,
      mimeType: mimeType || null,
      size: size ?? null,
      uploadedById: user.id,
      personId: target.personId ?? null,
      entrepriseId: target.entrepriseId ?? null,
      clientId: target.clientId ?? null,
      propertyId: target.propertyId ?? null,
      bailId: target.bailId ?? null,
    },
    select: { id: true },
  });

  // La nouvelle pièce est enregistrée : l'ancienne peut partir (fichier S3 compris).
  for (const id of replaceIds) {
    await deleteDocumentFromDB(id, { skipDiagnosticReading: true });
  }

  // Diagnostics : lecture du seul nouveau fichier pour ce diagnostic, sinon relecture de tous les fichiers du bien.
  if (kind === DocumentKind.DIAGNOSTICS && target.propertyId) {
    if (diagnosticItem && replaceIds.length === 0) {
      const reading = await startItemReading(target.propertyId, diagnosticItem as any, document.id, {
        bailId: bailId ?? null,
        actor: { id: user.id, name: getActorName(user) },
      });
      if (reading.error) console.error("[diagnostics] lecture du nouveau fichier", reading.error);
    } else {
      queueDiagnosticReading(target.propertyId);
    }
  }

  if (clientToRecalculate) await recalculateClientStatus(clientToRecalculate);
  if (propertyToRecalculate) await recalculatePropertyStatus(propertyToRecalculate);

  if (revalidate) revalidatePath(revalidate);
  if (clientToRecalculate) revalidatePath(`/interface/clients/${clientToRecalculate}`);
  if (propertyToRecalculate) revalidatePath(`/interface/properties/${propertyToRecalculate}`);

  return { success: true, documentId: document.id };
}

const deleteSchema = z.object({
  documentId: z.string().min(1),
  /** Page de l'interface à rafraîchir (celle d'où vient la suppression). */
  revalidate: schema.shape.revalidate,
});

/**
 * « Supprimer » une pièce depuis une fiche admin : la pièce et son fichier
 * sont supprimés définitivement, puis l'état du client ou du bien est recalculé.
 */
export async function deleteDocumentAdmin(data: unknown): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = deleteSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { documentId, revalidate } = parsed.data;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      clientId: true,
      propertyId: true,
      person: { select: { clientId: true } },
      entreprise: { select: { clientId: true } },
    },
  });
  if (!document) return { success: false, error: "Document introuvable" };

  try {
    await deleteDocumentFromDB(document.id);
  } catch (error: any) {
    return { success: false, error: error?.message || "La suppression a échoué" };
  }

  const clientToRecalculate = document.clientId || document.person?.clientId || document.entreprise?.clientId || null;
  if (clientToRecalculate) await recalculateClientStatus(clientToRecalculate);
  if (document.propertyId) await recalculatePropertyStatus(document.propertyId);

  if (revalidate) revalidatePath(revalidate);
  if (clientToRecalculate) revalidatePath(`/interface/clients/${clientToRecalculate}`);
  if (document.propertyId) revalidatePath(`/interface/properties/${document.propertyId}`);

  return { success: true };
}
