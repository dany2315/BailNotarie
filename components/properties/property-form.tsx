"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, InfoIcon } from "lucide-react";
import { createPropertySchema } from "@/lib/zod/property";
import { z } from "zod";
import { BienType, BienLegalStatus, PropertyStatus, ClientType } from "@prisma/client";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressData } from "@/lib/types/address";

// Liste des champs de mobilier obligatoire pour location meublée
const FURNITURE_FIELDS = [
  { key: "hasLiterie", label: "Literie avec couette ou couverture" },
  { key: "hasRideaux", label: "Volets ou rideaux dans les chambres" },
  { key: "hasPlaquesCuisson", label: "Plaques de cuisson" },
  { key: "hasFour", label: "Four ou four à micro-onde" },
  { key: "hasRefrigerateur", label: "Réfrigérateur" },
  { key: "hasCongelateur", label: "Congélateur ou compartiment à congélation (-6° max)" },
  { key: "hasVaisselle", label: "Vaisselle en nombre suffisant" },
  { key: "hasUstensilesCuisine", label: "Ustensiles de cuisine" },
  { key: "hasTable", label: "Table" },
  { key: "hasSieges", label: "Sièges" },
  { key: "hasEtageresRangement", label: "Étagères de rangement" },
  { key: "hasLuminaires", label: "Luminaires" },
  { key: "hasMaterielEntretien", label: "Matériel d'entretien ménager adapté" },
] as const;

// Fonction pour vérifier si tout le mobilier est présent
const hasAllFurniture = (values: Record<string, unknown>): boolean => {
  return FURNITURE_FIELDS.every(({ key }) => values[key] === true);
};

// Schéma pour la validation côté client - tous les champs optionnels sauf fullAddress et ownerId
const propertyFormSchema = z.object({
  label: z.string().optional().or(z.literal("")),
  fullAddress: z.string().min(1, "L'adresse est requise").max(500, "L'adresse est trop longue").trim(),
  surfaceM2: z.string().optional().or(z.literal("")),
  type: z.nativeEnum(BienType).optional().or(z.literal("")),
  legalStatus: z.nativeEnum(BienLegalStatus).optional().or(z.literal("")),
  status: z.nativeEnum(PropertyStatus).default(PropertyStatus.NON_LOUER),
  ownerId: z.string().min(1, "Le propriétaire est requis"),
  // Données géographiques enrichies (optionnelles)
  housenumber: z.string().max(20).trim().optional().or(z.literal("")),
  street: z.string().max(200).trim().optional().or(z.literal("")),
  city: z.string().max(200).trim().optional().or(z.literal("")),
  postalCode: z.string().max(10).trim().optional().or(z.literal("")),
  district: z.string().max(100).trim().optional().or(z.literal("")),
  inseeCode: z.string().max(10).trim().optional().or(z.literal("")),
  department: z.string().max(100).trim().optional().or(z.literal("")),
  region: z.string().max(100).trim().optional().or(z.literal("")),
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),
  // Mobilier obligatoire pour location meublée
  hasLiterie: z.boolean().default(false),
  hasRideaux: z.boolean().default(false),
  hasPlaquesCuisson: z.boolean().default(false),
  hasFour: z.boolean().default(false),
  hasRefrigerateur: z.boolean().default(false),
  hasCongelateur: z.boolean().default(false),
  hasVaisselle: z.boolean().default(false),
  hasUstensilesCuisine: z.boolean().default(false),
  hasTable: z.boolean().default(false),
  hasSieges: z.boolean().default(false),
  hasEtageresRangement: z.boolean().default(false),
  hasLuminaires: z.boolean().default(false),
  hasMaterielEntretien: z.boolean().default(false),
});

type PropertyFormData = z.infer<typeof propertyFormSchema>;

interface PropertyFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: any;
}

