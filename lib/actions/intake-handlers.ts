"use server";

import { prisma } from "@/lib/prisma";
import { ClientType, ProfilType, CompletionStatus, BailType, BailFamille, BailStatus, PropertyStatus } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { handleDocumentsInTransaction } from "./intakes";
import { triggerTenantFormEmail } from "@/lib/inngest/helpers";
import { updatePropertyZoneStatus } from "@/lib/services/zone-tendue";
import { randomBytes } from "crypto";

// ============================================================================
// HANDLERS POUR TENANT INTAKE
// ============================================================================

// Handler pour le step "clientType" du formulaire tenant
export async function handleTenantClientTypeStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  // Vérifier que le type est présent
  if (!payload.type) {
    throw new Error("Le type de client est requis");
  }

  await prisma.$transaction(async (tx) => {
    // Mettre à jour uniquement le type du client
    await tx.client.update({
      where: { id: clientId },
      data: { type: payload.type },
    });
  });

  return { success: true };
}

// Handler pour le step "clientInfo" du formulaire tenant
export async function handleTenantClientInfoStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  const effectivePayload = payload;

  // Vérifications d'email avant la transaction
  await validateTenantEmails(intakeLink, effectivePayload, clientId);

  await prisma.$transaction(async (tx) => {
    const clientType = effectivePayload.type as ClientType;

    // Mettre à jour le type du client si nécessaire
    if (effectivePayload.type) {
      await tx.client.update({
        where: { id: clientId },
        data: { type: effectivePayload.type },
      });
    }

    // Gérer Person/Entreprise selon le type
    if (clientType === ClientType.PERSONNE_PHYSIQUE) {
      await handleTenantPersons(tx, intakeLink, effectivePayload, clientId);
    } else if (clientType === ClientType.PERSONNE_MORALE) {
      await handleTenantEntreprise(tx, intakeLink, effectivePayload, clientId);
    }
  });

  return { success: true };
}

// Handler pour le step "documents" du formulaire tenant
export async function handleTenantDocumentsStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  await prisma.$transaction(async (tx) => {
    await handleDocumentsInTransaction(tx, payload, clientId, intakeLink);
  });

  return { success: true };
}

// Handler legacy pour compatibilité (sans stepId)
export async function handleTenantLegacySave(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  // Utiliser la logique complète de l'ancienne fonction
  await validateTenantEmails(intakeLink, payload, clientId);

  await prisma.$transaction(async (tx) => {
    const clientType = payload.type as ClientType;

    if (payload.type) {
      await tx.client.update({
        where: { id: clientId },
        data: { type: payload.type },
      });
    }

    if (clientType === ClientType.PERSONNE_PHYSIQUE) {
      await handleTenantPersons(tx, intakeLink, payload, clientId);
    } else if (clientType === ClientType.PERSONNE_MORALE) {
      await handleTenantEntreprise(tx, intakeLink, payload, clientId);
    }

    await handleDocumentsInTransaction(tx, payload, clientId, intakeLink);
  });

  return { success: true };
}

// ============================================================================
// HANDLERS POUR OWNER INTAKE
// ============================================================================

// Handler pour le step "clientType" du formulaire owner
export async function handleOwnerClientTypeStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  if (!payload.type) {
    throw new Error("Le type de client est requis");
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { type: payload.type },
    });
  });

  return { success: true };
}

// Handler pour le step "clientInfo" du formulaire owner
export async function handleOwnerClientInfoStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  const effectivePayload = payload;

  // Vérifications d'email avant la transaction
  await validateOwnerEmails(intakeLink, effectivePayload, clientId);

  await prisma.$transaction(async (tx) => {
    const clientType = effectivePayload.type as ClientType;

    if (effectivePayload.type) {
      await tx.client.update({
        where: { id: clientId },
        data: { type: effectivePayload.type },
      });
    }

    if (clientType === ClientType.PERSONNE_PHYSIQUE) {
      await handleOwnerPersons(tx, intakeLink, effectivePayload, clientId);
    } else if (clientType === ClientType.PERSONNE_MORALE) {
      await handleOwnerEntreprise(tx, intakeLink, effectivePayload, clientId);
    }
  });

  return { success: true };
}

