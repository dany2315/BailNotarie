"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Info, User } from "lucide-react";
import { DeletionBlockingEntity } from "@/lib/types/deletion-errors";

interface DeleteLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaseId: string;
  tenant?: { id: string; name: string } | null;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: {
    message: string;
    blockingEntities?: DeletionBlockingEntity[];
  } | null;
}

export function DeleteLeaseDialog({
  open,
  onOpenChange,
  leaseId,
  tenant,
  onConfirm,
  isLoading = false,
  error = null,
}: DeleteLeaseDialogProps) {
  const isErrorState = !!error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isErrorState ? "max-w-2xl" : ""}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {isErrorState ? "Impossible de supprimer" : "Confirmer la suppression"}
          </DialogTitle>
          {!isErrorState && (
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce bail ? Cette action est irréversible.
            </DialogDescription>
          )}
        </DialogHeader>

        {!isErrorState && tenant && (
          <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-3 text-sm">
            <Info className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">Le locataire sera déconnecté du bail</p>
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">{tenant.name}</span> restera dans le
                système en tant que client. Seul son lien avec ce bail sera supprimé.
              </p>
              <Link
                href={`/interface/clients/${tenant.id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Voir le dossier du locataire
                <ExternalLink className="size-3" />
              </Link>
            </div>
          </div>
        )}

        {isErrorState && (
          <div className="space-y-4 mt-2">
            <div className="text-sm text-destructive font-medium">{error.message}</div>
            {error.blockingEntities && error.blockingEntities.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-foreground">
                  {error.blockingEntities.length === 1
                    ? "Entité bloquante :"
                    : "Entités bloquantes :"}
                </div>
                <div className="space-y-2">
                  {error.blockingEntities.map((entity) => (
                    <Link
                      key={entity.id}
                      href={entity.link}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors group"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenChange(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{entity.name}</span>
                        <span className="text-xs text-muted-foreground">(Client)</span>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {isErrorState ? "Fermer" : "Annuler"}
          </Button>
          {!isErrorState && (
            <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
              {isLoading ? "Suppression..." : "Supprimer le bail"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