export function PropertyForm({ onSubmit, initialData }: PropertyFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertyFormSchema) as any,
    defaultValues: initialData || {
      label: "",
      fullAddress: "",
      housenumber: "",
      street: "",
      surfaceM2: "",
      type: "",
      legalStatus: "",
      status: PropertyStatus.NON_LOUER,
      ownerId: "",
      city: "",
      postalCode: "",
      district: "",
      inseeCode: "",
      department: "",
      region: "",
      latitude: "",
      longitude: "",
      // Mobilier
      hasLiterie: false,
      hasRideaux: false,
      hasPlaquesCuisson: false,
      hasFour: false,
      hasRefrigerateur: false,
      hasCongelateur: false,
      hasVaisselle: false,
      hasUstensilesCuisine: false,
      hasTable: false,
      hasSieges: false,
      hasEtageresRangement: false,
      hasLuminaires: false,
      hasMaterielEntretien: false,
    },
  });

  const handleAddressSelect = (addressData: AddressData) => {
    console.log("📍 [PropertyForm] Adresse sélectionnée:", addressData);
    form.setValue("fullAddress", addressData.fullAddress);
    form.setValue("housenumber", addressData.housenumber || "");
    form.setValue("street", addressData.street || "");
    form.setValue("city", addressData.city);
    form.setValue("postalCode", addressData.postalCode);
    form.setValue("district", addressData.district || "");
    form.setValue("inseeCode", addressData.inseeCode);
    form.setValue("department", addressData.department || "");
    form.setValue("region", addressData.region || "");
    form.setValue("latitude", addressData.latitude.toString());
    form.setValue("longitude", addressData.longitude.toString());
  };
  
  const watchedValues = form.watch();
  const allFurniturePresent = hasAllFurniture(watchedValues);

  const handleSubmit = async (data: PropertyFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Inclure l'ID si on est en mode édition
      if (initialData?.id) {
        formData.append("id", initialData.id);
      }
      
      // Ajouter tous les champs
      if (data.label) formData.append("label", data.label);
      formData.append("fullAddress", data.fullAddress);
      if (data.surfaceM2) formData.append("surfaceM2", data.surfaceM2);
      if (data.type) formData.append("type", data.type);
      if (data.legalStatus) formData.append("legalStatus", data.legalStatus);
      formData.append("status", data.status || "PROSPECT");
      formData.append("ownerId", data.ownerId);
      
      // Ajouter les champs d'adresse détaillés
      if (data.housenumber) formData.append("housenumber", data.housenumber);
      if (data.street) formData.append("street", data.street);
      if (data.city) formData.append("city", data.city);
      if (data.postalCode) formData.append("postalCode", data.postalCode);
      if (data.district) formData.append("district", data.district);
      if (data.inseeCode) formData.append("inseeCode", data.inseeCode);
      if (data.department) formData.append("department", data.department);
      if (data.region) formData.append("region", data.region);
      if (data.latitude) formData.append("latitude", data.latitude);
      if (data.longitude) formData.append("longitude", data.longitude);
      
      // Ajouter les champs de mobilier
      formData.append("hasLiterie", String(data.hasLiterie ?? false));
      formData.append("hasRideaux", String(data.hasRideaux ?? false));
      formData.append("hasPlaquesCuisson", String(data.hasPlaquesCuisson ?? false));
      formData.append("hasFour", String(data.hasFour ?? false));
      formData.append("hasRefrigerateur", String(data.hasRefrigerateur ?? false));
      formData.append("hasCongelateur", String(data.hasCongelateur ?? false));
      formData.append("hasVaisselle", String(data.hasVaisselle ?? false));
      formData.append("hasUstensilesCuisine", String(data.hasUstensilesCuisine ?? false));
      formData.append("hasTable", String(data.hasTable ?? false));
      formData.append("hasSieges", String(data.hasSieges ?? false));
      formData.append("hasEtageresRangement", String(data.hasEtageresRangement ?? false));
      formData.append("hasLuminaires", String(data.hasLuminaires ?? false));
      formData.append("hasMaterielEntretien", String(data.hasMaterielEntretien ?? false));
      
      await onSubmit(formData);
      toast.success(initialData?.id ? "Bien modifié avec succès" : "Bien créé avec succès");
      router.push(initialData?.id ? `/interface/properties/${initialData.id}` : "/interface/properties");
    } catch (error: any) {
      toast.error(error.message || (initialData?.id ? "Erreur lors de la modification du bien" : "Erreur lors de la création du bien"));
    } finally {
      setIsLoading(false);
    }
  };

  const onError = (errors: any) => {
    // Afficher les erreurs de validation avec des toasts
    const errorMessages: string[] = [];
    
    Object.keys(errors).forEach((key) => {
      const error = errors[key];
      if (error?.message) {
        errorMessages.push(`${key}: ${error.message}`);
      }
    });

    if (errorMessages.length > 0) {
      // Afficher la première erreur ou toutes les erreurs
      if (errorMessages.length === 1) {
        toast.error(errorMessages[0]);
      } else {
        toast.error(`${errorMessages.length} erreurs de validation`, {
          description: errorMessages.slice(0, 3).join(", ") + (errorMessages.length > 3 ? "..." : ""),
        });
      }
    } else {
      toast.error("Veuillez corriger les erreurs du formulaire");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bien</CardTitle>
        <CardDescription>
          Remplissez les informations pour créer un nouveau bien
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit, onError)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ownerId">Propriétaire *</Label>
            <Controller
              name="ownerId"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || ""}
                  onValueChange={(value) => {
                    field.onChange(value);
                    form.trigger("ownerId");
                  }}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un propriétaire" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ClientType.PERSONNE_PHYSIQUE}>Particulier</SelectItem>
                    <SelectItem value={ClientType.PERSONNE_MORALE}>Entreprise</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.ownerId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.ownerId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fullAddress">Adresse complète *</Label>
            <AddressAutocomplete
              value={form.watch("fullAddress") || ""}
              onAddressSelect={handleAddressSelect}
              onChange={(value) => form.setValue("fullAddress", value)}
              disabled={isLoading}
              placeholder="Rechercher une adresse..."
              error={form.formState.errors.fullAddress?.message}
            />
            {form.formState.errors.fullAddress && (
              <p className="text-sm text-destructive">
                {form.formState.errors.fullAddress.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="postalCode">Code postal *</Label>
              <Input
                id="postalCode"
                {...form.register("postalCode")}
                disabled={isLoading}
                placeholder="75001"
                value={form.watch("postalCode") || ""}
              />
              {form.formState.errors.postalCode && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.postalCode.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Ville *</Label>
              <Input
                id="city"
                {...form.register("city")}
                disabled={isLoading}
                placeholder="Paris"
                value={form.watch("city") || ""}
              />
              {form.formState.errors.city && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.city.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label">Libellé</Label>
              <Input
                id="label"
                {...form.register("label")}
                disabled={isLoading}
                placeholder="Appartement T2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type de bien</Label>
              <Controller
                name="type"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le type de bien" />
                    </SelectTrigger>
                    <SelectContent>
                      {BienType && Object.values(BienType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="surfaceM2">Surface (m²)</Label>
              <Input
                id="surfaceM2"
                type="number"
                step="0.01"
                {...form.register("surfaceM2")}
                disabled={isLoading}
                placeholder="50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legalStatus">Statut légal</Label>
              <Controller
                name="legalStatus"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange} disabled={isLoading}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner le statut légal" />
                    </SelectTrigger>
                    <SelectContent>
                      {BienLegalStatus && Object.values(BienLegalStatus).map((status) => (
                        <SelectItem key={status} value={status}>
                          {status.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
              <Controller
                name="status"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || "PROSPECT"}
                    onValueChange={(value) => field.onChange(value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PROSPECT">Prospect</SelectItem>
                      <SelectItem value="IN_PROGRESS">En cours</SelectItem>
                      <SelectItem value="ACTIVE">Actif</SelectItem>
                      <SelectItem value="ARCHIVED">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

          <Separator className="my-6" />

          {/* Section Mobilier pour location meublée */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Mobilier du logement</h3>
              <InfoIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cochez les équipements présents dans le bien. Pour louer en meublé, tous les équipements doivent être présents.
            </p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {FURNITURE_FIELDS.map(({ key, label }) => (
                <Controller
                  key={key}
                  name={key as keyof PropertyFormData}
                  control={form.control}
                  render={({ field }) => (
                    <Label
                    htmlFor={key}
                    className="text-sm font-normal cursor-pointer flex-1 flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                      <Checkbox
                        id={key}
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                        disabled={isLoading}
                      />

                        {label}
                   </Label>
                  )}
                />
              ))}
            </div>
            {/* Indicateur de complétion pour bail meublé */}
            <div className={`p-4 rounded-lg ${allFurniturePresent ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800" : "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"}`}>
              <p className={`text-sm font-medium ${allFurniturePresent ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                {allFurniturePresent 
                  ? "✓ Tous les équipements sont présents. Ce bien est éligible pour une location meublée." 
                  : "⚠ Équipements incomplets. Pour louer en meublé, tous les équipements doivent être présents."
                }
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {initialData?.id ? "Modifier" : "Créer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

