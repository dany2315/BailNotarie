"use server";

import { prisma } from "@/lib/prisma";
import { NotificationType } from "@prisma/client";
import { triggerNotificationEmail } from "@/lib/inngest/helpers";

/**
 * Génère le message de notification à partir du type et des métadonnées
 */
function getNotificationMessageText(
  type: NotificationType,
  metadata?: Record<string, any> | null
): string {
  const meta = metadata || {};
  
  switch (type) {
    case "COMMENT_CREATED": {
      const entityType = meta.entityType || "élément";
      const entityName = meta.entityName || "cet élément";
      return `Nouveau commentaire sur le ${entityType}: ${entityName}`;
    }
    case "CLIENT_CREATED":
      return meta.createdByForm 
        ? "Nouveau client créé via formulaire" 
        : "Nouveau client créé";
    case "CLIENT_UPDATED":
      return "Client modifié";
    case "CLIENT_DELETED":
      return "Client supprimé";
    case "PROPERTY_CREATED":
      return meta.createdByForm 
        ? "Nouveau bien créé via formulaire" 
        : "Nouveau bien créé";
    case "PROPERTY_UPDATED":
      return "Bien modifié";
    case "PROPERTY_DELETED":
      return "Bien supprimé";
    case "BAIL_CREATED":
      return meta.createdByForm 
        ? "Nouveau bail créé via formulaire" 
        : "Nouveau bail créé";
    case "BAIL_UPDATED":
      return "Bail modifié";
    case "BAIL_DELETED":
      return "Bail supprimé";
    case "BAIL_STATUS_CHANGED":
      return `Statut du bail changé: ${meta.oldStatus} → ${meta.newStatus}`;
    case "INTAKE_SUBMITTED":
      return `Formulaire ${meta.intakeTarget === "OWNER" ? "propriétaire" : "locataire"} soumis`;
    case "INTAKE_REVOKED":
      return "Lien d'intake révoqué";
    case "COMPLETION_STATUS_CHANGED": {
      const entityType = meta.entityType === "CLIENT" ? "client" : "bien";
      return `Statut de complétion du ${entityType} changé: ${meta.oldStatus} → ${meta.newStatus}`;
    }
    case "LEAD_CREATED":
      return "Nouveau lead créé";
    case "LEAD_CONVERTED":
      return `Lead converti en ${meta.newProfilType === "PROPRIETAIRE" ? "propriétaire" : "locataire"}`;
    default:
      return "Nouvelle notification";
  }
}

/**
 * Génère le lien vers l'interface selon le type de notification
 */
function getNotificationInterfaceLink(
  targetType: string | null,
  targetId: string | null
): string {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  
  if (!targetType || !targetId) {
    return `${baseUrl}/interface/notifications`;
  }

  switch (targetType) {
    case "CLIENT":
      return `${baseUrl}/interface/clients/${targetId}`;
    case "PROPERTY":
      return `${baseUrl}/interface/properties/${targetId}`;
    case "BAIL":
      return `${baseUrl}/interface/baux/${targetId}`;
    case "INTAKE":
      return `${baseUrl}/interface/intakes`;
    case "COMMENT":
      // Les commentaires sont sur la page de l'entité concernée
      return `${baseUrl}/interface/notifications`;
    default:
      return `${baseUrl}/interface/notifications`;
  }
}

/**
 * Crée une notification pour tous les utilisateurs (sauf celui qui a déclenché l'événement)
 */
