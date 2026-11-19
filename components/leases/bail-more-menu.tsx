"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, GraduationCap, ListChecks, Trash2, UserCog } from "lucide-react";
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
import { ChangeTenantDialog } from "@/components/leases/change-tenant-dialog";
import { deleteLease } from "@/lib/actions/leases";
import { MenuHeader, MenuItemRich } from "@/components/admin/fiche/menu-item";

interface BailMoreMenuProps {
  bailId: string;
  status: BailStatus;
  tenant?: { id: string; name: string } | null;
  /** Dossier pas encore transmis au notaire, avec un locataire : on peut le remplacer. */
  canChangeTenant?: boolean;
  /** Classes du bouton « Plus » (hauteur alignée sur les autres actions). */
  triggerClassName?: string;
  /**
   * Notaire actuel du dossier : le menu propose alors « Changer de notaire » (même fenêtre et même
   * action que l'assignation). Sans notaire, rien : c'est « Envoyer au notaire » qui en choisit un.
   */
  currentNotaire?: { id: string; name: string } | null;
}

/**
 * Actions rares de la fiche bail, rangées sous « Plus » : aucune n'est
 * retirée, elles cèdent seulement la place au bouton principal.
 */
export function BailMoreMenu({ bailId, status, tenant, canChangeTenant, triggerClassName, currentNotaire }: BailMoreMenuProps) {
  // Dossier clos (signé, terminé, abandonné) : plus de changement de notaire.
  const canChangeNotaire = !!currentNotaire && !["SIGNED", "TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"].includes(status);
  const router = useRouter();
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [tenantOpen, setTenantOpen] = React.useState(false);
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
        <DropdownMenuContent align="end" sideOffset={6} className="w-[19rem] rounded-xl p-1.5 shadow-lg">
          <MenuHeader kicker="Dossier" title={`Réf. #${bailId.slice(-8).toUpperCase()}`} />
          <DropdownMenuSeparator className="my-1" />
          {canChangeTenant && (
            <DropdownMenuItem className="cursor-pointer rounded-lg px-2 py-1.5" onSelect={() => setTenantOpen(true)}>
              <MenuItemRich icon={<UserCog />} title="Changer de locataire" hint={tenant ? `Actuel : ${tenant.name}` : "Remplacer le locataire du dossier"} />
            </DropdownMenuItem>
          )}
          {canChangeNotaire && (
            <DropdownMenuItem className="cursor-pointer rounded-lg px-2 py-1.5" onSelect={() => setAssignOpen(true)}>
              <MenuItemRich icon={<GraduationCap />} title="Changer de notaire" hint={`Actuel : ${currentNotaire!.name}`} />
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="cursor-pointer rounded-lg px-2 py-1.5" onSelect={() => setStatusOpen(true)}>
            <MenuItemRich icon={<ListChecks />} title="Changer le statut" hint="Cas particuliers seulement" />
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-2 py-1.5"
            onSelect={() => {
              const reference = `#${bailId.slice(-8).toUpperCase()}`;
              navigator.clipboard
                ?.writeText(reference)
                .then(() => toast.success(`Référence ${reference} copiée`))
                .catch(() => toast.error("Copie impossible"));
            }}
          >
            <MenuItemRich icon={<Copy />} title="Copier la référence" hint={`#${bailId.slice(-8).toUpperCase()}`} />
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1" />
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-2 py-1.5 focus:bg-red-50"
            onSelect={() => {
              setDeleteError(null);
              setDeleteOpen(true);
            }}
          >
            <MenuItemRich icon={<Trash2 />} title="Supprimer le dossier" hint="Une confirmation vous sera demandée" tone="danger" />
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

      {canChangeTenant && (
        <ChangeTenantDialog open={tenantOpen} onOpenChange={setTenantOpen} bailId={bailId} currentTenant={tenant ?? null} />
      )}

      {canChangeNotaire && (
        <AssignDossierDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          initialBailId={bailId}
          title="Changer de notaire"
          description={`Notaire actuel : ${currentNotaire!.name}. Choisissez le notaire qui reprend le dossier.`}
          submitLabel="Changer de notaire"
        />
      )}

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
