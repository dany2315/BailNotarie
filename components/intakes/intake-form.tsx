"use client";

import { OwnerIntakeForm } from "./owner-intake-form";
import { TenantIntakeForm } from "./tenant-intake-form";

export function IntakeForm({ intakeLink }: { intakeLink: any }) {
  // Si c'est un formulaire propriétaire avec clientId, utiliser OwnerIntakeForm
  if (intakeLink.target === "OWNER" && intakeLink.clientId) {
    return <OwnerIntakeForm intakeLink={intakeLink} />;
  }

  // Si c'est un formulaire locataire avec clientId, utiliser TenantIntakeForm
  if (intakeLink.target === "TENANT" && intakeLink.clientId) {
    return <TenantIntakeForm intakeLink={intakeLink} />;
  }

  // Fallback pour l'ancien système (sans clientId)
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Ce formulaire nécessite un client associé. Veuillez contacter l'administrateur.
      </p>
    </div>
  );
}


