"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

/**
 * Récupère les notifications pour l'utilisateur connecté
 */
export async function getNotifications(params?: {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}) {
  const user = await requireAuth();
  
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const unreadOnly = params?.unreadOnly || false;

  const where: any = {
    recipientId: user.id,
  };

  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      include: {
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);

  // Sérialiser les données
  const serializedNotifications = JSON.parse(JSON.stringify(notifications));

  return {
    notifications: serializedNotifications,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    unreadCount: await prisma.notification.count({
      where: {
        recipientId: user.id,
        isRead: false,
      },
    }),
  };
}

/**
 * Marque une notification comme lue
 */
export async function markNotificationAsRead(id: string) {
  const user = await requireAuth();

  const notification = await prisma.notification.findUnique({
    where: { id },
  });

  if (!notification) {
    throw new Error("Notification introuvable");
  }

  if (notification.recipientId !== user.id) {
    throw new Error("Non autorisé");
  }

  await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/interface");
}

/**
 * Marque toutes les notifications comme lues
 */
export async function markAllNotificationsAsRead() {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      recipientId: user.id,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/interface");
}

/**
 * Récupère le nombre de notifications non lues
 */
export async function getUnreadNotificationCount() {
  const user = await requireAuth();

  return prisma.notification.count({
    where: {
      recipientId: user.id,
      isRead: false,
    },
  });
}

/**
 * Marque toutes les notifications non lues comme lues pour un target/targetId donné
 */
export async function markNotificationsAsReadForTarget(targetType: string, targetId: string) {
  const user = await requireAuth();

  await prisma.notification.updateMany({
    where: {
      recipientId: user.id,
      targetType: targetType,
      targetId: targetId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  revalidatePath("/interface");
}

