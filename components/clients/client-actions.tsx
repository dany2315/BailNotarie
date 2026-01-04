"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Mail, Copy, RefreshCw } from "lucide-react";
import Link from "next/link";
import { deleteClient, sendIntakeLinkToClient, getClientNameById, getIntakeLinkUrl, hasIntakeLink, regenerateClientIntakeLink } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteClientDialog } from "./delete-client-dialog";
import { RegenerateIntakeLinkDialog } from "./regenerate-intake-link-dialog";
import { ClientType } from "@prisma/client";

// Helper pour obtenir l'email du client
function getClientEmail(row: any): string | null {
  if (!row) return null;
  
  if (row.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = row.persons?.find((p: any) => p.isPrimary) || row.persons?.[0];
    return primaryPerson?.email || row.email || null;
  }
  
  if (row.type === ClientType.PERSONNE_MORALE) {
    return row.entreprise?.email || row.email || null;
  }
  
  return row.email || null;
}

export function ClientActions({ row }: { row: any }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientName, setClientName] = useState<string>("");
  const [canCopyLink, setCanCopyLink] = useState<boolean | null>(null);
  const [hasSubmittedLink, setHasSubmittedLink] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [deleteError, setDeleteError] = useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

  // Vérification de sécurité après les hooks
  if (!row || !row.id) {
    return null;
  }

  const handleDeleteClick = async () => {
    try {
      // Récupérer le nom du client pour l'afficher dans le dialog
      const name = await getClientNameById(row.id);
      setClientName(name);
      setDeleteError(null);
      setIsDeleteDialogOpen(true);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la récupération du client");
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteClient(row.id);
      
      if (result.success) {
        toast.success("Client supprimé avec succès");
        setIsDeleteDialogOpen(false);
        router.refresh();
      } else {
        // Afficher l'erreur dans le dialog avec les blockingEntities
        setDeleteError({
          message: result.error,
          blockingEntities: result.blockingEntities || [],
        });
        // NE PAS fermer le dialog - on veut afficher l'erreur
      }
    } catch (error: any) {
      // Erreur inattendue (ne devrait pas arriver maintenant)
      console.error("Erreur inattendue:", error);
      setDeleteError({
        message: error.message || "Erreur lors de la suppression",
        blockingEntities: [],
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendIntakeLink = async () => {
    try {
      const clientEmail = getClientEmail(row);
      if (!clientEmail) {
        toast.error("Le client n'a pas d'email");
        return;
      }
      await sendIntakeLinkToClient(row.id);
      toast.success("Lien du formulaire envoyé avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du lien");
    }
  };

  // Vérifier si le client a un lien disponible au chargement
  useEffect(() => {
    if (!row?.id) return;
    
    const checkLinkAvailability = async () => {
      try {
        const linkInfo = await hasIntakeLink(row.id);
        setCanCopyLink(linkInfo.hasLink && !linkInfo.isSubmitted);
        setHasSubmittedLink(linkInfo.hasLink && linkInfo.isSubmitted);
      } catch (error) {
        setCanCopyLink(false);
        setHasSubmittedLink(false);
      }
    };
    
    // Vérifier seulement pour les leads, propriétaires et locataires
    if (row.profilType === "LEAD" || row.profilType === "PROPRIETAIRE" || row.profilType === "LOCATAIRE") {
      checkLinkAvailability();
    }
  }, [row?.id, row?.profilType]);

  const handleCopyIntakeLink = async () => {
    try {
      const url = await getIntakeLinkUrl(row.id);
      await navigator.clipboard.writeText(url);
      toast.success("Lien du formulaire copié dans le presse-papiers");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la copie du lien");
    }
  };

  const handleRegenerateIntakeLinkClick = () => {
    setIsRegenerateDialogOpen(true);
  };

  const handleConfirmRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await regenerateClientIntakeLink(row.id);
      toast.success("Lien du formulaire régénéré avec succès");
      setIsRegenerateDialogOpen(false);
      // Rafraîchir les états
      const linkInfo = await hasIntakeLink(row.id);
      setCanCopyLink(linkInfo.hasLink && !linkInfo.isSubmitted);
      setHasSubmittedLink(linkInfo.hasLink && linkInfo.isSubmitted);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la régénération du lien");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Désactiver le bouton si le client est en PENDING_CHECK ou COMPLETED
  const isCompletionStatusBlocking = row?.completionStatus === "PENDING_CHECK" || row?.completionStatus === "COMPLETED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
      <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href={`/interface/clients/${row.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Voir
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/interface/clients/${row.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleSendIntakeLink} 
          disabled={!getClientEmail(row) || isCompletionStatusBlocking || hasSubmittedLink}
        >
          <Mail className="mr-2 h-4 w-4" />
          Envoyer le formulaire
        </DropdownMenuItem>
        {(row?.profilType === "PROPRIETAIRE" || row?.profilType === "LOCATAIRE" || row?.profilType === "LEAD") && (
          <DropdownMenuItem 
            onClick={handleCopyIntakeLink}
            disabled={canCopyLink === false}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copier le lien du formulaire
          </DropdownMenuItem>
        )}
        {(row?.profilType === "PROPRIETAIRE" || row?.profilType === "LOCATAIRE" || row?.profilType === "LEAD") && hasSubmittedLink && (
          <DropdownMenuItem 
            onClick={handleRegenerateIntakeLinkClick}
            disabled={isRegenerating}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Régénérer le lien du formulaire
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
      <DeleteClientDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
          }
        }}
        clientName={clientName}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
      <RegenerateIntakeLinkDialog
        open={isRegenerateDialogOpen}
        onOpenChange={setIsRegenerateDialogOpen}
        onConfirm={handleConfirmRegenerate}
        isLoading={isRegenerating}
      />
    </DropdownMenu>
  );
}







