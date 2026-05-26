"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CreatePropertyForm, CreatePropertyFormRef } from "./create-property-form";
import { BailPaymentStep } from "./bail-payment-step";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { RentControlAlert } from "@/components/ui/rent-control-alert";
import { createLease, createTenantFromEmail, saveBailDraft } from "@/lib/actions/leases";
import { validateRentAmount } from "@/lib/utils/rent-validation";
import type { RentValidationResult } from "@/lib/utils/rent-validation";
import { BailType, BailStatus } from "@prisma/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronRight,
  Home,
  User,
  Building2,
  Plus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  propertyId: z.string().min(1, "Le bien est requis"),
  tenantId: z.string().optional().or(z.literal("")),
  bailType: z.nativeEnum(BailType),
  rentAmount: z.string().min(1, "Le loyer est requis"),
  monthlyCharges: z.string().min(1, "Les charges mensuelles sont requises"),
  securityDeposit: z.string().optional(),
  effectiveDate: z.string().min(1, "La date de début est requise"),
  endDate: z.string().optional(),
  paymentDay: z.string().min(1, "Le jour de paiement est requis"),
});

type FormData = z.infer<typeof schema>;

const STEP_LABELS = ["Bien", "Locataire", "Bail", "Dates", "Paiement"];

const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  0: ["propertyId"],
  1: [], // tenantId est optionnel
  2: ["bailType", "rentAmount", "monthlyCharges"],
  3: ["effectiveDate", "paymentDay"],
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface DraftBailData {
  id: string;
  bailType: string | null;
  rentAmount: number;
  monthlyCharges: number;
  securityDeposit: number;
  effectiveDate: string | null;
  endDate: string | null;
  paymentDay: number | null;
  propertyId: string;
  tenantId: string | null;
}

