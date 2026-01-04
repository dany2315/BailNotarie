"use server";

import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { ClientType, ProfilType, BailType, BailFamille, BailStatus, PropertyStatus, NotificationType } from "@prisma/client";
import { triggerOwnerFormEmail, triggerRequestStatusEmail } from "@/lib/inngest/helpers";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { z } from "zod";

const startOwnerSchema = z.object({
  role: z.literal("PROPRIETAIRE"),
  email: z.string().email("Email invalide"),
});

const startTenantSchema = z.object({
  role: z.literal("LOCATAIRE"),
  ownerEmail: z.string().email("Email invalide"),
});

export type StartOwnerInput = z.infer<typeof startOwnerSchema>;
export type StartTenantInput = z.infer<typeof startTenantSchema>;

// Créer un intakeLink pour un propriétaire depuis la landing page (sans authentification)
export async function startAsOwner(data: StartOwnerInput) {
  const validated = startOwnerSchema.parse(data);
  const email = validated.email.toLowerCase().trim();
  
  // Chercher un client via Person.email ou Entreprise.email
  const person = await prisma.person.findUnique({
    where: { email },
    include: { client: true },
  });

  const entreprise = await prisma.entreprise.findUnique({
    where: { email },
    include: { client: true },
  });

  let client = person?.client || entreprise?.client || null;

  // Variable pour savoir si le client existait déjà
  const isExistingClient = !!client;


  // Si le client existe mais est un LOCATAIRE, retourner une erreur
  if (client && client.profilType === ProfilType.LOCATAIRE) {
    return {
      success: false,
      alreadyExists: true,
      isTenant: true,
      message: "Cet email correspond à un compte existant. Veuillez nous contacter pour plus d'informations.",
      redirectTo: "/#contact",
      redirectLabel: "Contactez-nous",
    };
  }

  // Si le client n'existe pas, le créer avec une Person
  if (!isExistingClient) {
    client = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE,
        profilType: ProfilType.PROPRIETAIRE,
        persons: {
          create: {
            email: email,
            isPrimary: true,
          },
        },
      },
    });

    const token = randomBytes(32).toString("hex");
    const intakeLink = await prisma.intakeLink.create({
      data: {
        token,
        target: "OWNER",
        clientId: client?.id,
        status: "PENDING",
        // Pas de createdById car pas d'authentification
      },
    });

    // Notification pour création de propriétaire
    await createNotificationForAllUsers(
      NotificationType.CLIENT_CREATED_FROM_LANDING_PAGE,
      "CLIENT",
      client.id,
      null, // Créé depuis la landing page, pas par un utilisateur
      { createdByForm: true ,profileType: ProfilType.PROPRIETAIRE }
    );

    // Envoyer un email au propriétaire avec le formulaire
    const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    const ownerFormUrl = `${baseUrl}/commencer/proprietaire/${token}`;
    
    // Récupérer les informations de Person pour l'email
    const ownerPersonData = await prisma.person.findFirst({
      where: { clientId: client.id, isPrimary: true },
    });

    const firstName = ownerPersonData?.firstName || "";
    const lastName = ownerPersonData?.lastName || "";
    
    try {
      await triggerOwnerFormEmail({
        to: email,
        firstName: firstName,
        lastName: lastName,
        formUrl: ownerFormUrl,
        emailContext: "landing_owner",
      });
    } catch (error) {
      console.error("Erreur lors du déclenchement de l'email au propriétaire:", error);
      // On continue même si l'email échoue
    }

    return { success: true, token: intakeLink.token };
  } else {
    // Vérifier d'abord s'il y a un IntakeLink soumis
    const submittedIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: client?.id,
        target: "OWNER",
        status: "SUBMITTED",
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        bail: {
          include: {
            property: true,
          },
        },
      },
    });

    // Si un IntakeLink soumis existe, retourner une indication
    if (submittedIntakeLink) {
      return { 
        success: false, 
        alreadyExists: true,
        alreadySubmitted: true,
        message: "Vous êtes déjà client. Votre demande de bail notarié est en cours de traitement.",
        redirectTo: "/commencer/suivi",
      };
    } else {
      // Vérifier s'il y a un IntakeLink en cours
      const pendingIntakeLink = await prisma.intakeLink.findFirst({
        where: {
          clientId: client?.id,
          target: "OWNER",
          status: "PENDING",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (pendingIntakeLink && client) {
        // Envoyer un email au propriétaire avec le formulaire
        const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
        const ownerFormUrl = `${baseUrl}/commencer/proprietaire/${pendingIntakeLink.token}`;
        
        // Récupérer les informations de Person pour l'email
        const ownerPersonData = await prisma.person.findFirst({
          where: { clientId: client.id, isPrimary: true },
        });

        const firstName = ownerPersonData?.firstName || "";
        const lastName = ownerPersonData?.lastName || "";
        
        try {
          await triggerOwnerFormEmail({
            to: email,
            firstName: firstName,
            lastName: lastName,
            formUrl: ownerFormUrl,
            emailContext: "landing_owner",
          });
        } catch (error) {
          console.error("Erreur lors du déclenchement de l'email au propriétaire:", error);
          // On continue même si l'email échoue
        }

        return {
          success: true,
          token: pendingIntakeLink.token,
        };
      }

      return { 
        success: false, 
        alreadyExists: true, 
        message: "Vous êtes déjà client. Contactez-nous pour plus d'informations.",
        redirectTo: "/commencer/suivi",
      };
    }
  }  
}

// Créer les intakeLinks pour un locataire et envoyer un email au propriétaire
export async function startAsTenant(data: StartTenantInput) {
  const validated = startTenantSchema.parse(data);
  const { ownerEmail } = validated;


  // Chercher le client PROPRIETAIRE via Person.email ou Entreprise.email
  const normalizedOwnerEmail = ownerEmail.toLowerCase().trim();
  const ownerPerson = await prisma.person.findUnique({
    where: { email: normalizedOwnerEmail },
    include: { client: true },
  });

  const ownerEntreprise = await prisma.entreprise.findUnique({
    where: { email: normalizedOwnerEmail },
    include: { client: true },
  });

  let owner = ownerPerson?.client || ownerEntreprise?.client || null;

  // Si l'email correspond à un locataire, retourner une erreur
  if (owner && owner.profilType === ProfilType.LOCATAIRE) {
    return {
      success: false,
      alreadyExists: true,
      isTenant: true,
      message: "Cet email correspond à un compte existant. Veuillez nous contacter pour plus d'informations.",
      redirectTo: "/#contact",
      redirectLabel: "Contactez-nous",
    };
  }

  // Si le propriétaire existe, vérifier s'il a un IntakeLink soumis
  if (owner) {
    const existingOwnerIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: owner.id,
        target: "OWNER",
        status: "SUBMITTED",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (existingOwnerIntakeLink) {
      return {
        success: false,
        alreadyExists: true,
        alreadySubmitted: true,
        message: "Le propriétaire a déjà fait sa demande. Votre demande de bail notarié est en cours de traitement.",
        redirectTo: "/commencer/suivi",
      };
    }
    else{
      return {
        success: false,
        alreadyExists: true,
        alreadyPending: false,
        message: "Le propriétaire a déjà fait sa demande. Votre demande de bail notarié est en cours de traitement.",
        redirectTo: "/commencer/suivi",
      };
    }
  } else {
    // Créer un client locataire  // Créer un client temporaire avec profilType LOCATAIRE
  const tenant = await prisma.client.create({
    data: {
      type: ClientType.PERSONNE_PHYSIQUE,
      profilType: ProfilType.LOCATAIRE,
      // Pas d'email ni de téléphone pour l'instant, sera rempli dans le formulaire
    },
  });

  // Notification pour création de locataire
  await createNotificationForAllUsers(
    NotificationType.CLIENT_CREATED,
    "CLIENT",
    tenant.id,
    null, // Créé depuis la landing page, pas par un utilisateur
    { createdByForm: true ,profileType: ProfilType.LOCATAIRE }
  );

    // Créer un client propriétaire avec une Person
    owner = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE,
        profilType: ProfilType.PROPRIETAIRE,
        persons: {
          create: {
            email: normalizedOwnerEmail,
            isPrimary: true,
          },
        },
      },
    });

    // Notification pour création de propriétaire
    await createNotificationForAllUsers(
      NotificationType.CLIENT_CREATED,
      "CLIENT",
      owner.id,
      null, // Créé depuis la landing page, pas par un utilisateur
      { createdByForm: true ,profileType: ProfilType.PROPRIETAIRE }
    );


  // Créer un bien temporaire pour le propriétaire (sera complété lors du formulaire propriétaire)
  const property = await prisma.property.create({
    data: {
      fullAddress: "À compléter", // Adresse temporaire, sera mise à jour lors du formulaire propriétaire
      status: PropertyStatus.NON_LOUER,
      ownerId: owner.id,
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
          { id: tenant.id }, // Locataire
        ],
      },
    },
  });

  // Créer un IntakeLink pour le formulaire locataire
  const tenantToken = randomBytes(32).toString("hex");
  const tenantIntakeLink = await prisma.intakeLink.create({
    data: {
      token: tenantToken,
      target: "TENANT",
      clientId: tenant.id,
      propertyId: property.id,
      bailId: bail.id,
      status: "PENDING",
    },
  });

  // Créer un IntakeLink pour le formulaire propriétaire
  const ownerToken = randomBytes(32).toString("hex");
  const ownerIntakeLink = await prisma.intakeLink.create({
    data: {
      token: ownerToken,
      target: "OWNER",
      clientId: owner.id,
      propertyId: property.id,
      bailId: bail.id,
      status: "PENDING",
    },
  });

  // Envoyer un email au propriétaire avec le formulaire
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const ownerFormUrl = `${baseUrl}/commencer/proprietaire/${ownerToken}`;
  
  // Récupérer les informations de Person ou Entreprise pour l'email
  const ownerPersonData = await prisma.person.findFirst({
    where: { clientId: owner.id, isPrimary: true },
  });

  const ownerEntrepriseData = await prisma.entreprise.findUnique({
    where: { clientId: owner.id },
  });

  const firstName = ownerPersonData?.firstName || "";
  const lastName = ownerPersonData?.lastName || "";
  
  try {
    await triggerOwnerFormEmail({
      to: ownerEmail,
      firstName: firstName,
      lastName: lastName,
      formUrl: ownerFormUrl,
      emailContext: "landing_tenant",
    });
  } catch (error) {
    console.error("Erreur lors du déclenchement de l'email au propriétaire:", error);
    // On continue même si l'email échoue
  }

  return { 
    success: true, 
    tenantToken: tenantIntakeLink.token,
    ownerToken: ownerIntakeLink.token,
  };
}
}

