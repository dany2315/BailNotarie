import { auth } from "./auth";
import { prisma } from "./prisma";
import { headers } from "next/headers";

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

