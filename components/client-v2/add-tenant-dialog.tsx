"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createTenantForLease } from "@/lib/actions/leases";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOwnerRuntime } from "./owner-runtime";
import { PrimaryAction, QuietAction } from "./owner-ui";

/* L'ajout d'un locataire, en un seul exemplaire : la carte comme la ligne de
   liste ouvrent ce dialogue. Logique d'origine inchangée — validation de
   l'email, appel de la server action, message, rafraîchissement. */

export function AddTenantDialog({
  bailId,
  open,
  onOpenChange,
}: {
  bailId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { demo } = useOwnerRuntime();
  const [email, setEmail] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    if (!email.includes("@")) {
      toast.error("Email invalide");
      return;
    }
    try {
      setSaving(true);
      if (demo) await new Promise((resolve) => setTimeout(resolve, 450));
      else await createTenantForLease({ bailId, email });
      toast.success("Locataire ajouté — un email lui a été envoyé");
      onOpenChange(false);
      setEmail("");
      if (!demo) router.refresh();
    } catch (error: any) {
      toast.error("Erreur", { description: error?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[17px] tracking-tight">
            <UserPlus className="h-4 w-4 text-[#3563e9]" />
            Ajouter un locataire
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-snug">
            Entrez l&apos;adresse email de votre locataire. Il recevra un lien pour compléter son
            dossier.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label className="text-[12.5px]">Email *</Label>
          <Input
            type="email"
            placeholder="locataire@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={saving}
            inputMode="email"
            autoComplete="email"
            className="h-11 rounded-xl"
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <PrimaryAction onClick={submit} disabled={saving || !email} className="w-full py-3">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Ajouter le locataire
              </>
            )}
          </PrimaryAction>
          <QuietAction
            className="w-full py-3"
            disabled={saving}
            onClick={() => {
              onOpenChange(false);
              setEmail("");
            }}
          >
            Annuler
          </QuietAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
