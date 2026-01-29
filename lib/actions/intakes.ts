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
import { BailType, BailFamille, BailStatus, PropertyStatus, ClientType, ProfilType, IntakeTarget, CompletionStatus, DocumentKind } from "@prisma/client";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus, 
  updatePropertyCompletionStatus as calculateAndUpdatePropertyStatus 
} from "@/lib/utils/completion-status";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";
import { NotificationType } from "@prisma/client";
import { triggerTenantFormEmail } from "@/lib/inngest/helpers";
import {
  handleTenantClientTypeStep,
  handleTenantClientInfoStep,
  handleTenantDocumentsStep,
  handleTenantLegacySave,
  handleOwnerClientTypeStep,
  handleOwnerClientInfoStep,
  handleOwnerPropertyStep,
  handleOwnerBailStep,
  handleOwnerTenantStep,
  handleOwnerDocumentsStep,
  handleOwnerLegacySave,
} from "./intake-handlers";

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
          owner: {
            include: {
              persons: true,
              entreprise: true,
            },
          },
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
      // Les fichiers sont maintenant uploadés directement via FileUpload avec upload direct client → S3
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
      // Les fichiers sont maintenant uploadés directement via FileUpload avec upload direct client → S3
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

  // Fallback pour l'ancien système (ne devrait plus être utilisé)
  const updated = await prisma.intakeLink.update({
    where: { token },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
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
        client: {
          include: {
            persons: {
              orderBy: { isPrimary: 'desc' },
            },
            entreprise: true,
          },
        },
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
// Sauvegarde directement en base de données pour optimiser les performances
export async function savePartialIntake(data: unknown) {
  const validated = submitIntakeSchema.parse(data);
  const { token, payload, stepId } = validated as { token: string; payload: any; stepId?: string };

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
      bail: {
        include: {
          parties: {
            include: {
              persons: {
                where: { isPrimary: true },
              },
            },
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
  if (!clientId) {
    throw new Error("ClientId manquant dans l'intakeLink");
  }

  const targetType = intakeLink.target as IntakeTarget;

  // Normaliser le payload
  let normalizedPayload: any = payload;
  const clientType = normalizedPayload.type as ClientType | undefined;

  if (clientType === ClientType.PERSONNE_MORALE && normalizedPayload.entreprise) {
    normalizedPayload = {
      ...normalizedPayload,
      email: normalizedPayload.entreprise.email ?? normalizedPayload.email ?? null,
    };
  }

  if (
    clientType === ClientType.PERSONNE_PHYSIQUE &&
    Array.isArray(normalizedPayload.persons) &&
    normalizedPayload.persons.length > 0
  ) {
    const primary = normalizedPayload.persons[0];
    normalizedPayload = {
      ...normalizedPayload,
      email: primary?.email ?? normalizedPayload.email ?? null,
    };
  }

  const effectivePayload: any = normalizedPayload;

  // Router vers la fonction appropriée selon le target
  if (targetType === "TENANT") {
    return await savePartialTenantIntake(intakeLink, effectivePayload, stepId);
  } else if (targetType === "OWNER") {
    return await savePartialOwnerIntake(intakeLink, effectivePayload, stepId);
  }

  throw new Error("Type d'intake non supporté");
}


// Sauvegarder partiellement les données du formulaire TENANT par step
async function savePartialTenantIntake(
  intakeLink: any,
  payload: any,
  stepId: string | undefined,
) {
  const clientId = intakeLink.clientId;
  if (!clientId) {
    throw new Error("ClientId manquant dans l'intakeLink");
  }

  // Switch case pour gérer chaque step
  switch (stepId) {
    case "clientType":
      return await handleTenantClientTypeStep(intakeLink, payload, clientId);
    
    case "clientInfo":
      return await handleTenantClientInfoStep(intakeLink, payload, clientId);
    
    case "documents":
      return await handleTenantDocumentsStep(intakeLink, payload, clientId);
    
    default:
      // Si pas de stepId, utiliser l'ancien comportement pour compatibilité
      return await handleTenantLegacySave(intakeLink, payload, clientId);
  }
}

// Sauvegarder partiellement les données du formulaire OWNER par step
async function savePartialOwnerIntake(
  intakeLink: any,
  payload: any,
  stepId: string | undefined,
) {
  const clientId = intakeLink.clientId;
  if (!clientId) {
    throw new Error("ClientId manquant dans l'intakeLink");
  }

  // Switch case pour gérer chaque step
  switch (stepId) {
    case "clientType":
      return await handleOwnerClientTypeStep(intakeLink, payload, clientId);
    
    case "clientInfo":
      return await handleOwnerClientInfoStep(intakeLink, payload, clientId);
    
    case "property":
      return await handleOwnerPropertyStep(intakeLink, payload, clientId);
    
    case "bail":
      return await handleOwnerBailStep(intakeLink, payload, clientId);
    
    case "tenant":
      return await handleOwnerTenantStep(intakeLink, payload, clientId);
    
    case "documents":
      return await handleOwnerDocumentsStep(intakeLink, payload, clientId);
    
    default:
      // Si pas de stepId, utiliser l'ancien comportement pour compatibilité
      return await handleOwnerLegacySave(intakeLink, payload, clientId);
  }
}

// ✅ OPTIMISATION 6: Fonction helper optimisée pour gérer les documents dans une transaction
export async function handleDocumentsInTransaction(
  tx: any,
  payload: any,
  clientId: string,
  intakeLink: any,
) {
  // Documents des personnes
  if (payload.persons && Array.isArray(payload.persons)) {
    const allPersons = await tx.person.findMany({
      where: { clientId },
      orderBy: { isPrimary: 'desc' },
    });

    // Préparer toutes les opérations de documents en parallèle
    const documentOperations: Promise<void>[] = [];

    for (let i = 0; i < payload.persons.length; i++) {
      const personData = payload.persons[i];
      const personId = allPersons[i]?.id;
      
      if (personId && personData?.documents && Array.isArray(personData.documents)) {
        for (const docMeta of personData.documents) {
          if (docMeta.fileKey) {
            documentOperations.push(
              tx.document.findFirst({
                where: {
                  personId,
                  fileKey: docMeta.fileKey,
                },
              }).then(async (existingDoc: any) => {
                if (existingDoc && !existingDoc.uploadedById) {
                  await tx.document.update({
                    where: { id: existingDoc.id },
                    data: {
                      ...(docMeta.label && { label: docMeta.label }),
                      ...(docMeta.mimeType && { mimeType: docMeta.mimeType }),
                      ...(docMeta.size && { size: docMeta.size }),
                    },
                  });
                } else if (!existingDoc) {
                  console.warn(`[handleDocumentsInTransaction] Document NON trouvé pour person ${i}, fileKey: ${docMeta.fileKey}`);
                }
              })
            );
          }
        }
      }
    }

    await Promise.all(documentOperations);
  }

  // Documents de l'entreprise
  const entreprise = await tx.entreprise.findUnique({
    where: { clientId },
  });

  if (entreprise && payload.entreprise?.documents && Array.isArray(payload.entreprise.documents)) {
    const entrepriseDocOperations = payload.entreprise.documents
      .filter((docMeta: any) => docMeta.fileKey)
      .map((docMeta: any) =>
        tx.document.findFirst({
          where: {
            entrepriseId: entreprise.id,
            fileKey: docMeta.fileKey,
          },
        }).then(async (existingDoc: any) => {
          if (existingDoc && !existingDoc.uploadedById) {
            await tx.document.update({
              where: { id: existingDoc.id },
              data: {
                ...(docMeta.label && { label: docMeta.label }),
                ...(docMeta.mimeType && { mimeType: docMeta.mimeType }),
                ...(docMeta.size && { size: docMeta.size }),
              },
            });
          }
        })
      );

    await Promise.all(entrepriseDocOperations);
  }

  // Documents client
  if (payload.clientDocuments && Array.isArray(payload.clientDocuments)) {
    const clientDocOperations = payload.clientDocuments
      .filter((docMeta: any) => docMeta.fileKey)
      .map((docMeta: any) =>
        tx.document.findFirst({
          where: {
            clientId,
            personId: null,
            entrepriseId: null,
            fileKey: docMeta.fileKey,
          },
        }).then(async (existingDoc: any) => {
          if (existingDoc && !existingDoc.uploadedById) {
            await tx.document.update({
              where: { id: existingDoc.id },
              data: {
                ...(docMeta.label && { label: docMeta.label }),
                ...(docMeta.mimeType && { mimeType: docMeta.mimeType }),
                ...(docMeta.size && { size: docMeta.size }),
              },
            });
          }
        })
      );

    await Promise.all(clientDocOperations);
  }

  // Documents de la propriété
  if (intakeLink.propertyId && payload.propertyDocuments && Array.isArray(payload.propertyDocuments)) {
    const propertyDocOperations = payload.propertyDocuments
      .filter((docMeta: any) => docMeta.fileKey)
      .map((docMeta: any) =>
        tx.document.findFirst({
          where: {
            propertyId: intakeLink.propertyId,
            fileKey: docMeta.fileKey,
          },
        }).then(async (existingDoc: any) => {
          if (existingDoc && !existingDoc.uploadedById) {
            await tx.document.update({
              where: { id: existingDoc.id },
              data: {
                ...(docMeta.label && { label: docMeta.label }),
                ...(docMeta.mimeType && { mimeType: docMeta.mimeType }),
                ...(docMeta.size && { size: docMeta.size }),
              },
            });
          }
        })
      );

    await Promise.all(propertyDocOperations);
  }

  // Documents du bail
  if (intakeLink.bailId && payload.bailDocuments && Array.isArray(payload.bailDocuments)) {
    const bailDocOperations = payload.bailDocuments
      .filter((docMeta: any) => docMeta.fileKey)
      .map((docMeta: any) =>
        tx.document.findFirst({
          where: {
            bailId: intakeLink.bailId,
            fileKey: docMeta.fileKey,
          },
        }).then(async (existingDoc: any) => {
          if (existingDoc && !existingDoc.uploadedById) {
            await tx.document.update({
              where: { id: existingDoc.id },
              data: {
                ...(docMeta.label && { label: docMeta.label }),
                ...(docMeta.mimeType && { mimeType: docMeta.mimeType }),
                ...(docMeta.size && { size: docMeta.size }),
              },
            });
          }
        })
      );

    await Promise.all(bailDocOperations);
  }
}


// Récupérer les documents déjà uploadés pour un intake (sans authentification, accessible via token)
// Les documents sont maintenant stockés directement en base de données
export async function getIntakeDocuments(token: string) {
  console.log("[getIntakeDocuments] Récupération des documents pour token:", token);
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
  // Ce sont les documents qui ont un clientId mais pas de personId ni entrepriseId
  if (intakeLink.clientId) {
    const clientDocs = await prisma.document.findMany({
      where: { 
        clientId: intakeLink.clientId,
        personId: null,
        entrepriseId: null,
      },
      orderBy: { createdAt: "desc" },
    });
    documents.push(...clientDocs);
  }

  // Récupérer les documents des personnes (ID_IDENTITY)
  if (intakeLink.client?.persons) {
    for (const person of intakeLink.client.persons) {
      const personDocs = await prisma.document.findMany({
        where: { personId: person.id },
        orderBy: { createdAt: "desc" },
      });
      // Ajouter personIndex pour faciliter le filtrage
      personDocs.forEach((doc, index) => {
        documents.push({
          ...doc,
          personIndex: intakeLink.client?.persons?.indexOf(person) || 0,
        });
      });
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

  console.log("[getIntakeDocuments] Total documents récupérés:", documents.length, documents.map(d => ({ kind: d.kind, fileKey: d.fileKey?.substring(0, 50) })));
  return documents;
}

// Supprimer un document directement depuis la base de données
export async function deleteDocumentFromRawPayload(data: {
  token: string;
  fileKey: string;
  kind: DocumentKind | string;
  personIndex?: number;
}) {
  const { token, fileKey, kind, personIndex } = data;

  const intakeLink = await prisma.intakeLink.findUnique({
    where: { token },
    include: {
      client: {
        include: {
          persons: true,
          entreprise: true,
        },
      },
    },
  });

  if (!intakeLink) {
    throw new Error("Lien d'intake introuvable");
  }

  // Supprimer le fichier du blob si il existe
  try {
    const { deleteBlobFiles } = await import("@/lib/actions/documents");
    await deleteBlobFiles([fileKey]);
  } catch (error) {
    // Ne pas faire échouer la suppression si le fichier blob n'existe pas
    console.error(`Erreur lors de la suppression du fichier blob ${fileKey}:`, error);
  }

  let deleted = false;
  let documentToDelete = null;

  // Trouver le document à supprimer en cherchant dans tous les emplacements possibles
  if (personIndex !== undefined && intakeLink.client?.persons) {
    const person = intakeLink.client.persons[personIndex];
    if (person) {
      documentToDelete = await prisma.document.findFirst({
        where: {
          personId: person.id,
          fileKey,
          kind: kind as any,
        },
      });
    }
  }

  if (!documentToDelete && intakeLink.client?.entreprise) {
    documentToDelete = await prisma.document.findFirst({
      where: {
        entrepriseId: intakeLink.client.entreprise.id,
        fileKey,
        kind: kind as any,
      },
    });
  }

  if (!documentToDelete && intakeLink.clientId) {
    documentToDelete = await prisma.document.findFirst({
      where: {
        clientId: intakeLink.clientId,
        fileKey,
        kind: kind as any,
      },
    });
  }

  if (!documentToDelete && intakeLink.propertyId) {
    documentToDelete = await prisma.document.findFirst({
      where: {
        propertyId: intakeLink.propertyId,
        fileKey,
        kind: kind as any,
      },
    });
  }

  if (!documentToDelete && intakeLink.bailId) {
    documentToDelete = await prisma.document.findFirst({
      where: {
        bailId: intakeLink.bailId,
        fileKey,
        kind: kind as any,
      },
    });
  }

  // Si le document existe, le supprimer
  if (documentToDelete) {
    // Supprimer le fichier du blob si il existe
    try {
      const { deleteBlobFiles } = await import("@/lib/actions/documents");
      await deleteBlobFiles([documentToDelete.fileKey]);
    } catch (error) {
      // Ne pas faire échouer la suppression si le fichier blob n'existe pas
      console.error(`Erreur lors de la suppression du fichier blob ${documentToDelete.fileKey}:`, error);
    }

    // Supprimer le document de la base de données
    await prisma.document.delete({
      where: { id: documentToDelete.id },
    });
    
    deleted = true;
  }

  return { success: true, deleted };
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

