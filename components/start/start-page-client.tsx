"use client";

import { useState, startTransition } from "react";
import { OwnerEmailInputForm } from "@/components/start/owner-email-input-form";
import { OtpVerificationForm } from "@/components/start/otp-verification-form";
import { useRouter } from "next/navigation";
import { LpNav } from "@/components/lp/lp-nav";
import { Footer } from "@/components/footer";
import { AuroraBackdrop, NoiseOverlay } from "@/components/lp/ui/lp-primitives";
import { StartHeading } from "@/components/start/start-aside";
import { notifyAdminsForNewOwnerFromLanding } from "@/lib/actions/start";

type Step = "email-input" | "otp-verification";

export function StartPageClient() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("email-input");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | undefined>(undefined);
  const [isExistingClient, setIsExistingClient] = useState(false);

  // Callback quand l'OTP a été envoyé avec succès
  const handleOtpSent = (
    sentEmail: string,
    sentToken: string | undefined,
    existingClient: boolean
  ) => {
    setEmail(sentEmail);
    setToken(sentToken);
    setIsExistingClient(existingClient);
    setCurrentStep("otp-verification");
  };

  // Callback après vérification OTP réussie
  const handleOtpSuccess = async (
    existingClient: boolean,
    otpToken: string | undefined
  ) => {
    console.log(`[StartPage] handleOtpSuccess: existingClient=${existingClient}, otpToken=${otpToken}`);

    if (!existingClient && otpToken) {
      try {
        // Filet de sécurité: la notification est déjà déclenchée côté serveur
        // à la création du client, mais on retente ici de façon idempotente.
        await notifyAdminsForNewOwnerFromLanding({ token: otpToken });
      } catch (error) {
        console.error("[StartPage] Failed to notify admins after OTP verification:", error);
      }
    }

    startTransition(() => {
      if (existingClient) {
        // Client existant → espace client propriétaire
        console.log("[StartPage] Redirecting to /client/proprietaire (existing client)");
        window.location.href = "/client/proprietaire";
      } else if (otpToken) {
        // Nouveau client → formulaire propriétaire
        console.log(`[StartPage] Redirecting to /commencer/proprietaire/${otpToken} (new client)`);
        router.push(`/commencer/proprietaire/${otpToken}`);
      } else {
        // Fallback - ne devrait pas arriver
        console.warn("[StartPage] FALLBACK: no token for new client! Redirecting to /client/proprietaire");
        window.location.href = "/client/proprietaire";
      }
    });
  };

  // Retour à l'étape email
  const handleBack = () => {
    setCurrentStep("email-input");
    setEmail("");
    setToken(undefined);
    setIsExistingClient(false);
  };

  const step = currentStep === "email-input" ? "email" : "otp";

  return (
    /* `lp-root` apporte les jetons du design de l'accueil — couleurs, ombres,
       respect du mouvement réduit — au reste de l'arbre. */
    <div className="lp-root flex min-h-screen flex-col bg-white">
      <LpNav />

      <main className="lp-scene relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-[#eef3ff] px-5 pb-16 pt-[calc(var(--lp-nav-h,76px)+2rem)] sm:pb-20 sm:pt-[calc(var(--lp-nav-h,76px)+3rem)]">
        <div aria-hidden className="lp-mesh absolute inset-0" />
        <div aria-hidden className="lp-grid absolute inset-0" />
        <AuroraBackdrop />
        <NoiseOverlay />

        {/* Une seule colonne, centrée : on arrive ici décidé, le champ doit
            être la seule chose à regarder. */}
        <div className="relative z-10 w-full max-w-[30rem]">
          <StartHeading step={step} />

          <div className="mt-7 sm:mt-8">
            {currentStep === "email-input" && (
              <OwnerEmailInputForm onOtpSent={handleOtpSent} />
            )}
            {currentStep === "otp-verification" && (
              <OtpVerificationForm
                email={email}
                token={token}
                isExistingClient={isExistingClient}
                onSuccess={handleOtpSuccess}
                onBack={handleBack}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default StartPageClient;
