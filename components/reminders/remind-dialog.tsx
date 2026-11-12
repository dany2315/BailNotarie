"use client";

import * as React from "react";
import { Check, Loader2, Phone, PhoneCall, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  classifyBailWithoutFollowUp,
  getReminderPanel,
  logBailCall,
  sendBailReminders,
  snoozeBailReminder,
  type ReminderPanel,
} from "@/lib/actions/reminders";
import {
  CHANNEL_LABELS,
  REASON_LABELS,
  TARGET_LABELS,
  reminderRank,
  type ReminderNeed,
  type ReminderReasonValue,
  type ReminderTargetValue,
} from "@/lib/utils/reminders";
import { formatPhone } from "@/lib/utils/phone-format";
import { relanceEmailContent } from "@/lib/utils/relance-content";
import { EditableEmailText, EmailPreviewButton, EmailPreviewFrame } from "@/components/emails/email-preview-frame";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

type SendKey = `${ReminderTargetValue}:${ReminderReasonValue}`;
const keyOf = (target: ReminderTargetValue, reason: ReminderReasonValue) => `${target}:${reason}` as SendKey;

/** Où en est l'attente : jamais relancé, relancé N fois, reporté… */
function needStatus(need: ReminderNeed): string {
  if (need.snoozedUntil) return `Rappels reportés jusqu'au ${fmtDate(need.snoozedUntil)}`;
  const parts: string[] = [];
  parts.push(
    need.contacts === 0
      ? "Pas encore relancé"
      : `Relancé ${need.contacts} fois, dernier contact le ${fmtDate(need.lastContactAt as string)}`,
  );
  parts.push(need.due ? `${reminderRank(need.contacts)} conseillée depuis le ${fmtDate(need.dueAt)}` : `prochaine relance conseillée le ${fmtDate(need.dueAt)}`);
  return parts.join(" · ");
}

export interface RemindDialogProps {
  bailId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * « due » : seulement les relances dues.
   * « all » : fiche dossier, tout ce que le dossier attend du client est présélectionné.
   */
  focus?: "due" | "all";
  /** Titre de la fenêtre (par défaut « Relancer »). Les pièces manquantes se demandent avec « Demander des pièces ». */
  title?: string;
  /** Loyer au-dessus du plafond : détail envoyé au propriétaire avec la relance « RENT_CAP ». */
  rentCapLines?: string[] | null;
  /** Données déjà chargées (fiche dossier) ; sinon chargées à l'ouverture. */
  initialPanel?: ReminderPanel;
  /** Ne présélectionner que cette personne (fiche client). */
  only?: ReminderTargetValue;
}

/**
 * Relance d'un dossier : chaque ligne dit qui sera relancé, pour quoi et où en
 * est le suivi ; rien n'est envoyé sans confirmation.
 */
