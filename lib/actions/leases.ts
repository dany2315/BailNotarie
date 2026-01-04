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
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
          entreprise: true,
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

  // Helper pour obtenir le nom d'un client
  const getClientName = (client: any): string => {
    if (client.type === ClientType.PERSONNE_PHYSIQUE) {
      const primaryPerson = client.persons?.find((p: any) => p.isPrimary) || client.persons?.[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        return name || primaryPerson.email || "Client";
      }
      return client.email || "Client";
    }
    // PERSONNE_MORALE
    if (client.entreprise) {
      return client.entreprise.legalName || client.entreprise.name || client.entreprise.email || "Client";
    }
    return client.legalName || client.email || "Client";
  };

  // Vérifier s'il y a un locataire connecté au bail
  const hasTenant = bail.parties.some(party => party.profilType === ProfilType.LOCATAIRE);
  
  if (hasTenant) {
    // Trouver le nom du locataire pour le message d'erreur
    const tenant = bail.parties.find(party => party.profilType === ProfilType.LOCATAIRE);
    if (tenant) {
      const tenantName = getClientName(tenant);
      
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
          owner: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
                include: {
                  documents: { orderBy: { createdAt: "desc" } },
                },
              },
              entreprise: {
                include: {
                  documents: { orderBy: { createdAt: "desc" } },
                },
              },
            },
          },
        },
      },
      parties: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
            include: {
              documents: { orderBy: { createdAt: "desc" } },
            },
          },
          entreprise: {
            include: {
              documents: { orderBy: { createdAt: "desc" } },
            },
          },
        },
      },
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
      // Recherche dans les personnes des parties
      { parties: { some: { persons: { some: { firstName: { contains: params.search, mode: "insensitive" } } } } } },
      { parties: { some: { persons: { some: { lastName: { contains: params.search, mode: "insensitive" } } } } } },
      { parties: { some: { persons: { some: { email: { contains: params.search, mode: "insensitive" } } } } } },
      // Recherche dans les entreprises des parties
      { parties: { some: { entreprise: { legalName: { contains: params.search, mode: "insensitive" } } } } },
      { parties: { some: { entreprise: { name: { contains: params.search, mode: "insensitive" } } } } },
      { parties: { some: { entreprise: { email: { contains: params.search, mode: "insensitive" } } } } },
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.bail.findMany({
      where,
      include: {
        property: { 
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
        },
        parties: {
          include: {
            persons: {
              orderBy: { isPrimary: 'desc' },
            },
            entreprise: true,
          },
        },
        dossierAssignments: {
          include: {
            notaire: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
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
          owner: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
          entreprise: true,
        },
      },
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

  // Chercher un locataire existant avec cet email dans ses persons
  let tenant = await prisma.client.findFirst({
    where: {
      profilType: ProfilType.LOCATAIRE,
      persons: {
        some: {
          email: validated.email,
        },
      },
    },
  });

  if (!tenant) {
    // Créer un nouveau locataire avec une personne associée
    tenant = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE,
        profilType: ProfilType.LOCATAIRE,
        createdById: user.id,
        persons: {
          create: {
            email: validated.email,
            isPrimary: true,
            createdById: user.id,
          },
        },
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

// Types pour les données manquantes d'un bail
export interface BailMissingDataPerson {
  personId: string;
  personName: string;
  isPrimary: boolean;
  missingFields: string[];
  missingDocuments: string[];
}

export interface BailMissingDataClient {
  clientId: string;
  clientName: string;
  clientType: ClientType;
  profilType: ProfilType;
  completionStatus: string;
  persons: BailMissingDataPerson[];
  entreprise: {
    missingFields: string[];
    missingDocuments: string[];
  } | null;
  clientDocuments: string[];
  generalDocuments: string[];
  totalMissingFields: number;
  totalMissingDocuments: number;
}

export interface BailMissingDataProperty {
  propertyId: string;
  propertyLabel: string;
  propertyAddress: string;
  completionStatus: string;
  missingFields: string[];
  missingDocuments: string[];
}

export interface BailMissingDataBail {
  missingFields: string[];
  totalMissing: number;
}

export interface BailCompleteMissingData {
  bail: BailMissingDataBail;
  owner: BailMissingDataClient | null;
  tenant: BailMissingDataClient | null;
  property: BailMissingDataProperty | null;
  isComplete: boolean;
  totalMissing: number;
}

// Fonction pour récupérer toutes les données manquantes d'un bail
export async function getBailMissingData(bailId: string): Promise<BailCompleteMissingData | null> {
  await requireAuth();
  
  const { checkClientCompletionDetailed, checkPropertyCompletion } = await import("@/lib/utils/completion-status");
  
  try {
    // Récupérer le bail avec toutes ses relations
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      include: {
        property: {
          include: {
            documents: true,
          },
        },
        parties: {
          include: {
            persons: true,
            entreprise: true,
          },
        },
      },
    });

    if (!bail) {
      return null;
    }

    // Trouver propriétaire et locataire
    const owner = bail.parties.find(p => p.profilType === ProfilType.PROPRIETAIRE);
    const tenant = bail.parties.find(p => p.profilType === ProfilType.LOCATAIRE);
    
    // Vérifier les données du bail lui-même
    const bailMissingFields: string[] = [];
    
    // Champs obligatoires du bail
    if (!bail.rentAmount || bail.rentAmount <= 0) {
      bailMissingFields.push("rentAmount");
    }
    if (!bail.effectiveDate) {
      bailMissingFields.push("effectiveDate");
    }
    if (!bail.paymentDay) {
      bailMissingFields.push("paymentDay");
    }
    if (!bail.securityDeposit && bail.securityDeposit !== 0) {
      bailMissingFields.push("securityDeposit");
    }
    if (!tenant) {
      bailMissingFields.push("tenant");
    }
    if (!owner) {
      bailMissingFields.push("owner");
    }
    if (!bail.property) {
      bailMissingFields.push("property");
    }

    // Vérifier les données du propriétaire
    let ownerMissingData: BailMissingDataClient | null = null;
    if (owner) {
      const ownerCompletion = await checkClientCompletionDetailed(owner.id);
      
      // Calculer les totaux
      let totalMissingFields = 0;
      let totalMissingDocuments = 0;
      
      for (const person of ownerCompletion.missingData.persons) {
        totalMissingFields += person.missingFields.length;
        totalMissingDocuments += person.missingDocuments.length;
      }
      
      if (ownerCompletion.missingData.entreprise) {
        totalMissingFields += ownerCompletion.missingData.entreprise.missingFields.length;
        totalMissingDocuments += ownerCompletion.missingData.entreprise.missingDocuments.length;
      }
      
      totalMissingDocuments += ownerCompletion.missingData.clientDocuments.length;
      totalMissingDocuments += ownerCompletion.missingData.generalDocuments.length;
      
      // Déterminer le nom du propriétaire
      const primaryPerson = owner.persons?.find(p => p.isPrimary) || owner.persons?.[0];
      const ownerName = owner.type === ClientType.PERSONNE_PHYSIQUE
        ? primaryPerson
          ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || primaryPerson.email || "Propriétaire"
          : "Propriétaire"
        : owner.entreprise?.legalName || owner.entreprise?.name || "Entreprise propriétaire";

      ownerMissingData = {
        clientId: owner.id,
        clientName: ownerName,
        clientType: owner.type,
        profilType: owner.profilType,
        completionStatus: owner.completionStatus,
        persons: ownerCompletion.missingData.persons.map(p => ({
          ...p,
          missingDocuments: p.missingDocuments as string[],
        })),
        entreprise: ownerCompletion.missingData.entreprise ? {
          missingFields: ownerCompletion.missingData.entreprise.missingFields,
          missingDocuments: ownerCompletion.missingData.entreprise.missingDocuments as string[],
        } : null,
        clientDocuments: ownerCompletion.missingData.clientDocuments as string[],
        generalDocuments: ownerCompletion.missingData.generalDocuments as string[],
        totalMissingFields,
        totalMissingDocuments,
      };
    }

    // Vérifier les données du locataire
    let tenantMissingData: BailMissingDataClient | null = null;
    if (tenant) {
      const tenantCompletion = await checkClientCompletionDetailed(tenant.id);
      
      // Calculer les totaux
      let totalMissingFields = 0;
      let totalMissingDocuments = 0;
      
      for (const person of tenantCompletion.missingData.persons) {
        totalMissingFields += person.missingFields.length;
        totalMissingDocuments += person.missingDocuments.length;
      }
      
      if (tenantCompletion.missingData.entreprise) {
        totalMissingFields += tenantCompletion.missingData.entreprise.missingFields.length;
        totalMissingDocuments += tenantCompletion.missingData.entreprise.missingDocuments.length;
      }
      
      totalMissingDocuments += tenantCompletion.missingData.clientDocuments.length;
      totalMissingDocuments += tenantCompletion.missingData.generalDocuments.length;
      
      // Déterminer le nom du locataire
      const primaryPerson = tenant.persons?.find(p => p.isPrimary) || tenant.persons?.[0];
      const tenantName = tenant.type === ClientType.PERSONNE_PHYSIQUE
        ? primaryPerson
          ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || primaryPerson.email || "Locataire"
          : "Locataire"
        : tenant.entreprise?.legalName || tenant.entreprise?.name || "Entreprise locataire";

      tenantMissingData = {
        clientId: tenant.id,
        clientName: tenantName,
        clientType: tenant.type,
        profilType: tenant.profilType,
        completionStatus: tenant.completionStatus,
        persons: tenantCompletion.missingData.persons.map(p => ({
          ...p,
          missingDocuments: p.missingDocuments as string[],
        })),
        entreprise: tenantCompletion.missingData.entreprise ? {
          missingFields: tenantCompletion.missingData.entreprise.missingFields,
          missingDocuments: tenantCompletion.missingData.entreprise.missingDocuments as string[],
        } : null,
        clientDocuments: tenantCompletion.missingData.clientDocuments as string[],
        generalDocuments: tenantCompletion.missingData.generalDocuments as string[],
        totalMissingFields,
        totalMissingDocuments,
      };
    }

    // Vérifier les données du bien
    let propertyMissingData: BailMissingDataProperty | null = null;
    if (bail.property) {
      const propertyCompletion = await checkPropertyCompletion(bail.property.id);
      
      propertyMissingData = {
        propertyId: bail.property.id,
        propertyLabel: bail.property.label || "",
        propertyAddress: bail.property.fullAddress,
        completionStatus: bail.property.completionStatus,
        missingFields: propertyCompletion.missingFields,
        missingDocuments: propertyCompletion.missingDocuments as string[],
      };
    }

    // Calculer le total général
    const totalMissing = 
      bailMissingFields.length +
      (ownerMissingData ? ownerMissingData.totalMissingFields + ownerMissingData.totalMissingDocuments : 0) +
      (tenantMissingData ? tenantMissingData.totalMissingFields + tenantMissingData.totalMissingDocuments : 0) +
      (propertyMissingData ? propertyMissingData.missingFields.length + propertyMissingData.missingDocuments.length : 0);

    const isComplete = totalMissing === 0;

    return {
      bail: {
        missingFields: bailMissingFields,
        totalMissing: bailMissingFields.length,
      },
      owner: ownerMissingData,
      tenant: tenantMissingData,
      property: propertyMissingData,
      isComplete,
      totalMissing,
    };
  } catch (error) {
    console.error("Erreur lors de la récupération des données manquantes du bail:", error);
    return null;
  }
}


