import { createFullClient } from "@/lib/actions/clients";
import { FullClientForm } from "@/components/clients/full-client-form";
import { createFullClientSchema } from "@/lib/zod/client";

async function handleSubmit(data: FormData) {
  "use server";
  
  const formData: any = {
    type: data.get("type") as "PERSONNE_PHYSIQUE" | "PERSONNE_MORALE",
  };
  
  if (formData.type === "PERSONNE_PHYSIQUE") {
    formData.firstName = data.get("firstName") || undefined;
    formData.lastName = data.get("lastName") || undefined;
    formData.profession = data.get("profession") || undefined;
    formData.familyStatus = data.get("familyStatus") || undefined;
    formData.matrimonialRegime = data.get("matrimonialRegime") || undefined;
    formData.birthPlace = data.get("birthPlace") || undefined;
    formData.birthDate = data.get("birthDate") || undefined;
  } else {
    formData.legalName = data.get("legalName") || undefined;
    formData.registration = data.get("registration") || undefined;
  }

  formData.phone = data.get("phone") || undefined;
  formData.email = data.get("email") as string; // Email requis
  formData.fullAddress = data.get("fullAddress") || undefined;
  formData.nationality = data.get("nationality") || undefined;

  // Ajouter les données du bien, bail et locataire si présentes
  formData.propertyLabel = data.get("propertyLabel") || undefined;
  formData.propertyFullAddress = data.get("propertyFullAddress") || undefined;
  formData.propertySurfaceM2 = data.get("propertySurfaceM2") || undefined;
  formData.propertyType = data.get("propertyType") || undefined;
  formData.propertyLegalStatus = data.get("propertyLegalStatus") || undefined;
  formData.propertyStatus = data.get("propertyStatus") || undefined;
  formData.bailType = data.get("bailType") || undefined;
  formData.bailFamily = data.get("bailFamily") || undefined;
  formData.bailRentAmount = data.get("bailRentAmount") || undefined;
  formData.bailMonthlyCharges = data.get("bailMonthlyCharges") || undefined;
  formData.bailSecurityDeposit = data.get("bailSecurityDeposit") || undefined;
  formData.bailEffectiveDate = data.get("bailEffectiveDate") || undefined;
  formData.bailEndDate = data.get("bailEndDate") || undefined;
  formData.bailPaymentDay = data.get("bailPaymentDay") || undefined;
  formData.tenantEmail = data.get("tenantEmail") || undefined;
  
  // Parser le champ persons depuis JSON string
  const personsString = data.get("persons");
  if (personsString && typeof personsString === "string") {
    try {
      formData.persons = JSON.parse(personsString);
    } catch (error) {
      // En cas d'erreur de parsing, on ignore le champ persons
      formData.persons = undefined;
    }
  } else {
    formData.persons = undefined;
  }

  try {
    // Essayer avec le schéma complet (avec bien, bail, locataire)
    const createFullClientWithPropertySchema = (await import("@/lib/zod/client")).createFullClientWithPropertySchema;
    createFullClientWithPropertySchema.parse(formData);
    await createFullClient(formData);
  } catch (error: any) {
    // Si échec, essayer avec le schéma simple
    const createFullClientSchema = (await import("@/lib/zod/client")).createFullClientSchema;
    createFullClientSchema.parse(formData);
    await createFullClient(formData);
  }
}

export default function NewClientPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nouveau client complet</h1>
        <p className="text-muted-foreground mt-1">
          Créer un client avec toutes les informations nécessaires
        </p>
      </div>

      <FullClientForm onSubmit={handleSubmit} />
    </div>
  );
}

