import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientBails } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { LocataireBauxClient } from "@/components/client/locataire-baux-client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireBauxPage() {
  const { client } = await requireLocataireAuth();
  const baux = await getClientBails(client.id, ProfilType.LOCATAIRE);

  return (
    <div className="p-4 sm:p-6 space-y-5 md:max-w-2xl md:mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mes baux</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {baux.length > 0
            ? `${baux.length} bail${baux.length > 1 ? "x" : ""} associé${baux.length > 1 ? "s" : ""}`
            : "Consultez vos baux et échangez avec votre notaire"}
        </p>
      </div>

      <LocataireBauxClient baux={baux as any} />
    </div>
  );
}
