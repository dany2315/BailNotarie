"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updateBailStatusByNotaire } from "@/lib/actions/notaires";
import { cn } from "@/lib/utils";

type Status = "READY_FOR_NOTARY" | "CLIENT_CONTACTED" | "PROVISION_RECEIVED" | "SIGNED" | "DESISTE" | "CLASSE_SANS_SUITE";

const STEPS: Array<{ status: Status; label: string }> = [
  { status: "READY_FOR_NOTARY", label: "À contacter" },
  { status: "CLIENT_CONTACTED", label: "Clients contactés" },
  { status: "PROVISION_RECEIVED", label: "Provision reçue" },
  { status: "SIGNED", label: "Signé" },
];

/** Ce que le notaire fait ensuite, selon où en est le dossier. */
const NEXT: Partial<Record<Status, { label: string; to: Status; confirm?: { title: string; text: string } }>> = {
  READY_FOR_NOTARY: { label: "J'ai contacté les clients", to: "CLIENT_CONTACTED" },
  CLIENT_CONTACTED: { label: "La provision est reçue", to: "PROVISION_RECEIVED" },
  PROVISION_RECEIVED: {
    label: "Le bail est signé",
    to: "SIGNED",
    confirm: { title: "Le bail est signé ?", text: "Le dossier passe en « Signé » : le propriétaire et le locataire le voient dans leur espace." },
  },
};
const BACK: Partial<Record<Status, { label: string; to: Status }>> = {
  CLIENT_CONTACTED: { label: "Revenir à « À contacter »", to: "READY_FOR_NOTARY" },
  PROVISION_RECEIVED: { label: "Revenir à « Clients contactés »", to: "CLIENT_CONTACTED" },
  SIGNED: { label: "Annuler : pas encore signé", to: "PROVISION_RECEIVED" },
};
const STOPPED: Partial<Record<Status, string>> = { DESISTE: "Le client s'est désisté", CLASSE_SANS_SUITE: "Classé sans suite" };

/**
 * Avancement du dossier chez le notaire, en actions : une étape à la fois (« J'ai contacté les clients »,
 * « La provision est reçue », « Le bail est signé »), un retour arrière discret, et « Le dossier s'arrête ».
 * « Le bail est signé » attend la fin de la vérification du notaire (le serveur le vérifie aussi).
 */
export function NotaireStatusActions({
  bailId,
  status,
  signBlockedReason,
  compact = false,
}: {
  bailId: string;
  status: string;
  /** Raison pour laquelle « Le bail est signé » n'est pas encore possible (vérification à terminer). */
  signBlockedReason: string | null;
  /** Récapitulatif de la vérification : seulement le bouton de l'étape suivante. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<Status | null>(null);
  const [confirming, setConfirming] = React.useState<{ to: Status; title: string; text: string } | null>(null);
  const [stopping, setStopping] = React.useState(false);
  const current = status as Status;
  const next = NEXT[current];
  const back = BACK[current];
  const stopped = STOPPED[current];
  const stepIndex = STEPS.findIndex((step) => step.status === current);
  const blocked = next?.to === "SIGNED" ? signBlockedReason : null;

  const move = async (to: Status, done: string) => {
    setBusy(to);
    try {
      const result = await updateBailStatusByNotaire({ bailId, status: to });
      if (result && "success" in result && result.success === false) {
        toast.error("Pas encore possible", { description: result.error });
        return;
      }
      toast.success(done);
      setConfirming(null);
      setStopping(false);
      router.refresh();
    } catch {
      toast.error("L'avancement n'a pas pu être enregistré");
    } finally {
      setBusy(null);
    }
  };

  const nextButton = next && (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        className="h-10 gap-1.5"
        disabled={!!busy || !!blocked}
        onClick={() => (next.confirm ? setConfirming({ to: next.to, ...next.confirm }) : move(next.to, STEPS.find((s) => s.status === next.to)!.label))}
      >
        {busy === next.to ? <Loader2 className="size-4 animate-spin" /> : next.to === "SIGNED" ? <Check className="size-4" strokeWidth={3} /> : <ArrowRight className="size-4" />}
        {next.label}
      </Button>
      {blocked && <p className="max-w-xs text-[12.5px] text-muted-foreground">{blocked}</p>}
    </div>
  );

  const dialogs = (
    <>
      <Dialog open={!!confirming} onOpenChange={(open) => !open && !busy && setConfirming(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirming?.title}</DialogTitle>
            <DialogDescription>{confirming?.text}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setConfirming(null)} disabled={!!busy}>
              Annuler
            </Button>
            <Button type="button" disabled={!!busy} onClick={() => confirming && move(confirming.to, "Bail signé")}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Oui, le bail est signé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={stopping} onOpenChange={(open) => !busy && setStopping(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Le dossier s&apos;arrête</DialogTitle>
            <DialogDescription>Pourquoi ? Vous pourrez le reprendre plus tard si besoin.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="outline" className="h-auto justify-start py-3 text-left" disabled={!!busy} onClick={() => move("DESISTE", "Désistement enregistré")}>
              <span className="flex flex-col items-start">
                <span className="font-semibold">Le client se désiste</span>
                <span className="text-[12.5px] font-normal text-muted-foreground">Il renonce au bail notarié.</span>
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-auto justify-start py-3 text-left"
              disabled={!!busy}
              onClick={() => move("CLASSE_SANS_SUITE", "Dossier classé sans suite")}
            >
              <span className="flex flex-col items-start">
                <span className="font-semibold">Classer sans suite</span>
                <span className="text-[12.5px] font-normal text-muted-foreground">Le dossier ne peut pas aboutir (client injoignable…).</span>
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (compact) {
    return (
      <>
        {nextButton ?? <p className="text-[13.5px] font-medium text-green-800">Dossier {STEPS[stepIndex]?.label.toLowerCase() ?? "terminé"}.</p>}
        {dialogs}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {stopped ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-red-50 px-3 py-1 text-[13px] font-semibold text-red-800">{stopped}</span>
          <Button type="button" variant="outline" className="h-9 gap-1.5" disabled={!!busy} onClick={() => move("READY_FOR_NOTARY", "Dossier repris")}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Undo2 className="size-4" />}
            Reprendre le dossier
          </Button>
        </div>
      ) : (
        <>
          <ol aria-label="Avancement du dossier" className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] font-semibold">
            {STEPS.map((step, index) => {
              const done = index < stepIndex || (current === "SIGNED" && index === stepIndex);
              const here = index === stepIndex && current !== "SIGNED";
              return (
                <li key={step.status} className="flex items-center gap-1.5">
                  {index > 0 && <span aria-hidden className={cn("h-px w-4", index <= stepIndex ? "bg-primary" : "bg-border")} />}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                      done && "bg-green-50 text-green-800",
                      here && "bg-primary text-primary-foreground",
                      !done && !here && "text-muted-foreground",
                    )}
                    aria-current={here ? "step" : undefined}
                  >
                    {done && <Check className="size-3" strokeWidth={3} />}
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
            {nextButton}
            {back && (
              <button
                type="button"
                className="h-10 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                disabled={!!busy}
                onClick={() => move(back.to, "Avancement corrigé")}
              >
                {back.label}
              </button>
            )}
            {current !== "SIGNED" && (
              <button
                type="button"
                className="h-10 text-[13px] font-medium text-muted-foreground hover:text-red-700 hover:underline disabled:opacity-50"
                disabled={!!busy}
                onClick={() => setStopping(true)}
              >
                Le dossier s&apos;arrête
              </button>
            )}
          </div>
        </>
      )}
      {dialogs}
    </div>
  );
}
