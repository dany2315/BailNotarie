import { createIntakeLink } from "@/lib/actions/intakes";
import { createIntakeLinkSchema } from "@/lib/zod/intake";
import { getProperties } from "@/lib/actions/properties";
import { getLeases } from "@/lib/actions/leases";
import { IntakeLinkForm } from "@/components/intakes/intake-link-form";

async function handleSubmit(data: FormData) {
  "use server";
  
  // Convertir FormData en objet
  const formData: any = {
    target: data.get("target") as string,
  };
  
  const propertyId = data.get("propertyId");
  if (propertyId && propertyId.toString().trim() !== "") {
    formData.propertyId = propertyId.toString().trim();
  }
  
  const leaseId = data.get("leaseId");
  if (leaseId && leaseId.toString().trim() !== "") {
    formData.leaseId = leaseId.toString().trim();
  }
  
  const partyId = data.get("partyId");
  if (partyId && partyId.toString().trim() !== "") {
    formData.partyId = partyId.toString().trim();
  }

  // Validation avec Zod avant d'appeler createIntakeLink
  try {
    createIntakeLinkSchema.parse(formData);
    await createIntakeLink(formData);
  } catch (error: any) {
    throw error;
  }
}

export default async function NewIntakeLinkPage() {
  // Récupérer la liste des propriétés, des baux et des parties pour les selects
  const [propertiesResult, leasesResult] = await Promise.all([
    getProperties({
      page: 1,
      pageSize: 1000,
    }),
    getLeases({
      page: 1,
      pageSize: 1000,
    }),

  ]);

  // Sérialiser les données pour éviter les problèmes de sérialisation avec les objets Decimal
  const serializedProperties = JSON.parse(JSON.stringify(propertiesResult.data));
  const serializedLeases = JSON.parse(JSON.stringify(leasesResult.data));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouveau lien d'intake</h1>
        <p className="text-muted-foreground mt-1">
          Créer un nouveau lien d'intake pour collecter des informations
        </p>
      </div>

      <IntakeLinkForm
        onSubmit={handleSubmit}
        properties={serializedProperties}
        leases={serializedLeases}
      />
    </div>
  );
}

