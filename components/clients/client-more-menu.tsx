"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Edit, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProfilType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteClientDialog } from "@/components/clients/delete-client-dialog";
import { deleteClient, sendIntakeLinkToClient } from "@/lib/actions/clients";

interface ClientMoreMenuProps {
  clientId: string;
  clientName: string;
  hasEmail: boolean;
  profilType: ProfilType;
  /** Dernier lien de formulaire (en attente de préférence), pour le copier. */
  intakeLink?: { token: string; target: string } | null;
  triggerClassName?: string;
}

const FORM_LABELS: Record<string, string> = {
  LEAD: "Envoyer le formulaire de conversion",
  PROPRIETAIRE: "Envoyer le formulaire propriétaire",
  LOCATAIRE: "Envoyer le formulaire locataire",
};

/**
 * Actions de la fiche client rangées sous « Plus » (mêmes actions qu'avant :
 * modifier, envoyer le formulaire, copier son lien, supprimer).
 */
export function ClientMoreMenu({ clientId, clientName, hasEmail, profilType, intakeLink, triggerClassName }: ClientMoreMenuProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

  const sendForm = async () => {
    try {
      await sendIntakeLinkToClient(clientId);
      toast.success(profilType === ProfilType.LEAD ? "Lien de conversion envoyé" : "Formulaire envoyé");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de l'envoi du formulaire");
    }
  };

  const copyLink = async () => {
    if (!intakeLink) return;
    const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const url = intakeLink.target === "LEAD" ? `${baseUrl}/intakes/${intakeLink.token}/convert` : `${baseUrl}/intakes/${intakeLink.token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié dans le presse-papiers");
    } catch {
      toast.error("Erreur lors de la copie du lien");
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteClient(clientId);
      if (result.success) {
        toast.success("Client supprimé avec succès");
        setDeleteOpen(false);
        router.push("/interface/clients");
      } else {
        setDeleteError({ message: result.error, blockingEntities: result.blockingEntities || [] });
      }
    } catch (error: any) {
      setDeleteError({ message: error?.message || "Erreur lors de la suppression du client", blockingEntities: [] });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={triggerClassName ?? "gap-2"}>
            Plus
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
            <Link href={`/interface/clients/${clientId}/edit`}>
              <Edit className="size-4" />
              Modifier les informations
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10 cursor-pointer" disabled={!hasEmail} onSelect={sendForm}>
            <FileText className="size-4" />
            {FORM_LABELS[profilType] || "Envoyer le formulaire"}
          </DropdownMenuItem>
          {intakeLink && (
            <DropdownMenuItem className="min-h-10 cursor-pointer" onSelect={copyLink}>
              <Copy className="size-4" />
              Copier le lien du formulaire
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-10 cursor-pointer text-destructive focus:text-destructive"
            onSelect={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Supprimer le client…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteClientDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        clientName={clientName}
        onConfirm={confirmDelete}
        isLoading={deleting}
        error={deleteError}
      />
    </>
  );
}
