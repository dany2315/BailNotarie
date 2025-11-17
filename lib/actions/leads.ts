"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { ClientType, ProfilType, BailType, BailFamille, BailStatus, PropertyStatus } from "@prisma/client";
import { resend } from "@/lib/resend";
import { randomBytes } from "crypto";
import MailLeadConversion from "@/emails/mail-lead-conversion";
import { z } from "zod";

const createLeadSchema = z.object({
  email: z.string()
    .email("Email invalide")
    .max(100, "L'email est trop long")
    .toLowerCase()
    .trim(),
});

// Créer un lead et envoyer un email avec lien de conversion
export async function createLead(data: unknown) {
  try {
    const user = await requireAuth();
    const validated = createLeadSchema.parse(data);

    // Vérifier si un client avec cet email existe déjà
    const existingClient = await prisma.client.findUnique({
      where: { email: validated.email },
    });

    if (existingClient) {
      throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
    }

    // Créer le client avec profilType LEAD
    const client = await prisma.client.create({
      data: { 
        type: ClientType.PERSONNE_PHYSIQUE, 
        profilType: ProfilType.LEAD,
        email: validated.email,
        createdById: user.id,
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

    // Envoyer l'email avec le lien de conversion
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const convertUrl = `${baseUrl}/intakes/${token}/convert`;

    let emailSent = false;
    try {
      await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: validated.email,
        subject: "Bienvenue chez BailNotarie - Choisissez votre profil",
        react: MailLeadConversion({
          convertUrl,
        }),
      });
      emailSent = true;
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
      // Le lead est créé mais l'email n'a pas pu être envoyé
      // On continue mais on retourne une indication que l'email a échoué
    }

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
      client: true,
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
      client: true,
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
    await prisma.client.update({
      where: { id: intakeLink.client.id },
      data: {
        profilType: ProfilType.PROPRIETAIRE,
      },
    });

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

    // Envoyer l'email avec le formulaire propriétaire
    const formUrl = `${baseUrl}/intakes/${ownerIntakeLink.token}`;

    try {
      await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: intakeLink.client.email || "",
        subject: "Formulaire de bail notarié - Propriétaire",
        react: MailLeadConversion({
          convertUrl: formUrl,
          isOwnerForm: true,
        }),
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error);
    }

    revalidatePath("/interface/clients");
    return { success: true, intakeLinkToken: ownerIntakeLink.token };
  } else {
    // LOCATAIRE
    if (!ownerEmail) {
      throw new Error("L'email du propriétaire est requis pour un locataire");
    }

    // Mettre à jour le lead en LOCATAIRE
    await prisma.client.update({
      where: { id: intakeLink.client.id },
      data: {
        profilType: ProfilType.LOCATAIRE,
      },
    });

    // Créer ou récupérer le client PROPRIETAIRE
    let owner = await prisma.client.findFirst({
      where: {
        email: ownerEmail.toLowerCase().trim(),
        profilType: ProfilType.PROPRIETAIRE,
      },
    });

    if (!owner) {
      owner = await prisma.client.create({
        data: {
          type: ClientType.PERSONNE_PHYSIQUE,
          profilType: ProfilType.PROPRIETAIRE,
          email: ownerEmail.toLowerCase().trim(),
          createdById: intakeLink.createdById,
        },
      });
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
        rawPayload: {
          relatedOwnerId: owner.id,
          relatedOwnerEmail: ownerEmail,
        } as any,
      },
    });

    // Créer un IntakeLink pour le formulaire propriétaire
    const ownerIntakeLink = await prisma.intakeLink.create({
      data: {
        target: "OWNER",
        clientId: owner.id,
        propertyId: property.id,
        bailId: bail.id,
        status: "PENDING",
        createdById: intakeLink.createdById,
        rawPayload: {
          relatedTenantId: intakeLink.client.id,
          relatedTenantEmail: intakeLink.client.email,
        } as any,
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

    // Envoyer l'email au locataire avec le formulaire
    const tenantFormUrl = `${baseUrl}/intakes/${tenantIntakeLink.token}`;
    try {
      await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: intakeLink.client.email || "",
        subject: "Formulaire de bail notarié - Locataire",
        react: MailLeadConversion({
          convertUrl: tenantFormUrl,
          isTenantForm: true,
        }),
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email au locataire:", error);
    }

    // Envoyer l'email au propriétaire avec le formulaire
    const ownerFormUrl = `${baseUrl}/intakes/${ownerIntakeLink.token}`;
    try {
      await resend.emails.send({
        from: "noreply@bailnotarie.fr",
        to: ownerEmail,
        subject: "Formulaire de bail notarié - Propriétaire",
        react: MailLeadConversion({
          convertUrl: ownerFormUrl,
          isOwnerForm: true,
        }),
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email au propriétaire:", error);
    }

    revalidatePath("/interface/clients");
    return { success: true, tenantIntakeLinkToken: tenantIntakeLink.token, ownerIntakeLinkToken: ownerIntakeLink.token };
  }
}

