"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireStaff, requireClientAccess, STAFF_ROLES } from "@/lib/auth-helpers";
import { accessibleDocument } from "@/lib/document-access";
import { deleteDocumentFromDB } from "@/lib/document-storage";
import { revalidatePath } from "next/cache";
import { DocumentKind } from "@prisma/client";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";
import { uploadFileToS3, generateS3FileKey, deleteFileFromS3, extractS3KeyFromUrl } from "@/lib/utils/s3-client";

/**
 * @deprecated Cette fonction est obsolète. Utilisez `/api/blob/generate-upload-token` pour obtenir une URL signée S3.
 * Cette fonction retournait un stub et n'est plus utilisée.
 */
export async function getSignedUrl(kind: string, fileName: string, mimeType: string) {
  await requireStaff();
  
  // Cette fonction est deprecated - utiliser /api/blob/generate-upload-token à la place
  throw new Error("getSignedUrl() est deprecated. Utilisez /api/blob/generate-upload-token pour obtenir une URL signée S3.");
}

export async function createDocument(data: {
  kind: string;
  label?: string;
  fileKey: string;
  mimeType?: string;
  size?: number;
  clientId?: string;
  propertyId?: string;
  bailId?: string;
}) {
  const user = await requireStaff();

  const document = await prisma.document.create({
    data: {
      kind: data.kind as any,
      label: data.label,
      fileKey: data.fileKey,
      mimeType: data.mimeType,
      size: data.size,
      clientId: data.clientId,
      propertyId: data.propertyId,
      bailId: data.bailId,
      uploadedById: user.id,
    },
  });

  // Mettre à jour les statuts de complétion
  if (data.clientId) {
    await calculateAndUpdateClientStatus(data.clientId);
    revalidatePath(`/interface/clients/${data.clientId}`);
  }
  if (data.propertyId) {
    await calculateAndUpdatePropertyStatus(data.propertyId);
    revalidatePath(`/interface/properties/${data.propertyId}`);
  }
  if (data.bailId) {
    revalidatePath(`/interface/bails/${data.bailId}`);
  }

  return document;
}

export async function deleteDocument(id: string, token?: string) {
  // Lien d'intake en cours ou session autorisée sur le dossier (voir lib/document-access.ts).
  if (!(await accessibleDocument(id, "delete", token ?? null))) {
    throw new Error("Document introuvable");
  }

  const document = await prisma.document.findUnique({ where: { id } });
  
  if (!document) {
    throw new Error("Document introuvable");
  }

  const clientId = document.clientId;
  const propertyId = document.propertyId;

  // Utiliser la fonction wrapper pour supprimer le document et son fichier
  await deleteDocumentFromDB(id);

  // Mettre à jour les statuts de complétion
  if (clientId) {
    await calculateAndUpdateClientStatus(clientId);
    revalidatePath(`/interface/clients/${clientId}`);
  }
  if (propertyId) {
    await calculateAndUpdatePropertyStatus(propertyId);
    revalidatePath(`/interface/properties/${propertyId}`);
  }
  if (document.bailId) {
    revalidatePath(`/interface/bails/${document.bailId}`);
  }
}

export async function getDocuments(params: {
  clientId?: string;
  propertyId?: string;
  bailId?: string;
}) {
  const user = await requireAuth();
  // Hors équipe : un filtre est obligatoire et doit viser les données de l'appelant.
  if (!STAFF_ROLES.includes(user.role)) {
    if ((!params.clientId && !params.propertyId) || params.bailId) throw new Error("Forbidden");
    if (params.clientId) await requireClientAccess(params.clientId);
    if (params.propertyId) {
      const property = await prisma.property.findUnique({ where: { id: params.propertyId }, select: { ownerId: true } });
      if (!property) throw new Error("Forbidden");
      await requireClientAccess(property.ownerId);
    }
  }

  return prisma.document.findMany({
    where: {
      clientId: params.clientId,
      propertyId: params.propertyId,
      bailId: params.bailId,
    },
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      person: { 
        select: { 
          id: true, 
          firstName: true, 
          lastName: true, 
          isPrimary: true 
        } 
      },
      entreprise: { 
        select: { 
          id: true, 
          legalName: true, 
          name: true 
        } 
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
