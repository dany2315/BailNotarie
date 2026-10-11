"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setVerificationPoints } from "@/lib/actions/verification";
import { cn } from "@/lib/utils";

/*
 * Pas de router.refresh() ici : l'action revalide la fiche et sa réponse met
 * déjà la page à jour ; un refresh en plus provoquait des rechargements complets.
 */

/**
 * « Valider » / « ✓ Vérifié » d'un point de contrôle (comme dans la maquette).
 * Verrouillé quand le bloc est déjà validé (dossier envoyé au notaire, ou
 * client / bien déjà « Complété »).
 */
export function VerifyToggle({
  bailId,
  pointKey,
  verified,
  locked = false,
}: {
  bailId: string;
  pointKey: string;
  verified: boolean;
  locked?: boolean;
}) {
  const [optimistic, setOptimistic] = React.useState(verified);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setOptimistic(verified), [verified]);

  if (locked) {
    return (
      <span
        className="inline-flex h-9 min-w-[6.5rem] items-center justify-center gap-1.5 rounded-md border border-green-200 bg-green-100 px-3 text-sm font-medium text-green-800"
        title="Dossier transmis au notaire : la vérification est close"
      >
        <Check className="size-3.5" strokeWidth={3} />
        Vérifié
      </span>
    );
  }

  const toggle = () => {
    const next = !optimistic;
    setOptimistic(next);
    startTransition(async () => {
      const result = await setVerificationPoints({ bailId, pointKeys: [pointKey], verified: next });
      if (!result.success) {
        setOptimistic(!next);
        toast.error(result.error);
        return;
      }
    });
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      aria-pressed={optimistic}
      disabled={locked || pending}
      onClick={toggle}
      title={locked ? "Bloc déjà validé" : undefined}
      className={cn(
        "h-9 min-w-[6.5rem] gap-1.5 disabled:opacity-100",
        optimistic && "border-green-200 bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900",
      )}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : optimistic ? <Check className="size-3.5" strokeWidth={3} /> : null}
      {optimistic ? "Vérifié" : "Valider"}
    </Button>
  );
}

/** « Tout valider » d'un bloc : valide d'un coup les points restants (hors manquants). */
export function ValidateAllButton({ bailId, pointKeys }: { bailId: string; pointKeys: string[] }) {
  const [pending, startTransition] = React.useTransition();
  if (pointKeys.length === 0) return null;

  const validate = () =>
    startTransition(async () => {
      const result = await setVerificationPoints({ bailId, pointKeys, verified: true });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
    });

  return (
    <Button type="button" variant="outline" size="sm" className="h-8" onClick={validate} disabled={pending}>
      {pending && <Loader2 className="size-3.5 animate-spin" />}
      Tout valider
    </Button>
  );
}
