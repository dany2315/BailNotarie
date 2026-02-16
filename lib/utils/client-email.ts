"use server";

import { prisma } from "@/lib/prisma";
import { ClientType, ProfilType } from "@prisma/client";

/**
 * Récupère l'email d'un client
 */
export async function getClientEmail(clientId: string): Promise<string | null> {
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
    return null;
  }

  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.[0];
    return primaryPerson?.email || null;
  }

  return client.entreprise?.email || null;
}

/**
 * Récupère le nom d'un client
 */
export async function getClientName(clientId: string): Promise<string | null> {
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
    return null;
  }

  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.[0];
    if (primaryPerson) {
      const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
      return name || primaryPerson.email || null;
    }
    return null;
  }

  if (client.entreprise) {
    return client.entreprise.legalName || client.entreprise.name || client.entreprise.email || null;
  }

  return null;
}

/**
 * Récupère l'email et le nom d'un client
 */
export async function getClientEmailAndName(clientId: string): Promise<{ email: string | null; name: string | null; profilType: ProfilType }> {
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
    return { email: null, name: null, profilType: ProfilType.LEAD };
  }

  let email: string | null = null;
  let name: string | null = null;

  if (client.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = client.persons?.[0];
    if (primaryPerson) {
      email = primaryPerson.email || null;
      const fullName = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
      name = fullName || primaryPerson.email || null;
    }
  } else {
    if (client.entreprise) {
      email = client.entreprise.email || null;
      name = client.entreprise.legalName || client.entreprise.name || client.entreprise.email || null;
    }
  }

  return { email, name, profilType: client.profilType };
}


