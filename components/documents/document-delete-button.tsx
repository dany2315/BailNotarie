"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteDocumentAdmin } from "@/lib/actions/admin-documents";
import { cn } from "@/lib/utils";

/** « Supprimer » une pièce, après confirmation : la pièce et son fichier sont supprimés définitivement. */
export function DocumentDeleteButton({ documentId, fileName, className }: { documentId: string; fileName?: string | null; className?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await deleteDocumentAdmin({ documentId, revalidate: pathname });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success("Document supprimé");
    });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-9 gap-1.5 text-red-700 hover:bg-red-50 hover:text-red-800", className)}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-4" />
        Supprimer
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Êtes-vous sûr de vouloir supprimer ce document ?</DialogTitle>
            <DialogDescription>
              {fileName ? <span className="font-medium text-foreground">{fileName}</span> : "Ce fichier"} sera supprimé définitivement. Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" onClick={confirm} disabled={pending} className="gap-1.5">
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
