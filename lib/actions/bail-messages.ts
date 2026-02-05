"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth, canAccessBail } from "@/lib/auth-helpers";
import { Role, BailMessageType, NotaireRequestStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { isUserOnlineInChannel, pusherServer } from "@/lib/pusher";
import { triggerChatMessageNotificationEmail, triggerDocumentReceivedEmail } from "@/lib/inngest/helpers";

/**
 * Récupère tous les messages d'un bail avec les demandes triés par date
 */
export async function getBailMessages(bailId: string) {
  const user = await requireAuth();

  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    const hasAccess = await canAccessBail(user.id, bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
  } else if (user.role === Role.NOTAIRE) {
    // Vérifier que le notaire est assigné à ce bail
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: user.id,
      },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
  } else {
    throw new Error("Non autorisé");
  }

  const messages = await prisma.bailMessage.findMany({
    where: { bailId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      document: {
        select: {
          id: true,
          label: true,
          fileKey: true,
          mimeType: true,
          size: true,
        },
      },
      notaireRequest: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return messages;
}

/**
 * Récupère les messages et demandes d'un bail triés ensemble par date
 * @param bailId - ID du bail
 * @param filterByPartyId - (optionnel) Pour les notaires, filtre les messages par partie spécifique
 */
export async function getBailMessagesAndRequests(bailId: string, filterByPartyId?: string | null) {
  const user = await requireAuth();

  let userClientId: string | null = null;
  let dossierId: string | null = null;

  // Optimisation : exécuter les vérifications en parallèle
  let userProfilType: "PROPRIETAIRE" | "LOCATAIRE" | null = null;
  
  if (user.role === Role.UTILISATEUR) {
    // Pour un client, vérifier l'accès et récupérer le clientId et profilType en parallèle
    const [hasAccess, userWithClient, clientData] = await Promise.all([
      canAccessBail(user.id, bailId),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { clientId: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          client: {
            select: {
              id: true,
              profilType: true,
            },
          },
        },
      }),
    ]);
    
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    userClientId = userWithClient?.clientId || null;
    userProfilType = (clientData?.client?.profilType as "PROPRIETAIRE" | "LOCATAIRE" | null) || null;
    
    // Récupérer le dossierId en arrière-plan
    const dossier = await prisma.dossierNotaireAssignment.findFirst({
      where: { bailId },
      select: { id: true },
    });
    dossierId = dossier?.id || null;
  } else if (user.role === Role.NOTAIRE) {
    // Pour un notaire, on récupère l'assignment qui contient aussi l'ID du dossier
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: user.id,
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
    dossierId = assignment.id;
    
    // Si un filtre par partie est spécifié, récupérer le profilType de cette partie (qui est un Client)
    if (filterByPartyId) {
      const partyClient = await prisma.client.findUnique({
        where: { id: filterByPartyId },
        select: { profilType: true },
      });
      if (partyClient) {
        userProfilType = partyClient.profilType as "PROPRIETAIRE" | "LOCATAIRE" | null;
      }
    }
  } else {
    throw new Error("Non autorisé");
  }

  // Construire le filtre des messages
  let messageWhere: any = { bailId };
  
  if (user.role === Role.UTILISATEUR && userClientId) {
    // Pour un client : voir seulement les messages qu'il a envoyés OU qui lui sont destinés
    messageWhere = {
      bailId,
      OR: [
        { senderId: user.id }, // Messages envoyés par l'utilisateur
        { recipientPartyId: userClientId }, // Messages du notaire destinés à sa partie
      ],
    };
  } else if (user.role === Role.NOTAIRE && filterByPartyId) {
    // Pour un notaire avec filtre : voir les messages liés à cette partie
    messageWhere = {
      bailId,
      OR: [
        { recipientPartyId: filterByPartyId }, // Messages du notaire à cette partie
        { 
          sender: {
            clientId: filterByPartyId, // Messages envoyés par des utilisateurs de cette partie
          },
          recipientPartyId: null, // Messages des clients (qui n'ont pas de destinataire spécifique)
        },
      ],
    };
  }
  // Si notaire sans filtre : voir tous les messages (messageWhere reste { bailId })

  const [messages, requests] = await Promise.all([
    prisma.bailMessage.findMany({
      where: messageWhere,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            clientId: true,
          },
        },
        document: {
          select: {
            id: true,
            label: true,
            fileKey: true,
            mimeType: true,
            size: true,
          },
        },
        notaireRequest: {
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        recipientParty: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    dossierId
      ? prisma.notaireRequest.findMany({
          where: {
            dossierId,
            // Filtrer les demandes selon le profilType de l'utilisateur pour les clients
            // OU selon la partie sélectionnée pour les notaires
            ...(user.role === Role.UTILISATEUR && userClientId && userProfilType
              ? {
                  OR: [
                    // Demande destinée au type de profil de l'utilisateur
                    ...(userProfilType === "PROPRIETAIRE"
                      ? [{ targetProprietaire: true }]
                      : [{ targetLocataire: true }]),
                    // Demande destinée spécifiquement à ce client via targetPartyIds
                    {
                      targetPartyIds: {
                        has: userClientId,
                      },
                    },
                  ],
                }
              : user.role === Role.NOTAIRE && filterByPartyId && userProfilType
              ? {
                  // Pour un notaire avec filtre par partie : voir seulement les demandes destinées à cette partie
                  OR: [
                    // Demande destinée au type de profil de la partie sélectionnée
                    ...(userProfilType === "PROPRIETAIRE"
                      ? [{ targetProprietaire: true }]
                      : [{ targetLocataire: true }]),
                    // Demande destinée spécifiquement à cette partie via targetPartyIds
                    {
                      targetPartyIds: {
                        has: filterByPartyId,
                      },
                    },
                  ],
                }
              : {}), // Pour les notaires sans filtre : voir toutes les demandes
          },
          include: {
            createdBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            // Documents fournis directement liés à cette demande
            documents: {
              select: {
                id: true,
                label: true,
                fileKey: true,
                mimeType: true,
                size: true,
                clientId: true, // Pour identifier de quelle partie vient le document
                createdAt: true,
                client: {
                  select: {
                    id: true,
                    profilType: true,
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
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        })
      : [],
  ]);

  return { messages, requests, userClientId };
}

/**
 * Envoie un message texte dans le chat
 * @param bailId - ID du bail
 * @param content - Contenu du message
 * @param recipientPartyId - ID de la partie destinataire (requis pour les notaires, automatique pour les clients)
 */
export async function sendBailMessage(bailId: string, content: string, recipientPartyId?: string) {
  const user = await requireAuth();

  let finalRecipientPartyId: string | null = recipientPartyId || null;

  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    const hasAccess = await canAccessBail(user.id, bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    // Pour un client, le destinataire n'est pas une partie mais le notaire
    // On laisse recipientPartyId null car le notaire voit tous les messages
    finalRecipientPartyId = null;
  } else if (user.role === Role.NOTAIRE) {
    // Vérifier que le notaire est assigné à ce bail
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: user.id,
      },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
    // Pour un notaire, recipientPartyId est requis pour savoir à qui il parle
    if (!recipientPartyId) {
      throw new Error("Le destinataire est requis pour les messages du notaire");
    }
    finalRecipientPartyId = recipientPartyId;
  } else {
    throw new Error("Non autorisé");
  }

  const message = await prisma.bailMessage.create({
    data: {
      bailId,
      senderId: user.id,
      messageType: BailMessageType.MESSAGE,
      content: content.trim(),
      recipientPartyId: finalRecipientPartyId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      recipientParty: {
        select: {
          id: true,
        },
      },
    },
  });

  // Envoyer l'événement Pusher pour la mise à jour en temps réel
  try {
    await pusherServer.trigger(`presence-bail-${bailId}`, "new-message", {
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
  }

  revalidatePath(`/client/proprietaire/baux/${bailId}`);
  revalidatePath(`/client/locataire/baux/${bailId}`);
  revalidatePath(`/notaire/dossiers`);

  // Envoyer une notification par email si le destinataire n'est pas en ligne
  // Cette opération est faite en arrière-plan pour ne pas bloquer l'envoi du message
  notifyOfflineRecipients(bailId, user, content.trim(), finalRecipientPartyId).catch((error) => {
    console.error("Erreur lors de la notification des destinataires hors ligne:", error);
  });

  return message;
}

/**
 * Notifie les destinataires hors ligne d'un nouveau message via Inngest
 */
async function notifyOfflineRecipients(
  bailId: string,
  sender: { id: string; name: string | null; email: string; role: Role },
  messageContent: string,
  recipientPartyId: string | null
) {
  try {
    const presenceChannel = `presence-bail-${bailId}`;
    
    // Récupérer les informations du bail pour l'adresse
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      include: {
        property: {
          select: {
            fullAddress: true,
          },
        },
      },
    });

    const bailAddress = bail?.property?.fullAddress || null;

    // Trouver les destinataires potentiels selon le rôle de l'expéditeur
    let recipientUsers: { id: string; email: string; name: string | null }[] = [];

    if (sender.role === Role.UTILISATEUR) {
      // Si l'expéditeur est un client, notifier le notaire assigné
      const assignment = await prisma.dossierNotaireAssignment.findFirst({
        where: { bailId },
        include: {
          notaire: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
      
      if (assignment?.notaire) {
        recipientUsers = [assignment.notaire];
      }
    } else if (sender.role === Role.NOTAIRE && recipientPartyId) {
      // Si l'expéditeur est un notaire, notifier uniquement les utilisateurs de la partie destinataire
      const party = await prisma.client.findUnique({
        where: { id: recipientPartyId },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (party?.users) {
        recipientUsers = party.users.filter((u: { id: string }) => u.id !== sender.id);
      }
    }

    // Vérifier quels destinataires sont hors ligne et leur envoyer une notification
    for (const recipient of recipientUsers) {
      const isOnline = await isUserOnlineInChannel(presenceChannel, recipient.id);
      
      if (!isOnline && recipient.email) {
        // Déterminer l'URL du chat selon le type de destinataire
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
        const chatUrl = sender.role === Role.UTILISATEUR
          ? `${baseUrl}/notaire/dossiers` // Le notaire accède au chat depuis ses dossiers
          : `${baseUrl}/client/proprietaire/baux/${bailId}`; // Le client accède au chat depuis son bail

        // Envoyer la notification via Inngest (throttled pour éviter le spam)
        await triggerChatMessageNotificationEmail({
          recipientEmail: recipient.email,
          recipientName: recipient.name,
          senderName: sender.name || sender.email,
          senderRole: sender.role === Role.NOTAIRE ? "notaire" : "client",
          messagePreview: messageContent,
          bailAddress,
          chatUrl,
        });
      }
    }
  } catch (error) {
    // Ne pas faire échouer l'envoi du message si la notification échoue
    console.error("Erreur lors de la notification des destinataires:", error);
  }
}

/**
 * Récupère les demandes d'un bail spécifique
 */
export async function getNotaireRequestsByBail(bailId: string) {
  const user = await requireAuth();

  // Trouver le dossier associé au bail
  const dossier = await prisma.dossierNotaireAssignment.findFirst({
    where: { bailId },
  });

  if (!dossier) {
    return [];
  }

  let userClientId: string | null = null;
  let userProfilType: "PROPRIETAIRE" | "LOCATAIRE" | null = null;

  // Vérifier les permissions et récupérer les infos du client si nécessaire
  if (user.role === Role.UTILISATEUR) {
    const [hasAccess, userWithClient, clientData] = await Promise.all([
      canAccessBail(user.id, bailId),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { clientId: true },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          client: {
            select: {
              id: true,
              profilType: true,
            },
          },
        },
      }),
    ]);
    
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    userClientId = userWithClient?.clientId || null;
    userProfilType = (clientData?.client?.profilType as "PROPRIETAIRE" | "LOCATAIRE" | null) || null;
  } else if (user.role === Role.NOTAIRE) {
    if (dossier.notaireId !== user.id) {
      throw new Error("Non autorisé");
    }
  } else {
    throw new Error("Non autorisé");
  }

  const requests = await prisma.notaireRequest.findMany({
    where: {
      dossierId: dossier.id,
      // Filtrer les demandes selon le profilType de l'utilisateur pour les clients
      ...(user.role === Role.UTILISATEUR && userClientId && userProfilType
        ? {
            OR: [
              // Demande destinée au type de profil de l'utilisateur
              ...(userProfilType === "PROPRIETAIRE"
                ? [{ targetProprietaire: true }]
                : [{ targetLocataire: true }]),
              // Demande destinée spécifiquement à ce client via targetPartyIds
              {
                targetPartyIds: {
                  has: userClientId,
                },
              },
            ],
          }
        : {}), // Pour les notaires, pas de filtre (ils voient toutes les demandes)
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
}

/**
 * Envoie un message avec un ou plusieurs fichiers dans le chat
 * @param bailId - ID du bail
 * @param formData - FormData contenant les fichiers et le contenu
 * @param recipientPartyId - ID de la partie destinataire (requis pour les notaires)
 */
/**
 * Nouvelle fonction pour envoyer un message avec fichiers uploadés directement vers S3
 * Accepte les URLs publiques S3 au lieu de FormData
 */
export async function sendBailMessageWithS3Urls(
  bailId: string,
  files: Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }>,
  content: string = "",
  recipientPartyId?: string
) {
  const user = await requireAuth();

  let finalRecipientPartyId: string | null = recipientPartyId || null;

  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    const hasAccess = await canAccessBail(user.id, bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    // Pour un client, pas de destinataire spécifique (le notaire voit tout)
    finalRecipientPartyId = null;
  } else if (user.role === Role.NOTAIRE) {
    // Vérifier que le notaire est assigné à ce bail
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: user.id,
      },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
    // Pour un notaire, recipientPartyId est requis
    if (!recipientPartyId) {
      throw new Error("Le destinataire est requis pour les messages du notaire");
    }
    finalRecipientPartyId = recipientPartyId;
  } else {
    throw new Error("Non autorisé");
  }

  if (!files || files.length === 0) {
    throw new Error("Au moins un fichier est requis");
  }

  // Créer les documents dans la base de données avec les URLs S3
  const documents = await Promise.all(
    files.map(async (file) => {
      return prisma.document.create({
        data: {
          kind: "OTHER",
          label: file.fileName,
          fileKey: file.publicUrl, // URL publique S3
          mimeType: file.mimeType,
          size: file.size,
          bailId,
          uploadedById: user.id,
        },
      });
    })
  );

  // Créer un message pour chaque document (ou un seul message avec le premier document si plusieurs)
  const fileNames = files.map(f => f.fileName).join(", ");
  const firstDocument = documents[0];

  // Créer le message principal avec le premier document
  const message = await prisma.bailMessage.create({
    data: {
      bailId,
      senderId: user.id,
      messageType: BailMessageType.MESSAGE,
      content: content.trim() || (files.length === 1 ? `Fichier: ${fileNames}` : `${files.length} fichiers: ${fileNames}`),
      documentId: firstDocument.id,
      recipientPartyId: finalRecipientPartyId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      document: {
        select: {
          id: true,
          label: true,
          fileKey: true,
          mimeType: true,
          size: true,
        },
      },
      recipientParty: {
        select: {
          id: true,
        },
      },
    },
  });

  // Créer des messages supplémentaires pour les autres documents
  if (documents.length > 1) {
    await Promise.all(
      documents.slice(1).map((doc) =>
        prisma.bailMessage.create({
          data: {
            bailId,
            senderId: user.id,
            messageType: BailMessageType.MESSAGE,
            content: `Fichier: ${doc.label}`,
            documentId: doc.id,
            recipientPartyId: finalRecipientPartyId,
          },
        })
      )
    );
  }

  // Envoyer l'événement Pusher pour la mise à jour en temps réel
  try {
    await pusherServer.trigger(`presence-bail-${bailId}`, "new-message", {
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
  }

  revalidatePath(`/client/proprietaire/baux/${bailId}`);
  revalidatePath(`/client/locataire/baux/${bailId}`);
  revalidatePath(`/notaire/dossiers`);

  return message;
}

export async function sendBailMessageWithFile(bailId: string, formData: FormData, recipientPartyId?: string) {
  const user = await requireAuth();

  let finalRecipientPartyId: string | null = recipientPartyId || null;

  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    const hasAccess = await canAccessBail(user.id, bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    // Pour un client, pas de destinataire spécifique (le notaire voit tout)
    finalRecipientPartyId = null;
  } else if (user.role === Role.NOTAIRE) {
    // Vérifier que le notaire est assigné à ce bail
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: user.id,
      },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
    // Pour un notaire, recipientPartyId est requis
    if (!recipientPartyId) {
      throw new Error("Le destinataire est requis pour les messages du notaire");
    }
    finalRecipientPartyId = recipientPartyId;
  } else {
    throw new Error("Non autorisé");
  }

  const files = formData.getAll("files") as File[];
  const content = (formData.get("content") as string) || "";

  if (!files || files.length === 0) {
    throw new Error("Au moins un fichier est requis");
  }

  // Uploader tous les fichiers vers S3
  const { uploadFileToS3, generateS3FileKey } = await import("@/lib/utils/s3-client");
  
  const uploadPromises = files.map(async (file) => {
    const fileKey = generateS3FileKey(file.name, bailId);

    const s3Result = await uploadFileToS3(
      file,
      fileKey,
      file.type || "application/octet-stream"
    );

    // Créer le document dans la base de données
    return prisma.document.create({
      data: {
        kind: "OTHER",
        label: file.name,
        fileKey: s3Result.url, // URL publique S3
        mimeType: file.type,
        size: file.size,
        bailId,
        uploadedById: user.id,
      },
    });
  });

  const documents = await Promise.all(uploadPromises);

  // Créer un message pour chaque document (ou un seul message avec le premier document si plusieurs)
  const fileNames = files.map(f => f.name).join(", ");
  const firstDocument = documents[0];

  // Créer le message principal avec le premier document
  const message = await prisma.bailMessage.create({
    data: {
      bailId,
      senderId: user.id,
      messageType: BailMessageType.MESSAGE,
      content: content.trim() || (files.length === 1 ? `Fichier: ${fileNames}` : `${files.length} fichiers: ${fileNames}`),
      documentId: firstDocument.id,
      recipientPartyId: finalRecipientPartyId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      document: {
        select: {
          id: true,
          label: true,
          fileKey: true,
          mimeType: true,
          size: true,
        },
      },
      recipientParty: {
        select: {
          id: true,
        },
      },
    },
  });

  // Créer des messages supplémentaires pour les autres documents
  if (documents.length > 1) {
    await Promise.all(
      documents.slice(1).map((doc) =>
        prisma.bailMessage.create({
          data: {
            bailId,
            senderId: user.id,
            messageType: BailMessageType.MESSAGE,
            content: `Fichier: ${doc.label}`,
            documentId: doc.id,
            recipientPartyId: finalRecipientPartyId,
          },
        })
      )
    );
  }

  // Envoyer l'événement Pusher pour la mise à jour en temps réel
  try {
    await pusherServer.trigger(`presence-bail-${bailId}`, "new-message", {
      message: {
        ...message,
        createdAt: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
  }

  revalidatePath(`/client/proprietaire/baux/${bailId}`);
  revalidatePath(`/client/locataire/baux/${bailId}`);
  revalidatePath(`/notaire/dossiers`);

  return message;
}

/**
 * Ajoute un document du chat aux documents annexes du bail (pour le notaire)
 */
export async function addChatDocumentToBail(bailId: string, documentId: string) {
  const user = await requireAuth();

  // Vérifier que l'utilisateur est un notaire assigné à ce bail
  if (user.role !== Role.NOTAIRE) {
    throw new Error("Seuls les notaires peuvent ajouter des documents au bail");
  }

  const assignment = await prisma.dossierNotaireAssignment.findFirst({
    where: {
      bailId,
      notaireId: user.id,
    },
  });

  if (!assignment) {
    throw new Error("Non autorisé");
  }

  // Vérifier que le document existe et appartient à ce bail
  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || document.bailId !== bailId) {
    throw new Error("Document introuvable ou non associé à ce bail");
  }

  // Le document est déjà associé au bail, on peut juste mettre à jour son type si nécessaire
  // ou créer une copie pour les documents annexes
  // Pour l'instant, on garde le document tel quel car il est déjà lié au bail

  revalidatePath(`/notaire/dossiers`);
  revalidatePath(`/client/proprietaire/baux/${bailId}`);
  revalidatePath(`/client/locataire/baux/${bailId}`);

  return document;
}

/**
 * Met à jour le statut d'une demande de notaire
 */
export async function updateNotaireRequestStatus(
  requestId: string,
  status: NotaireRequestStatus
) {
  const user = await requireAuth();

  // Vérifier les permissions
  if (user.role !== Role.NOTAIRE && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  const request = await prisma.notaireRequest.findUnique({
    where: { id: requestId },
    include: {
      dossier: true,
    },
  });

  if (!request) {
    throw new Error("Demande introuvable");
  }

  // Vérifier que le notaire a accès à cette demande
  if (user.role === Role.NOTAIRE && request.dossier.notaireId !== user.id) {
    throw new Error("Non autorisé");
  }

  const updatedRequest = await prisma.notaireRequest.update({
    where: { id: requestId },
    data: { status },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        select: {
          id: true,
          label: true,
          fileKey: true,
          mimeType: true,
          size: true,
        },
      },
    },
  });

  // Envoyer l'événement Pusher pour la mise à jour en temps réel
  if (request.dossier.bailId) {
    try {
      await pusherServer.trigger(`presence-bail-${request.dossier.bailId}`, "request-updated", {
        request: {
          ...updatedRequest,
          createdAt: updatedRequest.createdAt.toISOString(),
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
    }
  }

  revalidatePath(`/notaire/dossiers`);
  if (request.dossier.bailId) {
    revalidatePath(`/client/proprietaire/baux/${request.dossier.bailId}`);
    revalidatePath(`/client/locataire/baux/${request.dossier.bailId}`);
  }

  return updatedRequest;
}

/**
 * Ajoute un document à une demande de notaire
 */
/**
 * Nouvelle fonction pour ajouter des documents à une demande avec URLs S3
 * Accepte les URLs publiques S3 au lieu de FormData
 */
export async function addDocumentToNotaireRequestWithS3Urls(
  requestId: string,
  files: Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }>
) {
  const user = await requireAuth();

  // Récupérer le clientId de l'utilisateur s'il est un client
  let userClientId: string | null = null;
  
  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    // Les utilisateurs peuvent répondre aux demandes qui les concernent
    const [request, userWithClient] = await Promise.all([
      prisma.notaireRequest.findUnique({
        where: { id: requestId },
        include: {
          dossier: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { clientId: true },
      }),
    ]);

    if (!request) {
      throw new Error("Demande introuvable");
    }

    if (!request.dossier.bailId) {
      throw new Error("Cette demande n'est pas liée à un bail");
    }

    const hasAccess = await canAccessBail(user.id, request.dossier.bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    
    // Récupérer le clientId de l'utilisateur
    userClientId = userWithClient?.clientId || null;
  } else if (user.role === Role.NOTAIRE) {
    const request = await prisma.notaireRequest.findUnique({
      where: { id: requestId },
      include: {
        dossier: true,
      },
    });

    if (!request || request.dossier.notaireId !== user.id) {
      throw new Error("Non autorisé");
    }
  } else {
    throw new Error("Non autorisé");
  }

  if (!files || files.length === 0) {
    throw new Error("Au moins un fichier est requis");
  }

  const request = await prisma.notaireRequest.findUnique({
    where: { id: requestId },
    include: {
      dossier: true,
    },
  });

  if (!request || !request.dossier.bailId) {
    throw new Error("Demande introuvable ou non liée à un bail");
  }

  // Créer les documents dans la base de données avec les URLs S3
  const documents = await Promise.all(
    files.map(async (file) => {
      return prisma.document.create({
        data: {
          kind: "OTHER",
          label: file.fileName,
          fileKey: file.publicUrl, // URL publique S3
          mimeType: file.mimeType,
          size: file.size,
          bailId: request.dossier.bailId,
          clientId: userClientId, // Lier le document au client qui l'envoie
          uploadedById: user.id,
          notaireRequestId: requestId, // Rattacher directement le document à la demande
        },
      });
    })
  );

  // Mettre à jour le statut de la demande en COMPLETED quand un document est ajouté
  await prisma.notaireRequest.update({
    where: { id: requestId },
    data: { status: NotaireRequestStatus.COMPLETED },
  });

  // Envoyer l'événement Pusher pour notifier que la demande a été complétée
  if (request.dossier.bailId) {
    try {
      // Émettre un événement pour mettre à jour le statut de la demande avec les documents
      await pusherServer.trigger(`presence-bail-${request.dossier.bailId}`, "request-updated", {
        request: {
          id: request.id,
          status: NotaireRequestStatus.COMPLETED,
          documents: documents.map(doc => ({
            id: doc.id,
            label: doc.label,
            fileKey: doc.fileKey,
            mimeType: doc.mimeType,
            size: doc.size,
          })),
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
    }

    // Envoyer un email au notaire pour le notifier du document reçu
    try {
      console.log("[addDocumentToNotaireRequestWithS3Urls] Préparation de l'email pour le notaire...");
      console.log("[addDocumentToNotaireRequestWithS3Urls] request.dossierId:", request.dossierId);
      
      // Récupérer les informations du notaire et du client
      const dossierWithNotaire = await prisma.dossierNotaireAssignment.findUnique({
        where: { id: request.dossierId },
        include: {
          notaire: {
            select: {
              email: true,
              name: true,
            },
          },
          bail: {
            include: {
              property: {
                select: { fullAddress: true },
              },
            },
          },
        },
      });

      console.log("[addDocumentToNotaireRequestWithS3Urls] dossierWithNotaire:", dossierWithNotaire ? "trouvé" : "null");
      console.log("[addDocumentToNotaireRequestWithS3Urls] notaire:", dossierWithNotaire?.notaire ? dossierWithNotaire.notaire.email : "null");

      if (dossierWithNotaire?.notaire) {
        // Récupérer le nom du client qui envoie le document
        const clientInfo = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            client: {
              include: {
                persons: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { firstName: true, lastName: true },
                },
                entreprise: {
                  select: { legalName: true, name: true },
                },
              },
            },
          },
        });

        let clientName = user.name || user.email;
        if (clientInfo?.client) {
          const primaryPerson = clientInfo.client.persons[0];
          if (primaryPerson) {
            clientName = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || clientName;
          } else if (clientInfo.client.entreprise) {
            clientName = clientInfo.client.entreprise.legalName || clientInfo.client.entreprise.name || clientName;
          }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
        const documentNames = documents.map(doc => doc.label || "Document");

        console.log("[addDocumentToNotaireRequestWithS3Urls] Envoi de l'email via Inngest...");
        console.log("[addDocumentToNotaireRequestWithS3Urls] Données email:", {
          notaireEmail: dossierWithNotaire.notaire.email,
          clientName,
          requestTitle: request.title,
          documentNames,
        });

        await triggerDocumentReceivedEmail({
          notaireEmail: dossierWithNotaire.notaire.email,
          notaireName: dossierWithNotaire.notaire.name,
          clientName,
          requestTitle: request.title,
          documentNames,
          bailAddress: dossierWithNotaire.bail?.property?.fullAddress || null,
          chatUrl: `${baseUrl}/notaire/dossiers`,
        });
        
        console.log("[addDocumentToNotaireRequestWithS3Urls] Email envoyé avec succès via Inngest");
      } else {
        console.log("[addDocumentToNotaireRequestWithS3Urls] Notaire non trouvé, email non envoyé");
      }
    } catch (emailError) {
      console.error("[addDocumentToNotaireRequestWithS3Urls] Erreur lors de l'envoi de l'email au notaire:", emailError);
      // Ne pas faire échouer la fonction si l'email échoue
    }
  }

  revalidatePath(`/notaire/dossiers`);
  revalidatePath(`/client/proprietaire/baux/${request.dossier.bailId}`);
  revalidatePath(`/client/locataire/baux/${request.dossier.bailId}`);

  return documents[0]; // Retourner le premier document
}

export async function addDocumentToNotaireRequest(
  requestId: string,
  formData: FormData
) {
  const user = await requireAuth();

  // Récupérer le clientId de l'utilisateur s'il est un client
  let userClientId: string | null = null;
  
  // Vérifier les permissions
  if (user.role === Role.UTILISATEUR) {
    // Les utilisateurs peuvent répondre aux demandes qui les concernent
    const [request, userWithClient] = await Promise.all([
      prisma.notaireRequest.findUnique({
        where: { id: requestId },
        include: {
          dossier: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { clientId: true },
      }),
    ]);

    if (!request) {
      throw new Error("Demande introuvable");
    }

    if (!request.dossier.bailId) {
      throw new Error("Cette demande n'est pas liée à un bail");
    }

    const hasAccess = await canAccessBail(user.id, request.dossier.bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
    
    // Récupérer le clientId de l'utilisateur
    userClientId = userWithClient?.clientId || null;
  } else if (user.role === Role.NOTAIRE) {
    const request = await prisma.notaireRequest.findUnique({
      where: { id: requestId },
      include: {
        dossier: true,
      },
    });

    if (!request || request.dossier.notaireId !== user.id) {
      throw new Error("Non autorisé");
    }
  } else {
    throw new Error("Non autorisé");
  }

  const files = formData.getAll("files") as File[];

  if (!files || files.length === 0) {
    throw new Error("Au moins un fichier est requis");
  }

  const request = await prisma.notaireRequest.findUnique({
    where: { id: requestId },
    include: {
      dossier: true,
    },
  });

  if (!request || !request.dossier.bailId) {
    throw new Error("Demande introuvable ou non liée à un bail");
  }

  // Uploader tous les fichiers vers S3
  const { uploadFileToS3, generateS3FileKey } = await import("@/lib/utils/s3-client");
  
  const uploadPromises = files.map(async (file) => {
    const fileKey = generateS3FileKey(file.name, request.dossier.bailId ?? undefined);

    const s3Result = await uploadFileToS3(
      file,
      fileKey,
      file.type || "application/octet-stream"
    );

    // Créer le document dans la base de données avec le clientId et notaireRequestId
    return prisma.document.create({
      data: {
        kind: "OTHER",
        label: file.name,
        fileKey: s3Result.url,
        mimeType: file.type,
        size: file.size,
        bailId: request.dossier.bailId,
        clientId: userClientId, // Lier le document au client qui l'envoie
        uploadedById: user.id,
        notaireRequestId: requestId, // Rattacher directement le document à la demande
      },
    });
  });

  const documents = await Promise.all(uploadPromises);

  // Mettre à jour le statut de la demande en COMPLETED quand un document est ajouté
  await prisma.notaireRequest.update({
    where: { id: requestId },
    data: { status: NotaireRequestStatus.COMPLETED },
  });

  // Envoyer l'événement Pusher pour notifier que la demande a été complétée
  if (request.dossier.bailId) {
    try {
      // Émettre un événement pour mettre à jour le statut de la demande avec les documents
      await pusherServer.trigger(`presence-bail-${request.dossier.bailId}`, "request-updated", {
        request: {
          id: request.id,
          status: NotaireRequestStatus.COMPLETED,
          documents: documents.map(doc => ({
            id: doc.id,
            label: doc.label,
            fileKey: doc.fileKey,
            mimeType: doc.mimeType,
            size: doc.size,
          })),
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
    }

    // Envoyer un email au notaire pour le notifier du document reçu
    try {
      console.log("[addDocumentToNotaireRequest] Préparation de l'email pour le notaire...");
      console.log("[addDocumentToNotaireRequest] request.dossierId:", request.dossierId);
      
      // Récupérer les informations du notaire et du client
      const dossierWithNotaire = await prisma.dossierNotaireAssignment.findUnique({
        where: { id: request.dossierId },
        include: {
          notaire: {
            select: {
              email: true,
              name: true,
            },
          },
          bail: {
            include: {
              property: {
                select: { fullAddress: true },
              },
            },
          },
        },
      });

      console.log("[addDocumentToNotaireRequest] dossierWithNotaire:", dossierWithNotaire ? "trouvé" : "null");
      console.log("[addDocumentToNotaireRequest] notaire:", dossierWithNotaire?.notaire ? dossierWithNotaire.notaire.email : "null");

      if (dossierWithNotaire?.notaire) {
        // Récupérer le nom du client qui envoie le document
        const clientInfo = await prisma.user.findUnique({
          where: { id: user.id },
          include: {
            client: {
              include: {
                persons: {
                  where: { isPrimary: true },
                  take: 1,
                  select: { firstName: true, lastName: true },
                },
                entreprise: {
                  select: { legalName: true, name: true },
                },
              },
            },
          },
        });

        let clientName = user.name || user.email;
        if (clientInfo?.client) {
          const primaryPerson = clientInfo.client.persons[0];
          if (primaryPerson) {
            clientName = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || clientName;
          } else if (clientInfo.client.entreprise) {
            clientName = clientInfo.client.entreprise.legalName || clientInfo.client.entreprise.name || clientName;
          }
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.bailnotarie.fr";
        const documentNames = documents.map(doc => doc.label || "Document");

        console.log("[addDocumentToNotaireRequest] Envoi de l'email via Inngest...");
        console.log("[addDocumentToNotaireRequest] Données email:", {
          notaireEmail: dossierWithNotaire.notaire.email,
          clientName,
          requestTitle: request.title,
          documentNames,
        });

        await triggerDocumentReceivedEmail({
          notaireEmail: dossierWithNotaire.notaire.email,
          notaireName: dossierWithNotaire.notaire.name,
          clientName,
          requestTitle: request.title,
          documentNames,
          bailAddress: dossierWithNotaire.bail?.property?.fullAddress || null,
          chatUrl: `${baseUrl}/notaire/dossiers`,
        });
        
        console.log("[addDocumentToNotaireRequest] Email envoyé avec succès via Inngest");
      } else {
        console.log("[addDocumentToNotaireRequest] Notaire non trouvé, email non envoyé");
      }
    } catch (emailError) {
      console.error("[addDocumentToNotaireRequest] Erreur lors de l'envoi de l'email au notaire:", emailError);
      // Ne pas faire échouer la fonction si l'email échoue
    }
  }

  revalidatePath(`/notaire/dossiers`);
  revalidatePath(`/client/proprietaire/baux/${request.dossier.bailId}`);
  revalidatePath(`/client/locataire/baux/${request.dossier.bailId}`);

  return documents[0]; // Retourner le premier document
}

/**
 * Supprime un message du chat et son document associé si présent
 */
export async function deleteBailMessage(messageId: string) {
  const user = await requireAuth();

  // Récupérer le message pour vérifier les permissions
  const message = await prisma.bailMessage.findUnique({
    where: { id: messageId },
    include: {
      bail: true,
      document: true,
    },
  });

  if (!message) {
    throw new Error("Message introuvable");
  }

  // Vérifier les permissions
  // Seul l'expéditeur peut supprimer son message
  if (message.senderId !== user.id) {
    throw new Error("Vous ne pouvez supprimer que vos propres messages");
  }

  // Vérifier l'accès au bail
  if (user.role === Role.UTILISATEUR) {
    const hasAccess = await canAccessBail(user.id, message.bailId);
    if (!hasAccess) {
      throw new Error("Non autorisé");
    }
  } else if (user.role === Role.NOTAIRE) {
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId: message.bailId,
        notaireId: user.id,
      },
    });
    if (!assignment) {
      throw new Error("Non autorisé");
    }
  } else {
    throw new Error("Non autorisé");
  }

  // Supprimer le document associé s'il existe
  if (message.document) {
    try {
      // Supprimer le fichier de S3
      const { deleteFileFromS3, extractS3KeyFromUrl } = await import("@/lib/utils/s3-client");
      if (message.document.fileKey) {
        const s3Key = extractS3KeyFromUrl(message.document.fileKey);
        if (s3Key) {
          await deleteFileFromS3(s3Key);
        }
      }
      
      // Supprimer le document de la base de données
      const { deleteDocumentFromDB } = await import("@/lib/actions/documents");
      await deleteDocumentFromDB(message.document.id);
    } catch (error) {
      // Ne pas faire échouer la suppression du message si le document ne peut pas être supprimé
      console.error(`Erreur lors de la suppression du document ${message.document.id}:`, error);
    }
  }

  // Supprimer le message
  await prisma.bailMessage.delete({
    where: { id: messageId },
  });

  // Envoyer l'événement Pusher pour la suppression en temps réel
  try {
    await pusherServer.trigger(`presence-bail-${message.bailId}`, "message-deleted", {
      messageId,
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'événement Pusher:", error);
  }

  revalidatePath(`/client/proprietaire/baux/${message.bailId}`);
  revalidatePath(`/client/locataire/baux/${message.bailId}`);
  revalidatePath(`/notaire/dossiers`);

  return { success: true };
}

/**
 * Récupère l'autre utilisateur dans le chat (pour un client, c'est le notaire, et vice versa)
 */
export async function getChatOtherUser(bailId: string) {
  const user = await requireAuth();

  if (user.role === Role.UTILISATEUR) {
    // Pour un client, trouver le notaire assigné
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: { bailId },
      include: {
        notaire: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!assignment?.notaire) {
      return null;
    }

    return {
      id: assignment.notaire.id,
      name: assignment.notaire.name,
      email: assignment.notaire.email,
      role: assignment.notaire.role,
    };
  } else if (user.role === Role.NOTAIRE) {
    // Pour un notaire, trouver le premier client du bail
    const bail = await prisma.bail.findUnique({
      where: { id: bailId },
      include: {
        parties: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
              take: 1,
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
          take: 1,
        },
      },
    });

    if (!bail?.parties?.[0]) {
      return null;
    }

    const party = bail.parties[0];
    const partyUser = party.users[0];
    const primaryPerson = party.persons[0];

    if (partyUser) {
      return {
        id: partyUser.id,
        name: partyUser.name || (primaryPerson ? `${primaryPerson.firstName} ${primaryPerson.lastName}` : null),
        email: partyUser.email,
        role: partyUser.role,
        partyId: party.id,
      };
    }

    return null;
  }

  return null;
}

/**
 * Récupère l'utilisateur d'une partie spécifique pour le chat (utilisé par le notaire)
 */
export async function getChatOtherUserByParty(bailId: string, partyId: string) {
  const user = await requireAuth();

  if (user.role !== Role.NOTAIRE) {
    throw new Error("Non autorisé");
  }

  // Vérifier que le notaire est assigné à ce bail
  const assignment = await prisma.dossierNotaireAssignment.findFirst({
    where: {
      bailId,
      notaireId: user.id,
    },
  });

  if (!assignment) {
    throw new Error("Non autorisé");
  }

  // Récupérer la partie et ses utilisateurs
  const party = await prisma.client.findUnique({
    where: { id: partyId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        take: 1,
      },
      // Récupérer d'abord les personnes primaires, sinon toutes les personnes
      persons: {
        orderBy: [
          { isPrimary: "desc" }, // Les personnes primaires en premier
          { createdAt: "asc" },  // Puis par date de création
        ],
        take: 1,
        select: {
          firstName: true,
          lastName: true,
        },
      },
      // Récupérer aussi l'entreprise si c'est une personne morale
      entreprise: {
        select: {
          legalName: true,
          name: true,
        },
      },
    },
  });

  if (!party) {
    return null;
  }

  const partyUser = party.users[0];
  const primaryPerson = party.persons[0];
  const entreprise = party.entreprise;

  // Construire le nom à afficher
  let displayName: string | null = null;
  if (primaryPerson) {
    displayName = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
  } else if (entreprise) {
    displayName = entreprise.legalName || entreprise.name || null;
  }

  // Libellé du type de profil
  const profilTypeLabel = party.profilType === "PROPRIETAIRE" ? "Propriétaire" 
    : party.profilType === "LOCATAIRE" ? "Locataire" 
    : party.profilType;

  if (partyUser) {
    return {
      id: partyUser.id,
      name: partyUser.name || displayName || partyUser.email,
      email: partyUser.email,
      role: partyUser.role,
      partyId: party.id,
      partyName: displayName || partyUser.name || partyUser.email,
      profilType: profilTypeLabel,
    };
  }

  // Si pas d'utilisateur lié, retourner les infos de la partie quand même
  if (displayName) {
    return {
      id: null,
      name: displayName,
      email: null,
      role: Role.UTILISATEUR,
      partyId: party.id,
      partyName: displayName,
      profilType: profilTypeLabel,
    };
  }

  // Fallback si vraiment rien n'est trouvé
  return {
    id: null,
    name: profilTypeLabel || "Client",
    email: null,
    role: Role.UTILISATEUR,
    partyId: party.id,
    partyName: profilTypeLabel || "Client",
    profilType: profilTypeLabel,
  };
}

