"use client";

import { useState, forwardRef, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AlertCircle, Loader2, Sofa } from "lucide-react";
import { z } from "zod";

/** Vérifie que le bien possède les 13 éléments obligatoires pour une location meublée (Décret 2015-981) */
function isPropertyMeuble(property: any): boolean {
  if (!property) return false;
  return Boolean(
    property.hasLiterie &&
    property.hasRideaux &&
    property.hasPlaquesCuisson &&
    property.hasFour &&
    property.hasRefrigerateur &&
    property.hasCongelateur &&
    property.hasVaisselle &&
    property.hasUstensilesCuisine &&
    property.hasTable &&
    property.hasSieges &&
    property.hasEtageresRangement &&
    property.hasLuminaires &&
    property.hasMaterielEntretien
  );
}

const leaseFormSchema = z
  .object({
    leaseType: z.enum(["HABITATION", "COMMERCIAL"]).default("HABITATION"),
    bailType: z
      .enum(["BAIL_NU_3_ANS", "BAIL_NU_6_ANS", "BAIL_MEUBLE_1_ANS", "BAIL_MEUBLE_9_MOIS"])
      .default("BAIL_NU_3_ANS"),
    status: z
      .enum([
        "DRAFT",
        "PENDING_VALIDATION",
        "READY_FOR_NOTARY",
        "CLIENT_CONTACTED",
        "SIGNED",
        "TERMINATED",
      ])
      .default("DRAFT"),
    propertyId: z.string().min(1, "Le bien est requis"),
    tenantId: z.string().optional().or(z.literal("")),
    effectiveDate: z.string().min(1, "La date de prise d'effet est requise"),
    endDate: z.string().optional().or(z.literal("")),
    rentAmount: z.string().min(1, "Le montant du loyer est requis"),
    monthlyCharges: z.string().optional().or(z.literal("")),
    securityDeposit: z.string().optional().or(z.literal("")),
    paymentDay: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const rentAmount = parseInt(data.rentAmount || "0", 10);
    const securityDeposit = parseInt(data.securityDeposit || "0", 10);
    if (rentAmount > 0 && securityDeposit > rentAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["securityDeposit"],
        message: `Le dépôt de garantie ne peut pas dépasser 1 mois de loyer hors charges (max ${rentAmount.toLocaleString("fr-FR")} €)`,
      });
    }
  });

type LeaseFormData = z.infer<typeof leaseFormSchema>;

export interface LeaseFormRef {
  submit: () => void;
}

const SecurityDepositValidation = ({ control }: { control: any }) => {
  const rentAmount = useWatch({ control, name: "rentAmount" });
  const securityDeposit = useWatch({ control, name: "securityDeposit" });

  const rentAmountNum = parseInt(rentAmount || "0", 10);
  const securityDepositNum = parseInt(securityDeposit || "0", 10);
  const isExceeded = rentAmountNum > 0 && securityDepositNum > rentAmountNum;

  if (rentAmountNum <= 0) return null;

  return (
    <>
      <p className={`text-xs ${isExceeded ? "text-destructive font-medium" : "text-muted-foreground"}`}>
        Maximum : {rentAmountNum.toLocaleString("fr-FR")} € (1 mois de loyer)
      </p>
      {isExceeded && (
        <p className="text-sm text-destructive flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Dépasse le maximum légal
        </p>
      )}
    </>
  );
};

