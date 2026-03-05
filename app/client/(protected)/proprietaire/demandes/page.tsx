import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { getCommonTenantsForOwner } from "@/lib/actions/leases";
import { DemandesPageClient } from "@/components/client/demandes-page-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DemandesPage() {
  const { client } = await requireProprietaireAuth();
  
  const [biens, locataires] = await Promise.all([
    getClientProperties(client.id),
    getCommonTenantsForOwner(client.id),
  ]);

  return <DemandesPageClient biens={biens} locataires={locataires || []} ownerId={client.id} />;
}

