import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { getCommonTenantsForOwner } from "@/lib/actions/leases";
import { OwnerDossiers } from "@/components/client-v2/dossiers";
import { OWNER_DOSSIERS_VIEW } from "@/lib/config/espace-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DemandesPage() {
  const { client } = await requireProprietaireAuth();
  
  const [biens, locataires] = await Promise.all([
    getClientProperties(client.id),
    getCommonTenantsForOwner(client.id),
  ]);

  return (
    <OwnerDossiers
      biens={biens}
      locataires={locataires || []}
      ownerId={client.id}
      variant={OWNER_DOSSIERS_VIEW}
    />
  );
}

