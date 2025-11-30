"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { 
  createBasicClientSchema, 
  createFullClientSchema,
  createFullClientWithPropertySchema,
  createTenantBasicClientSchema,
  ownerFormSchema,
  tenantFormSchema,
  updateClientSchema
} from "@/lib/zod/client";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { ClientType, ProfilType, FamilyStatus, MatrimonialRegime, BailType, BailFamille, BailStatus, PropertyStatus, CompletionStatus } from "@prisma/client";
import { 
  triggerOwnerFormEmail, 
  triggerTenantFormEmail, 
  triggerLeadConversionEmail,
  triggerCompletionStatusesCalculation
} from "@/lib/inngest/helpers";
import { handleOwnerFormDocuments, handleTenantFormDocuments } from "@/lib/actions/documents";
import { randomBytes } from "crypto";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { NotificationType } from "@prisma/client";
import { DeletionBlockedError, createDeletionError } from "@/lib/types/deletion-errors";

// Créer un client basique (email uniquement) et envoyer un email avec formulaire
export async function createBasicClient(data: unknown) {
  const user = await requireAuth();
  const validated = createBasicClientSchema.parse(data);

  // Vérifier si un client avec cet email existe déjà
  const existingClient = await prisma.client.findUnique({
    where: { email: validated.email },
  });

  if (existingClient) {
    throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
  }

  // Créer le client avec profilType PROPRIETAIRE (sans type, sera défini dans le formulaire)
  let client;
  try {
    client = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE, // Type temporaire, sera mis à jour dans le formulaire
        profilType: ProfilType.PROPRIETAIRE,
        email: validated.email,
        completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
        createdById: user.id,
      },
    });
  } catch (error: any) {
    // Gérer les erreurs Prisma (contrainte unique, etc.)
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("email")) {
        throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
      }
      throw new Error("Une erreur de contrainte unique s'est produite.");
    }
    throw error;
  }

  // Créer un IntakeLink pour le formulaire propriétaire
  const intakeLink = await prisma.intakeLink.create({
    data: {
      target: "OWNER",
      clientId: client.id,
      createdById: user.id,
    },
  });

  // Déclencher l'envoi d'email avec le lien du formulaire via Inngest (asynchrone, ne bloque pas le rendu)
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const formUrl = `${baseUrl}/intakes/${intakeLink.token}`;

  try {
    await triggerOwnerFormEmail({
      to: validated.email,
      firstName: "",
      lastName: "",
      formUrl,
    });
  } catch (error) {
    console.error("Erreur lors du déclenchement de l'email:", error);
    // On continue même si l'email échoue
  }

  // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le client)
  await createNotificationForAllUsers(
    NotificationType.CLIENT_CREATED,
    "CLIENT",
    client.id,
    user.id,
    { createdByForm: false ,profileType: ProfilType.PROPRIETAIRE }
  );

  revalidatePath("/interface/clients");
  return { client, intakeLink };
}

