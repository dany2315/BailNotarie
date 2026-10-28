"use client";

import * as React from "react";
import { History, Loader2, Mail, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
   * « missing » : ouvre sur la demande des éléments manquants (relance manuelle).
   * « all » : fiche dossier, tout ce que le dossier attend du client est présélectionné.
   */
  focus?: "due" | "missing" | "all";
  /** Titre de la fenêtre (par défaut selon focus). */
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
  const [showHistory, setShowHistory] = React.useState(false);

  const applyDefaults = React.useCallback(
    (data: ReminderPanel) => {
      const next = new Set<SendKey>();
      const addMissing = () => {
        const pendingForm = new Set(data.needs.filter((n) => n.reason === "OWNER_FORM" || n.reason === "TENANT_FORM").map((n) => n.target));
        (Object.keys(data.missing) as ReminderTargetValue[]).forEach((t) => {
          if (!pendingForm.has(t) && (!only || only === t) && data.missing[t].length > 0 && (t === "OWNER" ? data.owner : data.tenant)?.email) {
            next.add(keyOf(t, "MISSING_ITEMS"));
          }
        });
      };
      const addDue = () => {
        data.needs.filter((n) => n.due && n.party.email && (!only || only === n.target)).forEach((n) => next.add(keyOf(n.target, n.reason)));
        // Locataire sans téléphone, relancé sans réaction : on relance aussi son propriétaire.
        if (data.owner?.email && data.needs.some((n) => n.due && n.suggestViaOwner)) next.add(keyOf("OWNER", "TENANT_VIA_OWNER"));
      };
      if (focus === "missing") {
        addMissing();
      } else if (focus === "all") {
        addDue();
        addMissing();
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
    setShowHistory(false);
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

  // Une personne qui doit encore remplir son formulaire est relancée pour ce formulaire :
  // la demande d'éléments manquants ne concerne que ceux qui l'ont déjà envoyé.
  const formPending = new Set(panel?.needs.filter((n) => n.reason === "OWNER_FORM" || n.reason === "TENANT_FORM").map((n) => n.target));
  const missingTargets = panel
    ? (["OWNER", "TENANT"] as ReminderTargetValue[]).filter(
        (t) => !formPending.has(t) && panel.missing[t].length > 0 && (t === "OWNER" ? panel.owner : panel.tenant),
      )
    : [];

  const showRentCap = !!panel?.owner && !!rentCapLines?.length;

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title || (focus === "missing" ? "Demander les éléments manquants" : "Relancer")}</DialogTitle>
          <DialogDescription>{panel ? panel.address : "Chargement du dossier…"}</DialogDescription>
        </DialogHeader>

        {loading || !panel ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {/* Attentes du dossier : relances programmées */}
            {panel.needs.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-semibold">En attente du client</h3>
                {panel.needs.map((need) => {
                  const key = keyOf(need.target, need.reason);
                  const viaKey = keyOf("OWNER", "TENANT_VIA_OWNER");
                  const disabled = !need.party.email;
                  return (
                    <div key={key} className={cn("flex flex-col gap-3 rounded-lg border p-3.5", need.due && "border-amber-300 bg-amber-50/50")}>
                      <label className="flex items-start gap-3">
                        <Checkbox
                          checked={selected.has(key)}
                          disabled={disabled}
                          onCheckedChange={(on) => toggle(key, on === true)}
                          className="mt-0.5"
                          aria-label={`Relancer ${need.party.name} par e-mail`}
                        />
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-sm font-semibold">
                            {TARGET_LABELS[need.target]} · {need.party.name}
                          </span>
                          <span className="text-[13px] text-foreground/80">{REASON_LABELS[need.reason]}</span>
                          <span className="break-all text-[13px] text-muted-foreground">
                            {need.party.email || "Pas d'adresse e-mail"}
                            {need.party.phone ? ` · ${formatPhone(need.party.phone) || need.party.phone}` : ""}
                          </span>
                          <span className={cn("text-xs", need.due ? "font-semibold text-amber-800" : "text-muted-foreground")}>{needStatus(need)}</span>
                        </span>
                      </label>

                      {need.escalated && (
                        <div className="flex flex-col gap-2 rounded-md bg-muted/60 p-3 text-[13px]">
                          <span className="font-semibold">
                            {need.contacts} relances sans réaction
                            {need.canCall ? " : un appel sera plus efficace." : " et pas de téléphone."}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {need.canCall && (
                              <>
                                <Button asChild size="sm" variant="outline" className="h-9">
                                  <a href={`tel:${need.party.phone}`}>
                                    <Phone className="size-3.5" />
                                    Appeler {formatPhone(need.party.phone) || need.party.phone}
                                  </a>
                                </Button>
                                <Button size="sm" variant="outline" className="h-9" onClick={() => call(need)} disabled={!!busy}>
                                  {busy === `call:${need.target}` ? <Loader2 className="size-3.5 animate-spin" /> : <PhoneCall className="size-3.5" />}
                                  Noter l'appel
                                </Button>
                              </>
                            )}
                            {need.suggestClassify &&
                              (confirmClassify ? (
                                <span className="flex flex-wrap items-center gap-2">
                                  <span>Classer le dossier sans suite ?</span>
                                  <Button size="sm" variant="destructive" className="h-9" onClick={classify} disabled={!!busy}>
                                    {busy === "classify" && <Loader2 className="size-3.5 animate-spin" />}
                                    Confirmer
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-9" onClick={() => setConfirmClassify(false)}>
                                    Annuler
                                  </Button>
                                </span>
                              ) : (
                                <Button size="sm" variant="outline" className="h-9" onClick={() => setConfirmClassify(true)}>
                                  Classer sans suite…
                                </Button>
                              ))}
                          </div>
                          {need.target === "TENANT" && panel.owner?.email && (
                            <label className="flex items-start gap-2.5">
                              <Checkbox checked={selected.has(viaKey)} onCheckedChange={(on) => toggle(viaKey, on === true)} className="mt-0.5" />
                              <span>
                                Relancer aussi le propriétaire ({panel.owner.name}) au sujet de son locataire
                                {need.suggestViaOwner ? " (conseillé)" : ""}
                              </span>
                            </label>
                          )}
                        </div>
                      )}

                      {need.reason === "TENANT_TO_ADD" && (
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <span className="text-muted-foreground">Le propriétaire cherche encore son locataire ?</span>
                          <Select value={snoozeDays} onValueChange={setSnoozeDays}>
                            <SelectTrigger className="h-9 w-32" aria-label="Durée du report">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="7">7 jours</SelectItem>
                              <SelectItem value="14">14 jours</SelectItem>
                              <SelectItem value="30">30 jours</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="sm" variant="outline" className="h-9" onClick={() => snooze(need)} disabled={!!busy}>
                            {busy === `snooze:${need.target}` && <Loader2 className="size-3.5 animate-spin" />}
                            Reporter les rappels
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            )}

            {/* Éléments manquants : relance manuelle seulement */}
            {missingTargets.length > 0 && (
              <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-semibold">Éléments manquants</h3>
                {missingTargets.map((target) => {
                  const party = target === "OWNER" ? panel.owner! : panel.tenant!;
                  const key = keyOf(target, "MISSING_ITEMS");
                  return (
                    <label key={key} className="flex items-start gap-3 rounded-lg border p-3.5">
                      <Checkbox
                        checked={selected.has(key)}
                        disabled={!party.email}
                        onCheckedChange={(on) => toggle(key, on === true)}
                        className="mt-0.5"
                        aria-label={`Demander à ${party.name} les éléments manquants`}
                      />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="text-sm font-semibold">
                          {TARGET_LABELS[target]} · {party.name}
                        </span>
                        <span className="break-all text-[13px] text-muted-foreground">{party.email || "Pas d'adresse e-mail"}</span>
                        <span className="text-[13px] text-foreground/80">{panel.missing[target].join(" · ")}</span>
                      </span>
                    </label>
                  );
                })}
              </section>
            )}

            {/* Loyer au-dessus du plafond : le propriétaire choisit entre baisser le loyer et justifier un complément */}
            {showRentCap && (
              <section className="flex flex-col gap-2.5">
                <h3 className="text-sm font-semibold">Loyer au-dessus du plafond</h3>
                <label className="flex items-start gap-3 rounded-lg border p-3.5">
                  <Checkbox
                    checked={selected.has(keyOf("OWNER", "RENT_CAP"))}
                    disabled={!panel.owner!.email}
                    onCheckedChange={(on) => toggle(keyOf("OWNER", "RENT_CAP"), on === true)}
                    className="mt-0.5"
                    aria-label={`Prévenir ${panel.owner!.name} du dépassement du plafond`}
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-sm font-semibold">
                      {TARGET_LABELS.OWNER} · {panel.owner!.name}
                    </span>
                    <span className="break-all text-[13px] text-muted-foreground">{panel.owner!.email || "Pas d'adresse e-mail"}</span>
                    <span className="text-[13px] text-foreground/80">
                      Il pourra ramener le loyer au plafond ou justifier un complément de loyer.
                    </span>
                    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-[13px] text-foreground/80">
                      {rentCapLines!.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </span>
                </label>
              </section>
            )}

            {panel.needs.length === 0 && missingTargets.length === 0 && !showRentCap && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Personne n'est à relancer : le dossier n'attend rien du propriétaire ni du locataire.
              </p>
            )}

            {(panel.needs.length > 0 || missingTargets.length > 0 || showRentCap) && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`remind-note-${bailId}`}>Message ajouté à l'e-mail (facultatif)</Label>
                <Textarea
                  id={`remind-note-${bailId}`}
                  rows={2}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Ex. : n'hésitez pas à nous appeler si vous avez une question."
                />
              </div>
            )}

            {panel.history.length > 0 && (
              <section className="flex flex-col gap-2">
                <button
                  type="button"
                  className="flex min-h-9 w-fit items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  onClick={() => setShowHistory((v) => !v)}
                  aria-expanded={showHistory}
                >
                  <History className="size-4" />
                  Historique des relances ({panel.history.length})
                </button>
                {showHistory && <ReminderHistoryList history={panel.history} />}
              </section>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:items-stretch">
          {recipients.length > 0 && (
            <p className="text-[13px] text-muted-foreground">
              <Mail className="mr-1 inline size-3.5" />
              Recevront un e-mail :{" "}
              {recipients
                .map((r) => `${r.party?.name || TARGET_LABELS[r.target]} (${REASON_LABELS[r.reason].toLowerCase()})`)
                .join(" · ")}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>
              Fermer
            </Button>
            <Button onClick={send} disabled={!panel || recipients.length === 0 || !!busy}>
              {busy === "send" && <Loader2 className="size-4 animate-spin" />}
              {recipients.length > 1 ? `Envoyer ${recipients.length} relances` : "Envoyer la relance"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
