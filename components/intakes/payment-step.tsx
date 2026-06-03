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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BAIL_COST_FORMULA_HINT,
  computeBailNotaryCost,
  formatBailCurrency,
} from "@/components/leases/bail-cost-estimate";
import { cn } from "@/lib/utils";

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

// ─── Inner form (accès à stripe/elements via context) ────────────────────────

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
            {isProcessing ? "Traitement du paiement..." : "Finalisation du dossier..."}
          </>
        ) : !isReady ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Chargement...
          </>
        ) : (
          <>
            <Lock className="mr-2 h-4 w-4" />
            Payer 39,90€ et finaliser mon dossier
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Outer component (charge le client_secret, initialise Elements) ──────────

interface PaymentStepProps {
  token: string;
  onPaymentSuccess: (paymentIntentId: string) => void;
  isSubmitting: boolean;
  rentAmount?: number;
  peopleCount?: number;
}

export function PaymentStep({
  token,
  onPaymentSuccess,
  isSubmitting,
  rentAmount = 0,
  peopleCount = 2,
}: PaymentStepProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
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
  }, [token]);

  const inclus = [
    "Constitution du dossier en ligne",
    "Vérification documentaire par notre équipe",
    "Transmission sécurisée au notaire partenaire",
    "Suivi jusqu'à la signature de l'acte authentique",
  ];

  const notaryCost = rentAmount > 0 ? computeBailNotaryCost(rentAmount, peopleCount) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Récapitulatif unifié : maintenant (haut, mis en avant) + plus tard (bas, discret) */}
      <div className="rounded-xl border border-blue-100 overflow-hidden bg-white">
        {/* Section 1 — À payer maintenant : 39,90 € */}
        <div className="bg-blue-50/60 px-4 py-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#4373f5]">
                À payer maintenant
              </p>
              <p className="font-semibold text-sm text-gray-900 mt-1">
                Frais de dossier BailNotarie
              </p>
              <div className="flex flex-col gap-0.5 mt-2">
                {inclus.map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-2xl font-bold text-[#4373f5]">39,90€</p>
              <p className="text-xs text-gray-400">TTC</p>
            </div>
          </div>
        </div>

        {/* Section 2 — Plus tard, chez le notaire : estimation des honoraires */}
        {rentAmount > 0 && (
          <div className="border-t border-blue-100 bg-gray-50/60 px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Plus tard, chez le notaire
                </p>
                <p className="font-medium text-sm text-gray-700 mt-1">
                  Honoraires du notaire
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  {BAIL_COST_FORMULA_HINT} · estimation indicative
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-semibold text-gray-700 tabular-nums">
                  {formatBailCurrency(notaryCost)}
                </p>
                <p className="text-xs text-gray-400">estimé</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
