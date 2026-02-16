"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireProprietaireAuth } from "@/lib/auth-helpers";
import { createPropertySchema, updatePropertySchema } from "@/lib/zod/property";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { PropertyStatus, CompletionStatus, NotificationType, Role, ProfilType } from "@prisma/client";
import { updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus } from "@/lib/utils/completion-status";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { DeletionBlockedError, createDeletionError } from "@/lib/types/deletion-errors";
import { updatePropertyZoneStatus } from "@/lib/services/zone-tendue";

export async function createProperty(data: unknown) {
  const user = await requireAuth();
  const validated = createPropertySchema.parse(data);

  // Si l'utilisateur est un client, vérifier qu'il est propriétaire
  if (user.role === Role.UTILISATEUR) {
    const { client } = await requireProprietaireAuth();
    // Vérifier que le ownerId correspond au client
    if (validated.ownerId !== client.id) {
      throw new Error("Vous ne pouvez créer des biens que pour vous-même");
    }
    // Vérifier le statut de completion
    if (client.completionStatus !== CompletionStatus.PENDING_CHECK && 
        client.completionStatus !== CompletionStatus.COMPLETED) {
      throw new Error("Vous devez compléter vos informations personnelles et les soumettre à vérification avant de pouvoir créer un bien");
    }
  }

  const property = await prisma.property.create({
    data: {
      ...validated,
      // Normaliser les chaînes vides en null pour les champs optionnels
      housenumber: validated.housenumber && validated.housenumber.trim() ? validated.housenumber.trim() : null,
      street: validated.street && validated.street.trim() ? validated.street.trim() : null,
      city: validated.city && validated.city.trim() ? validated.city.trim() : null,
      postalCode: validated.postalCode && validated.postalCode.trim() ? validated.postalCode.trim() : null,
      district: validated.district && validated.district.trim() ? validated.district.trim() : null,
      inseeCode: validated.inseeCode && validated.inseeCode.trim() ? validated.inseeCode.trim() : null,
      department: validated.department && validated.department.trim() ? validated.department.trim() : null,
      region: validated.region && validated.region.trim() ? validated.region.trim() : null,
      surfaceM2: validated.surfaceM2 ? new Decimal(validated.surfaceM2) : null,
      latitude: validated.latitude ? new Decimal(validated.latitude) : null,
      longitude: validated.longitude ? new Decimal(validated.longitude) : null,
      createdById: user.id,
      status: PropertyStatus.NON_LOUER,
    },
    include: {
      owner: true,
    },
  });

  // Vérifier et mettre à jour les indicateurs de zone tendue
  if (validated.inseeCode && validated.type) {
    await updatePropertyZoneStatus(property.id, validated.inseeCode, validated.type);
  }

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

  // Récupérer le bien actuel pour vérifier si l'adresse ou le type a changé
  const currentProperty = await prisma.property.findUnique({
    where: { id },
    select: {
      inseeCode: true,
      type: true,
    },
  });

  // Normaliser les chaînes vides en null pour les champs optionnels d'adresse
  const normalizedUpdateData: any = { ...updateData };
  if (updateData.housenumber !== undefined) {
    normalizedUpdateData.housenumber = updateData.housenumber && updateData.housenumber.trim() ? updateData.housenumber.trim() : null;
  }
  if (updateData.street !== undefined) {
    normalizedUpdateData.street = updateData.street && updateData.street.trim() ? updateData.street.trim() : null;
  }
  if (updateData.city !== undefined) {
    normalizedUpdateData.city = updateData.city && updateData.city.trim() ? updateData.city.trim() : null;
  }
  if (updateData.postalCode !== undefined) {
    normalizedUpdateData.postalCode = updateData.postalCode && updateData.postalCode.trim() ? updateData.postalCode.trim() : null;
  }
  if (updateData.district !== undefined) {
    normalizedUpdateData.district = updateData.district && updateData.district.trim() ? updateData.district.trim() : null;
  }
  if (updateData.inseeCode !== undefined) {
    normalizedUpdateData.inseeCode = updateData.inseeCode && updateData.inseeCode.trim() ? updateData.inseeCode.trim() : null;
  }
  if (updateData.department !== undefined) {
    normalizedUpdateData.department = updateData.department && updateData.department.trim() ? updateData.department.trim() : null;
  }
  if (updateData.region !== undefined) {
    normalizedUpdateData.region = updateData.region && updateData.region.trim() ? updateData.region.trim() : null;
  }

  const property = await prisma.property.update({
    where: { id },
    data: {
      ...normalizedUpdateData,
      surfaceM2: updateData.surfaceM2 !== undefined ? (updateData.surfaceM2 ? new Decimal(updateData.surfaceM2) : null) : undefined,
      latitude: updateData.latitude !== undefined ? (updateData.latitude ? new Decimal(updateData.latitude) : null) : undefined,
      longitude: updateData.longitude !== undefined ? (updateData.longitude ? new Decimal(updateData.longitude) : null) : undefined,
      updatedById: user.id,
    },
    include: {
      owner: true,
    },
  });

  // Vérifier et mettre à jour les indicateurs de zone tendue si l'adresse ou le type a changé
  const inseeCodeChanged = updateData.inseeCode !== undefined && updateData.inseeCode !== currentProperty?.inseeCode;
  const typeChanged = updateData.type !== undefined && updateData.type !== currentProperty?.type;
  
  if (inseeCodeChanged || typeChanged) {
    const newInseeCode = updateData.inseeCode ?? currentProperty?.inseeCode ?? null;
    const newType = updateData.type ?? currentProperty?.type ?? null;
    
    if (newInseeCode && newType) {
      await updatePropertyZoneStatus(property.id, newInseeCode, newType);
    } else {
      // Si pas de code INSEE ou type, réinitialiser les indicateurs
      await prisma.property.update({
        where: { id },
        data: {
          isTightZone: false,
          hasRentControl: false,
        },
      });
    }
  }

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
          type: true,
          persons: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              isPrimary: true,
            },
          },
          entreprise: {
            select: {
              name: true,
              legalName: true,
              email: true,
            },
          },
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
  const { deleteDocumentsFromDB } = await import("@/lib/actions/documents");
  await deleteDocumentsFromDB({ propertyId: id });

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

