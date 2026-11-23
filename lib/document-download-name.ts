import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildDocumentFileName, shortAddress } from "@/lib/utils/document-filename";

/**
 * Nom de téléchargement d'une pièce, calculé à partir de la base : type de pièce, personne,
 * entreprise ou propriétaire concerné, rue du bien, puis l'identifiant court de la pièce.
 */

const CLIENT_NAME_SELECT = {
  persons: {
    select: { firstName: true, lastName: true, isPrimary: true },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    take: 1,
  },
  entreprise: { select: { legalName: true, name: true } },
} satisfies Prisma.ClientSelect;

const PROPERTY_SELECT = { fullAddress: true, owner: { select: CLIENT_NAME_SELECT } } satisfies Prisma.PropertySelect;

type ClientName = {
  persons: { firstName: string | null; lastName: string | null }[];
  entreprise: { legalName: string | null; name: string | null } | null;
};

function personName(person: { firstName: string | null; lastName: string | null } | null | undefined) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}

function entrepriseName(entreprise: { legalName: string | null; name: string | null } | null | undefined) {
  return (entreprise?.legalName || entreprise?.name || "").trim();
}

function clientName(client: ClientName | null | undefined) {
  if (!client) return "";
  return entrepriseName(client.entreprise) || personName(client.persons[0]);
}

export async function documentDownloadName(documentId: string): Promise<string | null> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      kind: true,
      label: true,
      fileKey: true,
      mimeType: true,
      person: { select: { firstName: true, lastName: true } },
      entreprise: { select: { legalName: true, name: true } },
      client: { select: CLIENT_NAME_SELECT },
      property: { select: PROPERTY_SELECT },
      bail: { select: { property: { select: PROPERTY_SELECT } } },
      notaireRequest: {
        select: {
          dossier: {
            select: {
              client: { select: CLIENT_NAME_SELECT },
              property: { select: PROPERTY_SELECT },
              bail: { select: { property: { select: PROPERTY_SELECT } } },
            },
          },
        },
      },
    },
  });
  if (!doc) return null;

  const dossier = doc.notaireRequest?.dossier;
  const property = doc.property ?? doc.bail?.property ?? dossier?.property ?? dossier?.bail?.property ?? null;
  const owner =
    personName(doc.person) ||
    entrepriseName(doc.entreprise) ||
    clientName(doc.client) ||
    clientName(property?.owner) ||
    clientName(dossier?.client);
  // L'adresse n'identifie que les pièces du bien ou du bail, pas celles d'une personne.
  const isPartyDocument = !!(doc.person || doc.entreprise || doc.client);

  return buildDocumentFileName({
    id: doc.id,
    kind: doc.kind,
    label: doc.label,
    fileKey: doc.fileKey,
    mimeType: doc.mimeType,
    owner,
    address: isPartyDocument ? null : shortAddress(property?.fullAddress),
  });
}
