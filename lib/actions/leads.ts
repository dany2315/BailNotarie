"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { ClientType, ProfilType, BailType, BailFamille, BailStatus, PropertyStatus, NotificationType } from "@prisma/client";
import { randomBytes } from "crypto";
import { triggerLeadConversionEmail, triggerOwnerFormEmail, triggerTenantFormEmail } from "@/lib/inngest/helpers";
import { z } from "zod";
import { isValidPhoneNumberSafe } from "@/lib/utils/phone-validation";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";

// Helper pour obtenir les informations d'un client avec la nouvelle architecture
interface ClientWithRelations {
  id: string;
  type: ClientType;
  profilType: ProfilType;
  persons?: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    isPrimary: boolean;
  }>;
  entreprise?: {
    id: string;
    legalName: string;
    name: string;
    email: string;
    phone?: string | null;
  } | null;
}

function getClientEmail(client: ClientWithRelations): string | null {
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.find(p => p.isPrimary) || client.persons?.[0];
    return primaryPerson?.email || null;
  }
  return client.entreprise?.email || null;
}

function getClientName(client: ClientWithRelations): { firstName: string | null; lastName: string | null } {
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.find(p => p.isPrimary) || client.persons?.[0];
    return {
      firstName: primaryPerson?.firstName || null,
      lastName: primaryPerson?.lastName || null,
    };
  }
  return {
    firstName: null,
    lastName: client.entreprise?.legalName || client.entreprise?.name || null,
  };
}

const createLeadSchema = z.object({
  contactType: z.enum(["email", "phone"]),
  email: z.string().optional(),
  phone: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.contactType === "email") {
    if (!data.email || data.email.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "L'email est requis",
        path: ["email"],
      });
    } else {
      const emailSchema = z.string().email("Email invalide");
      const result = emailSchema.safeParse(data.email.toLowerCase().trim());
      if (!result.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Email invalide",
          path: ["email"],
        });
      }
    }
  } else if (data.contactType === "phone") {
    if (!data.phone || data.phone.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le numéro de téléphone est requis",
        path: ["phone"],
      });
    } else if (!isValidPhoneNumberSafe(data.phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numéro de téléphone invalide",
        path: ["phone"],
      });
    }
  }
}).transform((data) => ({
  ...data,
  email: data.email ? data.email.toLowerCase().trim() : undefined,
}));

// Créer un lead et envoyer un email avec lien de conversion (si email fourni)
export async function createLead(data: unknown) {
  try {
    const user = await requireAuth();
    const validated = createLeadSchema.parse(data);

    // Vérifier si un client avec cet email ou téléphone existe déjà
    if (validated.contactType === "email" && validated.email) {
      const existingPerson = await prisma.person.findFirst({
        where: { email: validated.email },
        include: { client: true },
      });

      if (existingPerson?.client) {
        throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
      }
    } else if (validated.contactType === "phone" && validated.phone) {
      const existingPerson = await prisma.person.findFirst({
        where: { phone: validated.phone },
        include: { client: true },
      });

      if (existingPerson?.client) {
        throw new Error(`Un client avec le numéro de téléphone ${validated.phone} existe déjà.`);
      }
    }

    // Créer le client avec profilType LEAD et une Person associée
    const client = await prisma.client.create({
      data: { 
        type: ClientType.PERSONNE_PHYSIQUE, 
        profilType: ProfilType.LEAD,
        createdById: user.id,
        persons: {
          create: {
            email: validated.email || null,
            phone: validated.phone || null,
            isPrimary: true,
          },
        },
      },
    });

    // Créer un IntakeLink pour la conversion avec un token unique
    const token = randomBytes(32).toString("hex");
    const intakeLink = await prisma.intakeLink.create({
      data: {
        token,
        target: "LEAD", // Temporaire, sera utilisé pour la conversion
        clientId: client.id,
        status: "PENDING",
        createdById: user.id,
      },
    });

    // Envoyer l'email avec le lien de conversion uniquement si un email est fourni
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const convertUrl = `${baseUrl}/intakes/${token}/convert`;

    let emailSent = false;
    if (validated.contactType === "email" && validated.email) {
      try {
        await triggerLeadConversionEmail({
          to: validated.email,
          subject: "Bienvenue chez BailNotarie - Choisissez votre profil",
          convertUrl,
        });
        emailSent = true;
      } catch (error) {
        console.error("Erreur lors du déclenchement de l'email:", error);
        // Le lead est créé mais l'email n'a pas pu être envoyé
        // On continue mais on retourne une indication que l'email a échoué
      }
    }

    // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le lead)
    await createNotificationForAllUsers(
      NotificationType.LEAD_CREATED,
      "CLIENT",
      client.id,
      user.id,
      {
        contactType: validated.contactType,
        // Ne pas inclure email ou phone si ils sont null/undefined pour éviter les problèmes de sérialisation
        ...(validated.email && { email: validated.email }),
        ...(validated.phone && { phone: validated.phone }),
      }
    );

    revalidatePath("/interface/clients");
    return { client, intakeLink, emailSent };
  } catch (error: any) {
    // Gérer les erreurs Zod
    if (error.name === "ZodError") {
      const errorMessages = error.issues.map((issue: any) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      throw new Error(errorMessages.join(", "));
    }

    // Gérer les erreurs Prisma (contrainte unique, etc.)
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("email")) {
        throw new Error(`Un client avec l'email ${(data as any).email} existe déjà.`);
      }
      if (error.meta?.target?.includes("phone")) {
        throw new Error(`Un client avec le numéro de téléphone ${(data as any).phone} existe déjà.`);
      }
      throw new Error("Une erreur de contrainte unique s'est produite.");
    }

    // Gérer les autres erreurs Prisma
    if (error.code?.startsWith("P")) {
      throw new Error("Une erreur de base de données s'est produite. Veuillez réessayer.");
    }

    // Si c'est déjà une Error avec un message, la relancer
    if (error instanceof Error) {
      throw error;
    }

    // Erreur générique
    throw new Error("Une erreur inattendue s'est produite lors de la création du lead.");
  }
}