// Créer un client complet (toutes les données)
export async function createFullClient(data: unknown) {
  const user = await requireAuth();
  
  // Essayer d'abord avec le schéma complet (avec bien, bail, locataire)
  try {
    const validated = createFullClientWithPropertySchema.parse(data);
    
    // Créer le client propriétaire
    let client;
    try {
      if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
        client = await prisma.client.create({
          data: {
            type: ClientType.PERSONNE_PHYSIQUE,
            profilType: ProfilType.PROPRIETAIRE,
            firstName: validated.firstName,
            lastName: validated.lastName,
            profession: validated.profession,
            phone: validated.phone,
            email: validated.email,
            fullAddress: validated.fullAddress,
            nationality: validated.nationality,
            familyStatus: validated.familyStatus as FamilyStatus | null,
            matrimonialRegime: validated.matrimonialRegime as MatrimonialRegime | null,
            birthPlace: validated.birthPlace,
            birthDate: validated.birthDate,
            completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
            createdById: user.id,

          },
        });
      } else {
        client = await prisma.client.create({
          data: {
            type: ClientType.PERSONNE_MORALE,
            profilType: ProfilType.PROPRIETAIRE,
            legalName: validated.legalName,
            registration: validated.registration,
            phone: validated.phone,
            email: validated.email,
            fullAddress: validated.fullAddress,
            nationality: validated.nationality,
            completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
            createdById: user.id,
          },
        });
      }
    } catch (error: any) {
      // Gérer les erreurs Prisma (contrainte unique, etc.)
      if (error.code === "P2002") {
        if (error.meta?.target?.includes("email")) {
          throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
        }
        throw new Error("Une erreur de contrainte unique s'est produite.");
      }
      throw error;
    }

    // Ne pas mettre à jour le statut de complétion lors de la création manuelle
    // Le statut reste NOT_STARTED jusqu'à ce que le client remplisse le formulaire

    // Créer le bien
    const property = await prisma.property.create({
      data: {
        label: validated.propertyLabel,
        fullAddress: validated.propertyFullAddress,
        surfaceM2: validated.propertySurfaceM2 ? new Decimal(validated.propertySurfaceM2) : null,
        type: validated.propertyType,
        legalStatus: validated.propertyLegalStatus,
        status: validated.propertyStatus || PropertyStatus.NON_LOUER,
        ownerId: client.id,
        createdById: user.id,
      },
    });

    // Déclencher le calcul du statut de complétion du bien en arrière-plan (non bloquant)
    triggerCompletionStatusesCalculation({ propertyId: property.id }).catch((error) => {
      console.error("Erreur lors du déclenchement du calcul de statut bien:", error);
    });

    // Créer ou récupérer le locataire (seulement si email fourni)
    let tenant = null;
    let tenantIntakeLink = null;
    
    if (validated.tenantEmail) {
      // Vérifier si un locataire avec cet email existe déjà
      const existingTenant = await prisma.client.findUnique({
        where: { email: validated.tenantEmail },
      });

      if (existingTenant) {
        // Utiliser le locataire existant
        tenant = existingTenant;
      } else {
        // Créer un nouveau locataire
        try {
          tenant = await prisma.client.create({
            data: {
              type: ClientType.PERSONNE_PHYSIQUE,
              profilType: ProfilType.LOCATAIRE,
              email: validated.tenantEmail,
              completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
              createdById: user.id,
            },
          });
        } catch (error: any) {
          // Gérer les erreurs Prisma (contrainte unique, etc.)
          if (error.code === "P2002") {
            if (error.meta?.target?.includes("email")) {
              throw new Error(`Un client avec l'email ${validated.tenantEmail} existe déjà.`);
            }
            throw new Error("Une erreur de contrainte unique s'est produite.");
          }
          throw error;
        }
      }
    }

    // Créer le bail avec ou sans locataire
    const bailParties = [{ id: client.id }]; // Propriétaire
    if (tenant) {
      bailParties.push({ id: tenant.id }); // Locataire
    }

    const bail = await prisma.bail.create({
      data: {
        bailType: validated.bailType || BailType.BAIL_NU_3_ANS,
        bailFamily: validated.bailFamily || BailFamille.HABITATION,
        status: BailStatus.DRAFT,
        rentAmount: validated.bailRentAmount || 0,
        monthlyCharges: validated.bailMonthlyCharges || 0,
        securityDeposit: validated.bailSecurityDeposit || 0,
        effectiveDate: validated.bailEffectiveDate ? new Date(validated.bailEffectiveDate) : new Date(),
        endDate: validated.bailEndDate ? new Date(validated.bailEndDate) : null,
        paymentDay: validated.bailPaymentDay || null,
        propertyId: property.id,
        parties: {
          connect: bailParties,
        },
        createdById: user.id,
      },
    });
    
    // Notification pour création de bail (déjà gérée dans createLease, mais on l'ajoute ici aussi pour cohérence)
    await createNotificationForAllUsers(
      NotificationType.BAIL_CREATED,
      "BAIL",
      bail.id,
      user.id,
      { createdByForm: false }
    );

    // Créer un IntakeLink et envoyer l'email seulement si le locataire existe
    if (tenant) {
      tenantIntakeLink = await prisma.intakeLink.create({
        data: {
          target: "TENANT",
          clientId: tenant.id,
          propertyId: property.id,
          bailId: bail.id,
        },
      });

      // Déclencher l'envoi d'email au locataire avec le formulaire via Inngest (asynchrone, ne bloque pas le rendu)
      const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      const tenantFormUrl = `${baseUrl}/intakes/${tenantIntakeLink.token}`;

      try {
        await triggerTenantFormEmail({
          to: validated.tenantEmail!,
          firstName: "",
          lastName: "",
          formUrl: tenantFormUrl,
        });
      } catch (error) {
        console.error("Erreur lors du déclenchement de l'email au locataire:", error);
        // On continue même si l'email échoue
      }
    }

    revalidatePath("/interface/clients");
    revalidatePath("/interface/properties");
    revalidatePath("/interface/bails");

    return { client, property, bail, tenant, tenantIntakeLink };
  } catch (error: any) {
    // Si c'est une erreur Prisma de contrainte unique, la relancer avec un message clair
    if (error.code === "P2002") {
      if (error.meta?.target?.includes("email")) {
        const email = (data as any)?.email || (data as any)?.tenantEmail || "cet email";
        throw new Error(`Un client avec ${email} existe déjà.`);
      }
      throw new Error("Une erreur de contrainte unique s'est produite.");
    }

    // Si c'est une erreur Zod, la relancer
    if (error.name === "ZodError") {
      throw error;
    }

    // Si c'est déjà une Error avec un message, la relancer
    if (error instanceof Error) {
      throw error;
    }

    // Si le schéma complet échoue, essayer avec le schéma simple (sans bien/bail/locataire)
    try {
      const validated = createFullClientSchema.parse(data);

      if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
        try {
          const client = await prisma.client.create({
            data: {
              type: ClientType.PERSONNE_PHYSIQUE,
              profilType: ProfilType.PROPRIETAIRE,
              firstName: validated.firstName,
              lastName: validated.lastName,
              profession: validated.profession,
              phone: validated.phone,
              email: validated.email,
              fullAddress: validated.fullAddress,
              nationality: validated.nationality,
              familyStatus: validated.familyStatus as FamilyStatus | null,
              matrimonialRegime: validated.matrimonialRegime as MatrimonialRegime | null,
              birthPlace: validated.birthPlace,
              birthDate: validated.birthDate,
              completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
              createdById: user.id,
            },
            include: {
              bails: true,
              ownedProperties: true,
            },
          });

          revalidatePath("/interface/clients");
          return client;
        } catch (createError: any) {
          if (createError.code === "P2002") {
            if (createError.meta?.target?.includes("email")) {
              throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
            }
            throw new Error("Une erreur de contrainte unique s'est produite.");
          }
          throw createError;
        }
      } else {
        try {
          const client = await prisma.client.create({
            data: {
              type: ClientType.PERSONNE_MORALE,
              profilType: ProfilType.PROPRIETAIRE,
              legalName: validated.legalName,
              registration: validated.registration,
              phone: validated.phone,
              email: validated.email,
              fullAddress: validated.fullAddress,
              nationality: validated.nationality,
              completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
              createdById: user.id,
            },
            include: {
              bails: true,
              ownedProperties: true,
            },
          });

          // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le client)
          await createNotificationForAllUsers(
            NotificationType.CLIENT_CREATED,
            "CLIENT",
            client.id,
            user.id,
            { createdByForm: false ,profileType: ProfilType.PROPRIETAIRE }
          );

          revalidatePath("/interface/clients");
          return client;
        } catch (createError: any) {
          if (createError.code === "P2002") {
            if (createError.meta?.target?.includes("email")) {
              throw new Error(`Un client avec l'email ${validated.email} existe déjà.`);
            }
            throw new Error("Une erreur de contrainte unique s'est produite.");
          }
          throw createError;
        }
      }
    } catch (parseError: any) {
      // Si c'est une erreur Zod, formater les messages d'erreur
      if (parseError.name === "ZodError") {
        const errorMessages = parseError.issues.map((issue: any) => {
          const path = issue.path.join(".");
          return `${path}: ${issue.message}`;
        });
        throw new Error(errorMessages.join(", "));
      }
      // Relancer les autres erreurs
      throw parseError;
    }
  }
}

