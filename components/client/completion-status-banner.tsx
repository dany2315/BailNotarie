"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { CompletionStatus } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CompletionStatusBannerProps {
  completionStatus: CompletionStatus;
  informationsPath: string; // Chemin vers la page des informations (ex: "/client/proprietaire/informations")
}

const statusMessages: Record<CompletionStatus, { title: string; description: string }> = {
  NOT_STARTED: {
    title: "Vérification de vos données personnelles non commencée",
    description: "Veuillez compléter vos informations personnelles pour permettre la vérification de vos données.",
  },
  PARTIAL: {
    title: "Vérification de vos données personnelles en cours",
    description: "Certaines informations sont manquantes. Veuillez compléter vos données pour finaliser la vérification.",
  },
  PENDING_CHECK: {
    title: "Vérification de vos données personnelles en attente",
    description: "Vos données ont été soumises et sont en cours de vérification par notre équipe. Vous serez notifié une fois la vérification terminée.",
  },
  COMPLETED: {
    title: "Vérification de vos données personnelles complétée",
    description: "Toutes vos données ont été vérifiées et sont conformes.",
  },
};

export function CompletionStatusBanner({ completionStatus, informationsPath }: CompletionStatusBannerProps) {
  if (completionStatus === CompletionStatus.COMPLETED) {
    return null; // Ne pas afficher la bannière si tout est complété
  }

  const message = statusMessages[completionStatus];
  const isWarning = completionStatus !== CompletionStatus.PENDING_CHECK;

  return (
    <Alert className={isWarning ? "border-orange-200 bg-orange-50 dark:bg-orange-950/20" : "border-blue-200 bg-blue-50 dark:bg-blue-950/20"}>
      <AlertCircle className={`h-4 w-4 ${isWarning ? "text-orange-600" : "text-blue-600"}`} />
      <AlertTitle className={isWarning ? "text-orange-800 dark:text-orange-300" : "text-blue-800 dark:text-blue-300"}>
        {message.title}
      </AlertTitle>
      <AlertDescription className={isWarning ? "text-orange-700 dark:text-orange-400 flex" : "text-blue-700 dark:text-blue-400"}>
        <div className="flex flex-col items-center justify-between mt-2">
          <span>{message.description}</span>
          {completionStatus !== CompletionStatus.PENDING_CHECK && (
            <Link href={informationsPath} className="w-full">
              <Button variant="outline" size="sm" className="w-full ">
                Compléter mes informations
              </Button>
            </Link>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}