export async function getAllProperties() {
  await requireAuth();
  return prisma.property.findMany({
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
    orderBy: { createdAt: "desc" },
  });
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

  // Récupérer l'ancien statut et le propriétaire
  const property = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      completionStatus: true,
      label: true,
      fullAddress: true,
      ownerId: true,
      owner: {
        select: { id: true, profilType: true },
      },
    },
  });

  if (!property) {
    throw new Error("Bien introuvable");
  }

  const oldStatus = property.completionStatus;

  await prisma.property.update({
    where: { id },
    data: {
      completionStatus,
      updatedById: user.id,
    },
  });

  // Envoyer un email de notification au propriétaire si le statut a changé (asynchrone)
  if (oldStatus !== completionStatus && property.ownerId) {
    const { getClientEmailAndName } = await import("../utils/client-email");
    const { triggerCompletionStatusEmail } = await import("../inngest/helpers");
    
    getClientEmailAndName(property.ownerId).then(({ email, name, profilType }) => {
      if (email) {
        const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
        const dashboardPath = profilType === ProfilType.PROPRIETAIRE 
          ? "/client/proprietaire" 
          : "/client";
        
        const propertyName = property.label || property.fullAddress;
        
        triggerCompletionStatusEmail({
          to: email,
          clientName: name,
          entityType: "property",
          entityName: propertyName,
          oldStatus,
          newStatus: completionStatus,
          dashboardUrl: `${baseUrl}${dashboardPath}`,
          profilType: profilType === ProfilType.PROPRIETAIRE ? "PROPRIETAIRE" : undefined,
        }).catch((error) => {
          console.error(`Erreur lors de l'envoi de l'email de changement de statut au propriétaire ${property.ownerId}:`, error);
        });
      }
    }).catch((error) => {
      console.error(`Erreur lors de la récupération des informations du propriétaire ${property.ownerId}:`, error);
    });
  }

  // Vérifier et mettre à jour les baux associés si nécessaire
  const bails = await prisma.bail.findMany({
    where: {
      propertyId: id,
      status: { in: ["DRAFT", "PENDING_VALIDATION"] }
    },
    include: {
      property: true,
      parties: true
    }
  });

  for (const bail of bails) {
    const owner = bail.parties.find((p: any) => p.profilType === "PROPRIETAIRE");
    const tenant = bail.parties.find((p: any) => p.profilType === "LOCATAIRE");
    const property = bail.property;

    if (!owner || !tenant || !property) continue;

    const allCompleted = 
      owner.completionStatus === "COMPLETED" && 
      tenant.completionStatus === "COMPLETED" && 
      completionStatus === "COMPLETED";

    const allPendingCheck = 
      owner.completionStatus === "PENDING_CHECK" && 
      tenant.completionStatus === "PENDING_CHECK" && 
      completionStatus === "PENDING_CHECK";

    if (allCompleted && (bail.status === "DRAFT" || bail.status === "PENDING_VALIDATION")) {
      await prisma.bail.update({
        where: { id: bail.id },
        data: { status: "READY_FOR_NOTARY" }
      });
    } else if (allPendingCheck && bail.status === "DRAFT") {
      await prisma.bail.update({
        where: { id: bail.id },
        data: { status: "PENDING_VALIDATION" }
      });
    }
  }

  revalidatePath("/interface/properties");
  revalidatePath(`/interface/properties/${id}`);
  revalidatePath("/interface/baux");
  
  return { success: true };
}

