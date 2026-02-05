"use server";

import { prisma } from "@/lib/prisma";
import { getClientType } from "@/lib/utils/client-type";
import { ProfilType } from "@prisma/client";

/**
 * Récupère les informations d'un client pour l'affichage dans le header
 */
export async function getClientInfoForHeader(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {

      entreprise: true,
      persons: {
        where: { isPrimary: true },
        take: 1,
      },
    },
  });

  if (!client) {
    return null;
  }

  const clientType = getClientType(client);
  
  let name: string | null = null;
  let email: string | null = null;
  let profilType: ProfilType | null = null;

  if (clientType === "entreprise" && client.entreprise) {
    name = client.entreprise.legalName || client.entreprise.name || null;
    email = client.entreprise.email;
  } else if (clientType === "particulier" && client.persons && client.persons.length > 0) {
    const primaryPerson = client.persons[0];
    name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || null;
    email = primaryPerson.email;
  }

  if (client.profilType === ProfilType.PROPRIETAIRE) {
    profilType = ProfilType.PROPRIETAIRE;
  } else if (client.profilType === ProfilType.LOCATAIRE) {
    profilType = ProfilType.LOCATAIRE;
  }

  return {
    name,
    email,
    clientType,
    profilType,
  };
}