// Obtenir un IntakeLink par token pour la conversion
export async function getLeadConversionLink(token: string) {
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' as const },
          },
          entreprise: true,
        },
      },
    },
  });

  if (!intakeLink) {
    return null;
  }

  // Vérifier que le client est bien un LEAD
  if (intakeLink.client?.profilType !== ProfilType.LEAD) {
    return null;
  }

  // Vérifier le statut - accepter PENDING ou SUBMITTED pour les liens de conversion
  // SUBMITTED signifie que l'email a été envoyé mais la conversion n'a pas encore eu lieu
  if (intakeLink.status !== "PENDING" && intakeLink.status !== "SUBMITTED") {
    return null;
  }

  return {
    id: intakeLink.id,
    token: intakeLink.token,
    clientId: intakeLink.clientId,
    client: intakeLink.client,
    status: intakeLink.status,
  };
}

// Convertir un lead en PROPRIETAIRE ou LOCATAIRE
export async function convertLead(data: {
  token: string;
  role: "PROPRIETAIRE" | "LOCATAIRE";
  ownerEmail?: string;
}) {
  const { token, role, ownerEmail } = data;

  // Récupérer l'IntakeLink
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' as const },
          },
          entreprise: true,
        },
      },
    },
  });

  if (!intakeLink || !intakeLink.client) {
    throw new Error("Lien de conversion introuvable");
  }

  if (intakeLink.client.profilType !== ProfilType.LEAD) {
    throw new Error("Ce client n'est pas un lead");
  }

  // Accepter PENDING ou SUBMITTED pour les liens de conversion
  // SUBMITTED signifie que l'email a été envoyé mais la conversion n'a pas encore eu lieu
  if (intakeLink.status !== "PENDING" && intakeLink.status !== "SUBMITTED") {
    throw new Error("Ce lien a déjà été utilisé ou a expiré");
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  if (role === "PROPRIETAIRE") {
    // Mettre à jour le lead en PROPRIETAIRE
    const updatedClient = await prisma.client.update({
      where: { id: intakeLink.client.id },
      data: {
        profilType: ProfilType.PROPRIETAIRE,
      },
    });
    
    // Créer une notification pour la conversion du lead (notifier tous les utilisateurs)
    await createNotificationForAllUsers(
      NotificationType.LEAD_CONVERTED,
      "CLIENT",
      updatedClient.id,
      null, // Notifier tous les utilisateurs
      {
        oldProfilType: "LEAD",
        newProfilType: "PROPRIETAIRE",
      }
    );

    // Créer un IntakeLink pour le formulaire propriétaire
    const ownerIntakeLink = await prisma.intakeLink.create({
      data: {
        target: "OWNER",
        clientId: intakeLink.client.id,
        status: "PENDING",
        createdById: intakeLink.createdById,
      },
    });

    // Marquer le lien de conversion comme utilisé
    await prisma.intakeLink.update({
      where: { id: intakeLink.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Déclencher l'envoi d'email avec le formulaire propriétaire via Inngest (asynchrone, ne bloque pas le rendu)
    const formUrl = `${baseUrl}/intakes/${ownerIntakeLink.token}`;
    const clientEmail = getClientEmail(intakeLink.client as ClientWithRelations);

    if (clientEmail) {
      try {
        await triggerLeadConversionEmail({
          to: clientEmail,
          subject: "Formulaire de bail notarié - Propriétaire",
          convertUrl: formUrl,
          isOwnerForm: true,
        });
      } catch (error) {
        console.error("Erreur lors du déclenchement de l'email:", error);
      }
    }

    revalidatePath("/interface/clients");
    return { success: true, intakeLinkToken: ownerIntakeLink.token };
  } else {
    // LOCATAIRE
    if (!ownerEmail) {
      throw new Error("L'email du propriétaire est requis pour un locataire");
    }

    // Mettre à jour le lead en LOCATAIRE
    const updatedClient = await prisma.client.update({
      where: { id: intakeLink.client.id },
      data: {
        profilType: ProfilType.LOCATAIRE,
      },
    });
    
    // Créer une notification pour la conversion du lead (notifier tous les utilisateurs)
    await createNotificationForAllUsers(
      NotificationType.LEAD_CONVERTED,
      "CLIENT",
      updatedClient.id,
      null, // Notifier tous les utilisateurs
      {
        oldProfilType: "LEAD",
        newProfilType: "LOCATAIRE",
      }
    );

    // Créer ou récupérer le client PROPRIETAIRE
    // Chercher un propriétaire existant avec cet email dans ses persons
    let owner = await prisma.client.findFirst({
      where: {
        profilType: ProfilType.PROPRIETAIRE,
        persons: {
          some: {
            email: ownerEmail.toLowerCase().trim(),
          },
        },
      },
      include: {
        persons: {
          orderBy: { isPrimary: 'desc' },
        },
        entreprise: true,
      },
    });

    if (!owner) {
      // Créer un nouveau client avec une personne associée
      owner = await prisma.client.create({
        data: {
          type: ClientType.PERSONNE_PHYSIQUE,
          profilType: ProfilType.PROPRIETAIRE,
          createdById: intakeLink.createdById,
          persons: {
            create: {
              email: ownerEmail.toLowerCase().trim(),
              isPrimary: true,
              createdById: intakeLink.createdById,
            },
          },
        },
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
          entreprise: true,
        },
      });
      
      // Notification pour création de propriétaire lors de la conversion lead
      await createNotificationForAllUsers(
        NotificationType.CLIENT_CREATED,
        "CLIENT",
        owner.id,
        intakeLink.createdById,
        { createdByForm: true, fromLeadConversion: true }
      );
    }

    // Créer un bien temporaire pour le propriétaire (sera complété lors du formulaire propriétaire)
    const property = await prisma.property.create({
      data: {
        fullAddress: "À compléter", // Adresse temporaire, sera mise à jour lors du formulaire propriétaire
        status: PropertyStatus.NON_LOUER,
        ownerId: owner.id,
        createdById: intakeLink.createdById,
      },
    });

    // Créer un bail temporaire qui relie propriétaire et locataire
    const bail = await prisma.bail.create({
      data: {
        bailType: BailType.BAIL_NU_3_ANS, // Valeur par défaut
        bailFamily: BailFamille.HABITATION, // Valeur par défaut
        status: BailStatus.DRAFT,
        rentAmount: 0, // Sera mis à jour lors du formulaire propriétaire
        monthlyCharges: 0,
        securityDeposit: 0,
        effectiveDate: new Date(), // Date temporaire, sera mise à jour
        paymentDay: 1, // Valeur par défaut
        propertyId: property.id,
        parties: {
          connect: [
            { id: owner.id }, // Propriétaire
            { id: intakeLink.client.id }, // Locataire
          ],
        },
        createdById: intakeLink.createdById,
      },
    });

    // Créer un IntakeLink pour le formulaire locataire
    const tenantIntakeLink = await prisma.intakeLink.create({
      data: {
        target: "TENANT",
        clientId: intakeLink.client.id,
        propertyId: property.id,
        bailId: bail.id,
        status: "PENDING",
        createdById: intakeLink.createdById,
      },
    });

    // Obtenir l'email du locataire (client converti)
    const tenantEmail = getClientEmail(intakeLink.client as ClientWithRelations);
    const tenantName = getClientName(intakeLink.client as ClientWithRelations);

    // Créer un IntakeLink pour le formulaire propriétaire
    const ownerIntakeLink = await prisma.intakeLink.create({
      data: {
        target: "OWNER",
        clientId: owner.id,
        propertyId: property.id,
        bailId: bail.id,
        status: "PENDING",
        createdById: intakeLink.createdById,
      },
    });

    // Marquer le lien de conversion comme utilisé
    await prisma.intakeLink.update({
      where: { id: intakeLink.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
    });

    // Déclencher l'envoi d'email au locataire avec le formulaire via Inngest (asynchrone, ne bloque pas le rendu)
    const tenantFormUrl = `${baseUrl}/intakes/${tenantIntakeLink.token}`;
    if (tenantEmail) {
      try {
        await triggerTenantFormEmail({
          to: tenantEmail,
          firstName: tenantName.firstName,
          lastName: tenantName.lastName,
          formUrl: tenantFormUrl,
        });
      } catch (error) {
        console.error("Erreur lors du déclenchement de l'email au locataire:", error);
      }
    }

    // Obtenir les infos du propriétaire
    const ownerName = getClientName(owner as ClientWithRelations);

    // Déclencher l'envoi d'email au propriétaire avec le formulaire via Inngest (asynchrone, ne bloque pas le rendu)
    const ownerFormUrl = `${baseUrl}/intakes/${ownerIntakeLink.token}`;
    try {
      await triggerOwnerFormEmail({
        to: ownerEmail,
        firstName: ownerName.firstName,
        lastName: ownerName.lastName,
        formUrl: ownerFormUrl,
        emailContext: "default",
      });
    } catch (error) {
      console.error("Erreur lors du déclenchement de l'email au propriétaire:", error);
    }

    revalidatePath("/interface/clients");
    return { success: true, tenantIntakeLinkToken: tenantIntakeLink.token, ownerIntakeLinkToken: ownerIntakeLink.token };
  }
}

