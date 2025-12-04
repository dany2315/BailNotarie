"use server";

import { prisma  } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createIntakeLinkSchema, submitIntakeSchema } from "@/lib/zod/intake";
import { ownerFormSchema, tenantFormSchema } from "@/lib/zod/client";
import { submitOwnerForm, submitTenantForm } from "@/lib/actions/clients";
import { handleOwnerFormDocuments, handleTenantFormDocuments } from "@/lib/actions/documents";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { randomBytes } from "crypto";
import { BailType, BailFamille, BailStatus, PropertyStatus, ClientType, ProfilType, IntakeTarget } from "@prisma/client";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { NotificationType } from "@prisma/client";
import { triggerTenantFormEmail } from "@/lib/inngest/helpers";

export async function createIntakeLink(data: unknown) {
  const user = await requireAuth();
  const validated = createIntakeLinkSchema.parse(data);

  const token = randomBytes(32).toString("hex");

  const intakeLink = await prisma.intakeLink.create({
    data: {
      token,
      target: validated.target,
      propertyId: validated.propertyId,
      bailId: (validated as any).bailId,
      createdById: user.id,
    },
    include: {
      property: true,
      bail: true,
      client: true,
    },
  });

  revalidatePath("/interface/intakes");
  return intakeLink;
}

export async function revokeIntakeLink(id: string) {
  const user = await requireAuth();
  const intakeLink = await prisma.intakeLink.update({
    where: { id },
    data: { status: "REVOKED" },
  });
  
  // Créer une notification pour tous les utilisateurs (sauf celui qui a révoqué)
  await createNotificationForAllUsers(
    NotificationType.INTAKE_REVOKED,
    "INTAKE",
    id,
    user.id,
    { intakeTarget: intakeLink.target }
  );
  
  revalidatePath("/interface/intakes");
  return intakeLink;
}

export async function regenerateToken(id: string) {
  await requireAuth();
  const newToken = randomBytes(32).toString("hex");
  const intakeLink = await prisma.intakeLink.update({
    where: { id },
    data: { token: newToken, status: "PENDING" },
  });
  revalidatePath("/interface/intakes");
  return intakeLink;
}

export async function getIntakeLinkByToken(token: string) {
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      property: {
        include: {
          documents: true,
        },
      },
      bail: {
        include: {
          parties: {
            include: {
              persons: true,
              documents: true,
            },
          },
          documents: true,
        },
      },
      client: {
        include: {
          persons: {
            include: {
              documents: true,
            },
          },
          entreprise: {
            include: {
              documents: true,
            },
          },
          documents: true,
        },
      },
    },
  });

  if (!intakeLink) {
    return null;
  }

  // Sérialiser les données pour convertir les Decimal en chaînes et les Dates en chaînes ISO
  // Cela permet de passer les données aux Client Components sans erreur
  const serialized = {
    ...intakeLink,
    createdAt: intakeLink.createdAt.toISOString(),
    updatedAt: intakeLink.updatedAt.toISOString(),
    submittedAt: intakeLink.submittedAt?.toISOString() || null,
    property: intakeLink.property ? {
      ...intakeLink.property,
      type: intakeLink.property.type || null,
      legalStatus: intakeLink.property.legalStatus || null,
      status: intakeLink.property.status || null,
      surfaceM2: intakeLink.property.surfaceM2?.toString() || null,
      createdAt: intakeLink.property.createdAt.toISOString(),
      updatedAt: intakeLink.property.updatedAt.toISOString(),
      documents: intakeLink.property.documents || [],
    } : null,
    bail: intakeLink.bail ? {
      ...intakeLink.bail,
      bailType: intakeLink.bail.bailType || null,
      bailFamily: intakeLink.bail.bailFamily || null,
      rentAmount: intakeLink.bail.rentAmount?.toString() || null,
      monthlyCharges: intakeLink.bail.monthlyCharges?.toString() || null,
      securityDeposit: intakeLink.bail.securityDeposit?.toString() || null,
      effectiveDate: intakeLink.bail.effectiveDate?.toISOString().split('T')[0] || null,
      endDate: intakeLink.bail.endDate?.toISOString().split('T')[0] || null,
      paymentDay: intakeLink.bail.paymentDay?.toString() || null,
      createdAt: intakeLink.bail.createdAt.toISOString(),
      updatedAt: intakeLink.bail.updatedAt.toISOString(),
      documents: intakeLink.bail.documents || [],
      parties: intakeLink.bail.parties ? intakeLink.bail.parties.map((party: any) => ({
        ...party,
        createdAt: party.createdAt.toISOString(),
        updatedAt: party.updatedAt.toISOString(),
        persons: party.persons || [],
      })) : [],
    } : null,
    client: intakeLink.client ? {
      ...intakeLink.client,
      createdAt: intakeLink.client.createdAt.toISOString(),
      updatedAt: intakeLink.client.updatedAt.toISOString(),
      persons: intakeLink.client.persons || [],
      entreprise: intakeLink.client.entreprise || null,
      documents: intakeLink.client.documents || [],
    } : null,
  };  

  return serialized;
}

