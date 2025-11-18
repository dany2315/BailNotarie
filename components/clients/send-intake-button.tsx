"use client";

import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { sendIntakeLinkToClient } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfilType } from "@prisma/client";

interface SendIntakeButtonProps {
  clientId: string;
  hasEmail: boolean;
  profilType: ProfilType;
}

export function SendIntakeButton({ clientId, hasEmail, profilType }: SendIntakeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSendIntakeLink = async () => {
    if (!hasEmail) {
      toast.error("Le client n'a pas d'email");
      return;
    }

    setIsLoading(true);
    try {
      await sendIntakeLinkToClient(clientId);
      
      // Message personnalisé selon le profil
      const message = profilType === ProfilType.LEAD 
        ? "Lien de conversion envoyé avec succès"
        : profilType === ProfilType.PROPRIETAIRE
        ? "Formulaire propriétaire envoyé avec succès"
        : "Formulaire locataire envoyé avec succès";
      
      toast.success(message);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du formulaire");
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasEmail) {
    return null;
  }

  return (
    <Button 
      variant="outline" 
      className="w-full justify-start"
      onClick={handleSendIntakeLink}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Envoi en cours...
        </>
      ) : (
        <>
          <FileText className="h-4 w-4 mr-2" />
          {profilType === ProfilType.LEAD 
            ? "Envoyer le formulaire de conversion"
            : profilType === ProfilType.PROPRIETAIRE
            ? "Envoyer le formulaire propriétaire"
            : "Envoyer le formulaire locataire"}
        </>
      )}
    </Button>
  );
}

