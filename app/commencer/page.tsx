"use client";

import { useState, startTransition } from "react";
import { OwnerEmailInputForm } from "@/components/start/owner-email-input-form";
import { OtpVerificationForm } from "@/components/start/otp-verification-form";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type Step = "email-input" | "otp-verification";

export default function StartPage() {
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
  const handleOtpSuccess = (
    existingClient: boolean,
    otpToken: string | undefined
  ) => {
    console.log(`[StartPage] handleOtpSuccess: existingClient=${existingClient}, otpToken=${otpToken}`);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center py-4 sm:py-6 md:py-8 lg:py-12 px-3 sm:px-4 md:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50/50 relative overflow-hidden">
        {/* Motifs décoratifs en arrière-plan */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-48 h-48 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-purple-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        
        <div className="w-full max-w-4xl relative z-10">
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
      </main>
      <Footer />
    </div>
  );
}
