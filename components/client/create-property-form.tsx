"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createProperty } from "@/lib/actions/properties";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BienType, BienLegalStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createPropertySchema = z.object({
  label: z.string().max(200).optional(),
  fullAddress: z.string().min(1, "L'adresse est requise").max(500),
  surfaceM2: z.string().optional(),
  type: z.nativeEnum(BienType).optional(),
  legalStatus: z.nativeEnum(BienLegalStatus).optional(),
  ownerId: z.string(),
});

type CreatePropertyFormData = z.infer<typeof createPropertySchema>;

interface CreatePropertyFormProps {
  ownerId: string;
}

export function CreatePropertyForm({ ownerId }: CreatePropertyFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePropertyFormData>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      ownerId,
    },
  });

  const type = watch("type");
  const legalStatus = watch("legalStatus");

  const onSubmit = async (data: CreatePropertyFormData) => {
    try {
      setIsLoading(true);
      await createProperty(data);
      toast.success("Bien créé avec succès");
      router.push("/client/proprietaire/biens");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer le bien",
      });
    } finally {
      setIsLoading(false);
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullAddress">Adresse complète *</Label>
            <Input
              id="fullAddress"
              {...register("fullAddress")}
              disabled={isLoading}
              placeholder="123 Rue Example, 75001 Paris"
            />
            {errors.fullAddress && (
              <p className="text-sm text-destructive">{errors.fullAddress.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Libellé (optionnel)</Label>
            <Input
              id="label"
              {...register("label")}
              disabled={isLoading}
              placeholder="Ex: Appartement T2"
            />
            {errors.label && (
              <p className="text-sm text-destructive">{errors.label.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="surfaceM2">Surface (m²)</Label>
            <Input
              id="surfaceM2"
              type="number"
              {...register("surfaceM2")}
              disabled={isLoading}
              placeholder="50"
            />
            {errors.surfaceM2 && (
              <p className="text-sm text-destructive">{errors.surfaceM2.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de bien</Label>
            <Select
              value={type}
              onValueChange={(value) => setValue("type", value as BienType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BienType.APPARTEMENT}>Appartement</SelectItem>
                <SelectItem value={BienType.MAISON}>Maison</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="legalStatus">Statut juridique</Label>
            <Select
              value={legalStatus}
              onValueChange={(value) => setValue("legalStatus", value as BienLegalStatus)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BienLegalStatus.PLEIN_PROPRIETE}>Plein propriété</SelectItem>
                <SelectItem value={BienLegalStatus.CO_PROPRIETE}>Co-propriété</SelectItem>
                <SelectItem value={BienLegalStatus.LOTISSEMENT}>Lotissement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Link href="/client/proprietaire/biens">
              <Button type="button" variant="outline" disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            </Link>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                "Créer le bien"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}








