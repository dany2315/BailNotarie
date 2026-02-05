"use server";

import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Crée un User avec rôle UTILISATEUR pour un Client donné
 * Utilise l'email de la Person primary ou de l'Entreprise
 * 
 * @param clientId - ID du Client pour lequel créer le User
 * @returns Le User créé ou existant, ou null si aucun email trouvé
 */
export async function createUserForClient(clientId: string) {
  // Récupérer le Client avec ses relations
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      persons: {
        where: { isPrimary: true },
        take: 1,
      },
      entreprise: true,
    },
  });

  if (!client) {
    throw new Error(`Client avec l'ID ${clientId} introuvable`);
  }

  // Déterminer l'email à utiliser
  let email: string | null = null;
  let name: string | null = null;

  // Si c'est une entreprise, utiliser l'email de l'entreprise
  if (client.entreprise) {
    email = client.entreprise.email;
    name = client.entreprise.legalName || client.entreprise.name || null;
  } 
  // Sinon, utiliser l'email de la Person primary
  else if (client.persons && client.persons.length > 0) {
    const primaryPerson = client.persons[0];
    email = primaryPerson.email;
    name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || null;
  }

  // Si aucun email trouvé, ne pas créer de User
  if (!email) {
    console.warn(`Aucun email trouvé pour le client ${clientId}. User non créé.`);
    return null;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Vérifier si un User existe déjà avec cet email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Si un User existe déjà
  if (existingUser) {
    // Si c'est déjà un UTILISATEUR avec le même clientId, retourner l'existant
    if (existingUser.role === Role.UTILISATEUR && existingUser.clientId === clientId) {
      return existingUser;
    }
    
    // Si c'est un UTILISATEUR mais avec un clientId différent, c'est une erreur
    if (existingUser.role === Role.UTILISATEUR && existingUser.clientId !== clientId) {
      throw new Error(`Un User avec l'email ${normalizedEmail} existe déjà pour un autre client.`);
    }
    
    // Si c'est un autre rôle, c'est une erreur
    throw new Error(`Un User avec l'email ${normalizedEmail} existe déjà avec un rôle différent (${existingUser.role}).`);
  }

  // Créer le User
  try {
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        role: Role.UTILISATEUR,
        name: name,
        clientId: clientId,
        emailVerified: false,
      },
    });

    return user;
  } catch (error: any) {
    // Si le User existe déjà (race condition), le récupérer
    if (error.code === "P2002") {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (user) {
        return user;
      }
    }
    throw error;
  }
}




