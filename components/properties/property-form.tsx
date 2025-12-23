"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPropertySchema } from "@/lib/zod/property";
import { z } from "zod";
import { BienType, BienLegalStatus, PropertyStatus, ClientType } from "@prisma/client";

// Schéma pour la validation côté client - tous les champs optionnels sauf fullAddress et ownerId
const propertyFormSchema = z.object({
  label: z.string().optional().or(z.literal("")),
  fullAddress: z.string().min(1, "L'adresse est requise").max(500, "L'adresse est trop longue").trim(),
  surfaceM2: z.string().optional().or(z.literal("")),
  type: z.nativeEnum(BienType).optional().or(z.literal("")),
  legalStatus: z.nativeEnum(BienLegalStatus).optional().or(z.literal("")),
  status: z.nativeEnum(PropertyStatus).default(PropertyStatus.NON_LOUER),
  ownerId: z.string().min(1, "Le propriétaire est requis"),
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
      surfaceM2: "",
      type: "",
      legalStatus: "",
      status: PropertyStatus.NON_LOUER,
      ownerId: "",
    },
  });

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
            <Input
              id="fullAddress"
              {...form.register("fullAddress")}
              disabled={isLoading}
              placeholder="123 Rue Example, 75001 Paris"
            />
            {form.formState.errors.fullAddress && (
              <p className="text-sm text-destructive">
                {form.formState.errors.fullAddress.message}
              </p>
            )}
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

