"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createIntakeLinkSchema, submitIntakeSchema } from "@/lib/zod/intake";
import { ownerFormSchema, tenantFormSchema } from "@/lib/zod/client";
import { submitOwnerForm, submitTenantForm } from "@/lib/actions/clients";
import { handleOwnerFormDocuments, handleTenantFormDocuments } from "@/lib/actions/documents";
import { revalidatePath } from "next/cache";
import { Decimal } from "@prisma/client/runtime/library";
import { randomBytes } from "crypto";
import { BailType, BailFamille, BailStatus, PropertyStatus, ClientType, ProfilType } from "@prisma/client";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { NotificationType } from "@prisma/client";

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
          parties: true,
          documents: true,
        },
      },
      client: {
        include: {
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
    } : null,
    client: intakeLink.client ? {
      ...intakeLink.client,
      birthDate: intakeLink.client.birthDate?.toISOString().split('T')[0] || null,
      createdAt: intakeLink.client.createdAt.toISOString(),
      updatedAt: intakeLink.client.updatedAt.toISOString(),
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

  revalidatePath(`/intakes/${token}`);
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
  const { token, payload } = validated;
  // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
  // formData n'est plus nécessaire ici
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: true,
      property: true,
      bail: true,
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  if (intakeLink.status === "REVOKED") {
    throw new Error("Ce lien a été révoqué");
  }

  // Sauvegarder les données partiellement dans rawPayload
  await prisma.intakeLink.update({
    where: { token },
    data: {
      rawPayload: payload as any,
    },
  });

  // Si c'est un formulaire propriétaire avec clientId, mettre à jour le client partiellement
  if (intakeLink.target === "OWNER" && intakeLink.clientId) {
    // Récupérer le client actuel pour vérifier si l'email existe déjà
    const currentClient = await prisma.client.findUnique({
      where: { id: intakeLink.clientId },
      select: { email: true },
    });

    // Si l'email est fourni et que le client n'a pas encore d'email, vérifier qu'il n'existe pas déjà
    if (payload.email && !currentClient?.email) {
      const emailToCheck = payload.email.trim().toLowerCase();
      const existingClientWithEmail = await prisma.client.findUnique({
        where: { email: emailToCheck },
      });

      if (existingClientWithEmail && existingClientWithEmail.id !== intakeLink.clientId) {
        throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
      }
    }

    const updateData: any = {};
    if (payload.type) updateData.type = payload.type;
    if (payload.firstName) updateData.firstName = payload.firstName;
    if (payload.lastName) updateData.lastName = payload.lastName;
    if (payload.phone) updateData.phone = payload.phone;
    // Mettre à jour l'email seulement si le client n'en a pas encore
    if (payload.email && !currentClient?.email) {
      updateData.email = payload.email.trim().toLowerCase();
    }
    if (payload.fullAddress) updateData.fullAddress = payload.fullAddress;
    if (payload.nationality) updateData.nationality = payload.nationality;
    if (payload.profession) updateData.profession = payload.profession;
    if (payload.familyStatus) updateData.familyStatus = payload.familyStatus;
    if (payload.matrimonialRegime) updateData.matrimonialRegime = payload.matrimonialRegime;
    if (payload.birthPlace) updateData.birthPlace = payload.birthPlace;
    if (payload.birthDate) {
      const date = new Date(payload.birthDate);
      if (!isNaN(date.getTime())) {
        updateData.birthDate = date;
      }
    }
    if (payload.legalName) updateData.legalName = payload.legalName;
    if (payload.registration) updateData.registration = payload.registration;

    if (Object.keys(updateData).length > 0) {
      await prisma.client.update({
        where: { id: intakeLink.clientId },
        data: updateData,
      });
      // Mettre à jour le statut de complétion
      await calculateAndUpdateClientStatus(intakeLink.clientId);
    }

    // Créer ou mettre à jour le bien si les données sont disponibles
    let propertyId = intakeLink.propertyId;
    if (payload.propertyFullAddress || payload.propertyLabel || payload.propertySurfaceM2 || payload.propertyType || payload.propertyLegalStatus) {
      if (!propertyId) {
        // Vérifier s'il existe déjà un bien pour ce client avant d'en créer un nouveau
        const existingProperty = await prisma.property.findFirst({
          where: {
            ownerId: intakeLink.clientId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (existingProperty) {
          // Utiliser le bien existant
          propertyId = existingProperty.id;
          
          // Mettre à jour l'intakeLink avec le propertyId existant
          await prisma.intakeLink.update({
            where: { id: intakeLink.id },
            data: { propertyId: existingProperty.id },
          });
        } else {
          // Créer le bien seulement s'il n'en existe pas
          const propertyData: any = {
            label: payload.propertyLabel || null,
            fullAddress: payload.propertyFullAddress,
            type: payload.propertyType || null,
            legalStatus: payload.propertyLegalStatus || null,
            status: payload.propertyStatus || PropertyStatus.NON_LOUER,
            ownerId: intakeLink.clientId,
          };
          
          // Convertir les valeurs numériques
          if (payload.propertySurfaceM2 && payload.propertySurfaceM2 !== "") {
            propertyData.surfaceM2 = new Decimal(payload.propertySurfaceM2);
          } else {
            propertyData.surfaceM2 = null;
          }
          
          const property = await prisma.property.create({
            data: propertyData,
          });
          propertyId = property.id;

          // Mettre à jour le statut de complétion
          await calculateAndUpdatePropertyStatus(property.id);

          // Mettre à jour l'intakeLink avec le propertyId
          await prisma.intakeLink.update({
            where: { id: intakeLink.id },
            data: { propertyId: property.id },
          });
        }
      } else {
        // Mettre à jour le bien existant
        const updateData: any = {};
        
        if (payload.propertyLabel !== undefined) updateData.label = payload.propertyLabel || null;
        if (payload.propertyFullAddress !== undefined) updateData.fullAddress = payload.propertyFullAddress;
        if (payload.propertySurfaceM2 !== undefined && payload.propertySurfaceM2 !== null && payload.propertySurfaceM2 !== "") {
          updateData.surfaceM2 = new Decimal(payload.propertySurfaceM2);
        } else if (payload.propertySurfaceM2 === "") {
          updateData.surfaceM2 = null;
        }
        if (payload.propertyType !== undefined) updateData.type = payload.propertyType || null;
        if (payload.propertyLegalStatus !== undefined) updateData.legalStatus = payload.propertyLegalStatus || null;
        if (payload.propertyStatus !== undefined) updateData.status = payload.propertyStatus;
        
        if (Object.keys(updateData).length > 0) {
          await prisma.property.update({
            where: { id: propertyId },
            data: updateData,
          });
          // Mettre à jour le statut de complétion
          await calculateAndUpdatePropertyStatus(propertyId);
        }
      }
    }

    // Créer ou mettre à jour le bail si les données sont disponibles
    let bailId = intakeLink.bailId;
    if (payload.bailRentAmount && propertyId) {
      if (!bailId) {
        // Vérifier s'il existe déjà un bail pour ce bien avant d'en créer un nouveau
        const existingBail = await prisma.bail.findFirst({
          where: {
            propertyId: propertyId,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        if (existingBail) {
          // Utiliser le bail existant
          bailId = existingBail.id;
          
          // Mettre à jour l'intakeLink avec le bailId existant
          await prisma.intakeLink.update({
            where: { id: intakeLink.id },
            data: { bailId: existingBail.id },
          });
        } else {
          // Créer le locataire si nécessaire
          let tenantId = intakeLink.clientId; // Temporaire, sera mis à jour plus tard
          if (payload.tenantEmail) {
            const existingTenant = await prisma.client.findFirst({
              where: { email: payload.tenantEmail, profilType: ProfilType.LOCATAIRE },
            });
            if (existingTenant) {
              tenantId = existingTenant.id;
            } else {
              const tenant = await prisma.client.create({
                data: {
                  type: ClientType.PERSONNE_PHYSIQUE,
                  profilType: ProfilType.LOCATAIRE,
                  email: payload.tenantEmail,
                  createdById: intakeLink?.client?.createdById,
                },
              });
              tenantId = tenant.id;
            }
          }

          // Créer le bail seulement s'il n'en existe pas
          // Convertir paymentDay en entier si fourni
          let paymentDayValue: number | null = null;
          if (payload.bailPaymentDay && payload.bailPaymentDay !== "") {
            const paymentDayNum = typeof payload.bailPaymentDay === 'string' 
              ? parseInt(payload.bailPaymentDay, 10) 
              : payload.bailPaymentDay;
            if (!isNaN(paymentDayNum) && paymentDayNum >= 1 && paymentDayNum <= 31) {
              paymentDayValue = paymentDayNum;
            }
          }
          
          const bail = await prisma.bail.create({
            data: {
              bailType: payload.bailType || BailType.BAIL_NU_3_ANS,
              bailFamily:  BailFamille.HABITATION,
              status: BailStatus.DRAFT,
              rentAmount: parseInt(payload.bailRentAmount, 10),
              monthlyCharges: parseInt(payload.bailMonthlyCharges || "0", 10),
              securityDeposit: parseInt(payload.bailSecurityDeposit || "0", 10),
              effectiveDate: payload.bailEffectiveDate ? new Date(payload.bailEffectiveDate) : new Date(),
              endDate: payload.bailEndDate ? new Date(payload.bailEndDate) : null,
              paymentDay: paymentDayValue,
              propertyId: propertyId!,
              parties: {
                connect: [
                  { id: intakeLink.clientId }, // Propriétaire
                  ...(tenantId && tenantId !== intakeLink.clientId ? [{ id: tenantId }] : []), // Locataire
                ],
              },
            },
          });
          bailId = bail.id;

          // Mettre à jour l'intakeLink avec le bailId
          await prisma.intakeLink.update({
            where: { id: intakeLink.id },
            data: { bailId: bail.id },
          });
        }
      } else {
        // Mettre à jour le bail existant
        const updateData: any = {};
        
        if (payload.bailType !== undefined) updateData.bailType = payload.bailType;
        if (payload.bailFamily !== undefined) updateData.bailFamily = payload.bailFamily;
        if (payload.bailRentAmount !== undefined && payload.bailRentAmount !== null && payload.bailRentAmount !== "") {
          updateData.rentAmount = parseInt(payload.bailRentAmount, 10);
        }
        if (payload.bailMonthlyCharges !== undefined && payload.bailMonthlyCharges !== null && payload.bailMonthlyCharges !== "") {
          updateData.monthlyCharges = parseInt(payload.bailMonthlyCharges, 10);
        }
        if (payload.bailSecurityDeposit !== undefined && payload.bailSecurityDeposit !== null && payload.bailSecurityDeposit !== "") {
          updateData.securityDeposit = parseInt(payload.bailSecurityDeposit, 10);
        }
        if (payload.bailEffectiveDate !== undefined && payload.bailEffectiveDate !== null && payload.bailEffectiveDate !== "") {
          updateData.effectiveDate = new Date(payload.bailEffectiveDate);
        }
        if (payload.bailEndDate !== undefined && payload.bailEndDate !== null && payload.bailEndDate !== "") {
          updateData.endDate = new Date(payload.bailEndDate);
        } else if (payload.bailEndDate === "") {
          updateData.endDate = null;
        }
        if (payload.bailPaymentDay !== undefined && payload.bailPaymentDay !== null && payload.bailPaymentDay !== "") {
          const paymentDayNum = typeof payload.bailPaymentDay === 'string' 
            ? parseInt(payload.bailPaymentDay, 10) 
            : payload.bailPaymentDay;
          if (!isNaN(paymentDayNum) && paymentDayNum >= 1 && paymentDayNum <= 31) {
            updateData.paymentDay = paymentDayNum;
          } else {
            updateData.paymentDay = null;
          }
        } else if (payload.bailPaymentDay === "") {
          updateData.paymentDay = null;
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.bail.update({
            where: { id: bailId },
            data: updateData,
          });
        }
      }
    }

    // Gérer le locataire : mettre à jour ou créer, rattacher au bail
    if (payload.tenantEmail && payload.tenantEmail.trim() !== "" && bailId) {
      // Récupérer le bail avec ses parties
      const bail = await prisma.bail.findUnique({
        where: { id: bailId },
        include: { parties: true },
      });

      if (!bail) {
        return; // Bail introuvable, on ne peut pas continuer
      }

      // Chercher le locataire existant rattaché au bail
      const existingTenant = bail.parties.find(party => party.profilType === ProfilType.LOCATAIRE);
      
      let tenant;
      if (existingTenant) {
        // Si un locataire est déjà rattaché au bail, mettre à jour son email
        tenant = await prisma.client.update({
          where: { id: existingTenant.id },
          data: {
            email: payload.tenantEmail.trim().toLowerCase(),
          },
        });
      } else {
        // Vérifier d'abord si un client avec cet email existe déjà (peu importe le profilType)
        const existingClientWithEmail = await prisma.client.findUnique({
          where: { 
            email: payload.tenantEmail.trim().toLowerCase()
          },
        });

        if (existingClientWithEmail) {
          throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
        }

        // Si aucun locataire n'est rattaché, chercher un locataire existant avec cet email
        tenant = await prisma.client.findFirst({
          where: { 
            email: payload.tenantEmail.trim().toLowerCase(), 
            profilType: ProfilType.LOCATAIRE 
          },
        });

        // Si le locataire n'existe pas, le créer
        if (!tenant) {
          tenant = await prisma.client.create({
            data: {
              type: ClientType.PERSONNE_PHYSIQUE,
              profilType: ProfilType.LOCATAIRE,
              email: payload.tenantEmail.trim().toLowerCase(),
            },
          });
        }

        // Rattacher le locataire au bail
        await prisma.bail.update({
          where: { id: bailId },
          data: {
            parties: {
              connect: { id: tenant.id },
            },
          },
        });
      }

      // Vérifier si un IntakeLink existe déjà pour ce locataire et ce bail
      let tenantIntakeLink = await prisma.intakeLink.findFirst({
        where: {
          clientId: tenant.id,
          bailId: bailId,
          target: "TENANT",
        },
      });

      // Si l'IntakeLink n'existe pas, le créer (sans envoyer d'email ici)
      // L'email sera envoyé uniquement lors de la soumission finale dans submitOwnerForm
      if (!tenantIntakeLink) {
        tenantIntakeLink = await prisma.intakeLink.create({
          data: {
            target: "TENANT",
            clientId: tenant.id,
            propertyId: propertyId || null,
            bailId: bailId,
          },
        });
      }
    }

    // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
    // Plus besoin de les gérer ici
  }

  // Si c'est un formulaire locataire avec clientId, mettre à jour le client partiellement
  if (intakeLink.target === "TENANT" && intakeLink.clientId) {
    // Récupérer le client actuel pour vérifier si l'email existe déjà
    const currentClient = await prisma.client.findUnique({
      where: { id: intakeLink.clientId },
      select: { email: true },
    });

    // Si l'email est fourni et que le client n'a pas encore d'email, vérifier qu'il n'existe pas déjà
    if (payload.email && !currentClient?.email) {
      const emailToCheck = payload.email.trim().toLowerCase();
      const existingClientWithEmail = await prisma.client.findUnique({
        where: { email: emailToCheck },
      });

      if (existingClientWithEmail && existingClientWithEmail.id !== intakeLink.clientId) {
        throw new Error("Cet email est déjà utilisé. Impossible d'utiliser cet email. Veuillez contacter le service client : /#contact");
      }
    }

    const updateData: any = {};
    if (payload.firstName) updateData.firstName = payload.firstName;
    if (payload.lastName) updateData.lastName = payload.lastName;
    if (payload.phone) updateData.phone = payload.phone;
    // Mettre à jour l'email seulement si le client n'en a pas encore
    if (payload.email && !currentClient?.email) {
      updateData.email = payload.email.trim().toLowerCase();
    }
    if (payload.fullAddress) updateData.fullAddress = payload.fullAddress;
    if (payload.nationality) updateData.nationality = payload.nationality;
    if (payload.profession) updateData.profession = payload.profession;
    if (payload.familyStatus) updateData.familyStatus = payload.familyStatus;
    if (payload.matrimonialRegime) updateData.matrimonialRegime = payload.matrimonialRegime;
    if (payload.birthPlace) updateData.birthPlace = payload.birthPlace;
    if (payload.birthDate) {
      const date = new Date(payload.birthDate);
      if (!isNaN(date.getTime())) {
        updateData.birthDate = date;
      }
    }
    if (payload.legalName) updateData.legalName = payload.legalName;
    if (payload.registration) updateData.registration = payload.registration;

    if (Object.keys(updateData).length > 0) {
      await prisma.client.update({
        where: { id: intakeLink.clientId },
        data: updateData,
      });
      // Mettre à jour le statut de complétion
      await calculateAndUpdateClientStatus(intakeLink.clientId);
    }

    // Les fichiers sont maintenant uploadés via l'API route /api/intakes/upload
    // Plus besoin de les gérer ici
  }

  return { success: true };
}

// Récupérer les documents déjà uploadés pour un intake (sans authentification, accessible via token)
export async function getIntakeDocuments(token: string) {
  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: true,
      property: true,
      bail: true,
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  const documents: any[] = [];

  // Récupérer les documents du client
  if (intakeLink.clientId) {
    const clientDocs = await prisma.document.findMany({
      where: { clientId: intakeLink.clientId },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...clientDocs);
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