// Récupérer le statut d'une demande par email
export async function getRequestStatusByEmail(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  
  // Trouver le client via Person.email ou Entreprise.email
  const person = await prisma.person.findUnique({
    where: { email: normalizedEmail },
    select: { clientId: true },
  });

  const entreprise = await prisma.entreprise.findUnique({
    where: { email: normalizedEmail },
    select: { clientId: true },
  });

  const clientId = person?.clientId || entreprise?.clientId;

  if (!clientId) {
    return {
      success: false,
      found: false,
      message: "Aucune demande trouvée pour cet email.",
    };
  }

  // Récupérer le client avec toutes ses relations
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      intakeLinks: {
        where: {
          status: {
            in: ["PENDING", "SUBMITTED"],
          },
        },
        include: {
          bail: {
            include: {
              property: true,
            },
          },
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      bails: {
        include: {
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!client) {
    return {
      success: false,
      found: false,
      message: "Aucune demande trouvée pour cet email.",
    };
  }

  // Déterminer l'étape actuelle
  const latestIntakeLink = client.intakeLinks[0];
  const latestBail = client.bails[0];

  let currentStep = "Aucune étape en cours";
  let status = "NOT_STARTED";

  if (latestIntakeLink) {
    if (latestIntakeLink.status === "SUBMITTED") {
      status = "SUBMITTED";
      if (latestBail) {
        switch (latestBail.status) {
          case "DRAFT":
            currentStep = "Formulaire soumis - En attente de validation";
            break;
          case "PENDING_VALIDATION":
            currentStep = "En attente de validation par BailNotarié";
            break;
          case "READY_FOR_NOTARY":
            currentStep = "Prêt pour le notaire";
            break;
          case "SIGNED":
            currentStep = "Bail signé";
            break;
          case "TERMINATED":
            currentStep = "Bail terminé";
            break;
          default:
            currentStep = "Formulaire soumis - En attente de traitement";
        }
      } else {
        currentStep = "Formulaire soumis - En attente de traitement";
      }
    } else if (latestIntakeLink.status === "PENDING") {
      status = "PENDING";
      currentStep = "Formulaire en cours de complétion";
    }
  }

  // Récupérer les informations de Person ou Entreprise pour l'email
  const clientPerson = await prisma.person.findFirst({
    where: { clientId: client.id, isPrimary: true },
  });

  const clientEntreprise = await prisma.entreprise.findUnique({
    where: { clientId: client.id },
  });

  const firstName = clientPerson?.firstName || null;
  const lastName = clientPerson?.lastName || null;

  // Envoyer l'email avec les informations de suivi
  try {
    await triggerRequestStatusEmail({
      to: normalizedEmail,
      firstName: firstName,
      lastName: lastName,
      currentStep,
      status,
      propertyAddress: latestBail?.property?.fullAddress || null,
      profilType: client.profilType,
      intakeLinkToken: latestIntakeLink?.token || null,
    });
  } catch (error) {
    console.error("Erreur lors du déclenchement de l'email de suivi:", error);
    return {
      success: false,
      found: true,
      message: "Une erreur s'est produite lors de l'envoi de l'email. Veuillez réessayer plus tard.",
    };
  }

  return {
    success: true,
    found: true,
    message: "Un email contenant les informations de suivi de votre demande a été envoyé à votre adresse email.",
  };
}

