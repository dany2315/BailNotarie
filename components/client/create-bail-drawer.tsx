"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { CreateBailForm, CreateBailFormRef } from "./create-bail-form";
import { BailPaymentStep } from "./bail-payment-step";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { FileText, ArrowLeft } from "lucide-react";
import { createLease } from "@/lib/actions/leases";
import { BailStatus } from "@prisma/client";
import { toast } from "sonner";

interface CreateBailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
    entreprise: {
      legalName: string;
      name: string;
    } | null;
  }>;
  ownerId: string;
  initialPropertyId?: string;
  onBailCreated?: (bail: any) => void;
}

type Step = "form" | "payment";

export function CreateBailDrawer({
  open,
  onOpenChange,
  biens,
  locataires,
  ownerId,
  initialPropertyId,
  onBailCreated,
}: CreateBailDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const formRef = useRef<CreateBailFormRef | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [step, setStep] = useState<Step>("form");
  const [pendingFormData, setPendingFormData] = useState<any | null>(null);
  const onBailCreatedRef = useRef(onBailCreated);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onBailCreatedRef.current = onBailCreated;
    onOpenChangeRef.current = onOpenChange;
  }, [onBailCreated, onOpenChange]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Réinitialiser quand le drawer s'ouvre
  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
      setIsValidating(false);
      setStep("form");
      setPendingFormData(null);
      setFormInstanceKey((prev) => prev + 1);
    }
  }, [open]);

  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen) {
      setIsSubmitting(false);
      setIsValidating(false);
      setStep("form");
      setPendingFormData(null);
    }
    onOpenChangeRef.current(newOpen);
  }, []);

  // Étape 1 → 2 : valider le formulaire puis afficher le paiement
  const handleContinueToPayment = useCallback(async () => {
    if (!formRef.current || isValidating) return;
    setIsValidating(true);
    const data = await formRef.current.getValidatedData();
    setIsValidating(false);
    if (!data) return; // validation échouée — les erreurs sont affichées dans le form
    setPendingFormData(data);
    setStep("payment");
  }, [isValidating]);

  // Étape 2 : paiement réussi → créer le bail
  const handlePaymentSuccess = useCallback(async (paymentIntentId: string) => {
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
        paymentIntentId
      );
      toast.success("Bail créé avec succès");
      if (onBailCreatedRef.current) {
        onBailCreatedRef.current(bail);
      }
      onOpenChangeRef.current(false);
    } catch (error: any) {
      toast.error("Erreur lors de la création du bail", {
        description: error.message || "Veuillez réessayer",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [pendingFormData]);

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className={isMobile ? "max-h-[95vh]" : "sm:max-w-2xl h-full"}>
        {isSubmitting && (
          <div className="absolute inset-0 z-50 rounded-[inherit]">
            <LoadingScreen
              variant="inline"
              message="Création du bail en cours..."
              description="Veuillez patienter pendant la création de votre bail"
              className="h-full justify-center"
            />
          </div>
        )}
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {step === "form" ? "Créer un nouveau bail" : "Paiement"}
          </DrawerTitle>
          <DrawerDescription>
            {step === "form"
              ? "Remplissez les informations pour créer un nouveau bail"
              : "Réglez les frais de dossier pour finaliser votre bail"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {step === "form" ? (
            <CreateBailForm
              key={`${formInstanceKey}-${initialPropertyId || "none"}`}
              ref={formRef}
              biens={biens}
              locataires={locataires}
              ownerId={ownerId}
              initialPropertyId={initialPropertyId}
              hideActions={true}
            />
          ) : (
            <BailPaymentStep
              onPaymentSuccess={handlePaymentSuccess}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {step === "form" && (
          <DrawerFooter>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isValidating}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button
                onClick={handleContinueToPayment}
                disabled={isValidating}
                className="flex-1"
              >
                {isValidating ? "Vérification..." : "Continuer vers le paiement"}
              </Button>
            </div>
          </DrawerFooter>
        )}

        {step === "payment" && (
          <DrawerFooter>
            <Button
              variant="outline"
              onClick={() => setStep("form")}
              disabled={isSubmitting}
              className="w-full"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Modifier le bail
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
