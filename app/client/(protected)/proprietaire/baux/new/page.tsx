import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { prisma } from "@/lib/prisma";
import { CreateBailForm } from "@/components/client/create-bail-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreateBailPage() {
  const { client } = await requireProprietaireAuth();

  // Récupérer les biens du propriétaire
  const biens = await getClientProperties(client.id);

  // Récupérer tous les clients qui sont locataires (pour le select)
  const locataires = await prisma.client.findMany({
    where: {
      profilType: "LOCATAIRE",
    },
    include: {
      persons: { where: { isPrimary: true }, take: 1 },
      entreprise: true,
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Créer un nouveau bail</h1>
      <CreateBailForm biens={biens} locataires={locataires} />
    </div>
  );
}







