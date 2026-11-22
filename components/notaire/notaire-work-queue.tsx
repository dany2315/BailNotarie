"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { remindNotaireTarget } from "@/lib/actions/complement-requests";
import type { NotaireTask, NotaireWaiting } from "@/lib/notaire/dashboard";
import { cn } from "@/lib/utils";

type TabKey = "todo" | "waiting";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - +new Date(iso)) / 86_400_000));
const WHO = { OWNER: "le propriétaire", TENANT: "le locataire" } as const;

const KIND_TONE: Record<NotaireTask["kind"], string> = {
  answers: "bg-blue-100 text-blue-800",
  contact: "bg-orange-100 text-orange-800",
  remind: "bg-amber-100 text-amber-900",
  verify: "bg-slate-100 text-slate-800",
  missing: "bg-red-100 text-red-800",
  provision: "bg-indigo-100 text-indigo-800",
  sign: "bg-green-100 text-green-800",
};
const KIND_LABEL: Record<NotaireTask["kind"], string> = {
  answers: "Réponse reçue",
  contact: "Nouveau",
  remind: "À relancer",
  verify: "Vérification",
  missing: "Pièce manquante",
  provision: "Provision",
  sign: "Signature",
};

/** File de travail du notaire : ce qu'il a à faire, et ce qu'il attend des clients. */
export function NotaireWorkQueue({ todo, waiting }: { todo: NotaireTask[]; waiting: NotaireWaiting[] }) {
  const [tab, setTab] = React.useState<TabKey>("todo");
  const tabs: Array<{ key: TabKey; label: string; count: number; hint: string }> = [
    { key: "todo", label: "À faire", count: todo.length, hint: "Réponses reçues, nouveaux dossiers, clients sans réponse depuis 2 jours, pièces à vérifier : le plus urgent en premier." },
    {
      key: "waiting",
      label: "En attente des clients",
      count: waiting.length,
      hint: "Ce que vous avez demandé et pas encore reçu. Une relance est conseillée 2 jours après la demande ou votre dernière relance.",
    },
  ];
  const current = tabs.find((t) => t.key === tab)!;

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div role="tablist" aria-label="File de travail" className="flex gap-1 border-b px-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-2 text-sm font-semibold transition-colors sm:flex-none sm:px-3",
              t.key === tab ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">{t.count}</span>
          </button>
        ))}
      </div>
      <p className="border-b bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">{current.hint}</p>

      {tab === "todo" ? (
        todo.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Rien à faire pour le moment.</p>
        ) : (
          <ul className="divide-y">
            {todo.map((task) => {
              const days = daysSince(task.since);
              return (
                <li key={task.key} className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", KIND_TONE[task.kind])}>{KIND_LABEL[task.kind]}</span>
                      <span className="font-semibold">{task.title}</span>
                    </div>
                    <Link href={task.href} className="truncate text-sm text-foreground/80 hover:underline">
                      {task.address} · {task.parties}
                    </Link>
                    <span className="text-xs text-muted-foreground">{task.detail}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className={cn("whitespace-nowrap text-sm tabular-nums sm:w-24 sm:text-right", days > 7 ? "font-semibold text-red-700" : "text-muted-foreground")}>
                      {days === 0 ? "aujourd'hui" : `depuis ${days} j`}
                    </span>
                    {task.remindTarget ? (
                      <QuickRemind bailId={task.bailId} target={task.remindTarget} detail={task.detail} className="sm:min-w-36" />
                    ) : (
                      <Button asChild size="sm" variant={task.kind === "contact" || task.kind === "answers" ? "default" : "outline"} className="sm:min-w-36">
                        <Link href={task.href}>{task.action}</Link>
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : waiting.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Aucune demande en attente des clients.</p>
      ) : (
        <ul className="divide-y">
          {waiting.map((w) => (
            <li key={w.key} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">
                  {w.recipientName || (w.target === "OWNER" ? "Propriétaire" : "Locataire")}
                  <span className="font-normal text-muted-foreground"> · {w.target === "OWNER" ? "propriétaire" : "locataire"}</span>
                </span>
                <Link href={`/notaire/dossiers?dossierId=${w.assignmentId}#demandes-title`} className="truncate text-sm text-foreground/80 hover:underline">
                  {w.address}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {w.pending} élément{w.pending > 1 ? "s" : ""} attendu{w.pending > 1 ? "s" : ""} · demandé le {fmtDay(w.askedAt)} ·{" "}
                  {w.reminders > 0 && w.lastReminderAt ? `vous l'avez relancé ${w.reminders} fois, dernière le ${fmtDay(w.lastReminderAt)}` : "jamais relancé"}
                </span>
              </div>
              <QuickRemind
                bailId={w.bailId}
                target={w.target}
                detail={`${w.pending} élément${w.pending > 1 ? "s" : ""} attendu${w.pending > 1 ? "s" : ""}`}
                variant={w.due ? "default" : "outline"}
                className="sm:min-w-36"
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Relance depuis le tableau de bord, après une confirmation (un e-mail part au client). */
function QuickRemind({
  bailId,
  target,
  detail,
  variant = "default",
  className,
}: {
  bailId: string;
  target: "OWNER" | "TENANT";
  detail: string;
  variant?: "default" | "outline";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const send = async () => {
    setBusy(true);
    try {
      const result = await remindNotaireTarget({ bailId, target });
      if (!result.success) {
        toast.error("Le rappel n'a pas pu être envoyé", { description: result.error });
        return;
      }
      toast.success(`Rappel envoyé à ${result.data.emails.join(", ")}`);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("Le rappel n'a pas pu être envoyé");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button type="button" size="sm" variant={variant} className={cn("gap-1.5", className)} onClick={() => setOpen(true)}>
        <BellRing className="size-3.5" />
        Relancer
      </Button>
      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Relancer {WHO[target]} ?</DialogTitle>
            <DialogDescription>
              Il reçoit à nouveau votre demande par e-mail, avec seulement ce qu&apos;il n&apos;a pas encore envoyé ({detail.split(" · ")[0]}).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Annuler
            </Button>
            <Button type="button" onClick={send} disabled={busy} className="gap-1.5">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
              Envoyer le rappel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
