"use server";

import { prisma } from "@/lib/prisma";
import { requireClientAuth, requireProprietaireAuth, requireLocataireAuth, getClientFromUser } from "@/lib/auth-helpers";
import { ProfilType, BailStatus } from "@prisma/client";

// Types pour les données sérialisées
type SerializedProperty = {
  id: string;
  label: string | null;
  fullAddress: string | null;
  status: string;
  completionStatus: string;
  surfaceM2: number | null;
  createdAt: string;
  updatedAt: string;
  bails: Array<{
    id: string;
    status: string;
    effectiveDate: string | null;
    endDate: string | null;
  }>;
};

type SerializedBail = {
  id: string;
  bailType: string;
  bailFamily: string;
  status: string;
  rentAmount: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  propertyId: string;
  property: {
    id: string;
    label: string | null;
    fullAddress: string | null;
    status: string;
    completionStatus: string;
  };
  parties: Array<{
    id: string;
    profilType: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise: {
      legalName: string | null;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  dossierAssignments: Array<{
    id: string;
    notaire: {
      id: string;
      name: string;
      email: string;
    };
    requests: Array<{
      id: string;
      status: string;
      title: string;
    }>;
  }>;
};

/**
 * Fonction helper récursive pour sérialiser les Decimal de Prisma
 * Convertit les Decimal en nombres et les Date en chaînes ISO
 */
function serializeDecimal(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  // Détecter et convertir les Decimal de Prisma
  if (obj && typeof obj === 'object') {
    // Vérifier si c'est un Decimal de Prisma
    const isDecimal = 
      obj.constructor?.name === 'Decimal' ||
      (typeof obj.toNumber === 'function' && 
       typeof obj.toString === 'function' && 
       !Array.isArray(obj) && 
       !(obj instanceof Date) &&
       obj.constructor !== Object &&
       obj.constructor !== RegExp);
    
    if (isDecimal) {
      try {
        if (typeof obj.toNumber === 'function') {
          const num = obj.toNumber();
          return isNaN(num) ? null : num;
        }
        const num = Number(obj);
        return isNaN(num) ? null : num;
      } catch {
        try {
          return parseFloat(obj.toString()) || null;
        } catch {
          return null;
        }
      }
    }
    
    // Gérer les Date
    if (obj instanceof Date) {
      return obj.toISOString();
    }
    
    // Gérer les tableaux
    if (Array.isArray(obj)) {
      return obj.map(serializeDecimal);
    }
    
    // Gérer les objets (récursivement)
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDecimal(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

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
    select: {
      id: true,
      bailType: true,
      bailFamily: true,
      status: true,
      rentAmount: true,
      effectiveDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      propertyId: true,
      property: {
        select: {
          id: true,
          label: true,
          fullAddress: true,
          status: true,
          completionStatus: true,
        },
      },
      parties: {
        select: {
          id: true,
          profilType: true,
          persons: {
            where: { isPrimary: true },
            take: 1,
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          entreprise: {
            select: {
              legalName: true,
              name: true,
              email: true,
            },
          },
        },
      },
      dossierAssignments: {
        select: {
          id: true,
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
  let filteredBails;
  if (profilType === ProfilType.PROPRIETAIRE) {
    // Pour les propriétaires, retourner les baux où ils sont propriétaires
    // (c'est-à-dire où le bien leur appartient)
    const propertyIds = await prisma.property.findMany({
      where: { ownerId: clientId },
      select: { id: true },
    });
    
    filteredBails = bails.filter(bail => propertyIds.some(p => p.id === bail.propertyId));
  } else {
    // Pour les locataires, retourner les baux où ils sont parties
    filteredBails = bails.filter(bail => bail.parties.some(party => party.id === clientId && party.profilType === ProfilType.LOCATAIRE));
  }

  // Sérialiser les données pour convertir les Date en chaînes ISO
  // Cela évite les problèmes de sérialisation avec les Client Components
  return serializeDecimal(filteredBails) as SerializedBail[];
}

/**
 * Récupère tous les biens du client (UNIQUEMENT pour propriétaires)
 */
export async function getClientProperties(clientId: string) {
  const properties = await prisma.property.findMany({
    where: {
      ownerId: clientId,
    },
    select: {
      id: true,
      label: true,
      fullAddress: true,
      status: true,
      completionStatus: true,
      surfaceM2: true,
      createdAt: true,
      updatedAt: true,
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

  // Sérialiser les données pour convertir les Decimal en nombres et les Date en chaînes ISO
  // Cela évite l'erreur "Only plain objects can be passed to Client Components"
  return serializeDecimal(properties) as SerializedProperty[];
}

/**
 * Statistiques pour propriétaires
 */
export async function getProprietaireStats(clientId: string) {
  const properties = await getClientProperties(clientId);
  const bails = await getClientBails(clientId, ProfilType.PROPRIETAIRE);

  const stats = {
    totalProperties: properties.length,
    propertiesLouees: properties.filter((p: SerializedProperty) => p.status === "LOUER").length,
    propertiesNonLouees: properties.filter((p: SerializedProperty) => p.status === "NON_LOUER").length,
    totalBaux: bails.length,
    bauxActifs: bails.filter((b: SerializedBail) => b.status === BailStatus.SIGNED).length,
    bauxTermines: bails.filter((b: SerializedBail) => b.status === BailStatus.TERMINATED).length,
    bauxEnCours: bails.filter((b: SerializedBail) => 
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
    bauxActifs: bails.filter((b: SerializedBail) => b.status === BailStatus.SIGNED).length,
    bauxTermines: bails.filter((b: SerializedBail) => b.status === BailStatus.TERMINATED).length,
    bauxEnCours: bails.filter((b: SerializedBail) => 
      b.status === BailStatus.DRAFT || 
      b.status === BailStatus.PENDING_VALIDATION || 
      b.status === BailStatus.READY_FOR_NOTARY
    ).length,
  };

  return stats;
}

/**
 * Récupère les demandes du notaire non traitées pour un client
 */
export async function getPendingNotaireRequests(clientId: string, profilType: ProfilType) {
  // Récupérer tous les dossiers assignés à ce client
  const dossiers = await prisma.dossierNotaireAssignment.findMany({
    where: {
      clientId,
    },
    include: {
      bail: {
        include: {
          property: {
            select: {
              id: true,
              label: true,
              fullAddress: true,
            },
          },
        },
      },
      requests: {
        where: {
          status: "PENDING",
          OR: [
            // Demande destinée au type de profil du client
            ...(profilType === ProfilType.PROPRIETAIRE
              ? [{ targetProprietaire: true }]
              : [{ targetLocataire: true }]),
            // Demande destinée spécifiquement à ce client
            {
              targetPartyIds: {
                has: clientId,
              },
            },
          ],
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
      },
    },
  });

  // Flatten les demandes avec les infos du bail
  const requests = dossiers.flatMap((dossier) =>
    dossier.requests.map((request) => ({
      ...request,
      bail: dossier.bail,
      dossierId: dossier.id,
    }))
  );

  return requests;
}

/**
 * Récupère toutes les informations du client pour l'affichage dans l'espace client
 */
export async function getClientFullInfo(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      persons: {
        orderBy: { isPrimary: 'desc' },
        include: {
          documents: { orderBy: { createdAt: "desc" } },
        },
      },
      entreprise: {
        include: {
          documents: { orderBy: { createdAt: "desc" } },
        },
      },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  return client;
}

