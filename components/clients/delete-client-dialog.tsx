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
import { AlertTriangle, ExternalLink, User, FileText, Home } from "lucide-react";
import { DeletionBlockingEntity } from "@/lib/types/deletion-errors";

interface DeleteClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  onConfirm: () => void;
  isLoading?: boolean;
  error?: {
    message: string;
    blockingEntities?: DeletionBlockingEntity[];
  } | null;
}

function getEntityIcon(type: DeletionBlockingEntity["type"]) {
  switch (type) {
    case "CLIENT":
      return <User className="h-4 w-4" />;
    case "BAIL":
      return <FileText className="h-4 w-4" />;
    case "PROPERTY":
      return <Home className="h-4 w-4" />;
  }
}

export function DeleteClientDialog({
  open,
  onOpenChange,
  clientName,
  onConfirm,
  isLoading = false,
  error = null,
}: DeleteClientDialogProps) {
  const isErrorState = !!error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={isErrorState ? "max-w-2xl" : ""}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${isErrorState ? "text-destructive" : "text-destructive"}`} />
            {isErrorState ? "Impossible de supprimer" : "Confirmer la suppression"}
          </DialogTitle>
          {!isErrorState && (
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer le client <strong>{clientName}</strong> ?
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
                        {getEntityIcon(entity.type)}
                        <span className="font-medium">{entity.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({entity.type === "CLIENT" ? "Client" : entity.type === "BAIL" ? "Bail" : "Bien"})
                        </span>
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

