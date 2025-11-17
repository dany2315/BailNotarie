import { createProperty } from "@/lib/actions/properties";
import { createPropertySchema } from "@/lib/zod/property";
import { PropertyForm } from "@/components/properties/property-form";

async function handleSubmit(data: FormData) {
  "use server";
  
  // Convertir FormData en objet
  const formData: any = {
    fullAddress: data.get("fullAddress") as string,
    ownerId: data.get("ownerId") as string,
  };
  
  // Traiter les champs optionnels
  const label = data.get("label");
  if (label && label.toString().trim() !== "") {
    formData.label = label.toString().trim();
  }
  
  const surfaceM2 = data.get("surfaceM2");
  if (surfaceM2 && surfaceM2.toString().trim() !== "") {
    formData.surfaceM2 = surfaceM2.toString().trim();
  }
  
  const legalStatus = data.get("legalStatus");
  if (legalStatus && legalStatus.toString().trim() !== "") {
    formData.legalStatus = legalStatus.toString().trim();
  }
  
  const status = data.get("status");
  if (status) {
    formData.status = status.toString();
  }

  // Validation avec Zod avant d'appeler createProperty
  try {
    createPropertySchema.parse(formData);
    await createProperty(formData);
  } catch (error: any) {
    throw error;
  }
}

export default async function NewPropertyPage() {
  // Récupérer la liste des parties (propriétaires) pour le select


    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Nouveau bien</h1>
          <p className="text-muted-foreground mt-1">
            Créer un nouveau bien immobilier
          </p>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6">
          <p className="text-destructive font-medium">
            Aucun propriétaire disponible
          </p>
          <p className="text-muted-foreground mt-2">
            Vous devez créer au moins une partie (propriétaire) avant de pouvoir créer un bien.
          </p>
        </div>
      </div>
    );


}

