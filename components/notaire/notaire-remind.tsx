"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { remindNotaireTarget, type NotaireReminderSummary, type StaffComplementRequest } from "@/lib/actions/complement-requests";

type Target = "OWNER" | "TENANT";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const WHO: Record<Target, string> = { OWNER: "le propriétaire", TENANT: "le locataire" };

/** Ce que le notaire attend encore de cette personne : ses demandes envoyées, sans réponse. */
export function waitingRequests(requests: StaffComplementRequest[], target: Target) {
  return requests.filter((r) => r.target === target && r.origin === "NOTAIRE" && r.status === "OPEN");
}

/** Les relances du notaire lui-même (jamais celles de l'équipe). */
export function remindHistory(summary: NotaireReminderSummary | undefined) {
  return summary && summary.count > 0 && summary.lastAt
    ? `Vous l'avez déjà relancé ${summary.count} fois, la dernière le ${fmtDay(summary.lastAt)}.`
    : "Vous ne l'avez pas encore relancé.";
}

/**
 * « Relancer » du dossier notaire : le propriétaire ou le locataire reçoit à nouveau l'e-mail de la demande,
 * avec seulement ce qu'il n'a pas encore envoyé. Sans demande en attente, rien à relancer : on propose « Demander ».
 */
export function NotaireRemindButton({
  bailId,
  requests,
  reminders,
  targets,
  onAsk,
}: {
  bailId: string;
  requests: StaffComplementRequest[];
  /** Relances déjà faites par ce notaire, par personne. */
  reminders: Record<Target, NotaireReminderSummary>;
  /** Personnes présentes dans le dossier. */
  targets: Target[];
  /** Ouvre « Demander » pour cette personne. */
  onAsk: (target: Target) => void;
}) {
  const [target, setTarget] = React.useState<Target | null>(null);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-10 gap-2">
            <BellRing className="size-4" />
            Relancer
            <ChevronDown className="size-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-64">
          {targets.map((t) => {
            const waiting = waitingRequests(requests, t);
            const pending = waiting.reduce((n, r) => n + r.items.filter((i) => i.status === "PENDING").length, 0);
            return (
              <DropdownMenuItem key={t} onSelect={() => (waiting.length > 0 ? setTarget(t) : onAsk(t))} className="flex-col items-start gap-0">
                <span>{t === "OWNER" ? "Le propriétaire" : "Le locataire"}</span>
                <span className="text-[11.5px] text-muted-foreground">
                  {waiting.length > 0
                    ? `${pending} élément${pending > 1 ? "s" : ""} attendu${pending > 1 ? "s" : ""}${reminders[t].count > 0 ? ` · relancé ${reminders[t].count} fois` : ""}`
                    : "Rien en attente : lui demander quelque chose"}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {target && (
        <NotaireRemindDialog
          bailId={bailId}
          target={target}
          requests={waitingRequests(requests, target)}
          summary={reminders[target]}
          open
          onOpenChange={(open) => !open && setTarget(null)}
        />
      )}
    </>
  );
}

/** Fenêtre de relance : à qui, ce qui est encore attendu, et combien de fois il a déjà été relancé. */
export function NotaireRemindDialog({
  bailId,
  target,
  requests,
  summary,
  open,
  onOpenChange,
}: {
  bailId: string;
  target: Target;
  requests: StaffComplementRequest[];
  summary: NotaireReminderSummary | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const emails = [...new Set(requests.map((r) => r.recipientEmail))];
  const pending = requests.flatMap((r) => r.items.filter((i) => i.status === "PENDING"));

  const send = async () => {
    setBusy(true);
    try {
      const result = await remindNotaireTarget({ bailId, target });
      if (!result.success) {
        toast.error("Le rappel n'a pas pu être envoyé", { description: result.error });
        return;
      }
      toast.success(`Rappel envoyé à ${result.data.emails.join(", ")}`);
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Le rappel n'a pas pu être envoyé");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Relancer {WHO[target]}</DialogTitle>
          <DialogDescription>
            {requests[0]?.recipientName ? `${requests[0].recipientName} reçoit` : "Il reçoit"} à nouveau votre demande par e-mail, avec
            seulement ce qu&apos;il n&apos;a pas encore envoyé.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <section className="rounded-xl border bg-muted/30 px-4 py-3">
            <p className="text-[12.5px] font-medium text-muted-foreground">
              Demandé le {fmtDay(requests.map((r) => r.createdAt).sort()[0] ?? new Date().toISOString())}, toujours attendu :
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {pending.map((item) => (
                <li key={item.id} className="flex items-baseline gap-2 text-[14px]">
                  <span aria-hidden className="size-1.5 shrink-0 translate-y-[-2px] rounded-full bg-amber-500" />
                  {item.label}
                </li>
              ))}
              {pending.length === 0 && <li className="text-[13.5px] text-muted-foreground">Tout est envoyé, il reste à valider l&apos;envoi.</li>}
            </ul>
          </section>
          <p className="text-[13px] text-muted-foreground">
            {remindHistory(summary)} Envoyé à {emails.join(", ")}.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" onClick={send} disabled={busy} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Envoyer le rappel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