// Soumettre le formulaire propriétaire (crée bien, bail, locataire et envoie email)
export async function submitOwnerForm(data: unknown) {
  let validated;
  try {
    validated = ownerFormSchema.parse(data);
  } catch (error: any) {
    // Si c'est une erreur Zod, formater les messages d'erreur
    if (error.issues && Array.isArray(error.issues)) {
      const errorMessages = error.issues.map((issue: any) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      throw new Error(errorMessages.join(", "));
    }
    throw error;
  }

  // Vérifier qu'un IntakeLink valide existe pour ce client (sécurité)
  const intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: validated.clientId,
      target: "OWNER",
      status: {
        in: ["PENDING", "SUBMITTED"], // Permettre même si soumis (pour modifications)
      },
    },
  });

  if (!intakeLink) {
    throw new Error("Accès non autorisé : aucun lien d'intake valide trouvé pour ce client");
  }

  // Mettre à jour le client propriétaire
  const ownerUpdateData: any = {
    updatedAt: new Date(),
  };

  if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
    if (validated.firstName) ownerUpdateData.firstName = validated.firstName;
    if (validated.lastName) ownerUpdateData.lastName = validated.lastName;
    if (validated.profession) ownerUpdateData.profession = validated.profession;
    if (validated.familyStatus) ownerUpdateData.familyStatus = validated.familyStatus;
    if (validated.matrimonialRegime) ownerUpdateData.matrimonialRegime = validated.matrimonialRegime;
    if (validated.birthPlace) ownerUpdateData.birthPlace = validated.birthPlace;
    if (validated.birthDate) ownerUpdateData.birthDate = validated.birthDate;
  } else {
    if (validated.legalName) ownerUpdateData.legalName = validated.legalName;
    if (validated.registration) ownerUpdateData.registration = validated.registration;
  }

  if (validated.phone) ownerUpdateData.phone = validated.phone;
  if (validated.email) ownerUpdateData.email = validated.email;
  if (validated.fullAddress) ownerUpdateData.fullAddress = validated.fullAddress;
  if (validated.nationality) ownerUpdateData.nationality = validated.nationality;

  await prisma.client.update({
    where: { id: validated.clientId },
    data: ownerUpdateData,
  });

  // Récupérer l'intakeLink du propriétaire pour vérifier les objets existants
  const ownerIntakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: validated.clientId,
      target: "OWNER",
      status: "PENDING",
    },
    include: {
      property: true,
      bail: {
        include: {
          parties: true,
        },
      },
    },
  });

  // Utiliser le bien existant ou en créer un nouveau
  let property;
  if (ownerIntakeLink?.propertyId && ownerIntakeLink.property) {
    // Mettre à jour le bien existant
    property = await prisma.property.update({
      where: { id: ownerIntakeLink.propertyId },
      data: {
        label: validated.propertyLabel,
        fullAddress: validated.propertyFullAddress,
        surfaceM2: validated.propertySurfaceM2 ? new Decimal(validated.propertySurfaceM2) : null,
        type: validated.propertyType,
        legalStatus: validated.propertyLegalStatus,
        status: validated.propertyStatus || PropertyStatus.NON_LOUER,
      },
    });
  } else {
    // Créer un nouveau bien
    property = await prisma.property.create({
      data: {
        label: validated.propertyLabel,
        fullAddress: validated.propertyFullAddress,
        surfaceM2: validated.propertySurfaceM2 ? new Decimal(validated.propertySurfaceM2) : null,
        type: validated.propertyType,
        legalStatus: validated.propertyLegalStatus,
        status: validated.propertyStatus || PropertyStatus.NON_LOUER,
        ownerId: validated.clientId,
      },
    });
  }

  // Chercher ou créer le locataire (seulement si email fourni)
  let tenant = null;
  const rawPayload = ownerIntakeLink?.rawPayload as any;
  
  if (validated.tenantEmail) {
    // D'abord, vérifier si un locataire est lié via le rawPayload (cas de conversion lead)
    if (rawPayload?.relatedTenantId) {
      // Si un locataire est lié via le rawPayload, l'utiliser
      tenant = await prisma.client.findUnique({
        where: { id: rawPayload.relatedTenantId },
      });
      
      if (tenant) {
        // Mettre à jour l'email si nécessaire
        if (tenant.email !== validated.tenantEmail.trim().toLowerCase()) {
          tenant = await prisma.client.update({
            where: { id: tenant.id },
            data: {
              email: validated.tenantEmail.trim().toLowerCase(),
            },
          });
        }
      }
    }
    
    // Si aucun locataire n'a été trouvé via rawPayload, vérifier si un locataire est déjà rattaché au bail existant
    if (!tenant && ownerIntakeLink?.bailId && ownerIntakeLink.bail) {
      const existingTenant = ownerIntakeLink.bail.parties.find(
        (party: any) => party.profilType === ProfilType.LOCATAIRE
      );
      
      if (existingTenant) {
        // Si un locataire est déjà rattaché au bail, mettre à jour son email
        tenant = await prisma.client.update({
          where: { id: existingTenant.id },
          data: {
            email: validated.tenantEmail.trim().toLowerCase(),
          },
        });
      } else {
        // Vérifier d'abord si un client avec cet email existe déjà (peu importe le profilType)
        const existingClientWithEmail = await prisma.client.findUnique({
          where: {
            email: validated.tenantEmail.trim().toLowerCase()
          },
        });

        if (existingClientWithEmail) {
          throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
        }

        // Si aucun locataire n'est rattaché, chercher un locataire existant avec cet email
        tenant = await prisma.client.findFirst({
          where: {
            email: validated.tenantEmail.trim().toLowerCase(),
            profilType: ProfilType.LOCATAIRE,
          },
        });

        if (!tenant) {
          // Si le locataire n'existe pas, le créer
          tenant = await prisma.client.create({
            data: {
              type: ClientType.PERSONNE_PHYSIQUE,
              profilType: ProfilType.LOCATAIRE,
              email: validated.tenantEmail.trim().toLowerCase(),
            },
          });
        }
      }
    } else if (!tenant) {
      // Vérifier d'abord si un client avec cet email existe déjà (peu importe le profilType)
      const existingClientWithEmail = await prisma.client.findUnique({
        where: {
          email: validated.tenantEmail.trim().toLowerCase()
        },
      });

      if (existingClientWithEmail) {
        throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
      }

      // Si le bail n'existe pas encore, chercher ou créer le locataire
      tenant = await prisma.client.findFirst({
        where: {
          email: validated.tenantEmail.trim().toLowerCase(),
          profilType: ProfilType.LOCATAIRE,
        },
      });

      if (!tenant) {
        tenant = await prisma.client.create({
          data: {
            type: ClientType.PERSONNE_PHYSIQUE,
            profilType: ProfilType.LOCATAIRE,
            email: validated.tenantEmail.trim().toLowerCase(),
          },
        });
      }
    }
  }

  // Utiliser le bail existant ou en créer un nouveau
  let bail;
  const bailParties = [{ id: validated.clientId }]; // Propriétaire
  if (tenant) {
    bailParties.push({ id: tenant.id }); // Locataire
  }

  if (ownerIntakeLink?.bailId && ownerIntakeLink.bail) {
    // Vérifier si le locataire est déjà connecté au bail
    const isTenantConnected = tenant ? ownerIntakeLink.bail.parties.some(
      (party: any) => party.id === tenant!.id
    ) : false;
    
    // Préparer les données de mise à jour
    const updateData: any = {
      bailType: validated.bailType || BailType.BAIL_NU_3_ANS,
      bailFamily: validated.bailFamily || BailFamille.HABITATION,
      rentAmount: validated.bailRentAmount,
      monthlyCharges: validated.bailMonthlyCharges || 0,
      securityDeposit: validated.bailSecurityDeposit || 0,
      effectiveDate: validated.bailEffectiveDate,
      endDate: validated.bailEndDate,
      paymentDay: validated.bailPaymentDay,
    };
    
    // Connecter le locataire seulement s'il existe et n'est pas déjà connecté
    if (tenant && !isTenantConnected) {
      updateData.parties = {
        connect: bailParties,
      };
    }
    
    // Mettre à jour le bail existant
    bail = await prisma.bail.update({
      where: { id: ownerIntakeLink.bailId },
      data: updateData,
    });
    
  } else {
    // Créer un nouveau bail
    bail = await prisma.bail.create({
      data: {
        bailType: validated.bailType || BailType.BAIL_NU_3_ANS,
        bailFamily: validated.bailFamily || BailFamille.HABITATION,
        status: BailStatus.DRAFT,
        rentAmount: validated.bailRentAmount,
        monthlyCharges: validated.bailMonthlyCharges || 0,
        securityDeposit: validated.bailSecurityDeposit || 0,
        effectiveDate: validated.bailEffectiveDate,
        endDate: validated.bailEndDate,
        paymentDay: validated.bailPaymentDay,
        propertyId: property.id,
        parties: {
          connect: bailParties,
        },
      },
    });
  }

  // Chercher ou créer l'IntakeLink pour le formulaire locataire (seulement si locataire existe)
  let tenantIntakeLink = null;
  
  if (tenant) {
    // D'abord, chercher un IntakeLink existant pour ce locataire (peut-être créé lors de la conversion lead)
    tenantIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: tenant.id,
        target: "TENANT",
        status: "PENDING",
      },
    });

    if (tenantIntakeLink) {
      // Mettre à jour l'IntakeLink existant avec le bail et le bien
      tenantIntakeLink = await prisma.intakeLink.update({
        where: { id: tenantIntakeLink.id },
        data: {
          propertyId: property.id,
          bailId: bail.id,
        },
      });
    } else {
      // Si aucun IntakeLink n'existe, chercher un avec le bailId
      tenantIntakeLink = await prisma.intakeLink.findFirst({
        where: {
          clientId: tenant.id,
          bailId: bail.id,
          target: "TENANT",
        },
      });

      if (!tenantIntakeLink) {
        // Créer un nouvel IntakeLink
        tenantIntakeLink = await prisma.intakeLink.create({
          data: {
            target: "TENANT",
            clientId: tenant.id,
            propertyId: property.id,
            bailId: bail.id,
          },
        });
      }
    }
  }

  // Mettre à jour l'IntakeLink du propriétaire comme soumis
  if (ownerIntakeLink) {
    const updatedIntakeLink = await prisma.intakeLink.update({
      where: { id: ownerIntakeLink.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rawPayload: validated as any,
        propertyId: property.id,
        bailId: bail.id,
      },
    });
    
    // Mettre à jour le statut de complétion du client à PENDING_CHECK après soumission
    const currentClient = await prisma.client.findUnique({
      where: { id: validated.clientId },
      select: { completionStatus: true },
    });
    
    if (currentClient && (currentClient.completionStatus === CompletionStatus.PARTIAL || currentClient.completionStatus === CompletionStatus.NOT_STARTED)) {
      await prisma.client.update({
        where: { id: validated.clientId },
        data: {
          completionStatus: CompletionStatus.PENDING_CHECK,
        },
      });
    }
    
  }

  // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
  // Plus besoin de les gérer ici

  // Envoyer l'email au locataire avec le formulaire lors de la soumission finale
  if (tenant && validated.tenantEmail) {
    // S'assurer que le tenantIntakeLink existe, sinon le créer
    if (!tenantIntakeLink) {
      tenantIntakeLink = await prisma.intakeLink.findFirst({
        where: {
          clientId: tenant.id,
          bailId: bail.id,
          target: "TENANT",
        },
      });

      if (!tenantIntakeLink) {
        // Créer un nouvel IntakeLink pour le locataire
        tenantIntakeLink = await prisma.intakeLink.create({
          data: {
            target: "TENANT",
            clientId: tenant.id,
            propertyId: property.id,
            bailId: bail.id,
          },
        });
      }
    }
  }

  // L'email au locataire est maintenant envoyé lors de la sauvegarde de l'étape 4 dans savePartialIntake
  // Plus besoin d'envoyer l'email lors de la soumission finale

  // Stocker les IDs nécessaires pour les notifications en arrière-plan
  const ownerIntakeLinkId = ownerIntakeLink?.id || null;

  // Retourner le résultat AVANT l'envoi d'email et les notifications pour que l'utilisateur voie le statut immédiatement
  const result = { property, bail, tenant, tenantIntakeLink };

  // Déclencher les calculs de statut de complétion en arrière-plan (non bloquant)
  // Calculer les statuts du client et du bien ensemble pour optimiser
  triggerCompletionStatusesCalculation({
    clientId: validated.clientId,
    propertyId: property?.id,
  }).catch((error) => {
    console.error("Erreur lors du déclenchement des calculs de statut:", error);
  });

  // Déclencher l'envoi d'email et les notifications en arrière-plan (après le return, ne bloque pas le rendu)
  Promise.resolve().then(async () => {
    try {
      // Notification pour soumission d'intake
      if (ownerIntakeLinkId) {
        await createNotificationForAllUsers(
          NotificationType.INTAKE_SUBMITTED,
          "INTAKE",
          ownerIntakeLinkId,
          null,
          { intakeTarget: "OWNER"}
        );
      }

      // L'email au locataire est maintenant envoyé lors de la sauvegarde de l'étape 4 dans savePartialIntake
      // Plus besoin d'envoyer l'email lors de la soumission finale
    } catch (error: any) {
      // Ne pas bloquer la soumission même si les notifications/emails échouent
      console.error("❌ Erreur lors des notifications/emails (en arrière-plan):", error);
    }
  }).catch((error) => {
    console.error("❌ Erreur lors de l'exécution asynchrone des notifications/emails:", error);
  });

  return result;
}

