"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteLease } from "@/lib/actions/leases";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { DeleteLeaseDialog } from "./delete-lease-dialog";

interface DeleteLeaseButtonProps {
  leaseId: string;
}

export function DeleteLeaseButton({ leaseId }: DeleteLeaseButtonProps) {
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
      const result = await deleteLease(leaseId);
      
      if (result.success) {
        toast.success("Bail supprimé avec succès");
        setIsDeleteDialogOpen(false);
        router.push("/interface/baux");
      } else {
        setDeleteError({
          message: result.error,
          blockingEntities: result.blockingEntities || [],
        });
      }
    } catch (error: any) {
      console.error("Erreur inattendue:", error);
      setDeleteError({
        message: error.message || "Erreur lors de la suppression du bail",
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
      <DeleteLeaseDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          setIsDeleteDialogOpen(open);
          if (!open) {
            setDeleteError(null);
          }
        }}
        leaseId={leaseId}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        error={deleteError}
      />
    </>
  );
}

