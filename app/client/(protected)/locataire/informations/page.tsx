import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientFullInfo } from "@/lib/actions/client-space";
import { OwnerInformations } from "@/components/client-v2/owner-informations";
import { Surface, EmptyState } from "@/components/client-v2/owner-ui";
import { UserRound } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireInformationsPage() {
  const { client } = await requireLocataireAuth();
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

  /* La page est la même des deux côtés du bail : seul le profil change, et
     avec lui la pastille d'identité. */
  return (
    <OwnerInformations
      profil="locataire"
      clientType={clientData.type}
      persons={clientData.persons || []}
      entreprise={clientData.entreprise}
      clientDocuments={clientData.documents || []}
    />
  );
}