// Soumettre le formulaire locataire
export async function submitTenantForm(data: unknown) {
  let validated;
  try {
    validated = tenantFormSchema.parse(data);
  } catch (error: any) {
    // Si c'est une erreur Zod, formater les messages d'erreur
    if (error.issues && Array.isArray(error.issues)) {
      const errorMessages = error.issues.map((issue: any) => {
        const path = issue.path.join(".");
        return `${path}: ${issue.message}`;
      });
      throw new Error(errorMessages.join(", "));
    }
    throw error;
  }

  // Vérifier qu'un IntakeLink valide existe pour ce client (sécurité)
  const intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: validated.clientId,
      target: "TENANT",
      status: {
        in: ["PENDING", "SUBMITTED"], // Permettre même si soumis (pour modifications)
      },
    },
  });

  if (!intakeLink) {
    throw new Error("Accès non autorisé : aucun lien d'intake valide trouvé pour ce client");
  }

  // Mettre à jour le client locataire
  const tenantUpdateData: any = {
    updatedAt: new Date(),
    firstName: validated.firstName,
    lastName: validated.lastName,
  };

  if (validated.profession) tenantUpdateData.profession = validated.profession;
  if (validated.phone) tenantUpdateData.phone = validated.phone;
  if (validated.email) tenantUpdateData.email = validated.email;
  if (validated.fullAddress) tenantUpdateData.fullAddress = validated.fullAddress;
  if (validated.nationality) tenantUpdateData.nationality = validated.nationality;
  if (validated.familyStatus) tenantUpdateData.familyStatus = validated.familyStatus;
  if (validated.matrimonialRegime) tenantUpdateData.matrimonialRegime = validated.matrimonialRegime;
  if (validated.birthPlace) tenantUpdateData.birthPlace = validated.birthPlace;
  if (validated.birthDate) tenantUpdateData.birthDate = validated.birthDate;

  await prisma.client.update({
    where: { id: validated.clientId },
    data: tenantUpdateData,
  });

  // Déclencher le calcul du statut de complétion en arrière-plan (non bloquant)
  triggerCompletionStatusesCalculation({ clientId: validated.clientId }).catch((error) => {
    console.error("Erreur lors du déclenchement du calcul de statut client:", error);
  });

  // Mettre à jour l'IntakeLink du locataire comme soumis
  const tenantIntakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: validated.clientId,
      target: "TENANT",
      status: "PENDING",
    },
  });

  let updatedIntakeLinkId: string | null = null;
  
  if (tenantIntakeLink) {
    const updatedIntakeLink = await prisma.intakeLink.update({
      where: { id: tenantIntakeLink.id },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rawPayload: validated as any,
      },
    });
    
    updatedIntakeLinkId = updatedIntakeLink.id;
    
    // Mettre à jour le statut de complétion du client à PENDING_CHECK après soumission
    const currentClient = await prisma.client.findUnique({
      where: { id: validated.clientId },
      select: { completionStatus: true },
    });
    
    if (currentClient && (currentClient.completionStatus === CompletionStatus.PARTIAL || currentClient.completionStatus === CompletionStatus.NOT_STARTED)) {
      await prisma.client.update({
        where: { id: validated.clientId },
        data: {
          completionStatus: CompletionStatus.PENDING_CHECK,
        },
      });
    }
  }
  
  // Retourner le résultat AVANT les notifications pour que l'utilisateur voie le statut immédiatement
  const result = { success: true };

  // Déclencher les notifications en arrière-plan (après le return, ne bloque pas le rendu)
  Promise.resolve().then(async () => {
    try {    

      // Notification pour soumission d'intake via formulaire
      if (updatedIntakeLinkId) {
        await createNotificationForAllUsers(
          NotificationType.INTAKE_SUBMITTED,
          "INTAKE",
          updatedIntakeLinkId,
          null, // Soumis par formulaire, pas par un utilisateur
          { intakeTarget: "TENANT"}
        );
      }
    } catch (error: any) {
      // Ne pas bloquer la soumission même si les notifications échouent
      console.error("❌ Erreur lors des notifications (en arrière-plan):", error);
    }
  }).catch((error) => {
    console.error("❌ Erreur lors de l'exécution asynchrone des notifications:", error);
  });

  return result;
}

