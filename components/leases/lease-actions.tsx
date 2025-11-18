"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Loader2 } from "lucide-react";
import { deleteLease } from "@/lib/actions/leases";
import { toast } from "sonner";

interface LeaseActionsProps {
  row: { id: string; [key: string]: any };
}

export function LeaseActions({ row }: LeaseActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!row || !row.id) {
    return null;
  }

  const handleDelete = async () => {
    // Confirmation avant suppression
    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir supprimer ce bail ? Cette action est irréversible."
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteLease(row.id);
      toast.success("Bail supprimé avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression du bail");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Link href={`/interface/baux/${row.id}`}>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Voir">
          <Eye className="size-4" />
        </Button>
      </Link>
      <Link href={`/interface/baux/${row.id}/edit`}>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Modifier">
          <Edit className="size-4" />
        </Button>
      </Link>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleDelete}
        disabled={isDeleting}
        title="Supprimer"
      >
        {isDeleting ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </Button>
    </div>
  );
}

