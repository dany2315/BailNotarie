"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { createCommentSchema } from "@/lib/zod/comment";
import { revalidatePath } from "next/cache";
import { CommentTarget, Role, NotificationType } from "@prisma/client";
import { createNotificationForAllUsers } from "@/lib/utils/notifications";

export async function createComment(data: unknown) {
  const user = await requireAuth();
  const validated = createCommentSchema.parse(data);

  const comment = await prisma.commentInterface.create({
    data: {
      target: validated.target as CommentTarget,
      targetId: validated.targetId,
      body: validated.body,
      createdById: user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
  });

  // Récupérer les détails de l'entité concernée pour la notification
  let entityDetails: any = {};
  
  try {
    if (validated.target === "CLIENT") {
      const client = await prisma.client.findUnique({
        where: { id: validated.targetId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          legalName: true,
          email: true,
          type: true,
        },
      });
      if (client) {
        entityDetails = {
          entityType: "client",
          entityName: client.type === "PERSONNE_PHYSIQUE"
            ? `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email || "Client"
            : client.legalName || client.email || "Client",
          entityId: client.id,
        };
      }
    } else if (validated.target === "PROPERTY") {
      const property = await prisma.property.findUnique({
        where: { id: validated.targetId },
        select: {
          id: true,
          label: true,
          fullAddress: true,
        },
      });
      if (property) {
        entityDetails = {
          entityType: "bien",
          entityName: property.label || property.fullAddress || "Bien",
          entityId: property.id,
        };
      }
    } else if (validated.target === "BAIL") {
      const bail = await prisma.bail.findUnique({
        where: { id: validated.targetId },
        include: {
          property: {
            select: {
              id: true,
              label: true,
              fullAddress: true,
            },
          },
          parties: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              legalName: true,
              type: true,
              profilType: true,
            },
          },
        },
      });
      if (bail) {
        const owner = bail.parties.find((p: any) => p.profilType === "PROPRIETAIRE");
        const tenant = bail.parties.find((p: any) => p.profilType === "LOCATAIRE");
        const ownerName = owner
          ? owner.type === "PERSONNE_PHYSIQUE"
            ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
            : owner.legalName || ""
          : "";
        const tenantName = tenant
          ? tenant.type === "PERSONNE_PHYSIQUE"
            ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim()
            : tenant.legalName || ""
          : "";
        const propertyName = bail.property?.label || bail.property?.fullAddress || "";
        
        entityDetails = {
          entityType: "bail",
          entityName: propertyName || `Bail ${ownerName ? `(${ownerName})` : ""}`,
          entityId: bail.id,
          propertyAddress: bail.property?.fullAddress || null,
          ownerName: ownerName || null,
          tenantName: tenantName || null,
        };
      }
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des détails de l'entité:", error);
    // On continue même si on ne peut pas récupérer les détails
  }

  // Créer une notification pour tous les utilisateurs (sauf celui qui a créé le commentaire)
  await createNotificationForAllUsers(
    NotificationType.COMMENT_CREATED,
    validated.target,
    validated.targetId,
    user.id,
    {
      commentId: comment.id,
      commentBody: validated.body.substring(0, 100), // Premiers 100 caractères
      ...entityDetails,
    }
  );

  // Revalidate selon la cible
  if (validated.target === "CLIENT") {
    revalidatePath(`/interface/clients/${validated.targetId}`);
  } else if (validated.target === "PROPERTY") {
    revalidatePath(`/interface/properties/${validated.targetId}`);
  } else if (validated.target === "BAIL") {
    revalidatePath(`/interface/baux/${validated.targetId}`);
  }

  return comment;
}

export async function getComments(target: string, targetId: string) {
  const user = await requireAuth();

  const comments = await prisma.commentInterface.findMany({
    where: {
      target: target as any,
      targetId,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Récupérer les commentaires lus par cet utilisateur
  const commentIds = comments.map((c) => c.id);
  const readComments = await prisma.commentRead.findMany({
    where: {
      userId: user.id,
      commentId: { in: commentIds },
    },
    select: {
      commentId: true,
      readAt: true,
    },
  });

  const readCommentMap = new Map(
    readComments.map((r) => [r.commentId, r.readAt])
  );

  // Ajouter l'information isRead à chaque commentaire
  return comments.map((comment) => ({
    ...comment,
    isRead: readCommentMap.has(comment.id),
    readAt: readCommentMap.get(comment.id) || null,
  }));
}

export async function deleteComment(id: string) {
  const user = await requireAuth();
  const comment = await prisma.commentInterface.findUnique({ where: { id } });

  if (!comment) {
    throw new Error("Commentaire introuvable");
  }

  // Seul l'auteur ou un admin peut supprimer
  if (comment.createdById !== user.id && user.role !== Role.ADMINISTRATEUR) {
    throw new Error("Non autorisé");
  }

  await prisma.commentInterface.delete({ where: { id } });

  // Revalidate selon la cible
  if (comment.target === CommentTarget.CLIENT) {
    revalidatePath(`/interface/clients/${comment.targetId}`);
  } else if (comment.target === CommentTarget.PROPERTY) {
    revalidatePath(`/interface/properties/${comment.targetId}`);
  } else if (comment.target === CommentTarget.BAIL) {
    revalidatePath(`/interface/baux/${comment.targetId}`);
  }
}

/**
 * Compte le nombre de commentaires non lus pour un target/targetId donné
 * Un commentaire est considéré comme non lu s'il n'existe pas d'entrée CommentRead
 * pour ce commentaire et cet utilisateur (sauf si l'utilisateur est l'auteur)
 */
export async function getUnreadCommentsCount(target: string, targetId: string) {
  const user = await requireAuth();

  // Récupérer tous les commentaires pour ce target/targetId
  const allComments = await prisma.commentInterface.findMany({
    where: {
      target: target as any,
      targetId,
    },
    select: {
      id: true,
      createdById: true,
    },
  });

  // Récupérer tous les commentaires lus par cet utilisateur
  const readCommentIds = await prisma.commentRead.findMany({
    where: {
      userId: user.id,
      commentId: { in: allComments.map((c) => c.id) },
    },
    select: {
      commentId: true,
    },
  });

  const readCommentIdSet = new Set(readCommentIds.map((r: { commentId: string }) => r.commentId));

  // Compter les commentaires non lus (non créés par l'utilisateur et non lus)
  return allComments.filter(
    (comment) => comment.createdById !== user.id && !readCommentIdSet.has(comment.id)
  ).length;
}

/**
 * Marque un commentaire comme lu pour l'utilisateur connecté
 */
export async function markCommentAsRead(commentId: string) {
  const user = await requireAuth();

  // Vérifier que le commentaire existe
  const comment = await prisma.commentInterface.findUnique({
    where: { id: commentId },
  });

  if (!comment) {
    throw new Error("Commentaire introuvable");
  }

  // Créer ou mettre à jour l'entrée CommentRead
  // Utiliser findFirst avec update/create car Prisma génère le nom de la clé unique différemment
  const existing = await prisma.commentRead.findFirst({
    where: {
      commentId: commentId,
      userId: user.id,
    },
  });

  if (existing) {
    await prisma.commentRead.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.commentRead.create({
      data: {
        commentId: commentId,
        userId: user.id,
      },
    });
  }

  // Revalidate selon la cible
  if (comment.target === CommentTarget.CLIENT) {
    revalidatePath(`/interface/clients/${comment.targetId}`);
  } else if (comment.target === CommentTarget.PROPERTY) {
    revalidatePath(`/interface/properties/${comment.targetId}`);
  } else if (comment.target === CommentTarget.BAIL) {
    revalidatePath(`/interface/baux/${comment.targetId}`);
  }
}

/**
 * Marque tous les commentaires d'un target/targetId comme lus pour l'utilisateur connecté
 */
export async function markAllCommentsAsReadForTarget(target: string, targetId: string) {
  const user = await requireAuth();

  // Récupérer tous les commentaires pour ce target/targetId
  const comments = await prisma.commentInterface.findMany({
    where: {
      target: target as any,
      targetId,
    },
    select: {
      id: true,
    },
  });

  if (comments.length === 0) {
    return;
  }

  // Marquer tous les commentaires comme lus
  const commentIds = comments.map((c) => c.id);
  
  // Utiliser createMany avec skipDuplicates pour éviter les erreurs si déjà lus
  await prisma.commentRead.createMany({
    data: commentIds.map((commentId) => ({
      commentId,
      userId: user.id,
    })),
    skipDuplicates: true,
  });

  // Mettre à jour readAt pour les commentaires déjà lus
  await prisma.commentRead.updateMany({
    where: {
      commentId: { in: commentIds },
      userId: user.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  // Revalidate selon la cible
  if (target === "CLIENT") {
    revalidatePath(`/interface/clients/${targetId}`);
  } else if (target === "PROPERTY") {
    revalidatePath(`/interface/properties/${targetId}`);
  } else if (target === "BAIL") {
    revalidatePath(`/interface/baux/${targetId}`);
  }
}


