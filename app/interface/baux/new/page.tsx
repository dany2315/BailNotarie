import { createLease } from "@/lib/actions/leases";
import { createLeaseSchema } from "@/lib/zod/lease";
import { getProperties } from "@/lib/actions/properties";
import { getAllClients } from "@/lib/actions/clients";
import { LeaseForm } from "@/components/leases/lease-form";

async function handleSubmit(data: FormData) {
  "use server";
  
  // Convertir FormData en objet
  const formData: any = {
    propertyId: data.get("propertyId") as string,
    tenantId: data.get("tenantId") as string,
    effectiveDate: data.get("effectiveDate") as string,
    rentAmount: data.get("rentAmount") as string,
  };
  
  // Traiter les champs optionnels
  const leaseType = data.get("leaseType");
  if (leaseType) {
    formData.leaseType = leaseType.toString();
  }
  
  const status = data.get("status");
  if (status) {
    formData.status = status.toString();
  }
  
  const monthlyCharges = data.get("monthlyCharges");
  if (monthlyCharges && monthlyCharges.toString().trim() !== "") {
    formData.monthlyCharges = monthlyCharges.toString().trim();
  } else {
    formData.monthlyCharges = "0";
  }
  
  const securityDeposit = data.get("securityDeposit");
  if (securityDeposit && securityDeposit.toString().trim() !== "") {
    formData.securityDeposit = securityDeposit.toString().trim();
  } else {
    formData.securityDeposit = "0";
  }
  
  const endDate = data.get("endDate");
  if (endDate && endDate.toString().trim() !== "") {
    formData.endDate = endDate.toString().trim();
  }
  
  const paymentDay = data.get("paymentDay");
  if (paymentDay && paymentDay.toString().trim() !== "") {
    formData.paymentDay = paymentDay.toString().trim();
  }

  // Validation avec Zod avant d'appeler createLease
  try {
    createLeaseSchema.parse(formData);
    await createLease(formData);
  } catch (error: any) {
    throw error;
  }
}

export default async function NewLeasePage() {
  // Récupérer la liste des propriétés et des parties (locataires) pour les selects
  const [propertiesResult, partiesResult] = await Promise.all([
    getProperties({
      page: 1,
      pageSize: 1000, // Récupérer toutes les propriétés
    }),
    getAllClients(), // Utiliser getAllClients et filtrer côté client
  ]);

  if (propertiesResult.data.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nouveau bail</h1>
          <p className="text-muted-foreground mt-1">
            Créer un nouveau bail notarié
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive font-medium">
            Aucun bien disponible
          </p>
          <p className="text-muted-foreground mt-2">
            Vous devez créer au moins un bien avant de pouvoir créer un bail.
          </p>
        </div>
      </div>
    );
  }

  // Filtrer pour ne garder que les locataires
  const tenants = partiesResult.filter((client: any) => client.profilType === "LOCATAIRE");

  if (tenants.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nouveau bail</h1>
          <p className="text-muted-foreground mt-1">
            Créer un nouveau bail notarié
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive font-medium">
            Aucun locataire disponible
          </p>
          <p className="text-muted-foreground mt-2">
            Vous devez créer au moins une partie (locataire) avant de pouvoir créer un bail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouveau bail</h1>
        <p className="text-muted-foreground mt-1">
          Créer un nouveau bail notarié
        </p>
      </div>

      <LeaseForm
        onSubmit={handleSubmit}
        properties={propertiesResult.data}
        parties={tenants}
      />
    </div>
  );
}

