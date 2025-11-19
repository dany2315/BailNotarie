"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteProperty } from "@/lib/actions/properties";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeletePropertyDialog } from "./delete-property-dialog";

interface DeletePropertyButtonProps {
  propertyId: string;
  propertyAddress: string;
}

export function DeletePropertyButton({ propertyId, propertyAddress }: DeletePropertyButtonProps) {
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
      const result = await deleteProperty(propertyId);
      
      if (result.success) {
        toast.success("Bien supprimé avec succès");
        setIsDeleteDialogOpen(false);
        router.push("/interface/properties");
      } else {
        setDeleteError({
          message: result.error,
          blockingEntities: result.blockingEntities || [],
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      setDeleteError({
        message: error.message || "Erreur lors de la suppression du bien",
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
    </>
  );
}

