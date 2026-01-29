"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";
import { z } from "zod";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailNotaireAssignment from "@/emails/mail-notaire-assignment";
import { triggerNotaireWelcomeEmail, triggerDocumentRequestEmail } from "@/lib/inngest/helpers";
import { pusherServer } from "@/lib/pusher";

// Schémas de validation
const createNotaireSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

const assignDossierSchema = z.object({
  bailId: z.string().min(1, "Le bail est requis"),
  notaireId: z.string().min(1, "Le notaire est requis"),
  notes: z.string().optional().nullable(),
});

const revokeAssignmentSchema = z.object({
  assignmentId: z.string(),
});

/**
 * Helper pour sérialiser les objets Decimal de Prisma en nombres
 * Cela évite l'erreur "Only plain objects can be passed to Client Components"
 */
function serializeDecimal(value: any): any {
  if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
    return Number(value);
  }
  return value;
}

const createNotaireRequestSchema = z.object({
  dossierId: z.string().min(1, "Le dossier est requis"),
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().min(1, "Le contenu est requis"),
  targetProprietaire: z.boolean().default(false),
  targetLocataire: z.boolean().default(false),
  targetPartyIds: z.array(z.string()).default([]), // IDs des parties spécifiques ciblées
});

/**
 * Créer un nouveau notaire
 */
export async function createNotaire(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = createNotaireSchema.parse(data);

  const email = validated.email.toLowerCase().trim();

  // Vérifier si l'utilisateur existe déjà
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    // Si l'utilisateur existe, mettre à jour son rôle en NOTAIRE
    if (existingUser.role !== Role.NOTAIRE) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: Role.NOTAIRE,
          name: validated.name || existingUser.name,
        },
      });
    }
    revalidatePath("/interface/notaires");
    return existingUser;
  }

  // Créer un nouvel utilisateur avec le rôle NOTAIRE
  // Note: Better Auth créera automatiquement un compte, mais on peut aussi le créer manuellement
  // Pour l'instant, on crée juste l'utilisateur dans la base de données
  // Le notaire utilisera l'authentification OTP, donc pas besoin de mot de passe
  const newNotaire = await prisma.user.create({
    data: {
      email,
      name: validated.name,
      role: Role.NOTAIRE,
      emailVerified: false, // Sera vérifié lors de la première connexion OTP
    },
  });

  // Envoyer un email de bienvenue via Inngest
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
    const loginUrl = `${baseUrl}/notaire/login`;

    await triggerNotaireWelcomeEmail({
      email: newNotaire.email,
      userName: newNotaire.name,
      loginUrl,
    });
  } catch (emailError) {
    console.error("Erreur lors de l'envoi de l'email de bienvenue:", emailError);
    // Ne pas faire échouer la création si l'email échoue
  }

  revalidatePath("/interface/notaires");
  return newNotaire;
}

/**
 * Assigner un dossier à un notaire
 * Un dossier = un bail avec toutes ses données (parties et bien)
 */
