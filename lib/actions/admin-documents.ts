"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { DocumentKind, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { deleteDocumentFromDB } from "@/lib/document-storage";
import {
  updateClientCompletionStatus as recalculateClientStatus,
  updatePropertyCompletionStatus as recalculatePropertyStatus,
} from "@/lib/utils/completion-status";

/**
 * Cible d'une pièce, selon les conventions en base : pièce d'identité → la
 * personne ; Kbis / statuts → la société ; pièces du bien (dont assurance et
 * RIB du propriétaire) → le bien ; assurance / RIB du locataire, livret de
 * famille… → le client ; pièces du bail → le bail. Une seule cible à la fois.
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
  const { target, kind, fileKey, fileName, mimeType, size, replaceIds = [], revalidate } = parsed.data;

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
    await deleteDocumentFromDB(id);
  }

  if (clientToRecalculate) await recalculateClientStatus(clientToRecalculate);
  if (propertyToRecalculate) await recalculatePropertyStatus(propertyToRecalculate);

  if (revalidate) revalidatePath(revalidate);
  if (clientToRecalculate) revalidatePath(`/interface/clients/${clientToRecalculate}`);
  if (propertyToRecalculate) revalidatePath(`/interface/properties/${propertyToRecalculate}`);

  return { success: true, documentId: document.id };
}