// Handler pour le step "property" du formulaire owner
export async function handleOwnerPropertyStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  // Variable pour stocker le propertyId après la transaction (nécessaire pour updatePropertyZoneStatus)
  let finalPropertyId: string | null = null;

  await prisma.$transaction(async (tx) => {
    let propertyId = intakeLink.propertyId;

    if (propertyId && intakeLink.property) {
      const updateData: any = {};
      if (payload.propertyLabel) updateData.label = payload.propertyLabel;
      if (payload.propertyFullAddress) updateData.fullAddress = payload.propertyFullAddress;
      if (payload.propertySurfaceM2) updateData.surfaceM2 = new Decimal(payload.propertySurfaceM2);
      if (payload.propertyType) updateData.type = payload.propertyType;
      if (payload.propertyLegalStatus) updateData.legalStatus = payload.propertyLegalStatus;
      if (payload.propertyStatus) updateData.status = payload.propertyStatus;
      // Données géographiques enrichies - normaliser les chaînes vides en null
      if (payload.propertyHousenumber !== undefined) {
        updateData.housenumber = payload.propertyHousenumber && payload.propertyHousenumber.trim() ? payload.propertyHousenumber.trim() : null;
      }
      if (payload.propertyStreet !== undefined) {
        updateData.street = payload.propertyStreet && payload.propertyStreet.trim() ? payload.propertyStreet.trim() : null;
      }
      if (payload.propertyCity !== undefined) {
        updateData.city = payload.propertyCity && payload.propertyCity.trim() ? payload.propertyCity.trim() : null;
      }
      if (payload.propertyPostalCode !== undefined) {
        updateData.postalCode = payload.propertyPostalCode && payload.propertyPostalCode.trim() ? payload.propertyPostalCode.trim() : null;
      }
      if (payload.propertyDistrict !== undefined) {
        updateData.district = payload.propertyDistrict && payload.propertyDistrict.trim() ? payload.propertyDistrict.trim() : null;
      }
      if (payload.propertyInseeCode !== undefined) {
        updateData.inseeCode = payload.propertyInseeCode && payload.propertyInseeCode.trim() ? payload.propertyInseeCode.trim() : null;
      }
      if (payload.propertyDepartment !== undefined) {
        updateData.department = payload.propertyDepartment && payload.propertyDepartment.trim() ? payload.propertyDepartment.trim() : null;
      }
      if (payload.propertyRegion !== undefined) {
        updateData.region = payload.propertyRegion && payload.propertyRegion.trim() ? payload.propertyRegion.trim() : null;
      }
      if (payload.propertyLatitude !== undefined) updateData.latitude = payload.propertyLatitude ? new Decimal(payload.propertyLatitude) : null;
      if (payload.propertyLongitude !== undefined) updateData.longitude = payload.propertyLongitude ? new Decimal(payload.propertyLongitude) : null;

      await tx.property.update({
        where: { id: propertyId },
        data: updateData,
      });
    } else {
      const newProperty = await tx.property.create({
        data: {
          label: payload.propertyLabel || "",
          fullAddress: payload.propertyFullAddress || "",
          surfaceM2: payload.propertySurfaceM2 ? new Decimal(payload.propertySurfaceM2) : null,
          type: payload.propertyType || null,
          legalStatus: payload.propertyLegalStatus || null,
          status: payload.propertyStatus || PropertyStatus.NON_LOUER,
          ownerId: clientId,
          // Données géographiques enrichies - normaliser les chaînes vides en null
          housenumber: payload.propertyHousenumber && payload.propertyHousenumber.trim() ? payload.propertyHousenumber.trim() : null,
          street: payload.propertyStreet && payload.propertyStreet.trim() ? payload.propertyStreet.trim() : null,
          city: payload.propertyCity && payload.propertyCity.trim() ? payload.propertyCity.trim() : null,
          postalCode: payload.propertyPostalCode && payload.propertyPostalCode.trim() ? payload.propertyPostalCode.trim() : null,
          district: payload.propertyDistrict && payload.propertyDistrict.trim() ? payload.propertyDistrict.trim() : null,
          inseeCode: payload.propertyInseeCode && payload.propertyInseeCode.trim() ? payload.propertyInseeCode.trim() : null,
          department: payload.propertyDepartment && payload.propertyDepartment.trim() ? payload.propertyDepartment.trim() : null,
          region: payload.propertyRegion && payload.propertyRegion.trim() ? payload.propertyRegion.trim() : null,
          latitude: payload.propertyLatitude ? new Decimal(payload.propertyLatitude) : null,
          longitude: payload.propertyLongitude ? new Decimal(payload.propertyLongitude) : null,
        },
      });
      propertyId = newProperty.id;

      await tx.intakeLink.update({
        where: { id: intakeLink.id },
        data: { propertyId },
      });
    }

    finalPropertyId = propertyId;
  });

  // Vérifier et mettre à jour les indicateurs de zone tendue APRÈS la transaction
  // (updatePropertyZoneStatus utilise prisma directement, pas tx, donc le record doit être committé)
  if (finalPropertyId && payload.propertyInseeCode && payload.propertyType) {
    await updatePropertyZoneStatus(finalPropertyId, payload.propertyInseeCode, payload.propertyType);
  }

  return { success: true };
}

