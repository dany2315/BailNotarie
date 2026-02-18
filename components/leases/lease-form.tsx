"use client";

import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { createLeaseSchema } from "@/lib/zod/lease";
import { z } from "zod";

// Schéma pour la validation côté client
const leaseFormSchema = z.object({
  leaseType: z.enum(["HABITATION", "MEUBLE", "COMMERCIAL", "PROFESSIONNEL", "SAISONNIER", "OTHER"]).default("HABITATION"),
  status: z.enum(["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "SIGNED", "TERMINATED"]).default("DRAFT"),
  propertyId: z.string().min(1, "Le bien est requis"),
  tenantId: z.string().optional().or(z.literal("")),
  effectiveDate: z.string().min(1, "La date de prise d'effet est requise"),
  endDate: z.string().optional().or(z.literal("")),
  rentAmount: z.string().min(1, "Le montant du loyer est requis"),
  monthlyCharges: z.string().optional().or(z.literal("")),
  securityDeposit: z.string().optional().or(z.literal("")),
  paymentDay: z.string().optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  // Validation dépôt de garantie selon le type de bail
  const rentAmount = parseInt(data.rentAmount || '0', 10);
  const securityDeposit = parseInt(data.securityDeposit || '0', 10);
  
  if (rentAmount > 0 && securityDeposit > 0) {
    // MEUBLE = bail meublé → max 2 mois
    // HABITATION = bail nue → max 1 mois
    const isMeuble = data.leaseType === "MEUBLE";
    const maxDeposit = isMeuble ? rentAmount * 2 : rentAmount;
    
    if (securityDeposit > maxDeposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["securityDeposit"],
        message: `Le dépôt de garantie ne peut pas dépasser ${isMeuble ? '2' : '1'} mois de loyer hors charges (max ${maxDeposit.toLocaleString('fr-FR')} €)`,
      });
    }
  }
});

type LeaseFormData = z.infer<typeof leaseFormSchema>;

// Composant séparé pour la validation du dépôt de garantie (évite les re-renders)
const SecurityDepositValidation = ({ control }: { control: any }) => {
  const leaseType = useWatch({ control, name: "leaseType" });
  const rentAmount = useWatch({ control, name: "rentAmount" });
  const securityDeposit = useWatch({ control, name: "securityDeposit" });
  
  const isMeuble = leaseType === "MEUBLE";
  const rentAmountNum = parseInt(rentAmount || '0', 10);
  const securityDepositNum = parseInt(securityDeposit || '0', 10);
  const maxDeposit = isMeuble ? rentAmountNum * 2 : rentAmountNum;
  const isExceeded = rentAmountNum > 0 && securityDepositNum > maxDeposit;
  
  if (rentAmountNum <= 0) return null;
  
  return (
    <>
      <p className={`text-xs ${isExceeded ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
        Maximum : {maxDeposit.toLocaleString('fr-FR')} € ({isMeuble ? '2' : '1'} mois de loyer)
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
}

export function LeaseForm({ onSubmit, initialData, properties, parties }: LeaseFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseFormSchema) as any,
    defaultValues: initialData || {
      leaseType: "HABITATION",
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

  const handleSubmit = async (data: LeaseFormData) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      
      // Inclure l'ID si on est en mode édition
      if (initialData?.id) {
        formData.append("id", initialData.id);
      }
      
      // Ajouter tous les champs
      formData.append("leaseType", data.leaseType);
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
      router.push(initialData?.id ? `/interface/baux/${initialData.id}` : "/interface/baux");
    } catch (error: any) {
      toast.error(error.message || (initialData?.id ? "Erreur lors de la modification du bail" : "Erreur lors de la création du bail"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour obtenir le nom d'une partie
  const getPartyName = (party: any) => {
    if (party.type === "PERSONNE_PHYSIQUE") {
      // Chercher la personne principale ou la première personne
      const primaryPerson = party.persons?.find((p: any) => p.isPrimary) || party.persons?.[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        return name || primaryPerson.email || "Partie sans nom";
      }
      return "Partie sans nom";
    } else if (party.type === "PERSONNE_MORALE") {
      // Utiliser les données de l'entreprise
      if (party.entreprise) {
        return party.entreprise.legalName || party.entreprise.name || party.entreprise.email || "Partie sans nom";
      }
      return "Partie sans nom";
    }
    return "Partie sans nom";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informations du bail</CardTitle>
        <CardDescription>
          {initialData?.id ? "Modifiez les informations du bail" : "Remplissez les informations pour créer un nouveau bail"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
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
                      form.trigger("tenantId");
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
              {form.formState.errors.tenantId && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.tenantId.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="leaseType">Type de bail</Label>
              <Controller
                name="leaseType"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || "HABITATION"}
                    onValueChange={(value) => field.onChange(value as any)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HABITATION">Habitation</SelectItem>
                      <SelectItem value="MEUBLE">Meublé</SelectItem>
                      <SelectItem value="COMMERCIAL">Commercial</SelectItem>
                      <SelectItem value="PROFESSIONNEL">Professionnel</SelectItem>
                      <SelectItem value="SAISONNIER">Saisonnier</SelectItem>
                      <SelectItem value="OTHER">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Statut</Label>
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
                      <SelectItem value="SIGNED">Signé</SelectItem>
                      <SelectItem value="TERMINATED">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Montant du loyer *</Label>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
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

            <div className="space-y-2">
              <Label htmlFor="paymentDay">Jour de paiement</Label>
              <NumberInputGroup
                field={form.register("paymentDay")}
                value={form.watch("paymentDay")}
                min={1}
                max={31}
                disabled={isLoading}
                placeholder="5"
              />
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