// Mettre à jour un client
export async function updateClient(data: unknown) {
  const user = await requireAuth();
  const validated = updateClientSchema.parse(data);
  const { id, ...updateData } = validated;

  const existing = await prisma.client.findUnique({
    where: { id },
    include: { bails: true, ownedProperties: true },
  });

  if (!existing) {
    throw new Error("Client introuvable");
  }

  const client = await prisma.client.update({
    where: { id },
    data: {
      ...updateData,
      updatedById: user.id,
    },
    include: {
      bails: true,
      ownedProperties: true,
    },
  });

  // Mettre à jour le statut de complétion
  await updateClientCompletionStatus({ id, completionStatus: client.completionStatus });

  // Pas de notification pour les modifications via l'interface

  revalidatePath("/interface/clients");
  revalidatePath(`/interface/clients/${id}`);
  return client;
}

// Helper pour obtenir le nom d'un client
function getClientName(client: { type: ClientType; firstName?: string | null; lastName?: string | null; legalName?: string | null; email?: string | null }): string {
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const name = `${client.firstName || ""} ${client.lastName || ""}`.trim();
    return name || client.email || "Client";
  }
  return client.legalName || client.email || "Client";
}

// Obtenir le nom d'un client par son ID (pour le dialog de confirmation)
export async function getClientNameById(id: string): Promise<string> {
  await requireAuth();
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      type: true,
      firstName: true,
      lastName: true,
      legalName: true,
      email: true,
    },
  });
  
  if (!client) {
    return "Client";
  }
  
  return getClientName(client);
}