export async function assignDossierToNotaire(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = assignDossierSchema.parse(data);

  // Vérifier que le notaire existe et est bien un notaire
  const notaire = await prisma.user.findUnique({
    where: { id: validated.notaireId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!notaire || notaire.role !== Role.NOTAIRE) {
    throw new Error("Notaire introuvable ou invalide");
  }

  // Récupérer le bail avec sa propriété et ses parties
  const bail = await prisma.bail.findUnique({
    where: { id: validated.bailId },
    include: {
      property: {
        include: {
          owner: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
    },
  });

  if (!bail) {
    throw new Error("Bail introuvable");
  }

  if (!bail.property) {
    throw new Error("Le bail doit être associé à une propriété");
  }

  // Utiliser le propriétaire de la propriété comme client principal
  // Si le propriétaire n'est pas dans les parties, on l'ajoute logiquement
  const clientId = bail.property.ownerId;

  // Vérifier si l'assignation existe déjà
  const existingAssignment = await prisma.dossierNotaireAssignment.findFirst({
    where: {
      bailId: validated.bailId,
      notaireId: validated.notaireId,
    },
  });

  if (existingAssignment) {
    throw new Error("Ce bail est déjà assigné à ce notaire");
  }

  // Créer l'assignation
  const assignment = await prisma.dossierNotaireAssignment.create({
    data: {
      clientId: clientId,
      propertyId: bail.propertyId,
      bailId: validated.bailId,
      notaireId: validated.notaireId,
      assignedById: user.id,
      notes: validated.notes || null,
    },
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: {
        include: {
          property: true,
          parties: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Envoyer un email de notification au notaire (optionnel)
  try {
    const client = bail.property.owner;
    const clientName = client?.entreprise?.legalName || 
                      (client?.persons?.[0] ? `${client.persons[0].firstName || ""} ${client.persons[0].lastName || ""}`.trim() : "Client") ||
                      "Client";
    const propertyAddress = bail.property.fullAddress || undefined;

    await resendSendEmail({
      from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
      to: notaire.email,
      subject: "Nouveau dossier assigné - BailNotarie",
      react: MailNotaireAssignment({
        userName: notaire.name,
        clientName,
        propertyAddress,
        notes: validated.notes || undefined,
        interfaceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr"}/notaire/dossiers`,
      }),
    });
  } catch (emailError) {
    console.error("Erreur lors de l'envoi de l'email d'assignation:", emailError);
    // Ne pas faire échouer l'assignation si l'email échoue
  }

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignment = JSON.parse(JSON.stringify(assignment, (key, value) => serializeDecimal(value)));

  revalidatePath("/interface/notaires");
  revalidatePath("/interface/baux");
  return serializedAssignment;
}

/**
 * Récupérer tous les dossiers assignés à un notaire
 */
export async function getDossiersByNotaire(notaireId?: string) {
  const user = await requireAuth();
  
  // Si notaireId n'est pas fourni, utiliser l'utilisateur connecté
  const targetNotaireId = notaireId || user.id;

  // Vérifier que l'utilisateur est un notaire ou un admin
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  // Si l'utilisateur est un notaire, il ne peut voir que ses propres dossiers
  if (user.role === Role.NOTAIRE && user.id !== targetNotaireId) {
    throw new Error("Non autorisé");
  }

  const assignments = await prisma.dossierNotaireAssignment.findMany({
    where: {
      notaireId: targetNotaireId,
    },
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: {
        include: {
          property: true,
          parties: {
            include: {
              persons: {
                orderBy: { isPrimary: 'desc' },
              },
              entreprise: true,
              documents: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  // Sérialiser les données pour convertir les Decimal en nombres
  // Cela évite l'erreur "Only plain objects can be passed to Client Components"
  const serializedAssignments = JSON.parse(JSON.stringify(assignments, (key, value) => serializeDecimal(value)));

  return serializedAssignments;
}

/**
 * Récupérer un dossier spécifique (vérifie que le notaire y a accès)
 */
export async function getDossierById(assignmentId: string) {
  const user = await requireAuth();

  const assignment = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      client: {
        include: {
          persons: true,
          entreprise: true,
          documents: true,
        },
      },
      property: {
        include: {
          documents: true,
        },
      },
      bail: {
        include: {
          property: true,
          documents: true,
          parties: {
            include: {
              persons: true,
              entreprise: true,
            },
          },
        },
      },
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
      requests: {
        include: {
          createdBy: {
            select: { id: true, email: true, name: true },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!assignment) {
    throw new Error("Dossier introuvable");
  }

  // Vérifier que l'utilisateur a accès à ce dossier
  if (user.role === Role.NOTAIRE && assignment.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignment = JSON.parse(JSON.stringify(assignment, (key, value) => serializeDecimal(value)));

  return serializedAssignment;
}

/**
 * Révoquer une assignation
 */
export async function revokeAssignment(data: unknown) {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const validated = revokeAssignmentSchema.parse(data);

  const assignment = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: validated.assignmentId },
  });

  if (!assignment) {
    throw new Error("Assignation introuvable");
  }

  await prisma.dossierNotaireAssignment.delete({
    where: { id: validated.assignmentId },
  });

  revalidatePath("/interface/notaires");
  revalidatePath("/interface/baux");
  return { success: true };
}

/**
 * Récupérer tous les notaires
 */
export async function getAllNotaires() {
  await requireRole([Role.ADMINISTRATEUR]);

  const notaires = await prisma.user.findMany({
    where: {
      role: Role.NOTAIRE,
    },
    include: {
      _count: {
        select: {
          notaireAssignments: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notaires;
}

/**
 * Récupérer toutes les assignations (pour l'admin)
 */
export async function getAllAssignations() {
  await requireRole([Role.ADMINISTRATEUR]);

  const assignments = await prisma.dossierNotaireAssignment.findMany({
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      property: true,
      bail: true,
      notaire: {
        select: { id: true, email: true, name: true },
      },
      assignedBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      assignedAt: "desc",
    },
  });

  // Sérialiser les données pour convertir les Decimal en nombres
  const serializedAssignments = JSON.parse(JSON.stringify(assignments, (key, value) => serializeDecimal(value)));

  return serializedAssignments;
}

/**
 * Créer une demande du notaire
 */
export async function createNotaireRequest(data: unknown) {
  const user = await requireAuth();
  
  // Vérifier que l'utilisateur est un notaire
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  const validated = createNotaireRequestSchema.parse(data);

  // Vérifier que le dossier existe et que le notaire y a accès
  const dossier = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: validated.dossierId },
  });

  if (!dossier) {
    throw new Error("Dossier introuvable");
  }

  // Si l'utilisateur est un notaire, vérifier qu'il a accès à ce dossier
  if (user.role === Role.NOTAIRE && dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  // Vérifier qu'au moins un destinataire est sélectionné
  const hasTargetPartyIds = validated.targetPartyIds && validated.targetPartyIds.length > 0;
  if (!validated.targetProprietaire && !validated.targetLocataire && !hasTargetPartyIds) {
    throw new Error("Au moins un destinataire doit être sélectionné");
  }

  // Si des parties spécifiques sont ciblées, vérifier qu'elles appartiennent au bail du dossier
  if (hasTargetPartyIds && dossier.bailId) {
    const bail = await prisma.bail.findUnique({
      where: { id: dossier.bailId },
      include: { parties: true },
    });
    if (bail) {
      const validPartyIds = bail.parties.map(p => p.id);
      const invalidPartyIds = validated.targetPartyIds.filter(id => !validPartyIds.includes(id));
      if (invalidPartyIds.length > 0) {
        throw new Error(`Les parties suivantes n'appartiennent pas à ce bail: ${invalidPartyIds.join(", ")}`);
      }
    }
  }

  // Créer la demande
  const request = await prisma.notaireRequest.create({
    data: {
      dossierId: validated.dossierId,
      title: validated.title,
      content: validated.content,
      targetProprietaire: validated.targetProprietaire,
      targetLocataire: validated.targetLocataire,
      targetPartyIds: validated.targetPartyIds || [],
      createdById: user.id,
    },
    include: {
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  // Émettre l'événement Pusher pour notifier les clients
  if (dossier.bailId) {
    try {
      await pusherServer.trigger(`presence-bail-${dossier.bailId}`, "new-request", {
        request: {
          ...request,
          createdAt: request.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'émission Pusher:", error);
      // Ne pas faire échouer la fonction si Pusher échoue
    }

    // Envoyer un email aux destinataires via Inngest
    try {
      // Récupérer le bail avec ses parties, utilisateurs et adresse
      const bail = await prisma.bail.findUnique({
        where: { id: dossier.bailId },
        include: {
          property: {
            select: { fullAddress: true },
          },
          parties: {
            include: {
              users: {
                select: {
                  email: true,
                  name: true,
                },
              },
              persons: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
              entreprise: {
                select: {
                  legalName: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (bail) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
        const bailAddress = bail.property?.fullAddress || null;
        const notaireName = user.name || user.email;

        // Déterminer les parties destinataires
        const targetParties = bail.parties.filter(party => {
          if (hasTargetPartyIds && validated.targetPartyIds.includes(party.id)) {
            return true;
          }
          if (validated.targetProprietaire && party.profilType === "PROPRIETAIRE") {
            return true;
          }
          if (validated.targetLocataire && party.profilType === "LOCATAIRE") {
            return true;
          }
          return false;
        });

        // Envoyer un email à chaque utilisateur des parties destinataires
        for (const party of targetParties) {
          for (const partyUser of party.users) {
            // Construire le nom du destinataire
            const primaryPerson = party.persons[0];
            const recipientName = partyUser.name || 
              (primaryPerson ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() : null) ||
              (party.entreprise?.legalName || party.entreprise?.name) ||
              null;

            // URL du chat pour le client
            const chatUrl = party.profilType === "PROPRIETAIRE"
              ? `${baseUrl}/client/proprietaire/baux/${dossier.bailId}`
              : `${baseUrl}/client/locataire/baux/${dossier.bailId}`;

            await triggerDocumentRequestEmail({
              recipientEmail: partyUser.email,
              recipientName,
              notaireName,
              requestTitle: validated.title,
              requestContent: validated.content,
              bailAddress,
              chatUrl,
            });
          }
        }
      }
    } catch (emailError) {
      console.error("Erreur lors de l'envoi des emails de demande de document:", emailError);
      // Ne pas faire échouer la fonction si les emails échouent
    }
  }

  revalidatePath(`/notaire/dossiers/${validated.dossierId}`);
  return request;
}

/**
 * Récupère les documents annexes d'un dossier
 * - Documents liés aux demandes du notaire (via notaireRequestId)
 * - Documents envoyés via le chat sans demande (via BailMessage sans notaireRequestId)
 * Filtrés par partie
 */
export async function getDossierAnnexDocuments(dossierId: string) {
  const user = await requireAuth();

  // Vérifier que l'utilisateur est un notaire
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  // Récupérer le dossier
  const dossier = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: dossierId },
    include: {
      requests: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  if (!dossier) {
    throw new Error("Dossier introuvable");
  }

  // Vérifier que le notaire a accès à ce dossier
  if (user.role === Role.NOTAIRE && dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  if (!dossier.bailId) {
    return [];
  }

  // Récupérer le bail pour connaître les parties avec leurs informations complètes
  const bail = await prisma.bail.findUnique({
    where: { id: dossier.bailId },
    include: {
      parties: {
        select: {
          id: true,
          profilType: true,
          entreprise: {
            select: {
              legalName: true,
              name: true,
            },
          },
          persons: {
            select: {
              firstName: true,
              lastName: true,
              isPrimary: true,
            },
            orderBy: { isPrimary: "desc" },
          },
        },
      },
    },
  });

  if (!bail) {
    return [];
  }

  const bailParties = bail.parties;
  const requestIds = dossier.requests.map(r => r.id);

  // Récupérer les documents directement liés aux demandes (via notaireRequestId)
  const documentsFromRequests = await prisma.document.findMany({
    where: {
      notaireRequestId: { in: requestIds },
      bailId: dossier.bailId,
    },
    include: {
      client: {
        select: {
          id: true,
          profilType: true,
          entreprise: {
            select: {
              legalName: true,
              name: true,
            },
          },
          persons: {
            where: { isPrimary: true },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      uploadedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      notaireRequest: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  // Récupérer les documents envoyés via le chat sans demande (via BailMessage sans notaireRequestId)
  const messagesWithoutRequest = await prisma.bailMessage.findMany({
    where: {
      bailId: dossier.bailId,
      documentId: { not: null },
      notaireRequestId: null, // Documents du chat sans demande
    },
    include: {
      document: {
        include: {
          client: {
            select: {
              id: true,
              profilType: true,
              entreprise: {
                select: {
                  legalName: true,
                  name: true,
                },
              },
              persons: {
                where: { isPrimary: true },
                take: 1,
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          uploadedBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      },
      sender: {
        select: {
          id: true,
          email: true,
          name: true,
          clientId: true,
        },
      },
    },
  });

  // Collecter tous les documents avec leurs informations
  const documentsByParty: Record<string, Array<{
    id: string;
    label: string | null;
    fileKey: string;
    mimeType: string | null;
    size: number | null;
    createdAt: Date;
    uploadedBy: {
      id: string;
      email: string;
      name: string | null;
    };
    requestTitle: string | null;
    requestId: string | null;
  }>> = {};

  // Traiter les documents liés aux demandes
  for (const doc of documentsFromRequests) {
    const partyId = doc.clientId || "unknown";
    
    if (!documentsByParty[partyId]) {
      documentsByParty[partyId] = [];
    }

    documentsByParty[partyId].push({
      id: doc.id,
      label: doc.label,
      fileKey: doc.fileKey,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
      uploadedBy: {
        id: doc.uploadedBy?.id || "",
        email: doc.uploadedBy?.email || "",
        name: doc.uploadedBy?.name,
      },
      requestTitle: doc.notaireRequest?.title || null,
      requestId: doc.notaireRequest?.id || null,
    });
  }

  // Traiter les documents du chat sans demande
  for (const message of messagesWithoutRequest) {
    if (!message.document) continue;

    // Déterminer à quelle partie appartient le document
    let partyId: string | null = null;
    
    // D'abord essayer via le clientId du document
    if (message.document.clientId) {
      partyId = message.document.clientId;
    } 
    // Sinon essayer via le sender du message
    else if (message.sender.clientId) {
      partyId = message.sender.clientId;
    }

    const key = partyId || "unknown";

    if (!documentsByParty[key]) {
      documentsByParty[key] = [];
    }

    documentsByParty[key].push({
      id: message.document.id,
      label: message.document.label,
      fileKey: message.document.fileKey,
      mimeType: message.document.mimeType,
      size: message.document.size,
      createdAt: message.document.createdAt,
      uploadedBy: {
        id: message.document.uploadedBy?.id || message.sender.id,
        email: message.document.uploadedBy?.email || message.sender.email,
        name: message.document.uploadedBy?.name || message.sender.name,
      },
      requestTitle: null, // Pas de demande pour les documents du chat
      requestId: null,
    });
  }

  // Fonction helper pour obtenir le nom d'une partie
  const getPartyName = (party: typeof bailParties[0] | undefined): string => {
    if (!party) return "Non identifié";
    if (party.entreprise) {
      return party.entreprise.legalName || party.entreprise.name;
    }
    const primaryPerson = party.persons?.find(p => p.isPrimary) || party.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  // Organiser les documents par partie avec les informations de la partie
  const result = Object.entries(documentsByParty).map(([partyId, documents]) => {
    const party = bailParties.find(p => p.id === partyId);
    return {
      partyId: partyId === "unknown" ? null : partyId,
      partyName: getPartyName(party),
      profilType: party?.profilType || null,
      documents: documents.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    };
  });

  return result;
}

/**
 * Supprimer une demande de document et ses documents associés
 */
export async function deleteNotaireRequest(requestId: string) {
  const user = await requireAuth();

  // Vérifier que l'utilisateur est un notaire
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Seuls les notaires peuvent supprimer des demandes");
  }

  // Récupérer la demande avec ses relations
  const request = await prisma.notaireRequest.findUnique({
    where: { id: requestId },
    include: {
      dossier: true,
      bailMessages: {
        include: {
          document: true,
        },
      },
    },
  });

  if (!request) {
    throw new Error("Demande introuvable");
  }

  // Vérifier que le notaire a accès à ce dossier
  if (user.role === Role.NOTAIRE && request.dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  // Supprimer les fichiers de S3 et les documents associés
  const { deleteFileFromS3, extractS3KeyFromUrl } = await import("@/lib/utils/s3-client");
  for (const message of request.bailMessages) {
    if (message.document) {
      try {
        // Supprimer le fichier de S3
        if (message.document.fileKey) {
          const s3Key = extractS3KeyFromUrl(message.document.fileKey);
          if (s3Key) {
            await deleteFileFromS3(s3Key);
          }
        }
        
        // Supprimer le document de la base de données
        await prisma.document.delete({
          where: { id: message.document.id },
        });
      } catch (error) {
        // Ne pas faire échouer la suppression si un document ne peut pas être supprimé
        console.error(`Erreur lors de la suppression du document ${message.document.id}:`, error);
      }
    }
  }

  // Supprimer les messages associés à la demande
  await prisma.bailMessage.deleteMany({
    where: { notaireRequestId: requestId },
  });

  // Supprimer la demande
  await prisma.notaireRequest.delete({
    where: { id: requestId },
  });

  // Émettre l'événement Pusher pour notifier les clients
  if (request.dossier.bailId) {
    try {
      await pusherServer.trigger(`presence-bail-${request.dossier.bailId}`, "request-deleted", {
        requestId,
      });
    } catch (error) {
      console.error("Erreur lors de l'émission Pusher:", error);
      // Ne pas faire échouer la fonction si Pusher échoue
    }
  }

  revalidatePath(`/notaire/dossiers/${request.dossierId}`);
  if (request.dossier.bailId) {
    revalidatePath(`/client/proprietaire/baux/${request.dossier.bailId}`);
    revalidatePath(`/client/locataire/baux/${request.dossier.bailId}`);
  }

  return { success: true };
}

/**
 * Récupérer les demandes d'un dossier
 */
export async function getNotaireRequestsByDossier(dossierId: string) {
  const user = await requireAuth();

  // Vérifier que le dossier existe et que le notaire y a accès
  const dossier = await prisma.dossierNotaireAssignment.findUnique({
    where: { id: dossierId },
  });

  if (!dossier) {
    throw new Error("Dossier introuvable");
  }

  // Vérifier que l'utilisateur a accès à ce dossier
  if (user.role === Role.NOTAIRE && dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  const requests = await prisma.notaireRequest.findMany({
    where: { dossierId },
    include: {
      createdBy: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
}


