"use client";

import * as React from "react";
import type { CompletionStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";

interface CompletionStatusDialogProps {
  type: "client" | "property";
  id: string;
  currentStatus: CompletionStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Changement manuel du statut de complétion, rangé hors de la vue principale :
 * le statut s'affiche en lecture seule, ce réglage reste pour les cas
 * particuliers (débloquer l'espace d'un client, par exemple).
 */
export function CompletionStatusDialog({ type, id, currentStatus, open, onOpenChange }: CompletionStatusDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Changer le statut de complétion</DialogTitle>
          <DialogDescription>
            {type === "client"
              ? "Ce statut ouvre ou bloque l'espace du client (création de biens et de baux) et compte pour le passage du dossier chez le notaire. Le client reçoit un e-mail à chaque changement."
              : "Ce statut compte pour le passage du dossier chez le notaire. Le propriétaire reçoit un e-mail à chaque changement."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-start">
          <CompletionStatusSelect type={type} id={id} currentStatus={currentStatus} viewLabel={false} showValueLabel />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Lien discret « Modifier le statut » qui ouvre la fenêtre ci-dessus. */
export function CompletionStatusDialogButton(props: Omit<CompletionStatusDialogProps, "open" | "onOpenChange">) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        Modifier le statut
      </Button>
      <CompletionStatusDialog {...props} open={open} onOpenChange={setOpen} />
    </>
  );
}
