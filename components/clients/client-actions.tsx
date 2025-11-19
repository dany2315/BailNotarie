"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Mail } from "lucide-react";
import Link from "next/link";
import { deleteClient, sendIntakeLinkToClient, getClientNameById } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteClientDialog } from "./delete-client-dialog";

export function ClientActions({ row }: { row: any }) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientName, setClientName] = useState<string>("");
  const [deleteError, setDeleteError] = useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

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
      await sendIntakeLinkToClient(row.id);
      toast.success("Lien du formulaire envoyé avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du lien");
    }
  };

  // Désactiver le bouton si le client est en PENDING_CHECK ou COMPLETED
  const isCompletionStatusBlocking = row.completionStatus === "PENDING_CHECK" || row.completionStatus === "COMPLETED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Ouvrir le menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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
          disabled={!row.email || isCompletionStatusBlocking}
        >
          <Mail className="mr-2 h-4 w-4" />
          Envoyer le formulaire
        </DropdownMenuItem>
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
    </DropdownMenu>
  );
}