export async function createNotificationForAllUsers(
  type: NotificationType,
  targetType: string | null,
  targetId: string | null,
  createdById: string | null,
  metadata?: Record<string, any>
) {
  // Récupérer tous les utilisateurs sauf celui qui a créé l'événement
  const users = await prisma.user.findMany({
    where: createdById ? { id: { not: createdById } } : undefined,
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) {
    return;
  }

  // Générer le message de notification
  const notificationMessage = getNotificationMessageText(type, metadata);
  const interfaceUrl = getNotificationInterfaceLink(targetType, targetId);

  // Créer une notification pour chaque utilisateur
  await prisma.notification.createMany({
    data: users.map((user) => ({
      type,
      targetType,
      targetId,
      createdById,
      recipientId: user.id,
      metadata: metadata || undefined,
    })),
  });

  // Déclencher l'envoi d'email à chaque utilisateur via Inngest (asynchrone, ne bloque pas le rendu)
  const emailPromises = users
    .filter((user) => user.email) // Seulement les utilisateurs avec un email
    .map(async (user) => {
      try {
        await triggerNotificationEmail({
          to: user.email!,
          userName: user.name,
          notificationMessage,
          interfaceUrl,
        });
      } catch (error) {
        console.error(`Erreur lors du déclenchement de l'email à ${user.email}:`, error);
        // On continue même si l'email échoue
      }
    });

  // Déclencher tous les emails en parallèle (sans attendre)
  Promise.all(emailPromises).catch((error) => {
    console.error("Erreur lors du déclenchement des emails de notification:", error);
  });
}

/**
 * Crée une notification pour un utilisateur spécifique
 */
export async function createNotificationForUser(
  type: NotificationType,
  recipientId: string,
  targetType: string | null,
  targetId: string | null,
  createdById: string | null,
  metadata?: Record<string, any>
) {
  // Récupérer l'utilisateur pour obtenir son email
  const user = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true, email: true, name: true },
  });

  if (!user) {
    return;
  }

  // Créer la notification
  await prisma.notification.create({
    data: {
      type,
      targetType,
      targetId,
      createdById,
      recipientId,
      metadata: metadata || undefined,
    },
  });

  // Déclencher l'envoi d'email si l'utilisateur a un email (asynchrone, ne bloque pas le rendu)
  if (user.email) {
    try {
      const notificationMessage = getNotificationMessageText(type, metadata);
      const interfaceUrl = getNotificationInterfaceLink(targetType, targetId);

      await triggerNotificationEmail({
        to: user.email,
        userName: user.name,
        notificationMessage,
        interfaceUrl,
      });
    } catch (error) {
      console.error(`Erreur lors du déclenchement de l'email à ${user.email}:`, error);
      // On continue même si l'email échoue
    }
  }
}

/**
 * Crée une notification pour plusieurs utilisateurs spécifiques
 */
export async function createNotificationForUsers(
  type: NotificationType,
  recipientIds: string[],
  targetType: string | null,
  targetId: string | null,
  createdById: string | null,
  metadata?: Record<string, any>
) {
  if (recipientIds.length === 0) {
    return;
  }

  // Filtrer les IDs pour exclure celui qui a créé l'événement
  const filteredIds = recipientIds.filter((id) => id !== createdById);
  
  if (filteredIds.length === 0) {
    return;
  }

  // Récupérer les utilisateurs pour obtenir leurs emails
  const users = await prisma.user.findMany({
    where: { id: { in: filteredIds } },
    select: { id: true, email: true, name: true },
  });

  // Créer les notifications
  await prisma.notification.createMany({
    data: users.map((user) => ({
      type,
      targetType,
      targetId,
      createdById,
      recipientId: user.id,
      metadata: metadata || undefined,
    })),
  });

  // Générer le message de notification
  const notificationMessage = getNotificationMessageText(type, metadata);
  const interfaceUrl = getNotificationInterfaceLink(targetType, targetId);

  // Déclencher l'envoi d'email à chaque utilisateur via Inngest (asynchrone, ne bloque pas le rendu)
  const emailPromises = users
    .filter((user) => user.email) // Seulement les utilisateurs avec un email
    .map(async (user) => {
      try {
        await triggerNotificationEmail({
          to: user.email!,
          userName: user.name,
          notificationMessage,
          interfaceUrl,
        });
      } catch (error) {
        console.error(`Erreur lors du déclenchement de l'email à ${user.email}:`, error);
        // On continue même si l'email échoue
      }
    });

  // Déclencher tous les emails en parallèle (sans attendre)
  Promise.all(emailPromises).catch((error) => {
    console.error("Erreur lors du déclenchement des emails de notification:", error);
  });
}