// Handler pour le step "bail" du formulaire owner
export async function handleOwnerBailStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  await prisma.$transaction(async (tx) => {
    let bailId = intakeLink.bailId;
    const bailParties = [{ id: clientId }];

    // Mettre à jour la propriété avec les données de mobilier
    const propertyId = intakeLink.propertyId;
    if (propertyId) {
      const propertyUpdateData: any = {};
      
      // Champs de mobilier
      if (payload.hasLiterie !== undefined) propertyUpdateData.hasLiterie = payload.hasLiterie;
      if (payload.hasRideaux !== undefined) propertyUpdateData.hasRideaux = payload.hasRideaux;
      if (payload.hasPlaquesCuisson !== undefined) propertyUpdateData.hasPlaquesCuisson = payload.hasPlaquesCuisson;
      if (payload.hasFour !== undefined) propertyUpdateData.hasFour = payload.hasFour;
      if (payload.hasRefrigerateur !== undefined) propertyUpdateData.hasRefrigerateur = payload.hasRefrigerateur;
      if (payload.hasCongelateur !== undefined) propertyUpdateData.hasCongelateur = payload.hasCongelateur;
      if (payload.hasVaisselle !== undefined) propertyUpdateData.hasVaisselle = payload.hasVaisselle;
      if (payload.hasUstensilesCuisine !== undefined) propertyUpdateData.hasUstensilesCuisine = payload.hasUstensilesCuisine;
      if (payload.hasTable !== undefined) propertyUpdateData.hasTable = payload.hasTable;
      if (payload.hasSieges !== undefined) propertyUpdateData.hasSieges = payload.hasSieges;
      if (payload.hasEtageresRangement !== undefined) propertyUpdateData.hasEtageresRangement = payload.hasEtageresRangement;
      if (payload.hasLuminaires !== undefined) propertyUpdateData.hasLuminaires = payload.hasLuminaires;
      if (payload.hasMaterielEntretien !== undefined) propertyUpdateData.hasMaterielEntretien = payload.hasMaterielEntretien;

      // Mettre à jour la propriété seulement si des données de mobilier sont présentes
      if (Object.keys(propertyUpdateData).length > 0) {
        await tx.property.update({
          where: { id: propertyId },
          data: propertyUpdateData,
        });
      }
    }

    if (bailId && intakeLink.bail) {
      const updateData: any = {};
      if (payload.bailType) updateData.bailType = payload.bailType;
      if (payload.bailFamily) updateData.bailFamily = payload.bailFamily;
      if (payload.bailRentAmount !== undefined) {
        updateData.rentAmount = typeof payload.bailRentAmount === 'string'
          ? parseInt(payload.bailRentAmount, 10)
          : payload.bailRentAmount;
      }
      if (payload.bailMonthlyCharges !== undefined) {
        updateData.monthlyCharges = typeof payload.bailMonthlyCharges === 'string'
          ? parseInt(payload.bailMonthlyCharges, 10) || 0
          : payload.bailMonthlyCharges || 0;
      }
      if (payload.bailSecurityDeposit !== undefined) {
        updateData.securityDeposit = typeof payload.bailSecurityDeposit === 'string'
          ? parseInt(payload.bailSecurityDeposit, 10) || 0
          : payload.bailSecurityDeposit || 0;
      }
      if (payload.bailEffectiveDate) updateData.effectiveDate = new Date(payload.bailEffectiveDate);
      if (payload.bailEndDate) updateData.endDate = new Date(payload.bailEndDate);
      if (payload.bailPaymentDay !== undefined) {
        updateData.paymentDay = typeof payload.bailPaymentDay === 'string'
          ? parseInt(payload.bailPaymentDay, 10) || null
          : payload.bailPaymentDay || null;
      }

      await tx.bail.update({
        where: { id: bailId },
        data: updateData,
      });
    } else {
      if (!propertyId) {
        throw new Error("PropertyId manquant pour créer le bail");
      }

      const newBail = await tx.bail.create({
        data: {
          bailType: payload.bailType || BailType.BAIL_NU_3_ANS,
          bailFamily: payload.bailFamily || BailFamille.HABITATION,
          status: BailStatus.DRAFT,
          rentAmount: typeof payload.bailRentAmount === 'string'
            ? parseInt(payload.bailRentAmount, 10) || 0
            : payload.bailRentAmount || 0,
          monthlyCharges: typeof payload.bailMonthlyCharges === 'string'
            ? parseInt(payload.bailMonthlyCharges, 10) || 0
            : payload.bailMonthlyCharges || 0,
          securityDeposit: typeof payload.bailSecurityDeposit === 'string'
            ? parseInt(payload.bailSecurityDeposit, 10) || 0
            : payload.bailSecurityDeposit || 0,
          effectiveDate: payload.bailEffectiveDate ? new Date(payload.bailEffectiveDate) : new Date(),
          endDate: payload.bailEndDate ? new Date(payload.bailEndDate) : null,
          paymentDay: typeof payload.bailPaymentDay === 'string'
            ? parseInt(payload.bailPaymentDay, 10) || null
            : payload.bailPaymentDay || null,
          propertyId,
          parties: {
            connect: bailParties,
          },
        },
      });

      await tx.intakeLink.update({
        where: { id: intakeLink.id },
        data: { bailId: newBail.id },
      });
    }
  });

  return { success: true };
}