export async function submitIntake(data: unknown) {
  const validated = submitIntakeSchema.parse(data);
  const { token, payload } = validated;

  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: true,
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  if (intakeLink.status !== "PENDING") {
    throw new Error("Ce lien a déjà été utilisé");
  }

  // Si c'est un formulaire propriétaire avec clientId, utiliser submitOwnerForm
  if (intakeLink.target === "OWNER" && intakeLink.clientId) {
    try {
      // Valider avec ownerFormSchema
      console.log("payload", payload);
      const ownerData = ownerFormSchema.parse({
        clientId: intakeLink.clientId,
        ...payload,
      });
      // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
      // Plus besoin de passer formData
      await submitOwnerForm(ownerData);
      return { success: true };
    } catch (error: any) {
      // Si c'est une erreur Zod, formater les messages d'erreur
      if (error.issues && Array.isArray(error.issues)) {
        const errorMessages = error.issues.map((issue: any) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
        throw new Error(errorMessages.join(", "));
      }
      throw new Error(error.message || "Erreur lors de la soumission du formulaire propriétaire");
    }
  }

  // Si c'est un formulaire locataire avec clientId, utiliser submitTenantForm
  if (intakeLink.target === "TENANT" && intakeLink.clientId) {
    try {
      // Valider avec tenantFormSchema
      const tenantData = tenantFormSchema.parse({
        clientId: intakeLink.clientId,
        ...payload,
      });
      // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
      // Plus besoin de passer formData
      await submitTenantForm(tenantData);
      return { success: true };
    } catch (error: any) {
      // Si c'est une erreur Zod, formater les messages d'erreur
      if (error.issues && Array.isArray(error.issues)) {
        const errorMessages = error.issues.map((issue: any) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
        throw new Error(errorMessages.join(", "));
      }
      throw new Error(error.message || "Erreur lors de la soumission du formulaire locataire");
    }
  }

  // Fallback pour l'ancien système
  const updated = await prisma.intakeLink.update({
    where: { token },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      rawPayload: payload as any,
    },
  });

  // Créer une notification pour tous les utilisateurs (soumis par formulaire)
  await createNotificationForAllUsers(
    NotificationType.INTAKE_SUBMITTED,
    "INTAKE",
    updated.id,
    null, // Soumis par formulaire, pas par un utilisateur
    { intakeTarget: intakeLink.target }
  );
  return updated;
}

export async function getIntakeLinks(params: {
  page?: number;
  pageSize?: number;
  status?: string;
  target?: string;
}) {
  await requireAuth();

  const where: any = {};

  if (params.status) {
    where.status = params.status;
  }

  if (params.target) {
    where.target = params.target;
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.intakeLink.findMany({
      where,
      include: {
        property: {
          include: {
            owner: true,
          },
        },
        bail: {
          include: {
            parties: true,
          },
        },
        client: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.intakeLink.count({ where }),
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

// Sauvegarder partiellement les données du formulaire (sans validation complète)
export async function savePartialIntake(data: unknown) {
  const validated = submitIntakeSchema.parse(data);
  const { token, payload } = validated as { token: string; payload: any };

  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          persons: {
            where: { isPrimary: true },
            select: { email: true },
          },
          entreprise: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  if (intakeLink.status === "REVOKED") {
    throw new Error("Ce lien a été révoqué");
  }

  if (intakeLink.status === "EXPIRED") {
    throw new Error("Ce lien a expiré");
  }

  const clientId = intakeLink.clientId;
  const targetType = intakeLink.target as IntakeTarget

  // 🔁 Normalisation : pour OWNER, on force payload.email à suivre entreprise / personne principale
  let normalizedPayload: any = payload;

  if (targetType === "OWNER") {
    const ownerType = normalizedPayload.type as ClientType | undefined;

    if (ownerType === ClientType.PERSONNE_MORALE && normalizedPayload.entreprise) {
      normalizedPayload = {
        ...normalizedPayload,
        email:
          normalizedPayload.entreprise.email ??
          normalizedPayload.email ??
          null,
      };
    }

    if (
      ownerType === ClientType.PERSONNE_PHYSIQUE &&
      Array.isArray(normalizedPayload.persons) &&
      normalizedPayload.persons.length > 0
    ) {
      const primary = normalizedPayload.persons[0];
      normalizedPayload = {
        ...normalizedPayload,
        email: primary?.email ?? normalizedPayload.email ?? null,
      };
    }
  }

  // À partir d'ici on ne travaille plus qu'avec effectivePayload
  const effectivePayload: any =
    targetType === "OWNER" ? normalizedPayload : payload;

  /**
   * 1) Vérif email OWNER (personne ou entreprise)
   */
  if (targetType === "OWNER" && clientId) {
    const currentClient = intakeLink.client;
    const currentEmail =
      currentClient?.persons?.[0]?.email || currentClient?.entreprise?.email || null;

    if (effectivePayload.email && typeof effectivePayload.email === "string") {
      const emailToCheck = effectivePayload.email.trim().toLowerCase();

      // Si le client a déjà cet email, on ne vérifie pas plus loin
      if (!currentEmail || currentEmail.trim().toLowerCase() !== emailToCheck) {
        const [existingPersonWithEmail, existingEntrepriseWithEmail] =
          await Promise.all([
            prisma.person.findFirst({
              where: { email: emailToCheck },
              include: { client: { select: { id: true } } },
            }),
            prisma.entreprise.findFirst({
              where: { email: emailToCheck },
              include: { client: { select: { id: true } } },
            }),
          ]);

        const existingClientId =
          existingPersonWithEmail?.client?.id ||
          existingEntrepriseWithEmail?.client?.id;

        if (existingClientId && existingClientId !== clientId) {
          throw new Error(
            "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
          );
        }
      }
    }

    /**
     * 2) Vérif email locataire renseigné dans le formulaire propriétaire (tenantEmail)
     *    On bloque si l'email existe déjà pour un client qui n'est PAS LOCATAIRE.
     *    Si déjà utilisé par un LOCATAIRE, on laisse passer.
     */
    if (
      effectivePayload.tenantEmail &&
      typeof effectivePayload.tenantEmail === "string"
    ) {
      const tenantEmailToCheck =
        effectivePayload.tenantEmail.trim().toLowerCase();

      const [existingPersonTenant, existingEntrepriseTenant] =
        await Promise.all([
          prisma.person.findFirst({
            where: { email: tenantEmailToCheck },
            include: { client: { select: { id: true, profilType: true } } },
          }),
          prisma.entreprise.findFirst({
            where: { email: tenantEmailToCheck },
            include: { client: { select: { id: true, profilType: true } } },
          }),
        ]);

      const existingTenantClient =
        existingPersonTenant?.client || existingEntrepriseTenant?.client;

      if (
        existingTenantClient &&
        existingTenantClient.profilType !== ProfilType.LOCATAIRE
      ) {
        throw new Error(
          "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
        );
      }
    }
  }

  /**
   * 3) Vérif email pour un formulaire LOCATAIRE (target === TENANT)
   *    On applique la même logique que pour OWNER: email pas déjà utilisé par un autre client.
   */
  if (targetType === "TENANT" && clientId) {
    const currentClient = intakeLink.client;
    const currentEmail =
      currentClient?.persons?.[0]?.email || currentClient?.entreprise?.email || null;

    if (effectivePayload.email && typeof effectivePayload.email === "string") {
      const emailToCheck = effectivePayload.email.trim().toLowerCase();

      if (!currentEmail || currentEmail.trim().toLowerCase() !== emailToCheck) {
        const [existingPersonWithEmail, existingEntrepriseWithEmail] =
          await Promise.all([
            prisma.person.findFirst({
              where: { email: emailToCheck },
              include: { client: { select: { id: true } } },
            }),
            prisma.entreprise.findFirst({
              where: { email: emailToCheck },
              include: { client: { select: { id: true } } },
            }),
          ]);

        const existingClientId =
          existingPersonWithEmail?.client?.id ||
          existingEntrepriseWithEmail?.client?.id;

        if (existingClientId && existingClientId !== clientId) {
          throw new Error(
            "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
          );
        }
      }
    }
  }

  // 4) Sauvegarder les données partiellement dans rawPayload (brouillon)
  await prisma.intakeLink.update({
    where: { token },
    data: {
      rawPayload: effectivePayload as any,
    },
  });

  // On ne touche pas à Client / Person / Property / Bail ici.
  // Toute la cuisine lourde se fait dans submitOwnerForm (à la soumission finale).

  return { success: true };
}


// Récupérer les documents déjà uploadés pour un intake (sans authentification, accessible via token)
export async function getIntakeDocuments(token: string) {
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          persons: true,
          entreprise: true,
        },
      },
      property: true,
      bail: true,
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  const documents: any[] = [];

  // Récupérer les documents du client (livret de famille, PACS)
  if (intakeLink.clientId) {
    const clientDocs = await prisma.document.findMany({
      where: { clientId: intakeLink.clientId },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...clientDocs);
  }

  // Récupérer les documents des personnes (BIRTH_CERT, ID_IDENTITY)
  if (intakeLink.client?.persons) {
    for (const person of intakeLink.client.persons) {
      const personDocs = await prisma.document.findMany({
        where: { personId: person.id },
        orderBy: { createdAt: "desc" },
      });
      documents.push(...personDocs);
    }
  }

  // Récupérer les documents de l'entreprise (KBIS, STATUTES)
  if (intakeLink.client?.entreprise) {
    const entrepriseDocs = await prisma.document.findMany({
      where: { entrepriseId: intakeLink.client.entreprise.id },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...entrepriseDocs);
  }

  // Récupérer les documents de la propriété
  if (intakeLink.propertyId) {
    const propertyDocs = await prisma.document.findMany({
      where: { propertyId: intakeLink.propertyId },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...propertyDocs);
  }

  // Récupérer les documents du bail
  if (intakeLink.bailId) {
    const bailDocs = await prisma.document.findMany({
      where: { bailId: intakeLink.bailId },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...bailDocs);
  }

  return documents;
}

// Supprimer une personne supplémentaire d'un client
export async function deletePersonFromClient(data: {
  clientId: string;
  personEmail: string;
}) {
  const { clientId, personEmail } = data;

  if (!clientId || !personEmail) {
    throw new Error("clientId et personEmail sont requis");
  }

  // Trouver la personne par email et clientId
  const person = await prisma.person.findFirst({
    where: {
      email: personEmail.trim().toLowerCase(),
      clientId: clientId,
      isPrimary: false, // Ne pas permettre la suppression de la personne primaire
    },
  });

  if (!person) {
    // La personne n'existe pas en base, c'est OK (elle n'a peut-être pas encore été sauvegardée)
    return { success: true, deleted: false };
  }

  // Supprimer la personne
  await prisma.person.delete({
    where: { id: person.id },
  });

  // Mettre à jour le statut de complétion du client
  await calculateAndUpdateClientStatus(clientId);

  return { success: true, deleted: true };
}

