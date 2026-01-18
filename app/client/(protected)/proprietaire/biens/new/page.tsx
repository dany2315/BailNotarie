import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { CreatePropertyForm } from "@/components/client/create-property-form";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function CreatePropertyPage() {
  const { client } = await requireProprietaireAuth();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Créer un nouveau bien</h1>
      <CreatePropertyForm ownerId={client.id} />
    </div>
  );
}