// Supprimer un client
export async function deleteClient(id: string): Promise<{ success: true } | { success: false; error: string; blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }> }> {
  const user = await requireAuth();
  
  // Récupérer le client avec toutes ses relations
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      bails: {
        include: {
          parties: {
            select: {
              id: true,
              profilType: true,
            },
          },
        },
      },
      ownedProperties: {
        include: {
          bails: {
            include: {
              parties: {
                select: {
                  id: true,
                  profilType: true,
                  type: true,
                  firstName: true,
                  lastName: true,
                  legalName: true,
                  email: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              fileKey: true,
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          fileKey: true,
        },
      },
      intakeLinks: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!client) {
    throw new Error("Client introuvable");
  }

  const clientName = getClientName(client);

  // Gérer les différents cas selon le profilType
  if (client.profilType === ProfilType.LEAD) {
    // LEAD : Supprimer le client + son intake s'il y en a un
    const intakeLinkIds = client.intakeLinks.map(link => link.id);
    
    // Supprimer les intakeLinks
    if (intakeLinkIds.length > 0) {
      await prisma.intakeLink.deleteMany({
        where: { id: { in: intakeLinkIds } },
      });
    }

    // Supprimer les documents et leurs fichiers blob
    const documentFileKeys = client.documents.map(doc => doc.fileKey);
    if (documentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(documentFileKeys);
    }

    await prisma.document.deleteMany({
      where: { clientId: id },
    });

    // Supprimer le client
    await prisma.client.delete({ where: { id } });

  } else if (client.profilType === ProfilType.LOCATAIRE) {
    // LOCATAIRE : Supprimer le client + ses documents (du blob aussi) + sa connexion avec le bail + les intake en relation
    
    // Supprimer les documents et leurs fichiers blob
    const documentFileKeys = client.documents.map(doc => doc.fileKey);
    if (documentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(documentFileKeys);
    }

    await prisma.document.deleteMany({
      where: { clientId: id },
    });

    // Supprimer les connexions avec les baux (disconnect le locataire des baux)
    for (const bail of client.bails) {
      await prisma.bail.update({
        where: { id: bail.id },
        data: {
          parties: {
            disconnect: { id },
          },
        },
      });
    }

    // Supprimer les intakeLinks en relation
    await prisma.intakeLink.deleteMany({
      where: { clientId: id },
    });

    // Supprimer le client
    await prisma.client.delete({ where: { id } });

  } else if (client.profilType === ProfilType.PROPRIETAIRE) {
    // PROPRIETAIRE : Vérifications complexes
    
    // Vérifier s'il y a des baux avec des locataires
    const blockingEntities: Array<{ id: string; name: string; type: "CLIENT" | "BAIL"; link: string }> = [];
    
    for (const property of client.ownedProperties) {
      for (const bail of property.bails) {
        // Vérifier si le bail a un locataire connecté
        const hasTenant = bail.parties.some(party => party.profilType === ProfilType.LOCATAIRE);
        
        if (hasTenant) {
          const tenant = bail.parties.find(party => party.profilType === ProfilType.LOCATAIRE);
          if (tenant) {
            const tenantName = tenant.type === ClientType.PERSONNE_PHYSIQUE
              ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || tenant.email || "Locataire"
              : tenant.legalName || tenant.email || "Locataire";
            
            blockingEntities.push({
              id: tenant.id,
              name: tenantName,
              type: "CLIENT",
              link: `/interface/clients/${tenant.id}`,
            });
          }
        }
      }
    }

    if (blockingEntities.length > 0) {
      return {
        success: false,
        error: `Impossible de supprimer le propriétaire "${clientName}". ` +
          `Il existe ${blockingEntities.length} locataire${blockingEntities.length > 1 ? 's' : ''} connecté${blockingEntities.length > 1 ? 's' : ''} à ${blockingEntities.length > 1 ? 'des baux' : 'un bail'}. ` +
          `Vous devez d'abord supprimer le${blockingEntities.length > 1 ? 's' : ''} locataire${blockingEntities.length > 1 ? 's' : ''} concerné${blockingEntities.length > 1 ? 's' : ''}.`,
        blockingEntities,
      };
    }

    // Vérifier s'il y a des baux sans locataire
    const bailsWithoutTenant: Array<{ id: string; name: string; type: "BAIL"; link: string }> = [];
    
    for (const property of client.ownedProperties) {
      for (const bail of property.bails) {
        const hasTenant = bail.parties.some(party => party.profilType === ProfilType.LOCATAIRE);
        if (!hasTenant) {
          bailsWithoutTenant.push({
            id: bail.id,
            name: `Bail #${bail.id.slice(-8).toUpperCase()}`,
            type: "BAIL",
            link: `/interface/baux/${bail.id}`,
          });
        }
      }
    }

    if (bailsWithoutTenant.length > 0) {
      return {
        success: false,
        error: `Impossible de supprimer le propriétaire "${clientName}". ` +
          `Il existe ${bailsWithoutTenant.length} bail${bailsWithoutTenant.length > 1 ? 'x' : ''} associé${bailsWithoutTenant.length > 1 ? 's' : ''} à ses biens. ` +
          `Vous devez d'abord supprimer le${bailsWithoutTenant.length > 1 ? 's' : ''} bail${bailsWithoutTenant.length > 1 ? 'x' : ''} concerné${bailsWithoutTenant.length > 1 ? 's' : ''}.`,
        blockingEntities: bailsWithoutTenant,
      };
    }

    // Si seulement un bien et ses données du client : supprimer le client + le bien + les documents du bien et du client (du blob) + les intake en relation
    
    // Collecter tous les documents (client + biens)
    const allDocumentFileKeys: string[] = [];
    
    // Documents du client
    allDocumentFileKeys.push(...client.documents.map(doc => doc.fileKey));
    
    // Documents des biens
    for (const property of client.ownedProperties) {
      allDocumentFileKeys.push(...property.documents.map(doc => doc.fileKey));
    }

    // Supprimer tous les fichiers blob
    if (allDocumentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(allDocumentFileKeys);
    }

    // Supprimer tous les documents (client + biens)
    await prisma.document.deleteMany({
      where: {
        OR: [
          { clientId: id },
          { propertyId: { in: client.ownedProperties.map(p => p.id) } },
        ],
      },
    });

    // Supprimer les intakeLinks en relation avec le client et les biens
    await prisma.intakeLink.deleteMany({
      where: {
        OR: [
          { clientId: id },
          { propertyId: { in: client.ownedProperties.map(p => p.id) } },
        ],
      },
    });

    // Supprimer les baux (s'ils existent encore, normalement ils sont déjà supprimés)
    const propertyIds = client.ownedProperties.map(p => p.id);
    if (propertyIds.length > 0) {
      await prisma.bail.deleteMany({
        where: { propertyId: { in: propertyIds } },
      });
    }

    // Supprimer les biens
    await prisma.property.deleteMany({
      where: { ownerId: id },
    });

    // Supprimer le client
    await prisma.client.delete({ where: { id } });
  } else {
    // Cas par défaut (ne devrait pas arriver)
    await prisma.client.delete({ where: { id } });
  }
  
  // Créer une notification pour tous les utilisateurs (sauf celui qui a supprimé le client)
  await createNotificationForAllUsers(
    NotificationType.CLIENT_DELETED,
    "CLIENT",
    id,
    user.id,
    { clientEmail: client.email || null, clientName }
  );
  
  revalidatePath("/interface/clients");
  return { success: true };
}

// Obtenir un client
export async function getClient(id: string) {
  await requireAuth();
  return prisma.client.findUnique({
    where: { id },
    include: {
      bails: {
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
              firstName: true,
              lastName: true,
              legalName: true,
              type: true,
              email: true,
              profilType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      ownedProperties: {
        include: {
          bails: {
            include: {
              parties: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  legalName: true,
                  type: true,
                  email: true,
                  profilType: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      intakeLinks: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

// Obtenir la liste des clients
export async function getClients(params: {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: ClientType;
  profilType?: ProfilType;
}) {
  await requireAuth();

  const where: any = {};

  if (params.type) {
    where.type = params.type;
  }

  if (params.profilType) {
    where.profilType = params.profilType;
  }

  if (params.search) {
    where.OR = [
      { email: { contains: params.search, mode: "insensitive" } },
      { phone: { contains: params.search, mode: "insensitive" } },
      { firstName: { contains: params.search, mode: "insensitive" } },
      { lastName: { contains: params.search, mode: "insensitive" } },
      { legalName: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        ownedProperties: true,
        bails: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    }),
    prisma.client.count({ where }),
  ]);

  // Sérialiser les données
  const serializedData = JSON.parse(JSON.stringify(data));

  return {
    data: serializedData,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// Obtenir tous les clients (pour filtrage côté client)
export async function getAllClients() {
  await requireAuth();

  const data = await prisma.client.findMany({
    include: {
      ownedProperties: true,
      bails: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Sérialiser les données
  const serializedData = JSON.parse(JSON.stringify(data));

  return serializedData;
}

// Envoyer le lien du formulaire à un client existant
export async function sendIntakeLinkToClient(clientId: string) {
  const user = await requireAuth();

  // Récupérer le client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client introuvable");
  }

  if (!client.email) {
    throw new Error("Le client n'a pas d'email");
  }

  // Vérifier que le client n'est pas en statut PENDING_CHECK ou COMPLETED
  if (client.completionStatus === "PENDING_CHECK" || client.completionStatus === "COMPLETED") {
    throw new Error("Impossible d'envoyer le formulaire : le client est en statut de vérification ou complété");
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  // Si le client est un LEAD, envoyer le lien de conversion
  if (client.profilType === ProfilType.LEAD) {
    // Vérifier s'il existe déjà un IntakeLink de conversion en PENDING ou SUBMITTED
    let intakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: client.id,
        target: "LEAD",
        status: {
          in: ["PENDING", "SUBMITTED"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Si aucun lien valide n'existe, en créer un nouveau
    if (!intakeLink) {
      const token = randomBytes(32).toString("hex");
      intakeLink = await prisma.intakeLink.create({
        data: {
          token,
          target: "LEAD",
          clientId: client.id,
          status: "PENDING",
          createdById: user.id,
        },
      });
    }

    const convertUrl = `${baseUrl}/intakes/${intakeLink.token}/convert`;

    try {
      await triggerLeadConversionEmail({
        to: client.email,
        subject: "Bienvenue chez BailNotarie - Choisissez votre profil",
        convertUrl,
      });
    } catch (error) {
      console.error("Erreur lors du déclenchement de l'email:", error);
      throw new Error("Erreur lors du déclenchement de l'email");
    }

    revalidatePath("/interface/clients");
    return { intakeLink, emailSent: true };
  }

  // Pour les autres profils (PROPRIETAIRE ou LOCATAIRE)
  // Déterminer le target selon le profilType
  const target = client.profilType === ProfilType.PROPRIETAIRE ? "OWNER" : 
                 client.profilType === ProfilType.LOCATAIRE ? "TENANT" : 
                 "OWNER"; // Par défaut OWNER

  // Récupérer le bien et le bail existants du client si c'est un propriétaire
  let existingPropertyId: string | null = null;
  let existingBailId: string | null = null;

  if (target === "OWNER") {
    // Récupérer le premier bien du propriétaire
    const property = await prisma.property.findFirst({
      where: {
        ownerId: client.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (property) {
      existingPropertyId = property.id;

      // Récupérer le premier bail lié à ce bien
      const bail = await prisma.bail.findFirst({
        where: {
          propertyId: property.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (bail) {
        existingBailId = bail.id;
      }
    }
  } else if (target === "TENANT") {
    // Pour un locataire, récupérer le bail où il est partie
    const bail = await prisma.bail.findFirst({
      where: {
        parties: {
          some: {
            id: client.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        property: true,
      },
    });

    if (bail) {
      existingBailId = bail.id;
      if (bail.property) {
        existingPropertyId = bail.property.id;
      }
    }
  }

  // Vérifier s'il existe déjà un IntakeLink valide (PENDING) pour ce client et ce target
  let intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: client.id,
      target: target as any,
      status: "PENDING",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Si aucun lien valide n'existe, en créer un nouveau avec les biens/baux existants
  if (!intakeLink) {
    intakeLink = await prisma.intakeLink.create({
      data: {
        target: target as any,
        clientId: client.id,
        propertyId: existingPropertyId,
        bailId: existingBailId,
        createdById: user.id,
      },
    });
  } else {
    // Si l'IntakeLink existe mais n'a pas de propertyId/bailId, les mettre à jour
    if ((!intakeLink.propertyId && existingPropertyId) || (!intakeLink.bailId && existingBailId)) {
      intakeLink = await prisma.intakeLink.update({
        where: { id: intakeLink.id },
        data: {
          propertyId: intakeLink.propertyId || existingPropertyId,
          bailId: intakeLink.bailId || existingBailId,
        },
      });
    }
  }

  // Déclencher l'envoi d'email avec le lien du formulaire via Inngest (asynchrone, ne bloque pas le rendu)
  const formUrl = `${baseUrl}/intakes/${intakeLink.token}`;

  try {
    if (target === "OWNER") {
      await triggerOwnerFormEmail({
        to: client.email,
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        formUrl,
      });
    } else {
      await triggerTenantFormEmail({
        to: client.email,
        firstName: client.firstName || "",
        lastName: client.lastName || "",
        formUrl,
      });
    }
  } catch (error) {
    console.error("Erreur lors du déclenchement de l'email:", error);
    throw new Error("Erreur lors du déclenchement de l'email");
  }

  revalidatePath("/interface/clients");
  return { intakeLink, emailSent: true };
}

// Régénérer l'intakeLink d'un client (remet en PENDING et génère un nouveau token)
export async function regenerateClientIntakeLink(clientId: string) {
  const user = await requireAuth();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client introuvable");
  }

  let target: string;
  if (client.profilType === ProfilType.LEAD) {
    target = "LEAD";
  } else if (client.profilType === ProfilType.PROPRIETAIRE) {
    target = "OWNER";
  } else if (client.profilType === ProfilType.LOCATAIRE) {
    target = "TENANT";
  } else {
    throw new Error("Type de client non supporté");
  }

  // Trouver l'intakeLink existant
  const intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: client.id,
      target: target as any,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!intakeLink) {
    throw new Error("Aucun lien de formulaire trouvé pour ce client");
  }

  // Régénérer le token et remettre en PENDING
  const newToken = randomBytes(32).toString("hex");
  const updatedIntakeLink = await prisma.intakeLink.update({
    where: { id: intakeLink.id },
    data: {
      token: newToken,
      status: "PENDING",
      submittedAt: null,
    },
  });

  revalidatePath("/interface/clients");
  return updatedIntakeLink;
}

// Vérifier si un client a un lien de formulaire disponible
export async function hasIntakeLink(clientId: string): Promise<{ hasLink: boolean; isSubmitted: boolean }> {
  await requireAuth();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    return { hasLink: false, isSubmitted: false };
  }

  if (client.profilType === ProfilType.LEAD) {
    const intakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: client.id,
        target: "LEAD",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      hasLink: !!intakeLink,
      isSubmitted: intakeLink?.status === "SUBMITTED" || false,
    };
  }

  const target = client.profilType === ProfilType.PROPRIETAIRE ? "OWNER" : 
                 client.profilType === ProfilType.LOCATAIRE ? "TENANT" : 
                 null;

  if (!target) {
    return { hasLink: false, isSubmitted: false };
  }

  const intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: client.id,
      target: target as any,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    hasLink: !!intakeLink,
    isSubmitted: intakeLink?.status === "SUBMITTED" || false,
  };
}

// Obtenir le lien du formulaire pour un client (sans envoyer d'email)
export async function getIntakeLinkUrl(clientId: string): Promise<string> {
  const user = await requireAuth();

  // Récupérer le client
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error("Client introuvable");
  }

  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

  // Si le client est un LEAD, retourner le lien de conversion existant uniquement
  if (client.profilType === ProfilType.LEAD) {
    // Vérifier s'il existe déjà un IntakeLink de conversion
    const intakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: client.id,
        target: "LEAD",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!intakeLink) {
      throw new Error("Aucun lien de formulaire disponible pour ce lead");
    }

    return `${baseUrl}/intakes/${intakeLink.token}/convert`;
  }

  // Pour les autres profils (PROPRIETAIRE ou LOCATAIRE)
  // Déterminer le target selon le profilType
  const target = client.profilType === ProfilType.PROPRIETAIRE ? "OWNER" : 
                 client.profilType === ProfilType.LOCATAIRE ? "TENANT" : 
                 "OWNER"; // Par défaut OWNER

  // Récupérer le bien et le bail existants du client si c'est un propriétaire
  let existingPropertyId: string | null = null;
  let existingBailId: string | null = null;

  if (target === "OWNER") {
    // Récupérer le premier bien du propriétaire
    const property = await prisma.property.findFirst({
      where: {
        ownerId: client.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (property) {
      existingPropertyId = property.id;

      // Récupérer le premier bail lié à ce bien
      const bail = await prisma.bail.findFirst({
        where: {
          propertyId: property.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (bail) {
        existingBailId = bail.id;
      }
    }
  } else if (target === "TENANT") {
    // Pour un locataire, récupérer le bail où il est partie
    const bail = await prisma.bail.findFirst({
      where: {
        parties: {
          some: {
            id: client.id,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        property: true,
      },
    });

    if (bail) {
      existingBailId = bail.id;
      if (bail.property) {
        existingPropertyId = bail.property.id;
      }
    }
  }

  // Vérifier s'il existe déjà un IntakeLink pour ce client et ce target (ne pas en créer un nouveau)
  const intakeLink = await prisma.intakeLink.findFirst({
    where: {
      clientId: client.id,
      target: target as any,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!intakeLink) {
    throw new Error("Aucun lien de formulaire disponible pour ce client");
  }

  return `${baseUrl}/intakes/${intakeLink.token}`;
}

// Mettre à jour le statut de complétion d'un client
export async function updateClientCompletionStatus(data: { id: string; completionStatus: CompletionStatus }) {
  const user = await requireAuth();
  const { id, completionStatus } = data;

  // Récupérer l'ancien statut
  const oldClient = await prisma.client.findUnique({ where: { id } });
  const oldStatus = oldClient?.completionStatus;

  const client = await prisma.client.update({
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
      "CLIENT",
      id,
      null, // Modifié via interface, notifier tous les utilisateurs
      { 
        oldStatus,
        newStatus: completionStatus,
        entityType: "CLIENT"
      }
    );
  }

  revalidatePath("/interface/clients");
  revalidatePath(`/interface/clients/${id}`);
  return client;
}

