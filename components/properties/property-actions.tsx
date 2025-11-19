"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { deleteProperty } from "@/lib/actions/properties";
import { toast } from "sonner";
import { DeletePropertyDialog } from "./delete-property-dialog";

interface PropertyActionsProps {
  row: { id: string; [key: string]: any };
}

export function PropertyActions({ row }: PropertyActionsProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

  if (!row || !row.id) {
    return null;
  }

  const handleDeleteClick = () => {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteProperty(row.id);
      
      if (result.success) {
        toast.success("Bien supprimé avec succès");
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
        message: error.message || "Erreur lors de la suppression du bien",
        blockingEntities: [],
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const propertyAddress = row.fullAddress || "Bien";

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
          <Link href={`/interface/properties/${row.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            Voir
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/interface/properties/${row.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
      <DeletePropertyDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
          }
        }}
        propertyAddress={propertyAddress}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </DropdownMenu>
  );
}

