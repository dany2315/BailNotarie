import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { getCommonTenantsForOwner, getDraftBailForClient } from "@/lib/actions/leases";
import { CreateBailPageClient } from "@/components/client/create-bail-page-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateBailPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; draftId?: string }>;
}) {
  const { client } = await requireProprietaireAuth();
  const { propertyId, draftId } = await searchParams;

  const [biens, locataires, draftBail] = await Promise.all([
    getClientProperties(client.id),
    getCommonTenantsForOwner(client.id),
    draftId ? getDraftBailForClient(draftId, client.id) : Promise.resolve(null),
  ]);

  return (
    <CreateBailPageClient
      biens={biens.map((b) => ({
        id: b.id,
        label: b.label,
        fullAddress: b.fullAddress ?? null,
      }))}
      locataires={locataires || []}
      ownerId={client.id}
      initialPropertyId={propertyId}
      draftBail={draftBail}
    />
  );
}