interface CreateBailPageClientProps {
  biens: Array<{
    id: string;
    label: string | null;
    fullAddress: string | null;
  }>;
  locataires: Array<{
    id: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise: { legalName: string; name: string } | null;
  }>;
  ownerId: string;
  initialPropertyId?: string;
  draftBail?: DraftBailData | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateBailPageClient({
  biens,
  locataires,
  ownerId,
  initialPropertyId,
  draftBail,
}: CreateBailPageClientProps) {
  const router = useRouter();

  const getInitialStep = () => {
    if (!draftBail) return 0;
    if (!draftBail.tenantId) return 1;
    if (!draftBail.rentAmount || draftBail.rentAmount === 0) return 2;
    return 3;
  };

  const [step, setStep] = useState(getInitialStep);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(draftBail?.id ?? null);

  const [localBiens, setLocalBiens] = useState(biens);
  const [localLocataires, setLocalLocataires] = useState(locataires);

  const [isPropertyDrawerOpen, setIsPropertyDrawerOpen] = useState(false);
  const [isTenantDrawerOpen, setIsTenantDrawerOpen] = useState(false);
  const [newTenantEmail, setNewTenantEmail] = useState("");
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [isPropertyFormLoading, setIsPropertyFormLoading] = useState(false);
  const [isPropertyFormUploading, setIsPropertyFormUploading] = useState(false);

  const [selectedProperty, setSelectedProperty] = useState<{
    id: string;
    surfaceM2: number | null;
  } | null>(null);
  const [rentValidationResult, setRentValidationResult] =
    useState<RentValidationResult | null>(null);

  const propertyFormRef = useRef<CreatePropertyFormRef>(null);

  // ─── Formulaire ────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      propertyId: draftBail?.propertyId || initialPropertyId || "",
      tenantId: draftBail?.tenantId || "",
      bailType: (draftBail?.bailType as BailType) || BailType.BAIL_NU_3_ANS,
      rentAmount: draftBail?.rentAmount ? String(draftBail.rentAmount) : "",
      monthlyCharges: draftBail?.monthlyCharges ? String(draftBail.monthlyCharges) : "",
      securityDeposit: draftBail?.securityDeposit ? String(draftBail.securityDeposit) : "0",
      effectiveDate: draftBail?.effectiveDate || "",
      endDate: draftBail?.endDate || "",
      paymentDay: draftBail?.paymentDay ? String(draftBail.paymentDay) : "",
    },
  });

  const propertyId = watch("propertyId");
  const tenantId = watch("tenantId");
  const bailType = watch("bailType");
  const rentAmount = watch("rentAmount");

  // Surface du bien pour la validation loyer
  useEffect(() => {
    if (!propertyId) {
      setSelectedProperty(null);
      return;
    }
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setSelectedProperty({
            id: propertyId,
            surfaceM2: data.surfaceM2 ? Number(data.surfaceM2) : null,
          });
        }
      })
      .catch(() => setSelectedProperty({ id: propertyId, surfaceM2: null }));
  }, [propertyId]);

  // Validation du loyer (zone tendue)
  useEffect(() => {
    if (propertyId && rentAmount && selectedProperty) {
      const rent = parseFloat(rentAmount);
      if (!isNaN(rent) && rent > 0) {
        validateRentAmount(propertyId, rent, selectedProperty.surfaceM2)
          .then((r) => setRentValidationResult(r))
          .catch(() => setRentValidationResult(null));
      } else {
        setRentValidationResult(null);
      }
    } else {
      setRentValidationResult(null);
    }
  }, [propertyId, rentAmount, selectedProperty]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (step > 0) {
      setStep((s) => s - 1);
    } else {
      router.back();
    }
  }, [step, router]);

  const handleNext = useCallback(async () => {
    const fields = STEP_FIELDS[step];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    if (step === 3) {
      handleSubmit((data) => {
        setPendingFormData(data);
        setStep(4);
      })();
      return;
    }
    setStep((s) => s + 1);
  }, [step, trigger, handleSubmit]);

  const handleSaveDraft = useCallback(async () => {
    const currentPropertyId = watch("propertyId");
    if (!currentPropertyId) {
      toast.error("Sélectionnez d'abord un bien");
      return;
    }
    try {
      setIsSavingDraft(true);
      const result = await saveBailDraft({
        propertyId: currentPropertyId,
        draftBailId: currentDraftId ?? undefined,
        tenantId: watch("tenantId") || undefined,
        bailType: watch("bailType") || undefined,
        rentAmount: watch("rentAmount") || undefined,
        monthlyCharges: watch("monthlyCharges") || undefined,
        securityDeposit: watch("securityDeposit") || undefined,
        effectiveDate: watch("effectiveDate") || undefined,
        endDate: watch("endDate") || undefined,
        paymentDay: watch("paymentDay") || undefined,
      });
      setCurrentDraftId(result.bailId);
      toast.success("Brouillon sauvegardé");
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsSavingDraft(false);
    }
  }, [currentDraftId, watch]);

  const handlePaymentSuccess = useCallback(
    async (paymentIntentId: string) => {
      if (!pendingFormData) return;
      try {
        setIsSubmitting(true);
        const bail = await createLease(
          {
            ...pendingFormData,
            securityDeposit: pendingFormData.securityDeposit || "0",
            leaseType: "HABITATION",
            status: BailStatus.DRAFT,
          },
          paymentIntentId,
          currentDraftId ?? undefined
        );
        toast.success("Bail créé avec succès");
        router.push("/client/proprietaire/demandes");
      } catch (error: any) {
        toast.error("Erreur lors de la création du bail", {
          description: error.message || "Veuillez réessayer",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [pendingFormData, router, currentDraftId]
  );

  const getLocataireName = (loc: (typeof locataires)[0]) => {
    if (loc.entreprise)
      return loc.entreprise.legalName || loc.entreprise.name;
    if (loc.persons.length > 0) {
      const p = loc.persons[0];
      return (
        `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || "Locataire"
      );
    }
    return "Locataire";
  };

  const handlePropertyCreated = (newProp: any) => {
    setLocalBiens((prev) => [
      ...prev,
      { id: newProp.id, label: newProp.label, fullAddress: newProp.fullAddress },
    ]);
    setValue("propertyId", newProp.id);
    setIsPropertyDrawerOpen(false);
    toast.success("Bien créé avec succès");
  };

  const handleCreateTenant = async () => {
    if (!newTenantEmail.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    try {
      setIsCreatingTenant(true);
      const tenant = await createTenantFromEmail({ email: newTenantEmail });
      setLocalLocataires((prev) => [...prev, tenant]);
      setValue("tenantId", tenant.id);
      toast.success("Locataire créé avec succès");
      setNewTenantEmail("");
      setIsTenantDrawerOpen(false);
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsCreatingTenant(false);
    }
  };

  // ─── Contenu par étape ─────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold">Quel bien ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez le bien concerné par ce bail
              </p>
            </div>
            <div className="space-y-2.5">
              {localBiens.map((bien) => (
                <button
                  key={bien.id}
                  type="button"
                  onClick={() => {
                    setValue("propertyId", bien.id);
                    trigger("propertyId");
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                    propertyId === bien.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 p-2 rounded-lg shrink-0",
                      propertyId === bien.id ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    <Home
                      className={cn(
                        "h-4 w-4",
                        propertyId === bien.id ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {bien.label || "Bien sans libellé"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {bien.fullAddress || "Adresse non renseignée"}
                    </p>
                  </div>
                  {propertyId === bien.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsPropertyDrawerOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
              >
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Ajouter un nouveau bien</span>
              </button>
            </div>
            {errors.propertyId && (
              <p className="text-sm text-destructive">{errors.propertyId.message}</p>
            )}
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div>
              <p className="text-xl font-semibold">Quel locataire ?</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez le locataire pour ce bail, ou passez cette étape si vous ne l'avez pas encore trouvé.
              </p>
            </div>
            <div className="space-y-2.5">
              {localLocataires.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => {
                    setValue("tenantId", loc.id);
                    trigger("tenantId");
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
                    tenantId === loc.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30 hover:bg-muted/40"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 p-2 rounded-lg shrink-0",
                      tenantId === loc.id ? "bg-primary/10" : "bg-muted"
                    )}
                  >
                    {loc.entreprise ? (
                      <Building2
                        className={cn(
                          "h-4 w-4",
                          tenantId === loc.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    ) : (
                      <User
                        className={cn(
                          "h-4 w-4",
                          tenantId === loc.id ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{getLocataireName(loc)}</p>
                    {loc.persons[0]?.email && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {loc.persons[0].email}
                      </p>
                    )}
                  </div>
                  {tenantId === loc.id && (
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  )}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsTenantDrawerOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
              >
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Ajouter un nouveau locataire</span>
              </button>
            </div>
            <button
                type="button"
                onClick={() => { setValue("tenantId", ""); setStep((s) => s + 1); }}
                className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-muted-foreground/40 text-muted-foreground hover:text-foreground transition-all"
              >
                <div className="p-2 rounded-lg bg-muted shrink-0">
                  <ChevronRight className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium block">Passer cette étape</span>
                  <span className="text-xs opacity-70">Vous pourrez ajouter le locataire plus tard</span>
                </div>
              </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xl font-semibold">Détails du bail</p>
              <p className="text-sm text-muted-foreground mt-1">
                Type, loyer et charges mensuelles
              </p>
            </div>

            {propertyId && (
              <RentControlAlert
                propertyId={propertyId}
                rentAmount={rentAmount ? parseFloat(rentAmount) : undefined}
                surfaceM2={selectedProperty?.surfaceM2}
                validationResult={rentValidationResult}
              />
            )}

            <div className="space-y-2">
              <Label>Type de bail *</Label>
              <Select
                value={bailType}
                onValueChange={(v) => setValue("bailType", v as BailType)}
              >
                <SelectTrigger className="w-full h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BailType.BAIL_NU_3_ANS}>Bail nu 3 ans</SelectItem>
                  <SelectItem value={BailType.BAIL_NU_6_ANS}>Bail nu 6 ans</SelectItem>
                  <SelectItem value={BailType.BAIL_MEUBLE_1_ANS}>Bail meublé 1 an</SelectItem>
                  <SelectItem value={BailType.BAIL_MEUBLE_9_MOIS}>Bail meublé 9 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Loyer mensuel (€) *</Label>
              <Input
                type="number"
                placeholder="800"
                inputMode="decimal"
                className="w-full h-11"
                {...register("rentAmount")}
              />
              {errors.rentAmount && (
                <p className="text-sm text-destructive">{errors.rentAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Charges mensuelles (€) *</Label>
              <Input
                type="number"
                placeholder="50"
                inputMode="decimal"
                className="w-full h-11"
                {...register("monthlyCharges")}
              />
              {errors.monthlyCharges && (
                <p className="text-sm text-destructive">{errors.monthlyCharges.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Dépôt de garantie (€)</Label>
              <Input
                type="number"
                placeholder="800"
                inputMode="decimal"
                className="w-full h-11"
                {...register("securityDeposit")}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-xl font-semibold">Dates du bail</p>
              <p className="text-sm text-muted-foreground mt-1">
                Durée et échéance de paiement
              </p>
            </div>

            <div className="space-y-2">
              <Label>Date de début *</Label>
              <Input
                type="date"
                className="w-full h-11"
                {...register("effectiveDate")}
              />
              {errors.effectiveDate && (
                <p className="text-sm text-destructive">{errors.effectiveDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Date de fin (optionnel)</Label>
              <Input
                type="date"
                className="w-full h-11"
                {...register("endDate")}
              />
            </div>

            <div className="space-y-2">
              <Label>Jour de paiement du loyer *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                placeholder="5"
                inputMode="numeric"
                className="w-full h-11"
                {...register("paymentDay")}
              />
              {errors.paymentDay && (
                <p className="text-sm text-destructive">{errors.paymentDay.message}</p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <BailPaymentStep
            onPaymentSuccess={handlePaymentSuccess}
            isSubmitting={isSubmitting}
          />
        );
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="relative h-full bg-background flex flex-col overflow-hidden">
        {/* Overlay de soumission */}
        {isSubmitting && (
          <div className="absolute inset-0 z-50 bg-background/95 flex items-center justify-center">
            <LoadingScreen
              variant="inline"
              message="Création du bail en cours..."
              description="Veuillez patienter"
              className="justify-center"
            />
          </div>
        )}

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b">
          <button
            type="button"
            onClick={handleBack}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight">Nouveau bail</p>
            <p className="text-xs text-muted-foreground">
              {STEP_LABELS[step]} · Étape {step + 1}/{STEP_LABELS.length}
            </p>
          </div>
          {step > 0 && step < 4 && (
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSubmitting || isSavingDraft}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 px-2 py-1 rounded-md hover:bg-muted"
            >
              {isSavingDraft ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          )}
        </div>

        {/* Barre de progression */}
        <div className="shrink-0 h-0.5 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / STEP_LABELS.length) * 100}%` }}
          />
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-6">
          {renderStep()}
        </div>

        {/* Footer — toujours visible au-dessus du clavier */}
        {step < 4 && (
          <div
            className="shrink-0 border-t bg-background px-4 py-3"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
          >
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              className="w-full h-12 text-base"
            >
              {step === 3 ? "Continuer vers le paiement" : "Continuer"}
              {step < 3 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      {/* Dialog : ajouter un bien */}
      <Dialog open={isPropertyDrawerOpen} onOpenChange={(open) => { if (!isPropertyFormLoading && !isPropertyFormUploading) setIsPropertyDrawerOpen(open); }}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-0 sm:max-w-lg overflow-hidden" showCloseButton={!isPropertyFormLoading && !isPropertyFormUploading}>
          {/* Loader overlay */}
          {(isPropertyFormLoading || isPropertyFormUploading) && (
            <div className="absolute inset-0 z-10 bg-background/90 flex flex-col items-center justify-center gap-3 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                {isPropertyFormUploading ? "Upload des fichiers en cours..." : "Création du bien en cours..."}
              </p>
            </div>
          )}
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Créer un nouveau bien
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations du bien immobilier
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <CreatePropertyForm
              ref={propertyFormRef}
              ownerId={ownerId}
              onPropertyCreated={handlePropertyCreated}
              hideActions={true}
              onLoadingChange={setIsPropertyFormLoading}
              onUploadingChange={setIsPropertyFormUploading}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex-col sm:flex-col gap-2">
            <Button
              onClick={() => propertyFormRef.current?.submit()}
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              className="w-full"
            >
              {isPropertyFormUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload en cours...</>
              ) : isPropertyFormLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Créer le bien</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsPropertyDrawerOpen(false)}
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              className="w-full"
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog : ajouter un locataire */}
      <Dialog open={isTenantDrawerOpen} onOpenChange={setIsTenantDrawerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Ajouter un locataire
            </DialogTitle>
            <DialogDescription>
              Entrez l'email pour créer un nouveau locataire
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="locataire@example.com"
              value={newTenantEmail}
              onChange={(e) => setNewTenantEmail(e.target.value)}
              disabled={isCreatingTenant}
              inputMode="email"
              autoComplete="email"
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Un lien d'invitation sera envoyé une fois le bail créé.
            </p>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button
              onClick={handleCreateTenant}
              disabled={isCreatingTenant || !newTenantEmail}
              className="w-full"
            >
              {isCreatingTenant ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
              ) : (
                <><Plus className="mr-2 h-4 w-4" />Créer le locataire</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsTenantDrawerOpen(false);
                setNewTenantEmail("");
              }}
              disabled={isCreatingTenant}
              className="w-full"
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
