import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { getCommonTenantsForOwner, getDraftBailForClient } from "@/lib/actions/leases";
import { CreateBailPageClient } from "@/components/client/create-bail-page-client";
import { prisma } from "@/lib/prisma";
import { ClientType } from "@prisma/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateBailPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; draftId?: string }>;
}) {
  const { client } = await requireProprietaireAuth();
  const { propertyId, draftId } = await searchParams;

  const [biens, locataires, draftBail, ownerDetails] = await Promise.all([
    getClientProperties(client.id),
    getCommonTenantsForOwner(client.id),
    draftId ? getDraftBailForClient(draftId, client.id) : Promise.resolve(null),
    prisma.client.findUnique({
      where: { id: client.id },
      select: { type: true, _count: { select: { persons: true } } },
    }),
  ]);

  const ownerPeopleCount =
    ownerDetails?.type === ClientType.PERSONNE_MORALE
      ? 1
      : Math.max(1, ownerDetails?._count.persons ?? 1);

  return (
    <CreateBailPageClient
      biens={biens.map((b) => ({
        id: b.id,
        label: b.label,
        fullAddress: b.fullAddress ?? null,
      }))}
      locataires={locataires || []}
      ownerId={client.id}
      ownerPeopleCount={ownerPeopleCount}
      initialPropertyId={propertyId}
      draftBail={draftBail}
    />
  );
}
