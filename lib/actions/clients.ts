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

  const email = validated.email.toLowerCase().trim();

  const [existingPerson, existingEntreprise] = await Promise.all([
    prisma.person.findUnique({
      where: { email: email },
    }),
    prisma.entreprise.findUnique({
      where: { email: email },
    })
  ]);
  
  if (existingPerson || existingEntreprise) {
    throw new Error("Cet email est déjà utilisé par un client, une personne ou une entreprise.");
  }
  
  // Créer le client avec profilType PROPRIETAIRE (sans type, sera défini dans le formulaire)
  // Créer aussi une Person avec l'email
  let client;
  try {
    client = await prisma.client.create({
      data: {
        type: ClientType.PERSONNE_PHYSIQUE, // Type temporaire, sera mis à jour dans le formulaire
        profilType: ProfilType.PROPRIETAIRE,
        completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
        createdById: user.id,
        persons: {
          create: {
            email: email,
            isPrimary: true,
            createdById: user.id,
          },
        },
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
      rawPayload: {
        type: ClientType.PERSONNE_PHYSIQUE,
        email: email,
        persons: [
          {
            email: email,
            isPrimary: true,
          },
        ],
      },
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

    const providedPersons = Array.isArray((validated as any).persons)
      ? ((validated as any).persons as any[])
      : [];

    const fallbackPerson =
      validated.type === ClientType.PERSONNE_PHYSIQUE
        ? {
            firstName: validated.firstName,
            lastName: validated.lastName,
            profession: validated.profession,
            phone: validated.phone,
            email: validated.email,
            fullAddress: validated.fullAddress,
            nationality: validated.nationality,
            familyStatus: validated.familyStatus,
            matrimonialRegime: validated.matrimonialRegime,
            birthPlace: validated.birthPlace,
            birthDate: validated.birthDate,
            isPrimary: true,
          }
        : undefined;

    const personsToCreate =
      providedPersons.length > 0
        ? providedPersons.map((person, index) => ({
            ...person,
            isPrimary: person.isPrimary ?? index === 0,
          }))
        : fallbackPerson
          ? [fallbackPerson]
          : [];

    const primaryPerson = personsToCreate[0];

    // Créer le client propriétaire (sans champs personnels, ceux-ci vont dans Person ou Entreprise)
    let client;
    try {
      client = await prisma.client.create({
        data: {
          type: validated.type,
          profilType: ProfilType.PROPRIETAIRE,
          completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
          createdById: user.id,
        },
      });
    } catch (error: any) {
      // Gérer les erreurs Prisma (contrainte unique, etc.)
      if (error.code === "P2002") {
        throw new Error("Une erreur de contrainte unique s'est produite.");
      }
      throw error;
    }

    // Ne pas mettre à jour le statut de complétion lors de la création manuelle
    // Le statut reste NOT_STARTED jusqu'à ce que le client remplisse le formulaire

    // Pour PERSONNE_PHYSIQUE: créer les Person(s)
    if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
      if (personsToCreate.length > 0) {
        await prisma.person.createMany({
          data: personsToCreate.map((person, index) => ({
            clientId: client.id,
            firstName: person.firstName ?? null,
            lastName: person.lastName ?? null,
            profession: person.profession ?? null,
            phone: person.phone ?? null,
            email: person.email ?? null,
            fullAddress: person.fullAddress ?? null,
            nationality: person.nationality ?? null,
            familyStatus: (person.familyStatus as any) ?? null,
            matrimonialRegime: (person.matrimonialRegime as any) ?? null,
            birthPlace: person.birthPlace ?? null,
            birthDate: person.birthDate ? new Date(person.birthDate) : null,
            isPrimary: person.isPrimary ?? index === 0,
          })),
        });
      }
    } else {
      // Pour PERSONNE_MORALE: créer l'Entreprise
      try {
        await prisma.entreprise.create({
          data: {
            clientId: client.id,
            legalName: validated.legalName!,
            registration: validated.registration ?? "",
            name: validated.legalName!, // Utiliser legalName comme name par défaut
            email: validated.email!,
            phone: validated.phone ?? null,
            fullAddress: validated.fullAddress ?? null,
            createdById: user.id,
          },
        });
      } catch (error: any) {
        // Gérer les erreurs Prisma (contrainte unique, etc.)
        if (error.code === "P2002") {
          if (error.meta?.target?.includes("email")) {
            throw new Error(`Une entreprise avec l'email ${validated.email} existe déjà.`);
          }
          throw new Error("Une erreur de contrainte unique s'est produite.");
        }
        throw error;
      }


    }

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
      const email = validated.tenantEmail.toLowerCase().trim();
      // Vérifier si un locataire avec cet email existe déjà
      const existingTenant = await prisma.person.findUnique({
        where: { email },
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
              completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
              createdById: user.id,
              persons: {
                create: {
                  email: validated.tenantEmail,
                },
              },

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

      const providedPersons = Array.isArray((validated as any).persons)
        ? ((validated as any).persons as any[])
        : [];

      const fallbackPerson =
        validated.type === ClientType.PERSONNE_PHYSIQUE
          ? {
              firstName: validated.firstName,
              lastName: validated.lastName,
              profession: validated.profession,
              phone: validated.phone,
              email: validated.email,
              fullAddress: validated.fullAddress,
              nationality: validated.nationality,
              familyStatus: validated.familyStatus,
              matrimonialRegime: validated.matrimonialRegime,
              birthPlace: validated.birthPlace,
              birthDate: validated.birthDate,
              isPrimary: true,
            }
          : undefined;

      const personsToCreate =
        providedPersons.length > 0
          ? providedPersons.map((person, index) => ({
              ...person,
              isPrimary: person.isPrimary ?? index === 0,
            }))
          : fallbackPerson
            ? [fallbackPerson]
            : [];

      const primaryPerson = personsToCreate[0];

      // Créer le client propriétaire (sans champs personnels, ceux-ci vont dans Person ou Entreprise)
      try {
        const client = await prisma.client.create({
          data: {
            type: validated.type,
            profilType: ProfilType.PROPRIETAIRE,
            completionStatus: CompletionStatus.NOT_STARTED, // Statut par défaut lors de la création manuelle
            createdById: user.id,
          },
          include: {
            bails: true,
            ownedProperties: true,
          },
        });

        // Pour PERSONNE_PHYSIQUE: créer les Person(s)
        if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
          if (personsToCreate.length > 0) {
            await prisma.person.createMany({
              data: personsToCreate.map((person, index) => ({
                clientId: client.id,
                firstName: person.firstName ?? null,
                lastName: person.lastName ?? null,
                profession: person.profession ?? null,
                phone: person.phone ?? null,
                email: person.email ?? null,
                fullAddress: person.fullAddress ?? null,
                nationality: person.nationality ?? null,
                familyStatus: (person.familyStatus as any) ?? null,
                matrimonialRegime: (person.matrimonialRegime as any) ?? null,
                birthPlace: person.birthPlace ?? null,
                birthDate: person.birthDate ? new Date(person.birthDate) : null,
                isPrimary: person.isPrimary ?? index === 0,
                createdById: user.id,
              })),
            });
          }
        } else {
          // Pour PERSONNE_MORALE: créer l'Entreprise
          try {
            await prisma.entreprise.create({
              data: {
                clientId: client.id,
                legalName: validated.legalName!,
                registration: validated.registration ?? "",
                name: validated.legalName!, // Utiliser legalName comme name par défaut
                email: validated.email!,
                phone: validated.phone ?? null,
                fullAddress: validated.fullAddress ?? null,
                createdById: user.id,
              },
            });
          } catch (entrepriseError: any) {
            // Gérer les erreurs Prisma (contrainte unique, etc.)
            if (entrepriseError.code === "P2002") {
              if (entrepriseError.meta?.target?.includes("email")) {
                throw new Error(`Une entreprise avec l'email ${validated.email} existe déjà.`);
              }
              throw new Error("Une erreur de contrainte unique s'est produite.");
            }
            throw entrepriseError;
          }
        }

        // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le client)
        await createNotificationForAllUsers(
          NotificationType.CLIENT_CREATED,
          "CLIENT",
          client.id,
          user.id,
          { createdByForm: false, profileType: ProfilType.PROPRIETAIRE }
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

  // Mettre à jour le type du client si nécessaire
  await prisma.client.update({
    where: { id: validated.clientId },
    data: {
      type: validated.type,
      updatedAt: new Date(),
    },
  });

  // Créer ou mettre à jour la Person ou l'Entreprise selon le type
  if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
    // Récupérer toutes les personnes existantes
    const existingPersons = await prisma.person.findMany({
      where: {
        clientId: validated.clientId,
      },
    });

    const existingPrimaryPerson = existingPersons.find(p => p.isPrimary);
    const existingNonPrimaryPersons = existingPersons.filter(p => !p.isPrimary);

    // Récupérer toutes les personnes du payload
    const allPersons = (validated as any).persons || [];
    console.log("🔍 submitOwnerForm - Toutes les personnes reçues:", allPersons.length);
    console.log("🔍 submitOwnerForm - Personnes existantes en base:", existingPersons.length);

    if (allPersons.length === 0) {
      throw new Error("Au moins une personne est requise");
    }

    // Traiter toutes les personnes du payload
    const processedPersonIds: string[] = [];

    // La première personne est la personne primaire
    const primaryPersonData = allPersons[0];
    
    const primaryPersonDataToUpdate: any = {};
    if (primaryPersonData.firstName) primaryPersonDataToUpdate.firstName = primaryPersonData.firstName;
    if (primaryPersonData.lastName) primaryPersonDataToUpdate.lastName = primaryPersonData.lastName;
    if (primaryPersonData.profession) primaryPersonDataToUpdate.profession = primaryPersonData.profession;
    if (primaryPersonData.phone) primaryPersonDataToUpdate.phone = primaryPersonData.phone;
    if (primaryPersonData.email) primaryPersonDataToUpdate.email = primaryPersonData.email.trim().toLowerCase();
    if (primaryPersonData.fullAddress) primaryPersonDataToUpdate.fullAddress = primaryPersonData.fullAddress;
    if (primaryPersonData.nationality) primaryPersonDataToUpdate.nationality = primaryPersonData.nationality;
    if (primaryPersonData.familyStatus) primaryPersonDataToUpdate.familyStatus = primaryPersonData.familyStatus;
    if (primaryPersonData.matrimonialRegime) primaryPersonDataToUpdate.matrimonialRegime = primaryPersonData.matrimonialRegime;
    if (primaryPersonData.birthPlace) primaryPersonDataToUpdate.birthPlace = primaryPersonData.birthPlace;
    if (primaryPersonData.birthDate) primaryPersonDataToUpdate.birthDate = primaryPersonData.birthDate;

    // Mettre à jour ou créer la personne primaire
    if (existingPrimaryPerson) {
      await prisma.person.update({
        where: { id: existingPrimaryPerson.id },
        data: primaryPersonDataToUpdate,
      });
      processedPersonIds.push(existingPrimaryPerson.id);
    } else {
      const newPrimaryPerson = await prisma.person.create({
        data: {
          ...primaryPersonDataToUpdate,
          clientId: validated.clientId,
          isPrimary: true,
        },
      });
      processedPersonIds.push(newPrimaryPerson.id);
    }

    // Traiter les personnes supplémentaires (toutes sauf la première)
    const additionalPersonsFromPayload = allPersons.slice(1);
    
    for (const personData of additionalPersonsFromPayload) {
      // Vérifier si une personne avec cet email existe déjà
      if (personData.email) {
        const emailNormalized = personData.email.trim().toLowerCase();
        const existingPersonByEmail = await prisma.person.findFirst({
          where: { 
            email: emailNormalized,
            clientId: validated.clientId,
            isPrimary: false,
          },
        });

        if (existingPersonByEmail) {
          // Mettre à jour la personne existante
          await prisma.person.update({
            where: { id: existingPersonByEmail.id },
            data: {
              firstName: personData.firstName || null,
              lastName: personData.lastName || null,
              profession: personData.profession || null,
              phone: personData.phone || null,
              email: emailNormalized,
              fullAddress: personData.fullAddress || null,
              nationality: personData.nationality || null,
              familyStatus: personData.familyStatus || null,
              matrimonialRegime: personData.matrimonialRegime || null,
              birthPlace: personData.birthPlace || null,
              birthDate: personData.birthDate ? new Date(personData.birthDate) : null,
            },
          });
          processedPersonIds.push(existingPersonByEmail.id);
        } else {
          // Vérifier si l'email existe déjà pour un autre client
          const existingPersonWithEmail = await prisma.person.findUnique({
            where: { email: emailNormalized },
          });
          
          if (existingPersonWithEmail && existingPersonWithEmail.clientId !== validated.clientId) {
            throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
          }
          
          // Créer une nouvelle personne
          const newPerson = await prisma.person.create({
            data: {
              clientId: validated.clientId,
              firstName: personData.firstName || null,
              lastName: personData.lastName || null,
              profession: personData.profession || null,
              phone: personData.phone || null,
              email: emailNormalized,
              fullAddress: personData.fullAddress || null,
              nationality: personData.nationality || null,
              familyStatus: personData.familyStatus || null,
              matrimonialRegime: personData.matrimonialRegime || null,
              birthPlace: personData.birthPlace || null,
              birthDate: personData.birthDate ? new Date(personData.birthDate) : null,
              isPrimary: false,
            },
          });
          processedPersonIds.push(newPerson.id);
        }
      } else {
        // Si pas d'email, créer quand même si on a au moins un prénom ou nom
        if (personData.firstName || personData.lastName) {
          const newPerson = await prisma.person.create({
            data: {
              clientId: validated.clientId,
              firstName: personData.firstName || null,
              lastName: personData.lastName || null,
              profession: personData.profession || null,
              phone: personData.phone || null,
              fullAddress: personData.fullAddress || null,
              nationality: personData.nationality || null,
              familyStatus: personData.familyStatus || null,
              matrimonialRegime: personData.matrimonialRegime || null,
              birthPlace: personData.birthPlace || null,
              birthDate: personData.birthDate ? new Date(personData.birthDate) : null,
              isPrimary: false,
            },
          });
          processedPersonIds.push(newPerson.id);
        }
      }
    }

    // Supprimer uniquement les personnes qui ne sont pas dans la liste traitée
    const personsToDelete = existingNonPrimaryPersons.filter(
      (p) => !processedPersonIds.includes(p.id)
    );

    console.log("🔍 Personnes à supprimer potentielles:", personsToDelete.length);
    console.log("🔍 Personnes traitées (IDs):", processedPersonIds);
    console.log("🔍 Personnes supplémentaires dans le payload:", additionalPersonsFromPayload.length);

    // Ne supprimer que les personnes qui ne sont pas dans la liste traitée
    // Comparer avec toutes les personnes du payload (sauf la première qui est primaire)
    for (const personToDelete of personsToDelete) {
      // Vérifier si la personne correspond à une personne du payload (par email ou par prénom/nom)
      const matchesPayload = additionalPersonsFromPayload.some((p: any) => {
        // Comparaison par email si les deux ont un email
        if (personToDelete.email && p.email) {
          return personToDelete.email.trim().toLowerCase() === p.email.trim().toLowerCase();
        }
        // Comparaison par prénom/nom si pas d'email dans le payload mais la personne en base a un email
        // On ne supprime pas dans ce cas pour éviter les suppressions accidentelles
        if (personToDelete.email && !p.email) {
          return false; // Ne pas supprimer si la personne en base a un email mais pas dans le payload
        }
        // Comparaison par prénom/nom si aucun n'a d'email
        if (!personToDelete.email && !p.email) {
          const personNameMatch = 
            (personToDelete.firstName || "").trim().toLowerCase() === (p.firstName || "").trim().toLowerCase() &&
            (personToDelete.lastName || "").trim().toLowerCase() === (p.lastName || "").trim().toLowerCase();
          return personNameMatch;
        }
        return false;
      });
      
      // Ne supprimer que si la personne ne correspond à aucune personne du payload
      if (!matchesPayload) {
        console.log("🗑️ Suppression de la personne:", personToDelete.id, personToDelete.email || `${personToDelete.firstName} ${personToDelete.lastName}`);
        await prisma.person.delete({
          where: { id: personToDelete.id },
        });
      }
    }
  } else {
    // Pour PERSONNE_MORALE: créer ou mettre à jour l'Entreprise
    const existingEntreprise = await prisma.entreprise.findUnique({
      where: { clientId: validated.clientId },
    });

    const entrepriseData: any = {};
    if (validated.entreprise?.legalName) entrepriseData.legalName = validated.entreprise.legalName;
    if (validated.entreprise?.registration) entrepriseData.registration = validated.entreprise.registration;
    if (validated.entreprise?.phone) entrepriseData.phone = validated.entreprise.phone;
    if (validated.entreprise?.email) entrepriseData.email = validated.entreprise.email.trim().toLowerCase();
    if (validated.entreprise?.fullAddress) entrepriseData.fullAddress = validated.entreprise.fullAddress;
    if (validated.entreprise?.name) entrepriseData.name = validated.entreprise.name; // Utiliser legalName comme name

    if (existingEntreprise) {
      // Mettre à jour l'entreprise existante
      await prisma.entreprise.update({
        where: { id: existingEntreprise.id },
        data: entrepriseData,
      });
    } else {
      // Créer une nouvelle entreprise
      await prisma.entreprise.create({
        data: {
          ...entrepriseData,
          clientId: validated.clientId,
          legalName: validated.legalName || "",
          registration: validated.registration || "",
          name: validated.legalName || "",
          email: validated.email?.trim().toLowerCase() || "",
        },
      });
    }
  }

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
    const tenantEmail = validated.tenantEmail.trim().toLowerCase();
    
    // D'abord, vérifier si un locataire est lié via le rawPayload (cas de conversion lead)
    if (rawPayload?.relatedTenantId) {
      // Si un locataire est lié via le rawPayload, l'utiliser
      tenant = await prisma.client.findUnique({
        where: { id: rawPayload.relatedTenantId },
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
        },
      });
      
      if (tenant) {
        // Mettre à jour l'email de la personne primaire si nécessaire
        const primaryPerson = tenant.persons?.find(p => p.isPrimary) || tenant.persons?.[0];
        if (primaryPerson && primaryPerson.email !== tenantEmail) {
          await prisma.person.update({
            where: { id: primaryPerson.id },
            data: { email: tenantEmail },
          });
        } else if (!primaryPerson) {
          // Créer une personne primaire si elle n'existe pas
          await prisma.person.create({
            data: {
              clientId: tenant.id,
              email: tenantEmail,
              isPrimary: true,
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
        // Récupérer le tenant avec ses persons
        tenant = await prisma.client.findUnique({
          where: { id: existingTenant.id },
          include: {
            persons: {
              orderBy: { isPrimary: 'desc' },
            },
          },
        });
        
        if (tenant) {
          // Mettre à jour l'email de la personne primaire si nécessaire
          const primaryPerson = tenant.persons?.find((p: any) => p.isPrimary) || tenant.persons?.[0];
        if (primaryPerson && primaryPerson.email !== tenantEmail) {
          await prisma.person.update({
            where: { id: primaryPerson.id },
            data: { email: tenantEmail },
          });
        } else if (!primaryPerson) {
          await prisma.person.create({
            data: {
              clientId: tenant.id,
              email: tenantEmail,
              isPrimary: true,
            },
          });
        }
        }
      } else {
        // Vérifier d'abord si une personne ou entreprise avec cet email existe déjà
        const [existingPerson, existingEntreprise] = await Promise.all([
          prisma.person.findUnique({ where: { email: tenantEmail } }),
          prisma.entreprise.findUnique({ where: { email: tenantEmail } }),
        ]);

        if (existingPerson || existingEntreprise) {
          throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
        }

        // Si le locataire n'existe pas, le créer avec une Person
        tenant = await prisma.client.create({
          data: {
            type: ClientType.PERSONNE_PHYSIQUE,
            profilType: ProfilType.LOCATAIRE,
            completionStatus: CompletionStatus.NOT_STARTED,
            persons: {
              create: {
                email: tenantEmail,
                isPrimary: true,
              },
            },
          },
        });
      }
    } else if (!tenant) {
      // Vérifier d'abord si une personne ou entreprise avec cet email existe déjà
      const [existingPerson, existingEntreprise] = await Promise.all([
        prisma.person.findUnique({ where: { email: tenantEmail } }),
        prisma.entreprise.findUnique({ where: { email: tenantEmail } }),
      ]);

      if (existingPerson || existingEntreprise) {
        throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
      }
      
      // Créer le locataire avec une Person
      tenant = await prisma.client.create({
        data: {
          type: ClientType.PERSONNE_PHYSIQUE,
          profilType: ProfilType.LOCATAIRE,
          completionStatus: CompletionStatus.NOT_STARTED,
          persons: {
            create: {
              email: tenantEmail,
              isPrimary: true,
            },
          },
        },
      });
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

      // Envoyer l'email de confirmation au propriétaire après soumission
      let ownerEmail: string | null = null;
      let ownerFirstName: string | null = null;
      let ownerLastName: string | null = null;

      if (validated.type === ClientType.PERSONNE_PHYSIQUE) {
        // Pour personne physique : récupérer l'email de la personne primaire
        const primaryPerson = await prisma.person.findFirst({
          where: {
            clientId: validated.clientId,
            isPrimary: true,
          },
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        });
        
        if (primaryPerson?.email) {
          ownerEmail = primaryPerson.email;
          ownerFirstName = primaryPerson.firstName || null;
          ownerLastName = primaryPerson.lastName || null;
        }
      } else if (validated.type === ClientType.PERSONNE_MORALE) {
        // Pour personne morale : récupérer l'email de l'entreprise
        const entreprise = await prisma.entreprise.findUnique({
          where: { clientId: validated.clientId },
          select: {
            email: true,
            legalName: true,
          },
        });
        
        if (entreprise?.email) {
          ownerEmail = entreprise.email;
          ownerFirstName = entreprise.legalName || null;
          ownerLastName = null;
        }
      }

      // Envoyer l'email de confirmation au propriétaire si l'email existe
      if (ownerEmail && ownerIntakeLink) {
        const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
        const ownerFormUrl = `${baseUrl}/intakes/${ownerIntakeLink.token}`;
        
        try {
          await triggerOwnerFormEmail({
            to: ownerEmail,
            firstName: ownerFirstName || "",
            lastName: ownerLastName || "",
            formUrl: ownerFormUrl,
          });
          console.log(`✅ Email de confirmation envoyé au propriétaire ${ownerEmail}`);
        } catch (emailError) {
          console.error("❌ Erreur lors de l'envoi d'email au propriétaire:", emailError);
          // Ne pas bloquer la soumission même si l'email échoue
        }
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
    include: { 
      persons: {
        orderBy: { isPrimary: 'desc' },
      },
      entreprise: true,
      bails: true, 
      ownedProperties: true 
    },
  });

  if (!existing) {
    throw new Error("Client introuvable");
  }

  // Séparer les données du Client des données de Person/Entreprise
  const {
    type,
    profilType,
    persons,
    legalName,
    registration,
    name,
    phone,
    email,
    fullAddress,
    ...clientOnlyData
  } = updateData;

  // Mettre à jour le Client (seulement les champs qui lui appartiennent)
  // Note: profilType n'est pas modifiable dans l'édition
  const client = await prisma.client.update({
    where: { id },
    data: {
      ...(type !== undefined && { type }),
      // profilType n'est pas modifiable, on ne le met pas à jour
      ...clientOnlyData,
      updatedById: user.id,
    },
    include: {
      persons: {
        orderBy: { isPrimary: 'desc' },
      },
      entreprise: true,
      bails: true,
      ownedProperties: true,
    },
  });

  // Mettre à jour Person ou Entreprise selon le type
  // Note: Si le type change de PERSONNE_PHYSIQUE à PERSONNE_MORALE, on ne met pas à jour les personnes
  const finalType = type !== undefined ? type : existing.type;
  
  if (finalType === ClientType.PERSONNE_PHYSIQUE && persons && persons.length > 0) {
    // Gérer plusieurs personnes
    const existingPersonIds = existing.persons?.map(p => p.id) || [];
    const submittedPersonIds = persons.filter(p => p.id).map(p => p.id!);
    
    // Supprimer les personnes qui ne sont plus dans le tableau
    const personsToDelete = existingPersonIds.filter(id => !submittedPersonIds.includes(id));
    if (personsToDelete.length > 0) {
      await prisma.person.deleteMany({
        where: {
          id: { in: personsToDelete },
          clientId: id,
        },
      });
    }

    // Mettre à jour ou créer les personnes
    for (const personData of persons) {
      const personUpdateData: any = {
        ...(personData.firstName !== undefined && { firstName: personData.firstName }),
        ...(personData.lastName !== undefined && { lastName: personData.lastName }),
        ...(personData.profession !== undefined && { profession: personData.profession }),
        ...(personData.phone !== undefined && { phone: personData.phone }),
        ...(personData.email !== undefined && { email: personData.email }),
        ...(personData.fullAddress !== undefined && { fullAddress: personData.fullAddress }),
        ...(personData.nationality !== undefined && { nationality: personData.nationality }),
        ...(personData.familyStatus !== undefined && { familyStatus: personData.familyStatus }),
        ...(personData.matrimonialRegime !== undefined && { matrimonialRegime: personData.matrimonialRegime }),
        ...(personData.birthPlace !== undefined && { birthPlace: personData.birthPlace }),
        ...(personData.birthDate !== undefined && { birthDate: personData.birthDate ? new Date(personData.birthDate) : null }),
        ...(personData.isPrimary !== undefined && { isPrimary: personData.isPrimary }),
        updatedById: user.id,
      };

      if (personData.id) {
        // Mettre à jour la personne existante
        await prisma.person.update({
          where: { id: personData.id },
          data: personUpdateData,
        });
      } else {
        // Créer une nouvelle personne
        await prisma.person.create({
          data: {
            clientId: id,
            ...personUpdateData,
            isPrimary: personData.isPrimary || false,
            createdById: user.id,
          },
        });
      }
    }

    // S'assurer qu'une seule personne est primaire
    const primaryPersons = persons.filter(p => p.isPrimary);
    if (primaryPersons.length > 1) {
      // Si plusieurs personnes sont marquées comme primaires, ne garder que la première
      const firstPrimary = primaryPersons[0];
      for (let i = 1; i < primaryPersons.length; i++) {
        if (primaryPersons[i].id) {
          await prisma.person.update({
            where: { id: primaryPersons[i].id },
            data: { isPrimary: false },
          });
        }
      }
    } else if (primaryPersons.length === 0 && persons.length > 0) {
      // Si aucune personne n'est primaire, marquer la première comme primaire
      const firstPerson = persons[0];
      if (firstPerson.id) {
        await prisma.person.update({
          where: { id: firstPerson.id },
          data: { isPrimary: true },
        });
      }
    }
  } else if (finalType === ClientType.PERSONNE_MORALE) {
    // PERSONNE_MORALE - Mettre à jour Entreprise
    if (existing.entreprise) {
      await prisma.entreprise.update({
        where: { id: existing.entreprise.id },
        data: {
          ...(legalName !== undefined && { legalName }),
          ...(registration !== undefined && { registration }),
          ...(name !== undefined && { name: name || legalName || existing.entreprise.name }),
          ...(email !== undefined && { email }),
          ...(phone !== undefined && { phone }),
          ...(fullAddress !== undefined && { fullAddress }),
          updatedById: user.id,
        },
      });
    } else {
      // Créer l'entreprise si elle n'existe pas
      await prisma.entreprise.create({
        data: {
          clientId: id,
          legalName: legalName || "",
          registration: registration || "",
          name: name || legalName || "",
          email: email || "",
          phone: phone || null,
          fullAddress: fullAddress || null,
          createdById: user.id,
          updatedById: user.id,
        },
      });
    }
  }

  // Mettre à jour le statut de complétion
  await updateClientCompletionStatus({ id, completionStatus: client.completionStatus });

  // Pas de notification pour les modifications via l'interface

  revalidatePath("/interface/clients");
  revalidatePath(`/interface/clients/${id}`);
  
  // Récupérer le client mis à jour avec toutes ses relations
  return await getClient(id);
}

// Helper pour obtenir le nom d'un client
function getClientName(client: { 
  type: ClientType; 
  persons?: Array<{ firstName?: string | null; lastName?: string | null; email?: string | null; isPrimary: boolean }>; 
  entreprise?: { legalName?: string | null; name?: string | null; email?: string | null } | null;
}): string {
  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.find(p => p.isPrimary) || client.persons?.[0];
    if (primaryPerson) {
      const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
      return name || primaryPerson.email || "Client";
    }
    return "Client";
  }
  // PERSONNE_MORALE
  if (client.entreprise) {
    return client.entreprise.legalName || client.entreprise.name || client.entreprise.email || "Client";
  }
  return "Client";
}

// Obtenir le nom d'un client par son ID (pour le dialog de confirmation)
export async function getClientNameById(id: string): Promise<string> {
  await requireAuth();
  const client = await prisma.client.findUnique({
    where: { id },
    select: {
      type: true,
      persons: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          isPrimary: true,
        },
        orderBy: { isPrimary: 'desc' },
      },
      entreprise: {
        select: {
          legalName: true,
          name: true,
          email: true,
        },
      },
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
      persons: {
        orderBy: { isPrimary: 'desc' },
        include: {
          documents: {
            select: {
              id: true,
              fileKey: true,
            },
          },
        },
      },
      entreprise: {
        include: {
          documents: {
            select: {
              id: true,
              fileKey: true,
            },
          },
        },
      },
      bails: {
        include: {
          parties: {
            select: {
              id: true,
              profilType: true,
              type: true,
              persons: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  isPrimary: true,
                },
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: {
                select: {
                  legalName: true,
                  name: true,
                  email: true,
                },
              },
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
                  persons: {
                    select: {
                      firstName: true,
                      lastName: true,
                      email: true,
                      isPrimary: true,
                    },
                    orderBy: { isPrimary: 'desc' },
                  },
                  entreprise: {
                    select: {
                      legalName: true,
                      name: true,
                      email: true,
                    },
                  },
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

    // Collecter tous les documents depuis persons et entreprise
    const allDocumentFileKeys: string[] = [];
    client.persons?.forEach((person: any) => {
      if (person.documents) {
        allDocumentFileKeys.push(...person.documents.map((doc: any) => doc.fileKey));
      }
    });
    if (client.entreprise?.documents) {
      allDocumentFileKeys.push(...client.entreprise.documents.map((doc: any) => doc.fileKey));
    }

    // Supprimer les documents et leurs fichiers blob
    if (allDocumentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(allDocumentFileKeys);
    }

    // Les documents seront supprimés automatiquement via cascade quand Person/Entreprise seront supprimés

    // Supprimer le client
    await prisma.client.delete({ where: { id } });

  } else if (client.profilType === ProfilType.LOCATAIRE) {
    // LOCATAIRE : Supprimer le client + ses documents (du blob aussi) + sa connexion avec le bail + les intake en relation
    
    // Collecter tous les documents depuis persons et entreprise
    const allDocumentFileKeys: string[] = [];
    client.persons?.forEach((person: any) => {
      if (person.documents) {
        allDocumentFileKeys.push(...person.documents.map((doc: any) => doc.fileKey));
      }
    });
    if (client.entreprise?.documents) {
      allDocumentFileKeys.push(...client.entreprise.documents.map((doc: any) => doc.fileKey));
    }

    // Supprimer les documents et leurs fichiers blob
    if (allDocumentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(allDocumentFileKeys);
    }

    // Les documents seront supprimés automatiquement via cascade quand Person/Entreprise seront supprimés

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
            const tenantName = getClientName(tenant);
            
            blockingEntities.push({
              id: tenant.id,
              name: tenantName || "Locataire",
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
    
    // Documents du client (depuis persons et entreprise)
    client.persons?.forEach(person => {
      if (person.documents) {
        allDocumentFileKeys.push(...person.documents.map(doc => doc.fileKey));
      }
    });
    if (client.entreprise?.documents) {
      allDocumentFileKeys.push(...client.entreprise.documents.map(doc => doc.fileKey));
    }
    
    // Documents des biens
    for (const property of client.ownedProperties) {
      allDocumentFileKeys.push(...property.documents.map(doc => doc.fileKey));
    }

    // Supprimer tous les fichiers blob
    if (allDocumentFileKeys.length > 0) {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles(allDocumentFileKeys);
    }

    // Supprimer tous les documents (biens)
    // Les documents du client seront supprimés automatiquement via cascade quand Person/Entreprise seront supprimés
    await prisma.document.deleteMany({
      where: {
        propertyId: { in: client.ownedProperties.map(p => p.id) },
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
  
  // Obtenir l'email du client pour la notification
  const clientEmail = client.type === ClientType.PERSONNE_PHYSIQUE
    ? client.persons?.find(p => p.isPrimary)?.email || client.persons?.[0]?.email || null
    : client.entreprise?.email || null;

  // Créer une notification pour tous les utilisateurs (sauf celui qui a supprimé le client)
  await createNotificationForAllUsers(
    NotificationType.CLIENT_DELETED,
    "CLIENT",
    id,
    user.id,
    { clientEmail, clientName }
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
      bails: {
        include: {
          property: {
            include: {
              owner: {
                select: {
                  id: true,
                },
              },
            },
          },
          parties: {
            select: {
              id: true,
              profilType: true,
              persons: {
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
        orderBy: { createdAt: "desc" },
      },
      ownedProperties: {
        include: {
          bails: {
            include: {
              parties: {
                select: {
                  id: true,
                  profilType: true,
                  persons: {
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
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
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
      {
        persons: {
          some: {
            OR: [
              { email: { contains: params.search, mode: "insensitive" } },
              { phone: { contains: params.search, mode: "insensitive" } },
              { firstName: { contains: params.search, mode: "insensitive" } },
              { lastName: { contains: params.search, mode: "insensitive" } },
            ],
          },
        },
      },
      {
        entreprise: {
          OR: [
            { email: { contains: params.search, mode: "insensitive" } },
            { phone: { contains: params.search, mode: "insensitive" } },
            { legalName: { contains: params.search, mode: "insensitive" } },
            { name: { contains: params.search, mode: "insensitive" } },
            { registration: { contains: params.search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const page = params.page || 1;
  const pageSize = params.pageSize || 10;

  const [data, total] = await Promise.all([
    prisma.client.findMany({
      where,
      include: {
        persons: {
          orderBy: { isPrimary: 'desc' },
        },
        entreprise: true,
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
      persons: {
        orderBy: { isPrimary: 'desc' },
      },
      entreprise: true,
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

  // Récupérer le client avec persons et entreprise
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      persons: {
        orderBy: { isPrimary: 'desc' },
      },
      entreprise: true,
    },
  });

  if (!client) {
    throw new Error("Client introuvable");
  }

  // Obtenir l'email depuis Person ou Entreprise
  const clientEmail = client.type === ClientType.PERSONNE_PHYSIQUE
    ? client.persons?.find(p => p.isPrimary)?.email || client.persons?.[0]?.email
    : client.entreprise?.email;

  if (!clientEmail) {
    throw new Error("Le client n'a pas d'email");
  }

  // Obtenir le prénom et nom pour l'email
  const primaryPerson = client.type === ClientType.PERSONNE_PHYSIQUE
    ? client.persons?.find(p => p.isPrimary) || client.persons?.[0]
    : null;
  
  const firstName = primaryPerson?.firstName || "";
  const lastName = primaryPerson?.lastName || "";

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
        to: clientEmail,
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
        to: clientEmail,
        firstName: firstName,
        lastName: lastName,
        formUrl,
      });
    } else {
      await triggerTenantFormEmail({
        to: clientEmail,
        firstName: firstName,
        lastName: lastName,
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

