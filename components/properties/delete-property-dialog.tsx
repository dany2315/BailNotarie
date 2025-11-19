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
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import { DeletionBlockingEntity } from "@/lib/types/deletion-errors";

interface DeletePropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyAddress: string;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: {
    message: string;
    blockingEntities?: DeletionBlockingEntity[];
  } | null;
}

export function DeletePropertyDialog({
  open,
  onOpenChange,
  propertyAddress,
  onConfirm,
  isLoading = false,
  error = null,
}: DeletePropertyDialogProps) {
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
              Êtes-vous sûr de vouloir supprimer le bien <strong>{propertyAddress}</strong> ?
              Cette action est irréversible.
            </DialogDescription>
          )}
        </DialogHeader>
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
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{entity.name}</span>
                        <span className="text-xs text-muted-foreground">(Bail)</span>
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
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? "Suppression..." : "Supprimer"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

