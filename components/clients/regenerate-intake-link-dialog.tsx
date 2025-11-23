"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface RegenerateIntakeLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function RegenerateIntakeLinkDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: RegenerateIntakeLinkDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Confirmer la régénération
          </DialogTitle>
          <DialogDescription>
            Êtes-vous sûr de vouloir régénérer le lien du formulaire ? 
            L'ancien lien ne fonctionnera plus et le formulaire sera remis en attente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="default"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Régénération...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Régénérer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



