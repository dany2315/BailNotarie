"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { renewBail } from "@/lib/actions/bail-renewal";
import { dateToIsoDay } from "@/lib/utils/bail-duration";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const renewBailSchema = z.object({
  effectiveDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().optional(),
});

type RenewBailFormData = z.infer<typeof renewBailSchema>;

interface RenewBailFormProps {
  bail: {
    id: string;
    effectiveDate: Date;
    endDate: Date | null;
    rentAmount: number;
    monthlyCharges: number;
    securityDeposit: number;
    property: {
      label: string | null;
      fullAddress: string;
    };
  };
}

export function RenewBailForm({ bail }: RenewBailFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RenewBailFormData>({
    resolver: zodResolver(renewBailSchema),
    // Valeurs au format « yyyy-MM-dd », le seul que lit `new Date()` sans
    // ambiguïté à l'envoi. La date de fin reste vide : celle de l'ancien bail
    // n'a pas de sens pour un bail qui commence aujourd'hui.
    defaultValues: {
      effectiveDate: dateToIsoDay(new Date()),
      endDate: "",
    },
  });

  const onSubmit = async (data: RenewBailFormData) => {
    try {
      setIsLoading(true);
      const newEffectiveDate = new Date(data.effectiveDate);
      const newEndDate = data.endDate ? new Date(data.endDate) : undefined;

      await renewBail(bail.id, newEffectiveDate, newEndDate);

      toast.success("Bail renouvelé avec succès");
      router.push(`/client/proprietaire/baux`);
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", {
        description: error.message || "Impossible de renouveler le bail",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau bail</CardTitle>
        <CardDescription>
          Créer un nouveau bail pour {bail.property.label || bail.property.fullAddress}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="effectiveDate">Date de début *</Label>
            <Controller
              name="effectiveDate"
              control={control}
              render={({ field }) => (
                <DateInput
                  id="effectiveDate"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isLoading}
                  aria-invalid={!!errors.effectiveDate}
                />
              )}
            />
            {errors.effectiveDate && (
              <p className="text-sm text-destructive">{errors.effectiveDate.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">Date de fin (optionnel)</Label>
            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <DateInput
                  id="endDate"
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  disabled={isLoading}
                  aria-invalid={!!errors.endDate}
                />
              )}
            />
            {errors.endDate && (
              <p className="text-sm text-destructive">{errors.endDate.message}</p>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Informations du bail précédent :</p>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Loyer : {bail.rentAmount.toLocaleString()} € / mois</p>
              <p>Charges : {bail.monthlyCharges.toLocaleString()} € / mois</p>
              <p>Dépôt de garantie : {bail.securityDeposit.toLocaleString()} €</p>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Ces montants seront conservés pour le nouveau bail. Vous pourrez les modifier après création.
            </p>
          </div>

          <div className="flex gap-2">
            <Link href={`/client/proprietaire/baux/${bail.id}`}>
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
                "Créer le nouveau bail"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}








