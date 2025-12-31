import { getProperty, updateProperty } from "@/lib/actions/properties";
import { notFound } from "next/navigation";
import { PropertyForm } from "@/components/properties/property-form";
import { updatePropertySchema } from "@/lib/zod/property";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function handleSubmit(data: FormData) {
  "use server";
  
  // Convertir FormData en objet
  const formData: any = {
    id: data.get("id") as string,
  };
  
  const fullAddress = data.get("fullAddress");
  if (fullAddress) formData.fullAddress = fullAddress.toString();
  
  // Traiter les champs optionnels
  const label = data.get("label");
  if (label && label.toString().trim() !== "") {
    formData.label = label.toString().trim();
  }
  
  const surfaceM2 = data.get("surfaceM2");
  if (surfaceM2 && surfaceM2.toString().trim() !== "") {
    formData.surfaceM2 = surfaceM2.toString().trim();
  }
  
  const type = data.get("type");
  if (type && type.toString().trim() !== "") {
    formData.type = type.toString().trim();
  }
  
  const legalStatus = data.get("legalStatus");
  if (legalStatus && legalStatus.toString().trim() !== "") {
    formData.legalStatus = legalStatus.toString().trim();
  }
  
  const status = data.get("status");
  if (status) {
    formData.status = status.toString();
  }
  
  const ownerId = data.get("ownerId");
  if (ownerId) {
    formData.ownerId = ownerId.toString();
  }

  // Traiter les champs de mobilier (convertir string "true"/"false" en boolean)
  const furnitureFields = [
    "hasLiterie", "hasRideaux", "hasPlaquesCuisson", "hasFour", 
    "hasRefrigerateur", "hasCongelateur", "hasVaisselle", "hasUstensilesCuisine",
    "hasTable", "hasSieges", "hasEtageresRangement", "hasLuminaires", "hasMaterielEntretien"
  ];
  
  for (const field of furnitureFields) {
    const value = data.get(field);
    if (value !== null) {
      formData[field] = value.toString() === "true";
    }
  }

  // Validation avec Zod avant d'appeler updateProperty
  try {
    updatePropertySchema.parse(formData);
    await updateProperty(formData);
  } catch (error: any) {
    throw error;
  }
}

export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.id);

  if (!property) {
    notFound();
  }

  // Récupérer la liste des parties (propriétaires) pour le select

  // Préparer les données initiales pour le formulaire
  const initialData: any = {
    id: property.id,
    label: property.label || "",
    fullAddress: property.fullAddress,
    surfaceM2: property.surfaceM2 ? property.surfaceM2.toString() : "",
    type: property.type || "",
    legalStatus: property.legalStatus || "",
    status: property.status,
    ownerId: property.ownerId,
    // Champs de mobilier
    hasLiterie: property.hasLiterie ?? false,
    hasRideaux: property.hasRideaux ?? false,
    hasPlaquesCuisson: property.hasPlaquesCuisson ?? false,
    hasFour: property.hasFour ?? false,
    hasRefrigerateur: property.hasRefrigerateur ?? false,
    hasCongelateur: property.hasCongelateur ?? false,
    hasVaisselle: property.hasVaisselle ?? false,
    hasUstensilesCuisine: property.hasUstensilesCuisine ?? false,
    hasTable: property.hasTable ?? false,
    hasSieges: property.hasSieges ?? false,
    hasEtageresRangement: property.hasEtageresRangement ?? false,
    hasLuminaires: property.hasLuminaires ?? false,
    hasMaterielEntretien: property.hasMaterielEntretien ?? false,
  };

  const propertyName = property.label || property.fullAddress;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/interface/properties/${property.id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifier {propertyName}</h1>
          <p className="text-muted-foreground mt-1">
            Modifier les informations du bien
          </p>
        </div>
      </div>

      <PropertyForm onSubmit={handleSubmit} initialData={initialData} />
    </div>
  );
}

