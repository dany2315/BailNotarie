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
import { createLease } from "@/lib/actions/leases";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BailType, BailFamille, BailStatus } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const createBailSchema = z.object({
  propertyId: z.string().min(1, "Le bien est requis"),
  tenantId: z.string().min(1, "Le locataire est requis"),
  bailType: z.nativeEnum(BailType),
  rentAmount: z.string().min(1, "Le loyer est requis"),
  monthlyCharges: z.string().optional(),
  securityDeposit: z.string().optional(),
  effectiveDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().optional(),
  paymentDay: z.string().optional(),
});

type CreateBailFormData = z.infer<typeof createBailSchema>;

interface CreateBailFormProps {
  biens: Array<{
    id: string;
    label: string | null;
    fullAddress: string;
  }>;
  locataires: Array<{
    id: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
    }>;
    entreprise: {
      legalName: string;
      name: string;
    } | null;
  }>;
}

export function CreateBailForm({ biens, locataires }: CreateBailFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateBailFormData>({
    resolver: zodResolver(createBailSchema),
    defaultValues: {
      bailType: BailType.BAIL_NU_3_ANS,
      monthlyCharges: "0",
      securityDeposit: "0",
    },
  });

  const propertyId = watch("propertyId");
  const tenantId = watch("tenantId");
  const bailType = watch("bailType");

  const onSubmit = async (data: CreateBailFormData) => {
    try {
      setIsLoading(true);
      const bailData = {
        ...data,
        monthlyCharges: data.monthlyCharges || "0",
        securityDeposit: data.securityDeposit || "0",
        leaseType: "HABITATION",
        status: BailStatus.DRAFT,
      };
      await createLease(bailData);
      toast.success("Bail créé avec succès");
      router.push("/client/proprietaire/baux");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de créer le bail",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLocataireName = (locataire: typeof locataires[0]) => {
    if (locataire.entreprise) {
      return locataire.entreprise.legalName || locataire.entreprise.name;
    }
    if (locataire.persons.length > 0) {
      const person = locataire.persons[0];
      return `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Locataire";
    }
    return "Locataire";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bail</CardTitle>
        <CardDescription>
          Remplissez les informations pour créer un nouveau bail
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propertyId">Bien *</Label>
            <Select
              value={propertyId}
              onValueChange={(value) => setValue("propertyId", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>
              <SelectContent>
                {biens.map((bien) => (
                  <SelectItem key={bien.id} value={bien.id}>
                    {bien.label || bien.fullAddress}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.propertyId && (
              <p className="text-sm text-destructive">{errors.propertyId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tenantId">Locataire *</Label>
            <Select
              value={tenantId}
              onValueChange={(value) => setValue("tenantId", value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un locataire" />
              </SelectTrigger>
              <SelectContent>
                {locataires.map((locataire) => (
                  <SelectItem key={locataire.id} value={locataire.id}>
                    {getLocataireName(locataire)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.tenantId && (
              <p className="text-sm text-destructive">{errors.tenantId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bailType">Type de bail *</Label>
            <Select
              value={bailType}
              onValueChange={(value) => setValue("bailType", value as BailType)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BailType.BAIL_NU_3_ANS}>Bail nu 3 ans</SelectItem>
                <SelectItem value={BailType.BAIL_NU_6_ANS}>Bail nu 6 ans</SelectItem>
                <SelectItem value={BailType.BAIL_MEUBLE_1_ANS}>Bail meublé 1 an</SelectItem>
                <SelectItem value={BailType.BAIL_MEUBLE_9_MOIS}>Bail meublé 9 mois</SelectItem>
              </SelectContent>
            </Select>
            {errors.bailType && (
              <p className="text-sm text-destructive">{errors.bailType.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rentAmount">Loyer mensuel (€) *</Label>
            <Input
              id="rentAmount"
              type="number"
              {...register("rentAmount")}
              disabled={isLoading}
              placeholder="800"
            />
            {errors.rentAmount && (
              <p className="text-sm text-destructive">{errors.rentAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyCharges">Charges mensuelles (€)</Label>
            <Input
              id="monthlyCharges"
              type="number"
              {...register("monthlyCharges")}
              disabled={isLoading}
              placeholder="50"
            />
            {errors.monthlyCharges && (
              <p className="text-sm text-destructive">{errors.monthlyCharges.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="securityDeposit">Dépôt de garantie (€)</Label>
            <Input
              id="securityDeposit"
              type="number"
              {...register("securityDeposit")}
              disabled={isLoading}
              placeholder="800"
            />
            {errors.securityDeposit && (
              <p className="text-sm text-destructive">{errors.securityDeposit.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Date de début *</Label>
            <Input
              id="effectiveDate"
              type="date"
              {...register("effectiveDate")}
              disabled={isLoading}
            />
            {errors.effectiveDate && (
              <p className="text-sm text-destructive">{errors.effectiveDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Date de fin (optionnel)</Label>
            <Input
              id="endDate"
              type="date"
              {...register("endDate")}
              disabled={isLoading}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentDay">Jour de paiement (optionnel)</Label>
            <Input
              id="paymentDay"
              type="number"
              min="1"
              max="31"
              {...register("paymentDay")}
              disabled={isLoading}
              placeholder="5"
            />
            {errors.paymentDay && (
              <p className="text-sm text-destructive">{errors.paymentDay.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <Link href="/client/proprietaire/baux">
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
                "Créer le bail"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}







