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

/**
 * Pastille à gauche d'un point de contrôle : un clic valide le point, un
 * second clic retire la validation. Verrouillée une fois le dossier transmis.
 */
export function VerifyBullet({
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
        className="mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full bg-green-100 text-green-800"
        title="Dossier transmis au notaire : la vérification est close"
      >
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
        <span className="sr-only">Vérifié</span>
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
      }
    });
  };

  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Vérifié, cliquer pour retirer la validation" : "Cliquer pour valider"}
      title={optimistic ? "Retirer la validation" : "Valider"}
      disabled={pending}
      onClick={toggle}
      className={cn(
        // Zone de clic agrandie (≈ 40 px) autour de la pastille de 22 px, pour le tactile.
        "group relative mt-0.5 flex size-[22px] shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors",
        "before:absolute before:-inset-[9px] before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        optimistic
          ? "bg-green-100 text-green-800 hover:bg-green-200"
          : "border-2 border-slate-300 bg-background text-green-700 hover:border-green-600 hover:bg-green-50",
      )}
    >
      {pending ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : (
        <Check
          className={cn("size-3.5", !optimistic && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")}
          strokeWidth={3}
          aria-hidden
        />
      )}
    </button>
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