export function RemindDialog({ bailId, open, onOpenChange, focus = "due", initialPanel, only, title, rentCapLines }: RemindDialogProps) {
  const [panel, setPanel] = React.useState<ReminderPanel | null>(initialPanel ?? null);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<SendKey>>(new Set());
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmClassify, setConfirmClassify] = React.useState(false);
  const [snoozeDays, setSnoozeDays] = React.useState("14");

  const applyDefaults = React.useCallback(
    (data: ReminderPanel) => {
      const next = new Set<SendKey>();
      const addDue = () => {
        data.needs.filter((n) => n.due && n.party.email && (!only || only === n.target)).forEach((n) => next.add(keyOf(n.target, n.reason)));
        // Locataire sans téléphone, relancé sans réaction : on relance aussi son propriétaire.
        if (data.owner?.email && data.needs.some((n) => n.due && n.suggestViaOwner)) next.add(keyOf("OWNER", "TENANT_VIA_OWNER"));
      };
      if (focus === "all") {
        addDue();
        if (rentCapLines?.length && data.owner?.email) next.add(keyOf("OWNER", "RENT_CAP"));
        // Rien d'urgent : on propose quand même ce que le dossier attend.
        if (next.size === 0) data.needs.filter((n) => n.party.email).forEach((n) => next.add(keyOf(n.target, n.reason)));
      } else {
        addDue();
      }
      setSelected(next);
    },
    [focus, only, rentCapLines],
  );

  React.useEffect(() => {
    if (!open) return;
    setNote("");
    setConfirmClassify(false);
    if (initialPanel) {
      setPanel(initialPanel);
      applyDefaults(initialPanel);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getReminderPanel(bailId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.success) {
        setPanel(result.data);
        applyDefaults(result.data);
      } else {
        toast.error(result.error);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bailId]);

  // La fiche se met à jour après une action : on garde les données fraîches.
  React.useEffect(() => {
    if (initialPanel) setPanel(initialPanel);
  }, [initialPanel]);

  const toggle = (key: SendKey, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  const refresh = async () => {
    const result = await getReminderPanel(bailId);
    if (result.success) setPanel(result.data);
  };

  const recipients = React.useMemo(() => {
    if (!panel) return [];
    return Array.from(selected).map((key) => {
      const [target, reason] = key.split(":") as [ReminderTargetValue, ReminderReasonValue];
      const party = reason === "TENANT_VIA_OWNER" || target === "OWNER" ? panel.owner : panel.tenant;
      return { key, target, reason, party };
    });
  }, [selected, panel]);

  const send = async () => {
    if (!panel || recipients.length === 0) return;
    setBusy("send");
    const result = await sendBailReminders({
      bailId,
      sends: recipients.map((r) => ({ target: r.target, reason: r.reason })),
      note: note.trim() || undefined,
    });
    setBusy(null);
    if (!result.success) return toast.error(result.error);
    const { sent, failed } = result.data;
    if (sent.length) toast.success(`Relance envoyée : ${sent.map((s) => `${s.target.toLowerCase()} (${s.email})`).join(", ")}`);
    failed.forEach((f) => toast.error(`${f.target} : ${f.error}`));
    if (failed.length === 0) onOpenChange(false);
    else refresh();
  };

  const call = async (need: ReminderNeed) => {
    setBusy(`call:${need.target}`);
    const result = await logBailCall({ bailId, target: need.target, reason: need.reason, note: note.trim() || undefined });
    setBusy(null);
    if (!result.success) return toast.error(result.error);
    toast.success("Appel noté : prochaine relance dans 48 h");
    onOpenChange(false);
  };

  const snooze = async (need: ReminderNeed) => {
    setBusy(`snooze:${need.target}`);
    const result = await snoozeBailReminder({
      bailId,
      target: need.target,
      reason: need.reason,
      days: Number(snoozeDays),
      note: note.trim() || undefined,
    });
    setBusy(null);
    if (!result.success) return toast.error(result.error);
    toast.success(`Rappels reportés de ${snoozeDays} jours`);
    onOpenChange(false);
  };

  const classify = async () => {
    setBusy("classify");
    const result = await classifyBailWithoutFollowUp({ bailId });
    setBusy(null);
    if (!result.success) return toast.error(result.error);
    toast.success("Dossier classé sans suite");
    onOpenChange(false);
  };

  // Un e-mail possible par personne et par motif : ce que le dossier attend, le propriétaire au sujet
  // d'un locataire qui ne répond pas, le loyer au-dessus du plafond.
  const candidates = React.useMemo(() => {
    const list: Candidate[] = [];
    if (!panel) return list;
    const add = (target: ReminderTargetValue, reason: ReminderReasonValue, party: ReminderNeed["party"] | null | undefined, need?: ReminderNeed) => {
      const key = keyOf(target, reason);
      if (party && (!only || only === target) && !list.some((c) => c.key === key)) list.push({ key, target, reason, party, need });
    };
    for (const need of panel.needs) add(need.target, need.reason, need.party, need);
    if (panel.needs.some((n) => n.target === "TENANT" && (n.escalated || n.suggestViaOwner))) {
      add("OWNER", "TENANT_VIA_OWNER", panel.owner as ReminderNeed["party"] | null);
    }
    if (rentCapLines?.length) add("OWNER", "RENT_CAP", panel.owner as ReminderNeed["party"] | null);
    return list;
  }, [panel, only, rentCapLines]);

  const [activeKey, setActiveKey] = React.useState<SendKey | null>(null);
  const active = candidates.find((c) => c.key === activeKey) ?? candidates.find((c) => selected.has(c.key)) ?? candidates[0] ?? null;
  const need = active?.need;
  const content = active
    ? relanceEmailContent({
        reason: active.reason,
        name: active.party.name,
        address: panel?.address || "",
        actionUrl: "",
        items: active.reason === "RENT_CAP" ? (rentCapLines ?? []) : [],
        tenantName: panel?.tenant?.name,
        note,
      })
    : null;
  const several = candidates.length > 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <DialogTitle className="text-[17px]">{title || "Relancer"}</DialogTitle>
          <DialogDescription className="truncate">{panel ? panel.address : "Chargement du dossier…"}</DialogDescription>
          {several && (
            <div role="tablist" aria-label="E-mail" className="mt-3 flex flex-col gap-1 rounded-lg bg-slate-100 p-1 sm:flex-row sm:flex-wrap">
              {candidates.map((candidate) => {
                const isActive = candidate.key === active?.key;
                const included = selected.has(candidate.key);
                return (
                  <button
                    key={candidate.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveKey(candidate.key)}
                    className={cn(
                      "flex h-8 min-w-0 items-center gap-1.5 rounded-md px-3 text-left text-[12.5px] font-semibold transition-colors",
                      isActive ? "bg-white text-foreground shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-3.5 items-center justify-center rounded-full border",
                        included ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300",
                      )}
                    >
                      {included && <Check className="size-2.5" strokeWidth={3.5} />}
                    </span>
                    {TARGET_LABELS[candidate.target]} · {SHORT_REASONS[candidate.reason]}
                  </button>
                );
              })}
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {loading || !panel ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : !active || !content ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Personne n&apos;est à relancer : le dossier n&apos;attend rien du propriétaire ni du locataire.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {several && (
                <label className="flex items-center gap-2.5 text-[13px] font-medium">
                  <Checkbox
                    checked={selected.has(active.key)}
                    disabled={!active.party.email}
                    onCheckedChange={(on) => toggle(active.key, on === true)}
                  />
                  Envoyer cet e-mail à {active.party.name}
                </label>
              )}
              {need && <p className={cn("text-[12.5px]", need.due ? "font-semibold text-amber-800" : "text-muted-foreground")}>{needStatus(need)}</p>}

              <EmailPreviewFrame to={active.party.email} subject={content.subject}>
                <p className="text-[17px] font-bold text-slate-800">{content.greeting}</p>
                <div className="mt-3 flex flex-col gap-3">
                  {content.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-[14.5px] leading-[1.55] text-slate-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {content.items.length > 0 && (
                  <ul className="mt-3 flex list-disc flex-col gap-1 pl-5 text-[14px] text-slate-800">
                    {content.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {content.outro && <p className="mt-3 text-[14.5px] leading-[1.55] text-slate-600">{content.outro}</p>}
                <div className="mt-4">
                  <EditableEmailText
                    boxed
                    label="Un mot de l'équipe (facultatif)"
                    placeholder="Ajouter un mot pour le client (facultatif)"
                    value={note}
                    onChange={setNote}
                    maxLength={1000}
                  />
                </div>
                <EmailPreviewButton>{content.button}</EmailPreviewButton>
              </EmailPreviewFrame>

              {/* Plusieurs relances sans réponse, locataire pas encore trouvé : les autres gestes possibles, sur une ligne. */}
              {need && (need.escalated || need.reason === "TENANT_TO_ADD") && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-[13px] text-muted-foreground">
                  {need.escalated ? (
                    <span>
                      {need.contacts} relances sans réponse{need.canCall ? " : un appel sera plus efficace." : "."}
                    </span>
                  ) : (
                    <span>Pas encore de locataire ?</span>
                  )}
                  <span className="flex flex-wrap items-center gap-2">
                    {need.escalated && need.canCall && (
                      <>
                        <Button asChild size="sm" variant="outline" className="h-8 gap-1.5">
                          <a href={`tel:${need.party.phone}`}>
                            <Phone className="size-3.5" />
                            {formatPhone(need.party.phone) || need.party.phone}
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => call(need)} disabled={!!busy}>
                          {busy === `call:${need.target}` ? <Loader2 className="size-3.5 animate-spin" /> : <PhoneCall className="size-3.5" />}
                          Noter l&apos;appel
                        </Button>
                      </>
                    )}
                    {need.reason === "TENANT_TO_ADD" && (
                      <>
                        <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                          <SelectTrigger className="h-8 w-28" aria-label="Durée du report">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 jours</SelectItem>
                            <SelectItem value="14">14 jours</SelectItem>
                            <SelectItem value="30">30 jours</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-8" onClick={() => snooze(need)} disabled={!!busy}>
                          {busy === `snooze:${need.target}` && <Loader2 className="size-3.5 animate-spin" />}
                          Reporter les rappels
                        </Button>
                      </>
                    )}
                    {need.suggestClassify &&
                      (confirmClassify ? (
                        <>
                          <span className="text-foreground">Classer sans suite ?</span>
                          <Button size="sm" variant="destructive" className="h-8" onClick={classify} disabled={!!busy}>
                            {busy === "classify" && <Loader2 className="size-3.5 animate-spin" />}
                            Confirmer
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmClassify(false)}>
                            Non
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmClassify(true)}>
                          Classer sans suite…
                        </Button>
                      ))}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Button variant="ghost" className="h-10" onClick={() => onOpenChange(false)} disabled={!!busy}>
            Fermer
          </Button>
          <Button className="h-10 gap-1.5" onClick={send} disabled={!panel || recipients.length === 0 || !!busy}>
            {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {recipients.length > 1 ? `Envoyer ${recipients.length} relances` : "Envoyer la relance"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Candidate = {
  key: SendKey;
  target: ReminderTargetValue;
  reason: ReminderReasonValue;
  party: ReminderNeed["party"];
  need?: ReminderNeed;
};

/** Motif en deux ou trois mots, pour le sélecteur d'e-mails. */
const SHORT_REASONS: Record<ReminderReasonValue, string> = {
  OWNER_FORM: "formulaire",
  TENANT_TO_ADD: "locataire à indiquer",
  TENANT_FORM: "formulaire",
  TENANT_VIA_OWNER: "au sujet du locataire",
  MISSING_ITEMS: "éléments manquants",
  RENT_CAP: "plafond de loyer",
  DIAGNOSTICS: "diagnostics",
};

/** Liste des relances passées : quand, comment, à qui, par qui. */
export function ReminderHistoryList({ history, limit }: { history: ReminderPanel["history"]; limit?: number }) {
  const rows = limit ? history.slice(0, limit) : history;
  return (
    <ul className="flex flex-col divide-y rounded-lg border text-[13px]">
      {rows.map((item) => (
        <li key={item.id} className="flex flex-col gap-0.5 px-3 py-2.5">
          <span className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-semibold">
              {CHANNEL_LABELS[item.channel]} · {TARGET_LABELS[item.target].toLowerCase()}
            </span>
            <span className="text-muted-foreground">{fmtDateTime(item.createdAt)}</span>
          </span>
          <span className="text-foreground/80">
            {REASON_LABELS[item.reason]}
            {item.recipientEmail ? ` · ${item.recipientEmail}` : ""}
            {item.snoozeUntil ? ` · jusqu'au ${fmtDate(item.snoozeUntil)}` : ""}
          </span>
          {item.items.length > 0 && <span className="text-muted-foreground">{item.items.join(" · ")}</span>}
          {item.note && <span className="text-muted-foreground">« {item.note} »</span>}
          {item.createdByName && <span className="text-xs text-muted-foreground">par {item.createdByName}</span>}
        </li>
      ))}
    </ul>
  );
}
