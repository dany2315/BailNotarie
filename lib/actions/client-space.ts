"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAuth, requireProprietaireAuth, requireLocataireAuth, getClientFromUser } from "@/lib/auth-helpers";
import { ProfilType, BailStatus } from "@prisma/client";

/**
 * Récupère les données du client lié à l'utilisateur avec profilType
 */
export async function getClientUserData(userId: string) {
  const client = await getClientFromUser(userId);
  
  if (!client) {
    throw new Error("Client introuvable");
  }

  return {
    id: client.id,
    profilType: client.profilType,
    type: client.type,
    completionStatus: client.completionStatus,
  };
}

/**
 * Récupère les baux selon le profilType
 * PROPRIETAIRE : tous les baux où le client est propriétaire
 * LOCATAIRE : tous les baux où le client est locataire
 */
export async function getClientBails(clientId: string, profilType: ProfilType) {
  const bails = await prisma.bail.findMany({
    where: {
      parties: {
        some: {
          id: clientId,
        },
      },
    },
    include: {
      property: {
        select: {
          id: true,
          label: true,
          fullAddress: true,
          status: true,
        },
      },
      parties: {
        include: {
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
      dossierAssignments: {
        include: {
          notaire: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          requests: {
            where: {
              status: "PENDING",
            },
            select: {
              id: true,
              status: true,
              title: true,
            },
          },
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Filtrer selon le profilType
  if (profilType === ProfilType.PROPRIETAIRE) {
    // Pour les propriétaires, retourner les baux où ils sont propriétaires
    // (c'est-à-dire où le bien leur appartient)
    const propertyIds = await prisma.property.findMany({
      where: { ownerId: clientId },
      select: { id: true },
    });
    
    return bails.filter(bail => propertyIds.some(p => p.id === bail.propertyId));
  } else {
    // Pour les locataires, retourner les baux où ils sont parties
    return bails.filter(bail => bail.parties.some(party => party.id === clientId && party.profilType === ProfilType.LOCATAIRE));
  }
}

/**
 * Récupère tous les biens du client (UNIQUEMENT pour propriétaires)
 */
export async function getClientProperties(clientId: string) {
  const properties = await prisma.property.findMany({
    where: {
      ownerId: clientId,
    },
    include: {
      bails: {
        select: {
          id: true,
          status: true,
          effectiveDate: true,
          endDate: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return properties;
}

/**
 * Statistiques pour propriétaires
 */
export async function getProprietaireStats(clientId: string) {
  const properties = await getClientProperties(clientId);
  const bails = await getClientBails(clientId, ProfilType.PROPRIETAIRE);

  const stats = {
    totalProperties: properties.length,
    propertiesLouees: properties.filter(p => p.status === "LOUER").length,
    propertiesNonLouees: properties.filter(p => p.status === "NON_LOUER").length,
    totalBaux: bails.length,
    bauxActifs: bails.filter(b => b.status === BailStatus.SIGNED).length,
    bauxTermines: bails.filter(b => b.status === BailStatus.TERMINATED).length,
    bauxEnCours: bails.filter(b => 
      b.status === BailStatus.DRAFT || 
      b.status === BailStatus.PENDING_VALIDATION || 
      b.status === BailStatus.READY_FOR_NOTARY
    ).length,
  };

  return stats;
}

/**
 * Statistiques pour locataires
 */
export async function getLocataireStats(clientId: string) {
  const bails = await getClientBails(clientId, ProfilType.LOCATAIRE);

  const stats = {
    totalBaux: bails.length,
    bauxActifs: bails.filter(b => b.status === BailStatus.SIGNED).length,
    bauxTermines: bails.filter(b => b.status === BailStatus.TERMINATED).length,
    bauxEnCours: bails.filter(b => 
      b.status === BailStatus.DRAFT || 
      b.status === BailStatus.PENDING_VALIDATION || 
      b.status === BailStatus.READY_FOR_NOTARY
    ).length,
  };

  return stats;
}

