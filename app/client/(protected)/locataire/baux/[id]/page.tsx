import { requireLocataireAuth } from "@/lib/auth-helpers";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BailStatus, ProfilType } from "@prisma/client";

import { TenantBailDetail } from "@/components/client-v2/tenant/tenant-bail-detail";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/* Libellés d'origine, conservés comme repli : ils couvrent tous les statuts
   de l'énumération, là où l'écriture côté locataire n'en nomme que les
   étapes qu'un locataire traverse. */
const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  AWAITING_TENANT: "En attente du locataire",
  AWAITING_TENANT_FORM: "En attente du formulaire locataire",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Actif",
  TERMINATED: "Terminé",
  DESISTE: "Désisté",
  CLASSE_SANS_SUITE: "Classé sans suite",
};

export default async function LocataireBailDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { user, client } = await requireLocataireAuth();
  const resolvedParams = await params;
  const bailId = resolvedParams.id;
  const resolvedSearch = await searchParams;
  const openChat = resolvedSearch?.chat === "1";

  // Vérifier que le client peut accéder à ce bail
  const hasAccess = await canAccessBail(user.id, bailId);
  if (!hasAccess) {
    notFound();
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: {
        include: {
          owner: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
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
        },
        take: 1,
      },
      documents: {
        where: {
          // Afficher uniquement les documents liés au client connecté
          // ou les documents sans client spécifique (documents généraux du bail)
          OR: [
            { clientId: client.id },
            { clientId: null },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!bail) {
    notFound();
  }

  const proprietaire = bail.parties.find(p => p.profilType === ProfilType.PROPRIETAIRE) || bail.property.owner;
  const proprietaireName = proprietaire?.entreprise 
    ? proprietaire.entreprise.legalName || proprietaire.entreprise.name
    : proprietaire?.persons?.[0] 
      ? `${proprietaire.persons[0].firstName || ""} ${proprietaire.persons[0].lastName || ""}`.trim()
      : "Non défini";

  const notaire = bail.dossierAssignments[0]?.notaire;

  return (
    <TenantBailDetail
      bail={bail as any}
      bailId={bailId}
      proprietaireName={proprietaireName}
      hasProprietaire={Boolean(proprietaire)}
      notaire={notaire ?? null}
      openChat={openChat}
    />
  );
}
