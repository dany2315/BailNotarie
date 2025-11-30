"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { createLeaseSchema, updateLeaseSchema, transitionLeaseSchema } from "@/lib/zod/lease";
import { revalidatePath } from "next/cache";
import { BailFamille, BailType, BailStatus, ProfilType, NotificationType, ClientType } from "@prisma/client";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { DeletionBlockedError, createDeletionError } from "@/lib/types/deletion-errors";
import { z } from "zod";
import { triggerTenantFormEmail } from "@/lib/inngest/helpers";

export async function createLease(data: unknown) {
  const user = await requireAuth();
  const validated = createLeaseSchema.parse(data);

  // Récupérer le propriétaire du bien
  const property = await prisma.property.findUnique({
    where: { id: validated.propertyId },
    include: { owner: true },
  });

  if (!property) {
    throw new Error("Bien introuvable");
  }

  // Vérifier que le locataire existe
  const tenant = await prisma.client.findUnique({
    where: { id: validated.tenantId },
  });

  if (!tenant) {
    throw new Error("Locataire introuvable");
  }

  // Mapper leaseType vers bailFamily
  const bailFamilyMap: Record<string, BailFamille> = {
    HABITATION: BailFamille.HABITATION,
  };

  const bail = await prisma.bail.create({
    data: {
      bailType: BailType.BAIL_NU_3_ANS, // Par défaut
      bailFamily: bailFamilyMap[validated.leaseType] || BailFamille.HABITATION,
      status: validated.status as BailStatus,
      rentAmount: validated.rentAmount,
      monthlyCharges: validated.monthlyCharges,
      securityDeposit: validated.securityDeposit,
      effectiveDate: validated.effectiveDate,
      endDate: validated.endDate || null,
      paymentDay: validated.paymentDay || null,
      propertyId: validated.propertyId,
      parties: {
        connect: [
          { id: property.ownerId }, // Propriétaire
          { id: validated.tenantId }, // Locataire
        ],
      },
      createdById: user.id,
    },
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le bail)
  await createNotificationForAllUsers(
    NotificationType.BAIL_CREATED,
    "BAIL",
    bail.id,
    user.id
  );

  revalidatePath("/interface/baux");
  return bail;
}

export async function updateLease(data: unknown) {
  const user = await requireAuth();
  const validated = updateLeaseSchema.parse(data);
  const { id, tenantId, leaseType, ...updateData } = validated;

  const updatePayload: any = {
    updatedById: user.id,
  };

  if (updateData.rentAmount !== undefined) {
    updatePayload.rentAmount = updateData.rentAmount;
  }
  if (updateData.monthlyCharges !== undefined) {
    updatePayload.monthlyCharges = updateData.monthlyCharges;
  }
  if (updateData.securityDeposit !== undefined) {
    updatePayload.securityDeposit = updateData.securityDeposit;
  }
  if (updateData.effectiveDate !== undefined) {
    updatePayload.effectiveDate = updateData.effectiveDate;
  }
  if (updateData.endDate !== undefined) {
    updatePayload.endDate = updateData.endDate || null;
  }
  if (updateData.paymentDay !== undefined) {
    updatePayload.paymentDay = updateData.paymentDay || null;
  }
  if (updateData.status !== undefined) {
    updatePayload.status = updateData.status as BailStatus;
  }
  if (leaseType) {
    const bailFamilyMap: Record<string, BailFamille> = {
      HABITATION: BailFamille.HABITATION,
    };
    updatePayload.bailFamily = bailFamilyMap[leaseType] || BailFamille.HABITATION;
  }
  if (updateData.propertyId) {
    updatePayload.propertyId = updateData.propertyId;
  }

  // Si tenantId est fourni, mettre à jour les parties
  if (tenantId) {
    const bail = await prisma.bail.findUnique({
      where: { id },
      include: { property: true, parties: true },
    });

    if (bail) {
      const owner = bail.parties.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
      if (owner) {
        updatePayload.parties = {
          set: [
            { id: owner.id }, // Propriétaire
            { id: tenantId }, // Locataire
          ],
        };
      }
    }
  }

  // Récupérer l'ancien statut avant la mise à jour
  const oldBail = await prisma.bail.findUnique({ where: { id } });
  const oldStatus = oldBail?.status;
  const newStatus = updatePayload.status || oldBail?.status;

  const bail = await prisma.bail.update({
    where: { id },
    data: updatePayload,
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  // Pas de notification pour les modifications via l'interface

  revalidatePath("/interface/baux");
  revalidatePath(`/interface/baux/${id}`);
  return bail;
}

export async function transitionLease(data: unknown) {
  const validated = transitionLeaseSchema.parse(data);
  const { id, nextStatus } = validated;

  // Garde des rôles selon la transition
  if (nextStatus === "READY_FOR_NOTARY") {
    await requireRole(["ADMINISTRATEUR", "OPERATEUR", "REVIEWER"]);
  } else if (nextStatus === "ACTIVE") {
    await requireRole(["ADMINISTRATEUR", "NOTAIRE"]);
  } else if (nextStatus === "TERMINATED" || nextStatus === "CANCELED") {
    await requireRole(["ADMINISTRATEUR", "NOTAIRE", "OPERATEUR"]);
  } else {
    await requireAuth();
  }

  const user = await requireAuth();

  // Récupérer l'ancien statut
  const oldBail = await prisma.bail.findUnique({ where: { id } });
  const oldStatus = oldBail?.status;

  const bail = await prisma.bail.update({
    where: { id },
    data: {
      status: nextStatus as BailStatus,
      updatedById: user.id,
    },
    include: {
      property: { include: { owner: true } },
      parties: true,
    },
  });

  // Pas de notification pour les modifications via l'interface

  revalidatePath("/interface/baux");
  revalidatePath(`/interface/baux/${id}`);
  return bail;
}

export async function deleteLease(id: string): Promise<{ success: true } | { success: false; error: string; blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }> }> {
  const user = await requireAuth();
  
  // Récupérer le bail avec toutes ses relations
  const bail = await prisma.bail.findUnique({ 
    where: { id },
    include: { 
      property: {
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
        },
      },
      parties: {
        select: {
          id: true,
          profilType: true,
          firstName: true,
          lastName: true,
          legalName: true,
          type: true,
          email: true,
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

  if (!bail) {
    return { success: false, error: "Bail introuvable" };
  }

  // Vérifier s'il y a un locataire connecté au bail
  const hasTenant = bail.parties.some(party => party.profilType === ProfilType.LOCATAIRE);
  
  if (hasTenant) {
    // Trouver le nom du locataire pour le message d'erreur
    const tenant = bail.parties.find(party => party.profilType === ProfilType.LOCATAIRE);
    if (tenant) {
      const tenantName = tenant.type === ClientType.PERSONNE_PHYSIQUE
        ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || tenant.email || "Locataire"
        : tenant.legalName || tenant.email || "Locataire";
      
      return {
        success: false,
        error: `Impossible de supprimer le bail. ` +
          `Un locataire est connecté à ce bail. ` +
          `Vous devez d'abord supprimer le locataire concerné.`,
        blockingEntities: [{
          id: tenant.id,
          name: tenantName,
          type: "CLIENT",
          link: `/interface/clients/${tenant.id}`,
        }],
      };
    }
  }

  // Si seulement un propriétaire, on peut supprimer
  // Supprimer les documents et leurs fichiers blob
  const documentFileKeys = bail.documents.map(doc => doc.fileKey);
  if (documentFileKeys.length > 0) {
    const { deleteBlobFiles } = await import("@/lib/actions/documents");
    await deleteBlobFiles(documentFileKeys);
  }

  // Supprimer les documents du bail
  await prisma.document.deleteMany({
    where: { bailId: id },
  });

  // Remettre l'IntakeLink du propriétaire en PENDING s'il était en SUBMITTED
  if (bail.property?.owner) {
    const ownerIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: bail.property.owner.id,
        bailId: id,
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
          bailId: null, // Découpler du bail supprimé
        },
      });
    }
  }

  // Supprimer les autres intakeLinks en relation avec le bail (sauf celui du propriétaire qu'on vient de mettre à jour)
  await prisma.intakeLink.deleteMany({
    where: { bailId: id },
  });

  // Supprimer le bail
  await prisma.bail.delete({ where: { id } });
  
  // Créer une notification pour tous les utilisateurs (sauf celui qui a supprimé le bail)
  await createNotificationForAllUsers(
    NotificationType.BAIL_DELETED,
    "BAIL",
    id,
    user.id
  );
  
  revalidatePath("/interface/baux");
  return { success: true };
}

export async function getLease(id: string) {
  await requireAuth();
  return prisma.bail.findUnique({
    where: { id },
    include: {
      property: {
        include: {
          owner: true,
        },
      },
      parties: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      documents: true,
    },
  });
}

export async function getLeases(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string | string[];
  propertyId?: string;
  tenantId?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params.status) {
    // Gérer plusieurs statuts (tableau ou chaîne séparée par des virgules)
    const statuses = Array.isArray(params.status) 
      ? params.status 
      : params.status.split(",").filter(Boolean);
    
    if (statuses.length > 0) {
      where.status = statuses.length === 1 
        ? (statuses[0] as BailStatus)
        : { in: statuses as BailStatus[] };
    }
  }

  if (params.propertyId) {
    where.propertyId = params.propertyId;
  }

  if (params.tenantId) {
    where.parties = {
      some: { id: params.tenantId },
    };
  }

  if (params.search) {
    where.OR = [
      { property: { fullAddress: { contains: params.search, mode: "insensitive" } } },
      { parties: { some: { firstName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { lastName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { legalName: { contains: params.search, mode: "insensitive" } } } },
      { parties: { some: { email: { contains: params.search, mode: "insensitive" } } } },
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.bail.findMany({
      where,
      include: {
        property: { include: { owner: true } },
        parties: true,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { effectiveDate: "desc" },
    }),
    prisma.bail.count({ where }),
  ]);

  // Sérialiser les données pour éviter les problèmes de sérialisation
  const serializedData = JSON.parse(JSON.stringify(data));

  return {
    data: serializedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Obtenir tous les baux (pour filtrage côté client)
export async function getAllBails() {
  await requireAuth();

  const data = await prisma.bail.findMany({
    include: {
      property: {
        include: {
          owner: true,
        },
      },
      parties: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Sérialiser les données
  const serializedData = JSON.parse(JSON.stringify(data));

  return serializedData;
}

// Schéma pour créer un locataire avec juste l'email
const createTenantForLeaseSchema = z.object({
  bailId: z.string().cuid("ID de bail invalide"),
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
});

// Créer un locataire pour un bail existant (avec juste l'email)
export async function createTenantForLease(data: unknown) {
  const user = await requireAuth();
  const validated = createTenantForLeaseSchema.parse(data);

  // Récupérer le bail avec ses parties et le bien
  const bail = await prisma.bail.findUnique({
    where: { id: validated.bailId },
    include: {
      property: true,
      parties: true,
    },
  });

  if (!bail) {
    throw new Error("Bail introuvable");
  }

  // Vérifier s'il y a déjà un locataire connecté au bail
  const existingTenant = bail.parties.find(
    (party) => party.profilType === ProfilType.LOCATAIRE
  );

  if (existingTenant) {
    throw new Error("Un locataire est déjà connecté à ce bail");
  }

  // Chercher un locataire existant avec cet email
  let tenant = await prisma.client.findFirst({
    where: {
      email: validated.email,
      profilType: ProfilType.LOCATAIRE,
    },
  });

  if (!tenant) {
    // Créer un nouveau locataire
    tenant = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE,
        profilType: ProfilType.LOCATAIRE,
        email: validated.email,
        createdById: user.id,
      },
    });

    // Notification pour création de client
    await createNotificationForAllUsers(
      NotificationType.CLIENT_CREATED,
      "CLIENT",
      tenant.id,
      user.id,
      { createdByForm: false }
    );
  }

  // Connecter le locataire au bail
  await prisma.bail.update({
    where: { id: validated.bailId },
    data: {
      parties: {
        connect: { id: tenant.id },
      },
    },
  });

  // Vérifier si un IntakeLink existe déjà pour ce locataire et ce bail
  let tenantIntakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: tenant.id,
      bailId: validated.bailId,
      target: "TENANT",
    },
  });

  if (!tenantIntakeLink) {
    // Créer un nouvel IntakeLink
    tenantIntakeLink = await prisma.intakeLink.create({
      data: {
        target: "TENANT",
        clientId: tenant.id,
        propertyId: bail.propertyId,
        bailId: validated.bailId,
        createdById: user.id,
      },
    });
  }

  // Déclencher l'envoi d'email au locataire avec le formulaire via Inngest (asynchrone, ne bloque pas le rendu)
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const tenantFormUrl = `${baseUrl}/intakes/${tenantIntakeLink.token}`;

  try {
    await triggerTenantFormEmail({
      to: validated.email,
      firstName: "",
      lastName: "",
      formUrl: tenantFormUrl,
    });
  } catch (error) {
    console.error("Erreur lors du déclenchement de l'email au locataire:", error);
    // On continue même si l'email échoue
  }

  revalidatePath("/interface/baux");
  revalidatePath(`/interface/baux/${validated.bailId}`);
  revalidatePath("/interface/clients");

  return { tenant, tenantIntakeLink };
}


