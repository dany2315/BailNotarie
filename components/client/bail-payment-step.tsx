"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Shield,
  Lock,
  CheckCircle2,
  CreditCard,
  Loader2,
  AlertCircle,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BailCostEstimate } from "@/components/leases/bail-cost-estimate";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const STRIPE_APPEARANCE = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#4373f5",
    colorBackground: "#ffffff",
    colorText: "#111827",
    colorDanger: "#ef4444",
    fontFamily: "Inter, system-ui, sans-serif",
    spacingUnit: "4px",
    borderRadius: "8px",
  },
  rules: {
    ".Input": {
      border: "1px solid #e5e7eb",
      boxShadow: "none",
      padding: "10px 12px",
    },
    ".Input:focus": {
      border: "1.5px solid #4373f5",
      boxShadow: "0 0 0 3px rgba(67,115,245,0.12)",
    },
    ".Label": {
      fontWeight: "500",
      fontSize: "13px",
      color: "#374151",
    },
    ".Tab": {
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
    },
    ".Tab--selected": {
      border: "1.5px solid #4373f5",
      backgroundColor: "#eff4ff",
    },
  },
};

interface PaymentFormProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  isSubmitting: boolean;
}

function PaymentForm({ onPaymentSuccess, isSubmitting }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [cgvAccepted, setCgvAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements || isProcessing || isSubmitting || !isReady)
      return;

    setIsProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(
        stripeError.message ||
          "Une erreur est survenue lors du paiement. Veuillez réessayer."
      );
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onPaymentSuccess(paymentIntent.id);
    } else {
      setError("Le paiement n'a pas pu être confirmé. Veuillez réessayer.");
      setIsProcessing(false);
    }
  };

  const disabled = !stripe || !isReady || isProcessing || isSubmitting || !cgvAccepted;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <PaymentElement
          onReady={() => setIsReady(true)}
          options={{
            layout: "tabs",
            paymentMethodOrder: ["apple_pay", "google_pay", "link", "card", "klarna"],
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>

      {/* Acceptation CGV */}
      <label className={cn(
        "flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all",
        cgvAccepted
          ? "border-[#4373f5] bg-blue-50/60"
          : "border-gray-200 bg-gray-50 hover:border-gray-300"
      )}>
        <input
          type="checkbox"
          checked={cgvAccepted}
          onChange={(e) => setCgvAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#4373f5] shrink-0 cursor-pointer"
        />
        <span className={cn("text-xs leading-snug transition-colors", cgvAccepted ? "text-blue-900" : "text-gray-600")}>
          J'accepte les{" "}
          <a href="/cgv" target="_blank" className="underline font-medium hover:text-[#4373f5]" onClick={(e) => e.stopPropagation()}>
            Conditions Générales de Vente
          </a>{" "}
          et les{" "}
          <a href="/cgu" target="_blank" className="underline font-medium hover:text-[#4373f5]" onClick={(e) => e.stopPropagation()}>
            Conditions Générales d'Utilisation
          </a>
        </span>
      </label>

      {!cgvAccepted && isReady && (
        <p className="text-center text-xs text-amber-600 font-medium">
          ↑ Acceptez les conditions pour activer le paiement
        </p>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={disabled}
        className="w-full h-12 text-base font-semibold bg-[#4373f5] hover:bg-blue-700 text-white rounded-xl shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing || isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {isProcessing ? "Traitement du paiement..." : "Création du bail..."}
          </>
        ) : !isReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Payer 39,90€ et créer mon bail
          </>
        )}
      </Button>
    </div>
  );
}

interface BailPaymentStepProps {
  onPaymentSuccess: (paymentIntentId: string) => void;
  isSubmitting: boolean;
  rentAmount?: number;
}

export function BailPaymentStep({
  onPaymentSuccess,
  isSubmitting,
  rentAmount = 0,
}: BailPaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [estimatePeopleCount, setEstimatePeopleCount] = useState(2);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/stripe/create-payment-intent-bail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setLoadError(
            data.error || "Impossible d'initialiser le paiement. Réessayez."
          );
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setLoadError("Erreur réseau lors de l'initialisation du paiement.");
        }
      });

    return () => controller.abort();
  }, []);

  const inclus = [
    "Constitution du dossier en ligne",
    "Vérification documentaire par notre équipe",
    "Transmission sécurisée au notaire partenaire",
    "Suivi jusqu'à la signature de l'acte authentique",
  ];

  return (
    <div className="space-y-6 py-2">
      {/* Titre */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 mb-2">
          <CreditCard className="w-6 h-6 text-[#4373f5]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Paiement sécurisé</h2>
        <p className="text-gray-500 text-sm">
          Dernière étape — réglez les frais de dossier pour finaliser votre bail
        </p>
      </div>

      {/* Récapitulatif */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Frais de dossier BailNotarie</p>
            <p className="text-xs text-gray-500 mt-0.5">Prestation administrative — paiement unique</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-[#4373f5]">39,90€</p>
            <p className="text-xs text-gray-400">TTC</p>
          </div>
        </div>

        <div className="border-t border-blue-100 pt-4 space-y-2">
          {inclus.map((item) => (
            <div key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between font-semibold text-gray-900 text-sm bg-white/60 rounded-lg px-4 py-2.5">
          <span>À payer maintenant</span>
          <span className="text-[#4373f5] text-lg">39,90€ TTC</span>
        </div>

        <div className="flex items-start gap-2 text-xs text-gray-500 pt-1">
          <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            Ce montant ne comprend <strong className="text-gray-700">pas</strong> les émoluments du notaire — ceux-ci sont facturés séparément avant la signature.
          </span>
        </div>
      </div>

      {rentAmount > 0 && (
        <BailCostEstimate
          rentAmount={rentAmount}
          peopleCount={estimatePeopleCount}
          onPeopleCountChange={setEstimatePeopleCount}
          disabled={isSubmitting}
        />
      )}

      {/* Formulaire Stripe */}
      {loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      ) : !clientSecret ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#4373f5]" />
          <p className="text-sm text-gray-500">Initialisation du paiement sécurisé...</p>
        </div>
      ) : (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: STRIPE_APPEARANCE,
            locale: "fr",
          }}
        >
          <PaymentForm
            onPaymentSuccess={onPaymentSuccess}
            isSubmitting={isSubmitting}
          />
        </Elements>
      )}

      {/* Badges de sécurité */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400 pt-2">
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          <span>Chiffrement SSL 256 bits</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          <span>Sécurisé par Stripe</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>PCI DSS certifié</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Vos données bancaires ne sont jamais stockées sur nos serveurs.{" "}
        <a href="/cgv" target="_blank" className="underline hover:text-gray-600">
          *Remboursé si le dossier n'aboutit pas (voir CGV)
        </a>
      </p>
    </div>
  );
}
