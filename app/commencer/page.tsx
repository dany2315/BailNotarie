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
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="w-full max-w-4xl">
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