// Handler pour le step "tenant" du formulaire owner
export async function handleOwnerTenantStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  // Vérifier l'email du locataire
  if (payload.tenantEmail && typeof payload.tenantEmail === "string") {
    await validateTenantEmailForOwner(intakeLink, payload, clientId);
  }

  const tenantEmail = payload.tenantEmail?.trim().toLowerCase();
  if (!tenantEmail) {
    return { success: true }; // Pas de locataire à gérer
  }

  if (!intakeLink.bailId) {
    throw new Error("BailId manquant pour ajouter le locataire");
  }

  // Récupérer l'ancien email du locataire avant la transaction pour détecter les changements
  const existingTenant = intakeLink.bail?.parties?.find(
    (party: any) => party.profilType === ProfilType.LOCATAIRE
  );
  let oldTenantEmail: string | null = null;
  let tenantId: string | null = null;

  if (existingTenant) {
    tenantId = existingTenant.id;
    const tenantPerson = await prisma.person.findFirst({
      where: { clientId: existingTenant.id, isPrimary: true },
    });
    oldTenantEmail = tenantPerson?.email?.toLowerCase() || null;
  }

  // Exécuter la transaction pour créer/mettre à jour le locataire
  await prisma.$transaction(async (tx) => {
    if (existingTenant) {
      // Mettre à jour l'email de la personne primaire
      const tenantPerson = await tx.person.findFirst({
        where: { clientId: existingTenant.id, isPrimary: true },
      });
      if (tenantPerson && tenantPerson.email?.toLowerCase() !== tenantEmail) {
        await tx.person.update({
          where: { id: tenantPerson.id },
          data: { email: tenantEmail },
        });
      }
    } else {
      // Créer un nouveau locataire
      const newTenant = await tx.client.create({
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

      tenantId = newTenant.id;

      // Connecter le locataire au bail
      await tx.bail.update({
        where: { id: intakeLink.bailId },
        data: {
          parties: {
            connect: [{ id: newTenant.id }],
          },
        },
      });
    }
  });

  // Après la transaction, gérer l'envoi d'email au locataire
  if (tenantId) {
    // Récupérer le bail avec le propertyId pour créer l'IntakeLink
    const bail = await prisma.bail.findUnique({
      where: { id: intakeLink.bailId },
      include: {
        property: true,
      },
    });

    if (!bail) {
      throw new Error("Bail introuvable");
    }

    // Vérifier si un IntakeLink existe déjà pour ce locataire et ce bail
    let tenantIntakeLink = await prisma.intakeLink.findFirst({
      where: {
        clientId: tenantId,
        bailId: intakeLink.bailId,
        target: "TENANT",
      },
    });

    // Déterminer si on doit envoyer l'email
    const shouldSendEmail = 
      !tenantIntakeLink || // Nouveau locataire, pas encore d'IntakeLink
      (oldTenantEmail && oldTenantEmail !== tenantEmail); // Email a changé

    if (shouldSendEmail) {
      // Créer l'IntakeLink si nécessaire
      if (!tenantIntakeLink) {
        const token = randomBytes(32).toString("hex");
        // Utiliser propertyId du bail ou de l'intakeLink si disponible
        const propertyId = bail.propertyId || intakeLink.propertyId;
        tenantIntakeLink = await prisma.intakeLink.create({
          data: {
            token,
            target: "TENANT",
            clientId: tenantId,
            propertyId: propertyId,
            bailId: intakeLink.bailId,
            status: "PENDING",
          },
        });
      } else if (tenantIntakeLink.propertyId !== bail.propertyId && bail.propertyId) {
        // Mettre à jour le propertyId si le bail a été associé à un bien
        tenantIntakeLink = await prisma.intakeLink.update({
          where: { id: tenantIntakeLink.id },
          data: { propertyId: bail.propertyId },
        });
      }

      // Envoyer l'email au locataire avec le formulaire
      const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
      const tenantFormUrl = `${baseUrl}/intakes/${tenantIntakeLink.token}`;

      // Récupérer les informations de Person pour l'email
      const tenantPerson = await prisma.person.findFirst({
        where: { clientId: tenantId, isPrimary: true },
      });

      const firstName = tenantPerson?.firstName || "";
      const lastName = tenantPerson?.lastName || "";

      try {
        await triggerTenantFormEmail({
          to: tenantEmail,
          firstName: firstName,
          lastName: lastName,
          formUrl: tenantFormUrl,
        });
        console.log(`[handleOwnerTenantStep] Email envoyé au locataire: ${tenantEmail}`);
      } catch (error) {
        console.error("Erreur lors du déclenchement de l'email au locataire:", error);
        // On continue même si l'email échoue
      }
    } else {
      console.log(`[handleOwnerTenantStep] Email non envoyé - IntakeLink existe déjà et email inchangé pour: ${tenantEmail}`);
    }
  }

  return { success: true };
}

// Handler pour le step "documents" du formulaire owner
export async function handleOwnerDocumentsStep(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  await prisma.$transaction(async (tx) => {
    await handleDocumentsInTransaction(tx, payload, clientId, intakeLink);
  });

  return { success: true };
}

// Handler legacy pour compatibilité (sans stepId)
export async function handleOwnerLegacySave(
  intakeLink: any,
  payload: any,
  clientId: string,
) {
  // Utiliser la logique complète de l'ancienne fonction
  await validateOwnerEmails(intakeLink, payload, clientId);

  await prisma.$transaction(async (tx) => {
    const clientType = payload.type as ClientType;

    if (payload.type) {
      await tx.client.update({
        where: { id: clientId },
        data: { type: payload.type },
      });
    }

    if (clientType === ClientType.PERSONNE_PHYSIQUE) {
      await handleOwnerPersons(tx, intakeLink, payload, clientId);
    } else if (clientType === ClientType.PERSONNE_MORALE) {
      await handleOwnerEntreprise(tx, intakeLink, payload, clientId);
    }

    await handleDocumentsInTransaction(tx, payload, clientId, intakeLink);
  });

  // Gérer Property, Bail et Tenant en dehors de la transaction principale
  // car ces fonctions créent leurs propres transactions
  if (payload.propertyLabel || payload.propertyFullAddress) {
    await handleOwnerPropertyStep(intakeLink, payload, clientId);
  }

  // Gérer Bail
  if (payload.bailType || payload.bailRentAmount) {
    await handleOwnerBailStep(intakeLink, payload, clientId);
  }

  // Gérer Tenant
  if (payload.tenantEmail) {
    await handleOwnerTenantStep(intakeLink, payload, clientId);
  }

  return { success: true };
}

// ============================================================================
// FONCTIONS HELPER POUR TENANT
// ============================================================================

async function validateTenantEmails(intakeLink: any, payload: any, clientId: string) {
  const currentClient = intakeLink.client;
  const currentEmail =
    currentClient?.persons?.find((p: any) => p.isPrimary)?.email ||
    currentClient?.persons?.[0]?.email ||
    currentClient?.entreprise?.email ||
    null;

  if (payload.email && typeof payload.email === "string") {
    const emailToCheck = payload.email.trim().toLowerCase();

    if (!currentEmail || currentEmail.trim().toLowerCase() !== emailToCheck) {
      const [existingPersonWithEmail, existingEntrepriseWithEmail] = await Promise.all([
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
        existingPersonWithEmail?.client?.id || existingEntrepriseWithEmail?.client?.id;

      if (existingClientId && existingClientId !== clientId) {
        throw new Error(
          "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
        );
      }
    }
  }
}

async function handleTenantPersons(tx: any, intakeLink: any, payload: any, clientId: string) {
  const allPersons = payload.persons || [];
  if (allPersons.length === 0) return;

  // Traiter la personne primaire
  const primaryPersonData = allPersons[0];
  const existingPrimaryPerson = intakeLink.client?.persons?.find((p: any) => p.isPrimary);

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
  if (primaryPersonData.birthDate) primaryPersonDataToUpdate.birthDate = new Date(primaryPersonData.birthDate);

  if (existingPrimaryPerson) {
    await tx.person.update({
      where: { id: existingPrimaryPerson.id },
      data: primaryPersonDataToUpdate,
    });
  } else {
    await tx.person.create({
      data: {
        ...primaryPersonDataToUpdate,
        clientId,
        isPrimary: true,
      },
    });
  }

  // Traiter les personnes supplémentaires
  const additionalPersons = allPersons.slice(1);
  const existingNonPrimaryPersons = intakeLink.client?.persons?.filter((p: any) => !p.isPrimary) || [];
  const processedPersonIds: string[] = [];

  const personOperations = additionalPersons.map(async (personData: any) => {
    if (personData.email) {
      const emailNormalized = personData.email.trim().toLowerCase();
      const existingPersonByEmail = existingNonPrimaryPersons.find(
        (p: any) => p.email?.toLowerCase() === emailNormalized
      );

      if (existingPersonByEmail) {
        await tx.person.update({
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
        return existingPersonByEmail.id;
      } else {
        const newPerson = await tx.person.create({
          data: {
            clientId,
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
        return newPerson.id;
      }
    } else if (personData.firstName || personData.lastName) {
      const newPerson = await tx.person.create({
        data: {
          clientId,
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
      return newPerson.id;
    }
    return null;
  });

  const personIds = await Promise.all(personOperations);
  processedPersonIds.push(...personIds.filter(Boolean) as string[]);

  // Supprimer les personnes qui ne sont plus dans le payload
  const personsToDelete = existingNonPrimaryPersons.filter(
    (p: any) => !processedPersonIds.includes(p.id)
  );
  await Promise.all(
    personsToDelete.map((p: any) => tx.person.delete({ where: { id: p.id } }))
  );
}

async function handleTenantEntreprise(tx: any, intakeLink: any, payload: any, clientId: string) {
  const entrepriseData: any = {};
  if (payload.entreprise?.legalName) entrepriseData.legalName = payload.entreprise.legalName;
  if (payload.entreprise?.registration) entrepriseData.registration = payload.entreprise.registration;
  if (payload.entreprise?.phone) entrepriseData.phone = payload.entreprise.phone;
  if (payload.entreprise?.email) entrepriseData.email = payload.entreprise.email.trim().toLowerCase();
  if (payload.entreprise?.fullAddress) entrepriseData.fullAddress = payload.entreprise.fullAddress;
  if (payload.entreprise?.name) entrepriseData.name = payload.entreprise.name;
  if (payload.entreprise?.nationality) entrepriseData.nationality = payload.entreprise.nationality;

  const existingEntreprise = intakeLink.client?.entreprise;
  if (existingEntreprise) {
    await tx.entreprise.update({
      where: { id: existingEntreprise.id },
      data: entrepriseData,
    });
  } else {
    await tx.entreprise.create({
      data: {
        ...entrepriseData,
        clientId,
        legalName: payload.entreprise?.legalName || "",
        registration: payload.entreprise?.registration || "",
        name: payload.entreprise?.legalName || "",
        email: payload.entreprise?.email?.trim().toLowerCase() || "",
        phone: payload.entreprise?.phone || "",
        fullAddress: payload.entreprise?.fullAddress || "",
      },
    });
  }
}

// ============================================================================
// FONCTIONS HELPER POUR OWNER
// ============================================================================

async function validateOwnerEmails(intakeLink: any, payload: any, clientId: string) {
  const currentClient = intakeLink.client;
  const currentEmail =
    currentClient?.persons?.find((p: any) => p.isPrimary)?.email ||
    currentClient?.persons?.[0]?.email ||
    currentClient?.entreprise?.email ||
    null;

  if (payload.email && typeof payload.email === "string") {
    const emailToCheck = payload.email.trim().toLowerCase();

    if (!currentEmail || currentEmail.trim().toLowerCase() !== emailToCheck) {
      const [existingPersonWithEmail, existingEntrepriseWithEmail] = await Promise.all([
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
        existingPersonWithEmail?.client?.id || existingEntrepriseWithEmail?.client?.id;

      if (existingClientId && existingClientId !== clientId) {
        throw new Error(
          "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
        );
      }
    }
  }

  // Vérifier les emails des personnes supplémentaires
  if (payload.type === ClientType.PERSONNE_PHYSIQUE && Array.isArray(payload.persons)) {
    const primaryEmail = payload.email?.trim().toLowerCase();
    const emailSet = new Set<string>();

    for (let i = 0; i < payload.persons.length; i++) {
      const person = payload.persons[i];
      if (person?.email && typeof person.email === "string") {
        const personEmail = person.email.trim().toLowerCase();
        if (!personEmail) continue;

        if (emailSet.has(personEmail)) {
          throw new Error(
            `L'email ${personEmail} est utilisé plusieurs fois dans le formulaire. Chaque personne doit avoir un email unique.`
          );
        }
        emailSet.add(personEmail);
      }
    }

    const emailChecks = payload.persons
      .filter((person: any) => person?.email && typeof person.email === "string")
      .map((person: any) => {
        const personEmail = person.email.trim().toLowerCase();
        if (personEmail === primaryEmail) return null;
        return Promise.all([
          prisma.person.findFirst({
            where: { email: personEmail },
            include: { client: { select: { id: true } } },
          }),
          prisma.entreprise.findFirst({
            where: { email: personEmail },
            include: { client: { select: { id: true } } },
          }),
        ]).then(([existingPerson, existingEntreprise]) => ({
          email: personEmail,
          existingClientId: existingPerson?.client?.id || existingEntreprise?.client?.id,
        }));
      })
      .filter(Boolean);

    const emailCheckResults = await Promise.all(emailChecks);
    for (const result of emailCheckResults) {
      if (result && result.existingClientId && result.existingClientId !== clientId) {
        throw new Error(
          `L'email ${result.email} est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact`
        );
      }
    }
  }

  // Vérifier l'email de l'entreprise
  if (
    payload.type === ClientType.PERSONNE_MORALE &&
    payload.entreprise?.email &&
    typeof payload.entreprise.email === "string"
  ) {
    const entrepriseEmail = payload.entreprise.email.trim().toLowerCase();
    const primaryEmail = payload.email?.trim().toLowerCase();

    if (entrepriseEmail !== primaryEmail) {
      const [existingPersonWithEmail, existingEntrepriseWithEmail] = await Promise.all([
        prisma.person.findFirst({
          where: { email: entrepriseEmail },
          include: { client: { select: { id: true } } },
        }),
        prisma.entreprise.findFirst({
          where: { email: entrepriseEmail },
          include: { client: { select: { id: true } } },
        }),
      ]);

      const existingClientId =
        existingPersonWithEmail?.client?.id || existingEntrepriseWithEmail?.client?.id;

      if (existingClientId && existingClientId !== clientId) {
        throw new Error(
          `L'email ${entrepriseEmail} est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact`
        );
      }
    }
  }
}

async function validateTenantEmailForOwner(intakeLink: any, payload: any, clientId: string) {
  const tenantEmailToCheck = payload.tenantEmail.trim().toLowerCase();
  const ownerEmail = payload.email?.trim().toLowerCase();

  if (ownerEmail === tenantEmailToCheck) {
    throw new Error(
      "L'email du locataire ne peut pas être le même que l'email du propriétaire. Veuillez utiliser un email différent."
    );
  }

  if (payload.entreprise?.email && typeof payload.entreprise.email === "string") {
    const entrepriseEmail = payload.entreprise.email.trim().toLowerCase();
    if (entrepriseEmail === tenantEmailToCheck) {
      throw new Error(
        "L'email du locataire ne peut pas être le même que l'email de l'entreprise. Veuillez utiliser un email différent."
      );
    }
  }

  if (payload.type === ClientType.PERSONNE_PHYSIQUE && Array.isArray(payload.persons)) {
    for (const person of payload.persons) {
      if (person?.email && typeof person.email === "string") {
        const personEmail = person.email.trim().toLowerCase();
        if (personEmail === tenantEmailToCheck) {
          throw new Error(
            "L'email du locataire ne peut pas être le même que l'email d'une personne du propriétaire. Veuillez utiliser un email différent."
          );
        }
      }
    }
  }

  const [existingPersonTenant, existingEntrepriseTenant] = await Promise.all([
    prisma.person.findFirst({
      where: { email: tenantEmailToCheck },
      include: { client: { select: { id: true, profilType: true } } },
    }),
    prisma.entreprise.findFirst({
      where: { email: tenantEmailToCheck },
      include: { client: { select: { id: true, profilType: true } } },
    }),
  ]);

  const existingTenantClient = existingPersonTenant?.client || existingEntrepriseTenant?.client;

  if (existingTenantClient) {
    const isAlreadyPartyOfThisBail = intakeLink.bailId
      ? (await prisma.bail.count({
          where: {
            id: intakeLink.bailId,
            parties: { some: { id: existingTenantClient.id } },
          },
        })) > 0
      : false;

    if (!isAlreadyPartyOfThisBail) {
      throw new Error(
        "Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact"
      );
    }
  }
}

async function handleOwnerPersons(tx: any, intakeLink: any, payload: any, clientId: string) {
  // Même logique que handleTenantPersons
  await handleTenantPersons(tx, intakeLink, payload, clientId);
}

async function handleOwnerEntreprise(tx: any, intakeLink: any, payload: any, clientId: string) {
  // Même logique que handleTenantEntreprise
  await handleTenantEntreprise(tx, intakeLink, payload, clientId);
}

