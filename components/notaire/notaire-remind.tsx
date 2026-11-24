"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { remindNotaireTarget, type NotaireReminderSummary, type StaffComplementRequest } from "@/lib/actions/complement-requests";
import { sendNotaireFormReminder } from "@/lib/actions/reminders";
import type { NotaireFormWait } from "@/lib/notaire/form-reminders";
import { relanceEmailContent } from "@/lib/utils/relance-content";
import { RelanceEmailPreview } from "@/components/emails/relance-email-preview";
import { ComplementReminderPreview } from "@/components/complements/complement-remind-dialog";

type Target = "OWNER" | "TENANT";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
const WHO: Record<Target, string> = { OWNER: "le propriétaire", TENANT: "le locataire" };

/** Ce qu'on attend encore de cette personne : les demandes du notaire et de l'équipe, sans réponse. */
export function waitingRequests(requests: StaffComplementRequest[], target: Target) {
  return requests.filter((r) => r.target === target && r.status === "OPEN");
}

const TEAM_BADGE = "rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700";

/** Les relances du notaire lui-même (jamais celles de l'équipe). */
export function remindHistory(summary: NotaireReminderSummary | undefined) {
  return summary && summary.count > 0 && summary.lastAt
    ? `Vous l'avez déjà relancé ${summary.count} fois, la dernière le ${fmtDay(summary.lastAt)}.`
    : "Vous ne l'avez pas encore relancé.";
}

/**
 * « Relancer » du dossier notaire : le propriétaire ou le locataire reçoit à nouveau l'e-mail de la demande
 * (seulement ce qu'il n'a pas encore envoyé), ou le rappel de son formulaire. Le bouton n'apparaît que s'il y a
 * quelque chose à relancer : pour demander autre chose, c'est « Demander », juste à côté.
 */
