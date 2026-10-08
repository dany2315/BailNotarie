"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Edit, GraduationCap, ListChecks, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BailStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AssignDossierDialog } from "@/components/notaires/assign-dossier-dialog";
import { LeaseStatusSelect } from "@/components/leases/lease-status-select";
import { DeleteLeaseDialog } from "@/components/leases/delete-lease-dialog";
import { deleteLease } from "@/lib/actions/leases";

interface BailMoreMenuProps {
  bailId: string;
  status: BailStatus;
  tenant?: { id: string; name: string } | null;
  /** Classes du bouton « Plus » (hauteur alignée sur les autres actions). */
  triggerClassName?: string;
}

/**
 * Actions rares de la fiche bail, rangées sous « Plus » : aucune n'est
 * retirée, elles cèdent seulement la place au bouton principal.
 */
export function BailMoreMenu({ bailId, status, tenant, triggerClassName }: BailMoreMenuProps) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<{
    message: string;
    blockingEntities?: Array<{ id: string; name: string; type: "CLIENT" | "BAIL" | "PROPERTY"; link: string }>;
  } | null>(null);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const result = await deleteLease(bailId);
      if (result.success) {
        toast.success("Bail supprimé avec succès");
        setDeleteOpen(false);
        router.push("/interface/baux");
      } else {
        setDeleteError({ message: result.error, blockingEntities: result.blockingEntities || [] });
      }
    } catch (error: any) {
      setDeleteError({ message: error?.message || "Erreur lors de la suppression du bail", blockingEntities: [] });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className={triggerClassName ?? "w-full sm:w-auto"}>
            Plus
            <ChevronDown className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
            <Link href={`/interface/baux/${bailId}/edit`}>
              <Edit className="size-4" />
              Modifier les informations du bail
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10 cursor-pointer" onSelect={() => setStatusOpen(true)}>
            <ListChecks className="size-4" />
            Changer le statut manuellement
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-10 cursor-pointer" onSelect={() => setAssignOpen(true)}>
            <GraduationCap className="size-4" />
            Assigner un notaire
          </DropdownMenuItem>
          <DropdownMenuItem
            className="min-h-10 cursor-pointer"
            onSelect={() => {
              const reference = `#${bailId.slice(-8).toUpperCase()}`;
              navigator.clipboard
                ?.writeText(reference)
                .then(() => toast.success(`Référence ${reference} copiée`))
                .catch(() => toast.error("Copie impossible"));
            }}
          >
            <Copy className="size-4" />
            Copier la référence #{bailId.slice(-8).toUpperCase()}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="min-h-10 cursor-pointer text-destructive focus:text-destructive"
            onSelect={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            <Trash2 className="size-4" />
            Supprimer le dossier…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le statut manuellement</DialogTitle>
            <DialogDescription>
              À réserver aux cas particuliers : le parcours normal fait avancer le statut tout seul.
            </DialogDescription>
          </DialogHeader>
          <LeaseStatusSelect leaseId={bailId} currentStatus={status} className="h-11 w-full" />
        </DialogContent>
      </Dialog>

      <AssignDossierDialog open={assignOpen} onOpenChange={setAssignOpen} initialBailId={bailId} />

      <DeleteLeaseDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
        leaseId={bailId}
        tenant={tenant}
        onConfirm={confirmDelete}
        isLoading={deleting}
        error={deleteError}
      />
    </>
  );
}
