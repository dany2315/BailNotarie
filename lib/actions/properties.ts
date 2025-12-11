"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createPropertySchema, updatePropertySchema } from "@/lib/zod/property";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { PropertyStatus, CompletionStatus, NotificationType } from "@prisma/client";
import { updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus } from "@/lib/utils/completion-status";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { DeletionBlockedError, createDeletionError } from "@/lib/types/deletion-errors";

export async function createProperty(data: unknown) {
  const user = await requireAuth();
  const validated = createPropertySchema.parse(data);

  const property = await prisma.property.create({
    data: {
      ...validated,
      surfaceM2: validated.surfaceM2 ? new Decimal(validated.surfaceM2) : null,
      createdById: user.id,
      status: PropertyStatus.NON_LOUER,
    },
    include: {
      owner: true,
    },
  });

  // Mettre à jour le statut de complétion
  await calculateAndUpdatePropertyStatus(property.id);

  // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le bien)
  await createNotificationForAllUsers(
    NotificationType.PROPERTY_CREATED,
    "PROPERTY",
    property.id,
    user.id,
    { createdByForm: false }
  );

  revalidatePath("/interface/properties");
  return property;
}

export async function updateProperty(data: unknown) {
  const user = await requireAuth();
  const validated = updatePropertySchema.parse(data);
  const { id, ...updateData } = validated;

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...updateData,
      surfaceM2: updateData.surfaceM2 !== undefined ? (updateData.surfaceM2 ? new Decimal(updateData.surfaceM2) : null) : undefined,
      updatedById: user.id,
    },
    include: {
      owner: true,
    },
  });

  // Mettre à jour le statut de complétion
  await calculateAndUpdatePropertyStatus(id);

  // Pas de notification pour les modifications via l'interface

  revalidatePath("/interface/properties");
  revalidatePath(`/interface/properties/${id}`);
  return property;
}

export async function deleteProperty(id: string): Promise<{ success: true } | { success: false; error: string; blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }> }> {
  const user = await requireAuth();
  
  // Récupérer le bien avec toutes ses relations
  const property = await prisma.property.findUnique({ 
    where: { id },
    include: { 
      owner: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          legalName: true,
          type: true,
          email: true,
        },
      },
      bails: {
        select: {
          id: true,
        },
      },
      documents: {
        select: {
          id: true,
          fileKey: true,
        },
      },
      intakes: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!property) {
    return { success: false, error: "Bien introuvable" };
  }

  // Vérifier s'il y a un bail sur ce bien
  if (property.bails.length > 0) {
    const blockingEntities = property.bails.map(bail => ({
      id: bail.id,
      name: `Bail #${bail.id.slice(-8).toUpperCase()}`,
      type: "BAIL" as const,
      link: `/interface/baux/${bail.id}`,
    }));
    
    return {
      success: false,
      error: `Impossible de supprimer le bien "${property.fullAddress}". ` +
        `Il existe ${property.bails.length} bail${property.bails.length > 1 ? 'x' : ''} associé${property.bails.length > 1 ? 's' : ''} à ce bien. ` +
        `Vous devez d'abord supprimer le${property.bails.length > 1 ? 's' : ''} bail${property.bails.length > 1 ? 'x' : ''} concerné${property.bails.length > 1 ? 's' : ''}.`,
      blockingEntities,
    };
  }

  // Supprimer les documents et leurs fichiers blob
  const documentFileKeys = property.documents.map(doc => doc.fileKey);
  if (documentFileKeys.length > 0) {
    const { deleteBlobFiles } = await import("@/lib/actions/documents");
    await deleteBlobFiles(documentFileKeys);
  }

  // Supprimer les documents du bien
  await prisma.document.deleteMany({
    where: { propertyId: id },
  });

  // Remettre l'IntakeLink du propriétaire en PENDING s'il était en SUBMITTED
  if (property.owner) {
    const ownerIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: property.owner.id,
        propertyId: id,
        target: "OWNER",
        status: "SUBMITTED",
      },
    });

    if (ownerIntakeLink) {
      await prisma.intakeLink.update({
        where: { id: ownerIntakeLink.id },
        data: {
          status: "PENDING",
          submittedAt: null,
          propertyId: null, // Découpler du bien supprimé
          bailId: null, // Découpler du bail si présent
        },
      });
    }
  }

  // Supprimer les autres intakeLinks en relation avec le bien (sauf celui du propriétaire qu'on vient de mettre à jour)
  await prisma.intakeLink.deleteMany({
    where: { propertyId: id },
  });

  // Supprimer le bien
  await prisma.property.delete({ where: { id } });
  
  // Créer une notification pour tous les utilisateurs (sauf celui qui a supprimé le bien)
  await createNotificationForAllUsers(
    NotificationType.PROPERTY_DELETED,
    "PROPERTY",
    id,
    user.id,
    { propertyAddress: property.fullAddress }
  );
  
  revalidatePath("/interface/properties");
  return { success: true };
}

export async function getProperty(id: string) {
  await requireAuth();
  return prisma.property.findUnique({
    where: { id },
    include: {
      owner: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
          entreprise: true,
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      bails: { 
        include: { 
          parties: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
            },
          },
        },
      },
      documents: true,
    },
  });
}

export async function getProperties(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  ownerId?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.ownerId) {
    where.ownerId = params.ownerId;
  }

  if (params.search) {
    where.fullAddress = { contains: params.search, mode: "insensitive" };
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: {
        owner: {
          include: {
            persons: {
              orderBy: { isPrimary: 'desc' },
            },
            entreprise: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.property.count({ where }),
  ]);

  // Sérialiser les données pour éviter les problèmes de sérialisation avec les objets Decimal
  const serializedData = JSON.parse(JSON.stringify(data));

  return {
    data: serializedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Mettre à jour le statut de complétion d'un bien
export async function updatePropertyCompletionStatus(data: { id: string; completionStatus: CompletionStatus }) {
  const user = await requireAuth();
  const { id, completionStatus } = data;

  // Récupérer l'ancien statut
  const oldProperty = await prisma.property.findUnique({ where: { id } });
  const oldStatus = oldProperty?.completionStatus;

  const property = await prisma.property.update({
    where: { id },
    data: {
      completionStatus,
      updatedById: user.id,
    },
  });

  // Notification uniquement si le statut devient COMPLETED (via interface, notifier tous les utilisateurs)
  if (oldStatus !== completionStatus && completionStatus === CompletionStatus.COMPLETED) {
    await createNotificationForAllUsers(
      NotificationType.COMPLETION_STATUS_CHANGED,
      "PROPERTY",
      id,
      null, // Modifié via interface, notifier tous les utilisateurs
      { 
        oldStatus,
        newStatus: completionStatus,
        entityType: "PROPERTY"
      }
    );
  }

  revalidatePath("/interface/properties");
  revalidatePath(`/interface/properties/${id}`);
  return property;
}

