import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientFullInfo } from "@/lib/actions/client-space";
import { OwnerInformations } from "@/components/client-v2/owner-informations";
import { Surface, EmptyState } from "@/components/client-v2/owner-ui";
import { UserRound } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireInformationsPage() {
  const { client } = await requireProprietaireAuth();
  const clientData = await getClientFullInfo(client.id);

  if (!clientData) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <Surface tone="raised">
          <EmptyState icon={UserRound} title="Client introuvable" />
        </Surface>
      </div>
    );
  }

  /* Le nom affiché, les initiales et la répartition par nature des champs
     sont calculés dans le composant : la page ne fait que transmettre ce que
     la base renvoie. */
  return (
    <OwnerInformations
      clientType={clientData.type}
      persons={clientData.persons || []}
      entreprise={clientData.entreprise}
      clientDocuments={clientData.documents || []}
    />
  );
}
