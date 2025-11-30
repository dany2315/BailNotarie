"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteClient } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteClientDialog } from "./delete-client-dialog";

interface DeleteClientButtonProps {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: DeleteClientButtonProps) {
  const router = useRouter();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

  const handleDeleteClick = () => {
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteClient(clientId);
      
      if (result.success) {
        toast.success("Client supprimé avec succès");
        setIsDeleteDialogOpen(false);
        router.push("/interface/clients");
      } else {
        setDeleteError({
          message: result.error,
          blockingEntities: result.blockingEntities || [],
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      setDeleteError({
        message: error.message || "Erreur lors de la suppression du client",
        blockingEntities: [],
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleDeleteClick}
        className=" sm:w-auto"
      >
        <Trash2 className="size-4 sm:mr-2" />
        <span className="hidden sm:inline">Supprimer</span>
      </Button>
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
    </>
  );
}

