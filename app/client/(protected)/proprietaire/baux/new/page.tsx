import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { getCommonTenantsForOwner } from "@/lib/actions/leases";
import { prisma } from "@/lib/prisma";
import { CreateBailForm } from "@/components/client/create-bail-form";
import { CompletionStatusGuard } from "@/components/client/completion-status-guard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateBailPage() {
  const { client } = await requireProprietaireAuth();

  // Récupérer les biens du propriétaire
  const biens = await getClientProperties(client.id);

  // Récupérer uniquement les locataires qui ont eu un bail en commun avec ce propriétaire
  const locatairesEnCommun = (await getCommonTenantsForOwner(client.id)) || [];

  return (
    <CompletionStatusGuard 
      completionStatus={client.completionStatus}
      informationsPath="/client/proprietaire/informations"
    >
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Créer un nouveau bail</h1>
        <CreateBailForm 
          biens={biens} 
          locataires={locatairesEnCommun}
          ownerId={client.id}
        />
      </div>
    </CompletionStatusGuard>
  );
}








