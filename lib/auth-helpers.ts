import { auth } from "./auth";
import { prisma } from "./prisma";
import { headers } from "next/headers";
import { ProfilType, Role } from "@prisma/client";

export async function getCurrentUser() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
      },
    });

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
}

export async function signOut() {
  try {
    await auth.api.signOut({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Error signing out:", error);
  }
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function requireRole(allowedRoles: string[]) {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

/**
 * Vérifie qu'un clientId correspond à un IntakeLink valide (PENDING ou SUBMITTED)
 * Utilisé pour sécuriser les actions d'intake qui ne nécessitent pas d'authentification utilisateur
 */
export async function verifyIntakeAccess(clientId: string, target?: "OWNER" | "TENANT" | "LEAD"): Promise<boolean> {
  const { prisma } = await import("./prisma");
  
  const where: any = {
    clientId,
    status: {
      in: ["PENDING"], // Permettre l'accès même si soumis (pour modifications)
    },
  };
  
  if (target) {
    where.target = target;
  }
  
  const intakeLink = await prisma.intakeLink.findFirst({
    where,
  });
  
  return !!intakeLink;
}

/**
 * Récupère le Client lié à un User
 */
export async function getClientFromUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      client: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
    },
  });

  return user?.client || null;
}

/**
 * Récupère le profilType (PROPRIETAIRE/LOCATAIRE) d'un client via son User
 */
export async function getClientProfilType(userId: string): Promise<ProfilType | null> {
  const client = await getClientFromUser(userId);
  return client?.profilType || null;
}

/**
 * Vérifie que l'utilisateur est un client et retourne le Client
 */
export async function requireClientAuth() {
  const user = await requireAuth();
  
  if (user.role !== Role.UTILISATEUR) {
    throw new Error("Forbidden - Accès réservé aux clients");
  }

  const client = await getClientFromUser(user.id);
  
  if (!client) {
    throw new Error("Client introuvable");
  }

  return { user, client };
}

/**
 * Vérifie que l'utilisateur est un client PROPRIETAIRE
 */
export async function requireProprietaireAuth() {
  const { user, client } = await requireClientAuth();
  
  if (client.profilType !== ProfilType.PROPRIETAIRE) {
    throw new Error("Forbidden - Accès réservé aux propriétaires");
  }

  return { user, client };
}

/**
 * Vérifie que l'utilisateur est un client LOCATAIRE
 */
export async function requireLocataireAuth() {
  const { user, client } = await requireClientAuth();
  
  if (client.profilType !== ProfilType.LOCATAIRE) {
    throw new Error("Forbidden - Accès réservé aux locataires");
  }

  return { user, client };
}

/**
 * Vérifie qu'un client peut accéder à un bail (propriétaire OU locataire)
 */
export async function canAccessBail(userId: string, bailId: string): Promise<boolean> {
  const client = await getClientFromUser(userId);
  
  if (!client) {
    return false;
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      parties: true,
    },
  });

  if (!bail) {
    return false;
  }

  // Vérifier si le client est une partie du bail (propriétaire ou locataire)
  return bail.parties.some(party => party.id === client.id);
}

/**
 * Vérifie qu'un client peut accéder à un bien (UNIQUEMENT propriétaire)
 */
export async function canAccessProperty(userId: string, propertyId: string): Promise<boolean> {
  const client = await getClientFromUser(userId);
  
  if (!client) {
    return false;
  }

  // Seuls les propriétaires peuvent accéder aux biens
  if (client.profilType !== ProfilType.PROPRIETAIRE) {
    return false;
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property) {
    return false;
  }

  // Vérifier que le bien appartient au client
  return property.ownerId === client.id;
}