export function NotaireRemindButton({
  bailId,
  address,
  requests,
  reminders,
  formWaits = [],
  targets,
}: {
  bailId: string;
  /** Adresse du bien, comme dans l'e-mail. */
  address: string;
  requests: StaffComplementRequest[];
  /** Relances déjà faites par ce notaire, par personne. */
  reminders: Record<Target, NotaireReminderSummary>;
  /** Ce que le dossier attend encore avant d'être prêt (formulaire, locataire à indiquer). */
  formWaits?: NotaireFormWait[];
  /** Personnes présentes dans le dossier. */
  targets: Target[];
}) {
  const [target, setTarget] = React.useState<Target | null>(null);
  const [formWait, setFormWait] = React.useState<NotaireFormWait | null>(null);
  const shown = (["OWNER", "TENANT"] as const).filter(
    (t) => formWaits.some((w) => w.target === t) || (targets.includes(t) && waitingRequests(requests, t).length > 0),
  );
  if (shown.length === 0) return null;
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
          {shown.map((t) => {
            const who = t === "OWNER" ? "Le propriétaire" : "Le locataire";
            const waiting = waitingRequests(requests, t);
            const pending = waiting.reduce((n, r) => n + r.items.filter((i) => i.status === "PENDING").length, 0);
            const forms = formWaits.filter((w) => w.target === t);
            return (
              <React.Fragment key={t}>
                {forms.map((w) => (
                  <DropdownMenuItem key={w.reason} onSelect={() => setFormWait(w)} className="flex-col items-start gap-0">
                    <span>
                      {who} · {lower(w.label)}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      Attendu depuis le {fmtDay(w.since)}
                      {w.mine > 0 ? ` · relancé ${w.mine} fois` : ""}
                    </span>
                  </DropdownMenuItem>
                ))}
                {waiting.length > 0 && (
                  <DropdownMenuItem onSelect={() => setTarget(t)} className="flex-col items-start gap-0">
                    <span className="flex flex-wrap items-center gap-1.5">
                      {who} · pièces demandées
                      {waiting.some((r) => r.origin === "TEAM") && <span className={TEAM_BADGE}>Par l&apos;équipe BailNotarie</span>}
                    </span>
                    <span className="text-[11.5px] text-muted-foreground">
                      {pending} élément{pending > 1 ? "s" : ""} attendu{pending > 1 ? "s" : ""}
                      {reminders[t].count > 0 ? ` · relancé ${reminders[t].count} fois` : ""}
                    </span>
                  </DropdownMenuItem>
                )}
              </React.Fragment>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {target && (
        <NotaireRemindDialog
          bailId={bailId}
          address={address}
          target={target}
          requests={waitingRequests(requests, target)}
          summary={reminders[target]}
          open
          onOpenChange={(open) => !open && setTarget(null)}
        />
      )}
      {formWait && <NotaireFormRemindDialog wait={formWait} open onOpenChange={(open) => !open && setFormWait(null)} />}
    </>
  );
}

const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const FORM_TEXT: Record<NotaireFormWait["reason"], string> = {
  OWNER_FORM: "reçoit un e-mail lui rappelant de terminer son formulaire, avec le lien pour le reprendre là où il s'était arrêté.",
  TENANT_TO_ADD: "reçoit un e-mail lui demandant d'indiquer son locataire depuis son espace, pour que le locataire reçoive son formulaire.",
  TENANT_FORM: "reçoit un e-mail lui rappelant de remplir son formulaire locataire, avec le lien pour le reprendre là où il s'était arrêté.",
};

/** Relance « formulaire » : ce que la personne reçoit, et combien de fois le notaire l'a déjà relancée. */
export function NotaireFormRemindDialog({ wait, open, onOpenChange }: { wait: NotaireFormWait; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  // Encadré du notaire : sa phrase, modifiable et complétable.
  const [note, setNote] = React.useState(wait.notaryLine);
  const [body, setBody] = React.useState<string | null>(null);
  // Même contenu que l'e-mail envoyé (modèle de l'équipe), avec la phrase du notaire.
  const content = relanceEmailContent({ reason: wait.reason, name: wait.greetingName, address: wait.address, actionUrl: "" });
  const send = async () => {
    setBusy(true);
    try {
      const result = await sendNotaireFormReminder({
        bailId: wait.bailId,
        target: wait.target,
        reason: wait.reason,
        note: note.trim(),
        body: body?.trim() || undefined,
      });
      if (!result.success) {
        toast.error("Le rappel n'a pas pu être envoyé", { description: result.error });
        return;
      }
      toast.success(`Rappel envoyé à ${result.data.email}`);
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
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-4 overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Relancer {WHO[wait.target]} : {lower(wait.label)}
          </DialogTitle>
          <DialogDescription>
            {wait.partyName} {FORM_TEXT[wait.reason]}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
          <p className="text-[13px] text-muted-foreground">
            Attendu depuis le {fmtDay(wait.since)}.{" "}
            {wait.mine > 0 && wait.myLastAt
              ? `Vous l'avez déjà relancé ${wait.mine} fois, la dernière le ${fmtDay(wait.myLastAt)}.`
              : "Vous ne l'avez pas encore relancé."}
          </p>
          <RelanceEmailPreview
            content={content}
            reason={wait.reason}
            address={wait.address}
            to={wait.email}
            toName={wait.partyName}
            toRole={wait.target === "OWNER" ? "Propriétaire" : "Locataire"}
            body={body}
            onBodyChange={setBody}
            note={note}
            onNoteChange={setNote}
            noteLabel="Votre mot au client"
            notePlaceholder="Un mot pour le client (facultatif)"
            noteMax={1500}
          />
        </div>
        {!wait.email && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            Pas d&apos;adresse e-mail pour cette personne : l&apos;envoi est impossible.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Annuler
          </Button>
          <Button type="button" onClick={send} disabled={busy || !wait.email} className="gap-1.5">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <BellRing className="size-4" />}
            Envoyer le rappel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Fenêtre de relance : à qui, ce qui est encore attendu, et combien de fois il a déjà été relancé. */
export function NotaireRemindDialog({
  bailId,
  address,
  target,
  requests,
  summary,
  open,
  onOpenChange,
}: {
  bailId: string;
  /** Adresse du bien, comme dans l'e-mail. */
  address: string;
  target: Target;
  requests: StaffComplementRequest[];
  summary: NotaireReminderSummary | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  // Message de chaque e-mail modifié dans l'aperçu ; absent = texte de rappel prévu.
  const [messages, setMessages] = React.useState<Record<string, string>>({});
  const emails = [...new Set(requests.map((r) => r.recipientEmail))];

  const send = async () => {
    setBusy(true);
    try {
      const edited = Object.fromEntries(Object.entries(messages).filter(([, value]) => value.trim()));
      const result = await remindNotaireTarget({ bailId, target, messages: edited });
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
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-4 overflow-hidden sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Relancer {WHO[target]}</DialogTitle>
          <DialogDescription>
            {requests[0]?.recipientName ? `${requests[0].recipientName} reçoit` : "Il reçoit"} à nouveau la demande par e-mail, avec
            seulement ce qu&apos;il n&apos;a pas encore envoyé. Voici l&apos;e-mail tel qu&apos;il partira.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-1">
          {requests.map((request, index) => {
            const items = request.items.filter((i) => i.status === "PENDING");
            return (
              <section key={request.id} className="flex flex-col gap-2">
                <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] font-medium text-muted-foreground">
                  {requests.length > 1 && <span>E-mail {index + 1} sur {requests.length} ·</span>}
                  {request.origin === "TEAM" && <span className={TEAM_BADGE}>Par l&apos;équipe BailNotarie</span>}
                  Demandé le {fmtDay(request.createdAt)}
                </p>
                {items.length === 0 ? (
                  <p className="rounded-xl border bg-muted/30 px-4 py-3 text-[13.5px] text-muted-foreground">
                    Tout est envoyé, il reste à valider l&apos;envoi : pas d&apos;e-mail pour cette demande.
                  </p>
                ) : (
                  <ComplementReminderPreview
                    greetingName={request.greetingName}
                    recipientName={request.recipientName}
                    email={request.recipientEmail}
                    role={target === "OWNER" ? "Propriétaire" : "Locataire"}
                    address={address}
                    items={items.map((item) => ({ label: item.label, reason: item.reason, note: item.note, kind: item.type }))}
                    message={messages[request.id] ?? null}
                    onMessageChange={(value) => setMessages((current) => ({ ...current, [request.id]: value }))}
                  />
                )}
              </section>
            );
          })}
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
