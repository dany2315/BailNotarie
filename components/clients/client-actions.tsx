"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2, Mail } from "lucide-react";
import Link from "next/link";
import { deleteClient, sendIntakeLinkToClient } from "@/lib/actions/clients";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ClientActions({ row }: { row: any }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
      return;
    }

    try {
      await deleteClient(row.id);
      toast.success("Client supprimé avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
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
        <DropdownMenuItem onClick={handleSendIntakeLink} disabled={!row.email}>
          <Mail className="mr-2 h-4 w-4" />
          Envoyer le formulaire
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}







