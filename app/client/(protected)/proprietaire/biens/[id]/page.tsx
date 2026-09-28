import { notFound, redirect } from "next/navigation";

import { getCurrentUser, requireProprietaireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { PropertyPage } from "@/components/client-v2/property-page";

export const dynamic = "force-dynamic";

/* La page d'un bien. L'authentification, le contrôle de propriété et la
   requête sont ceux de `/api/client/properties/[id]` — mêmes appels, mêmes
   règles : le bien doit appartenir au client connecté. */
export default async function ProprietaireBienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/client/login");

  const { client } = await requireProprietaireAuth();
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true,
          kind: true,
          label: true,
          fileKey: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      bails: {
        select: { id: true, status: true, rentAmount: true, effectiveDate: true, paidAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!property) notFound();
  // Même règle que l'API : un bien qui n'est pas le sien n'existe pas pour vous.
  if (property.ownerId !== client.id) notFound();

  // La mise en page du dossier fournit déjà le conteneur de défilement.
  return (
    <PropertyPage
      property={{
        id: property.id,
        label: property.label,
        fullAddress: property.fullAddress,
        surfaceM2: property.surfaceM2,
        type: property.type,
        completionStatus: property.completionStatus,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt,
        documents: property.documents,
        // Même filtre que « Mes dossiers » : un brouillon impayé ne compte pas.
        bails: property.bails
          .filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt))
          .map((bail) => ({
            id: bail.id,
            status: bail.status,
            rentAmount: bail.rentAmount === null ? null : Number(bail.rentAmount),
            effectiveDate: bail.effectiveDate,
          })),
      }}
    />
  );
}