interface LeaseFormProps {
  onSubmit: (data: FormData) => Promise<void>;
  initialData?: any;
  properties: any[];
  parties: any[];
  /** Si true, masque les boutons Annuler/Valider (pour usage dans un drawer) */
  hideActions?: boolean;
  /** Appelé après succès (remplace la navigation par défaut) */
  onSuccess?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

export const LeaseForm = forwardRef<LeaseFormRef, LeaseFormProps>(function LeaseForm(
  { onSubmit, initialData, properties, parties, hideActions, onSuccess, onLoadingChange },
  ref
) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema) as any,
    defaultValues: initialData || {
      leaseType: "HABITATION",
      bailType: "BAIL_NU_3_ANS",
      status: "DRAFT",
      propertyId: "",
      tenantId: "",
      effectiveDate: "",
      endDate: "",
      rentAmount: "",
      monthlyCharges: "",
      securityDeposit: "",
      paymentDay: "",
    },
  });

  useImperativeHandle(ref, () => ({
    submit: () => {
      form.handleSubmit(handleFormSubmit)();
    },
  }));

  const handleFormSubmit = async (data: LeaseFormData) => {
    setIsLoading(true);
    onLoadingChange?.(true);
    try {
      const formData = new FormData();

      if (initialData?.id) formData.append("id", initialData.id);
      formData.append("leaseType", data.leaseType);
      formData.append("bailType", data.bailType);
      formData.append("status", data.status);
      formData.append("propertyId", data.propertyId);
      if (data.tenantId) formData.append("tenantId", data.tenantId);
      formData.append("effectiveDate", data.effectiveDate);
      if (data.endDate) formData.append("endDate", data.endDate);
      formData.append("rentAmount", data.rentAmount);
      formData.append("monthlyCharges", data.monthlyCharges || "0");
      formData.append("securityDeposit", data.securityDeposit || "0");
      if (data.paymentDay) formData.append("paymentDay", data.paymentDay);

      await onSubmit(formData);
      toast.success(initialData?.id ? "Bail modifié avec succès" : "Bail créé avec succès");

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(initialData?.id ? `/interface/baux/${initialData.id}` : "/interface/baux");
      }
    } catch (error: any) {
      toast.error(
        error.message ||
          (initialData?.id
            ? "Erreur lors de la modification du bail"
            : "Erreur lors de la création du bail")
      );
    } finally {
      setIsLoading(false);
      onLoadingChange?.(false);
    }
  };

  // Bien sélectionné et capacité meublée
  const selectedPropertyId = form.watch("propertyId");
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId) ?? null;
  const isCommercial = form.watch("leaseType") === "COMMERCIAL";
  const canMeuble = !isCommercial && isPropertyMeuble(selectedProperty);

  const getPartyName = (party: any) => {
    if (party.type === "PERSONNE_PHYSIQUE") {
      const primaryPerson = party.persons?.find((p: any) => p.isPrimary) || party.persons?.[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        return name || primaryPerson.email || "Partie sans nom";
      }
      return "Partie sans nom";
    } else if (party.type === "PERSONNE_MORALE") {
      if (party.entreprise) {
        return (
          party.entreprise.legalName ||
          party.entreprise.name ||
          party.entreprise.email ||
          "Partie sans nom"
        );
      }
      return "Partie sans nom";
    }
    return "Partie sans nom";
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Parties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="propertyId">Bien *</Label>
              <Controller
                name="propertyId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger("propertyId");
                      // Si le nouveau bien ne supporte pas le meublé, réinitialiser le type de bail
                      const newProperty = properties.find((p) => p.id === value);
                      const currentBailType = form.getValues("bailType");
                      const isMeubleBailType =
                        currentBailType === "BAIL_MEUBLE_1_ANS" ||
                        currentBailType === "BAIL_MEUBLE_9_MOIS";
                      if (isMeubleBailType && !isPropertyMeuble(newProperty)) {
                        form.setValue("bailType", "BAIL_NU_3_ANS");
                      }
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un bien" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.label || property.fullAddress}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.propertyId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.propertyId.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantId">Locataire</Label>
              <Controller
                name="tenantId"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || ""}
                    onValueChange={(value) => {
                      field.onChange(value === "none" ? "" : value);
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un locataire (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun locataire</SelectItem>
                      {parties.map((party) => (
                        <SelectItem key={party.id} value={party.id}>
                          {getPartyName(party)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Famille de bail</Label>
              <Controller
                name="leaseType"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || "HABITATION"}
                    onValueChange={(value) => {
                      field.onChange(value as any);
                      // Si on passe en Commercial, les types meublés ne sont plus valides
                      const currentBailType = form.getValues("bailType");
                      const isMeuble =
                        currentBailType === "BAIL_MEUBLE_1_ANS" ||
                        currentBailType === "BAIL_MEUBLE_9_MOIS";
                      if (value === "COMMERCIAL" && isMeuble) {
                        form.setValue("bailType", "BAIL_NU_3_ANS");
                      }
                    }}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HABITATION">Habitation</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Type de contrat</Label>
              <Controller
                name="bailType"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || "BAIL_NU_3_ANS"}
                    onValueChange={(value) => field.onChange(value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAIL_NU_3_ANS">Bail nu 3 ans</SelectItem>
                      <SelectItem value="BAIL_NU_6_ANS">Bail nu 6 ans</SelectItem>
                      <SelectItem value="BAIL_MEUBLE_1_ANS" disabled={!canMeuble}>
                        Bail meublé 1 an
                      </SelectItem>
                      <SelectItem value="BAIL_MEUBLE_9_MOIS" disabled={!canMeuble}>
                        Bail meublé 9 mois
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {!canMeuble && selectedPropertyId && !isCommercial && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Sofa className="size-3 shrink-0" />
                  Location meublée indisponible — le bien ne possède pas tous les équipements obligatoires
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Statut</Label>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => (
                <Select
                  value={field.value || "DRAFT"}
                  onValueChange={(value) => field.onChange(value as any)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Brouillon</SelectItem>
                    <SelectItem value="PENDING_VALIDATION">En attente de validation</SelectItem>
                    <SelectItem value="READY_FOR_NOTARY">Prêt pour notaire</SelectItem>
                    <SelectItem value="CLIENT_CONTACTED">Client contacté</SelectItem>
                    <SelectItem value="SIGNED">Signé</SelectItem>
                    <SelectItem value="TERMINATED">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="effectiveDate">Date de prise d'effet *</Label>
              <Input
                id="effectiveDate"
                type="date"
                {...form.register("effectiveDate")}
                disabled={isLoading}
              />
              {form.formState.errors.effectiveDate && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.effectiveDate.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                {...form.register("endDate")}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-2 max-w-[200px]">
            <Label htmlFor="paymentDay">Jour de paiement mensuel</Label>
            <NumberInputGroup
              field={form.register("paymentDay")}
              value={form.watch("paymentDay")}
              min={1}
              max={31}
              disabled={isLoading}
              placeholder="5"
            />
            <p className="text-xs text-muted-foreground">Entre 1 et 31</p>
          </div>
        </CardContent>
      </Card>

      {/* Montants */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Montants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Loyer mensuel *</Label>
              <NumberInputGroup
                field={form.register("rentAmount")}
                value={form.watch("rentAmount")}
                min={0}
                unit="€"
                disabled={isLoading}
                placeholder="800"
              />
              {form.formState.errors.rentAmount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.rentAmount.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthlyCharges">Charges mensuelles</Label>
              <NumberInputGroup
                field={form.register("monthlyCharges")}
                value={form.watch("monthlyCharges")}
                min={0}
                unit="€"
                disabled={isLoading}
                placeholder="100"
              />
            </div>
          </div>

          <div className="space-y-2 sm:max-w-[calc(50%-8px)]">
            <Label htmlFor="securityDeposit">Dépôt de garantie</Label>
            <NumberInputGroup
              field={form.register("securityDeposit")}
              min={0}
              unit="€"
              disabled={isLoading}
              placeholder="800"
            />
            <SecurityDepositValidation control={form.control} />
          </div>
        </CardContent>
      </Card>

      {!hideActions && (
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
            {initialData?.id ? "Modifier le bail" : "Créer le bail"}
          </Button>
        </div>
      )}
    </form>
  );
});
