"use client";

import { useState } from "react";
import { RoleSelectionForm } from "@/components/start/role-selection-form";
import { OwnerEmailForm } from "@/components/start/owner-email-form";
import { OwnerEmailInputForm } from "@/components/start/owner-email-input-form";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

type Step = "role-selection" | "owner-email-input" | "owner-email";

export default function StartPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("role-selection");

  const handleOwnerSelected = () => {
    setCurrentStep("owner-email-input");
  };

  const handleTenantSelected = () => {
    setCurrentStep("owner-email");
  };

  const handleOwnerEmailSuccess = (tenantToken: string) => {
    // Rediriger vers le formulaire locataire
    router.push(`/intakes/${tenantToken}`);
  };

  const handleBack = () => {
    setCurrentStep("role-selection");
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
          {currentStep === "role-selection" && (
            <RoleSelectionForm
              onOwnerSelected={handleOwnerSelected}
              onTenantSelected={handleTenantSelected}
            />
          )}
          {currentStep === "owner-email-input" && (
            <OwnerEmailInputForm onBack={handleBack} />
          )}
          {currentStep === "owner-email" && (
            <OwnerEmailForm
              onSuccess={handleOwnerEmailSuccess}
              onBack={handleBack}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

