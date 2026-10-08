"use server";

import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const LIMIT = 10;

export interface AdminSearchResults {
  query: string;
  dossiers: Array<{ id: string; address: string; status: string; parties: string[] }>;
  clients: Array<{ id: string; name: string; profilType: string; email: string | null; phone: string | null }>;
  biens: Array<{ id: string; address: string; label: string | null; ownerName: string | null }>;
}

function clientDisplayName(client: {
  type: string;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
  entreprise: { legalName: string | null; name: string | null; email: string | null } | null;
}): string {
  if (client.type === "PERSONNE_MORALE") {
    return client.entreprise?.legalName || client.entreprise?.name || client.entreprise?.email || "Société";
  }
  const p = client.persons[0];
  return (p && (`${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email)) || "Client";
}

/** Recherche transverse de l'espace administrateur (dossiers, clients, biens). */
export async function adminSearch(rawQuery: string): Promise<AdminSearchResults> {
  await requireRole([Role.ADMINISTRATEUR]);
  const query = (rawQuery || "").trim().slice(0, 100);
  if (query.length < 2) return { query, dossiers: [], clients: [], biens: [] };

  const contains = { contains: query, mode: "insensitive" as const };
  const personMatch = {
    OR: [{ firstName: contains }, { lastName: contains }, { email: contains }, { phone: contains }],
  };
  const entrepriseMatch = {
    OR: [{ legalName: contains }, { name: contains }, { email: contains }, { registration: contains }, { phone: contains }],
  };
  const partySelect = {
    type: true,
    profilType: true,
    persons: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { firstName: true, lastName: true, email: true } },
    entreprise: { select: { legalName: true, name: true, email: true } },
  };

  const [bails, clients, properties] = await Promise.all([
    prisma.bail.findMany({
      where: {
        OR: [
          { property: { fullAddress: contains } },
          { property: { label: contains } },
          { parties: { some: { persons: { some: personMatch } } } },
          { parties: { some: { entreprise: entrepriseMatch } } },
        ],
      },
      select: {
        id: true,
        status: true,
        property: { select: { fullAddress: true, label: true } },
        parties: { select: partySelect },
      },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
    }),
    prisma.client.findMany({
      where: { OR: [{ persons: { some: personMatch } }, { entreprise: entrepriseMatch }] },
      select: {
        id: true,
        ...partySelect,
        persons: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { firstName: true, lastName: true, email: true, phone: true } },
        entreprise: { select: { legalName: true, name: true, email: true, phone: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
    }),
    prisma.property.findMany({
      where: { OR: [{ fullAddress: contains }, { label: contains }, { city: contains }, { postalCode: contains }] },
      select: { id: true, fullAddress: true, label: true, owner: { select: partySelect } },
      orderBy: { updatedAt: "desc" },
      take: LIMIT,
    }),
  ]);

  return {
    query,
    dossiers: bails.map((bail) => ({
      id: bail.id,
      address: bail.property?.label || bail.property?.fullAddress || "Bien sans adresse",
      status: bail.status,
      parties: bail.parties.map(clientDisplayName),
    })),
    clients: clients.map((client) => ({
      id: client.id,
      name: clientDisplayName(client),
      profilType: client.profilType,
      email: client.type === "PERSONNE_MORALE" ? client.entreprise?.email || null : client.persons[0]?.email || null,
      phone: client.type === "PERSONNE_MORALE" ? client.entreprise?.phone || null : client.persons[0]?.phone || null,
    })),
    biens: properties.map((property) => ({
      id: property.id,
      address: property.fullAddress,
      label: property.label,
      ownerName: property.owner ? clientDisplayName(property.owner) : null,
    })),
  };
}
