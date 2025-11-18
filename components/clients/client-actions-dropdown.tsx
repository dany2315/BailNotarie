"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, FileText, Loader2, Copy, Check } from "lucide-react";
import { sendIntakeLinkToClient } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ProfilType } from "@prisma/client";

interface IntakeLink {
  id: string;
  token: string;
  target: string;
  status: string;
  createdAt: string;
}

interface ClientActionsDropdownProps {
  clientId: string;
  hasEmail: boolean;
  profilType: ProfilType;
  intakeLinks?: IntakeLink[];
}

export function ClientActionsDropdown({ 
  clientId, 
  hasEmail, 
  profilType,
  intakeLinks = []
}: ClientActionsDropdownProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Trouver le lien d'intake le plus récent (PENDING de préférence)
  const getLatestIntakeLink = () => {
    if (!intakeLinks || intakeLinks.length === 0) return null;
    
    // Chercher d'abord un lien PENDING
    const pendingLink = intakeLinks.find(link => link.status === "PENDING");
    if (pendingLink) return pendingLink;
    
    // Sinon, retourner le plus récent
    return intakeLinks[0];
  };

  const latestIntakeLink = getLatestIntakeLink();

  const handleCopyIntakeLink = async () => {
    if (!latestIntakeLink) return;

    const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const url = latestIntakeLink.target === "LEAD" 
      ? `${baseUrl}/intakes/${latestIntakeLink.token}/convert`
      : `${baseUrl}/intakes/${latestIntakeLink.token}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Lien copié dans le presse-papiers");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erreur lors de la copie du lien");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="px-2">
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={handleSendIntakeLink} 
          disabled={!hasEmail || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              {profilType === ProfilType.LEAD 
                ? "Envoyer le formulaire de conversion"
                : profilType === ProfilType.PROPRIETAIRE
                ? "Envoyer le formulaire propriétaire"
                : "Envoyer le formulaire locataire"}
            </>
          )}
        </DropdownMenuItem>
        {latestIntakeLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleCopyIntakeLink}
              disabled={copied}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-600" />
                  Lien copié
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien du formulaire
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

