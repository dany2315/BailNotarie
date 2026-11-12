"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Plus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getComplementComposer,
  sendComplementRequest,
  type ComposerData,
  type ComposerFieldRow,
  type ComposerRow,
} from "@/lib/actions/complement-requests";
import {
  COMPLEMENT_NOTE_MAX,
  FIELD_REDO_REASONS,
  REASON_LABELS,
  REDO_REASONS,
  complementCountLabel,
  defaultComplementMessage,
  type ComplementReasonValue,
} from "@/lib/utils/complement";
import { ComplementEmailPreview } from "@/components/complements/complement-email-preview";
import { cn } from "@/lib/utils";

type Target = "OWNER" | "TENANT";

/** Pièce cochée à l'ouverture (on vient de sa ligne dans la fiche). */
export interface ComplementPreselect {
  key: string;
}

interface Choice {
  reason: ComplementReasonValue;
  note: string;
}

interface ExtraPiece {
  id: string;
  label: string;
  note: string;
}

const GROUP_TITLES: Record<Target, Record<ComposerRow["group"], string>> = {
  OWNER: { party: "Le propriétaire", property: "Le bien", bail: "Le bail" },
  TENANT: { party: "Le locataire", property: "Le bien", bail: "Le bail" },
};

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

/** Bouton qui ouvre la fenêtre de demande, avec une pièce déjà cochée si on vient d'une ligne. */
export function ComplementRequestButton({
  bailId,
  target,
  alsoTarget,
  preselect,
  label,
  icon,
  className,
  variant = "outline",
  size = "sm",
}: {
  bailId: string;
  target: Target;
  /** L'autre partie a aussi des pièces à fournir : la fenêtre permet de passer de l'une à l'autre. */
  alsoTarget?: Target;
  preselect?: ComplementPreselect;
  label: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: "outline" | "default" | "ghost";
  size?: "sm" | "default";
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={cn(size === "sm" && "h-9", "gap-1.5", className)} onClick={() => setOpen(true)}>
        {icon}
        <span className="truncate">{label}</span>
      </Button>
      {open && (
        <ComplementComposer bailId={bailId} target={target} alsoTarget={alsoTarget} preselect={preselect} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}

export function ComplementComposer({
  bailId,
  target: initialTarget,
  alsoTarget,
  preselect,
  open,
  onOpenChange,
}: {
  bailId: string;
  target: Target;
  alsoTarget?: Target;
  preselect?: ComplementPreselect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [target, setTarget] = React.useState<Target>(initialTarget);
  const [data, setData] = React.useState<ComposerData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<"pick" | "preview">("pick");
  const [choices, setChoices] = React.useState<Map<string, Choice>>(() => new Map());
  const [extras, setExtras] = React.useState<ExtraPiece[]>([]);
  const [fieldChoices, setFieldChoices] = React.useState<Map<string, Choice>>(() => new Map());
  // Message : celui proposé par défaut (qui suit le contenu) tant que l'équipe ne l'a pas modifié.
  const [customMessage, setCustomMessage] = React.useState<string | null>(null);
  const [showOptional, setShowOptional] = React.useState(false);
  const [showOtherFields, setShowOtherFields] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    // Autre personne : on repart d'une demande vierge.
    setData(null);
    setError(null);
    setStep("pick");
    setChoices(new Map());
    setFieldChoices(new Map());
    setExtras([]);
    setCustomMessage(null);
    setShowOtherFields(false);
    getComplementComposer({ bailId, target }).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        setError(result.error);
        return;
      }
      setData(result.data);
      const row = target === initialTarget && preselect && result.data.rows.find((r) => r.key === preselect.key && !r.pending);
      if (row) {
        setChoices(new Map([[row.key, { reason: row.documents.length > 0 ? "ILLEGIBLE" : "MISSING", note: "" }]]));
        if (row.level === "optional") setShowOptional(true);
      }
      const field = target === initialTarget && preselect && result.data.fields.find((r) => r.key === preselect.key && !r.pending);
      if (field) {
        setFieldChoices(new Map([[field.key, { reason: field.missing.length > 0 ? "MISSING" : "WRONG_VALUE", note: "" }]]));
        if (field.missing.length === 0) setShowOtherFields(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bailId, target, initialTarget, preselect?.key]);

  const toggle = (row: ComposerRow, on: boolean) => {
    setChoices((current) => {
      const next = new Map(current);
      if (on) next.set(row.key, { reason: row.documents.length > 0 ? "ILLEGIBLE" : "MISSING", note: "" });
      else next.delete(row.key);
      return next;
    });
  };
  const update = (key: string, patch: Partial<Choice>) =>
    setChoices((current) => {
      const next = new Map(current);
      const choice = next.get(key);
      if (choice) next.set(key, { ...choice, ...patch });
      return next;
    });

  const toggleField = (row: ComposerFieldRow, on: boolean) => {
    setFieldChoices((current) => {
      const next = new Map(current);
      if (on) next.set(row.key, { reason: row.missing.length > 0 ? "MISSING" : "WRONG_VALUE", note: "" });
      else next.delete(row.key);
      return next;
    });
  };
  const updateField = (key: string, patch: Partial<Choice>) =>
    setFieldChoices((current) => {
      const next = new Map(current);
      const choice = next.get(key);
      if (choice) next.set(key, { ...choice, ...patch });
      return next;
    });

  const selectedRows = (data?.rows ?? []).filter((row) => choices.has(row.key));
  const selectedFields = (data?.fields ?? []).filter((row) => fieldChoices.has(row.key));
  const validExtras = extras.filter((extra) => extra.label.trim().length >= 2);
  const count = selectedRows.length + validExtras.length + selectedFields.length;

  const previewItems = [
    ...(data?.openRequest?.pendingItems ?? []),
    ...selectedRows.map((row) => ({ label: row.label, reason: choices.get(row.key)!.reason, note: choices.get(row.key)!.note, kind: "DOCUMENT" as const })),
    ...validExtras.map((extra) => ({ label: extra.label.trim(), reason: "MISSING" as const, note: extra.note, kind: "DOCUMENT" as const })),
    ...selectedFields.map((row) => ({ label: row.label, reason: fieldChoices.get(row.key)!.reason, note: fieldChoices.get(row.key)!.note, kind: "FIELD" as const })),
  ];
  const defaultMessage = defaultComplementMessage(previewItems.some((item) => item.kind === "FIELD"));
  const message = customMessage ?? defaultMessage;
  const newItems = [
    ...selectedRows.map(() => ({ kind: "DOCUMENT" as const })),
    ...validExtras.map(() => ({ kind: "DOCUMENT" as const })),
    ...selectedFields.map(() => ({ kind: "FIELD" as const })),
  ];

  const send = async () => {
    if (!data) return;
    setSending(true);
    const result = await sendComplementRequest({
      bailId,
      target,
      message: customMessage === null || message.trim() === defaultMessage ? undefined : message.trim(),
      fields: selectedFields.map((row) => {
        const choice = fieldChoices.get(row.key)!;
        return { question: row.question, reason: choice.reason, note: choice.note.trim() || undefined, target: row.target };
      }),
      items: [
        ...selectedRows.map((row) => {
          const choice = choices.get(row.key)!;
          return {
            kind: row.kind,
            label: row.label,
            reason: choice.reason,
            note: choice.note.trim() || undefined,
            target: row.target,
            // Pièce à refaire : les fichiers actuels seront remplacés quand l'équipe acceptera le nouveau.
            replacesDocumentIds: choice.reason === "MISSING" ? [] : row.documents.map((doc) => doc.id),
          };
        }),
        ...validExtras.map((extra) => ({
          kind: "OTHER",
          label: extra.label.trim(),
          reason: "MISSING",
          note: extra.note.trim() || undefined,
          target: { bailId },
          replacesDocumentIds: [],
        })),
      ],
    });
    setSending(false);
    if (!result.success) {
      toast.error("Demande non envoyée", { description: result.error });
      return;
    }
    toast.success("Demande envoyée", { description: `E-mail envoyé à ${result.data.email}` });
    onOpenChange(false);
    router.refresh();
  };

  const groups = (["party", "property", "bail"] as const)
    .map((group) => ({
      group,
      rows: (data?.rows ?? []).filter((row) => row.group === group && (row.level !== "optional" || row.documents.length > 0)),
    }))
    .filter((g) => g.rows.length > 0);
  const optionalRows = (data?.rows ?? []).filter((row) => row.level === "optional" && row.documents.length === 0);
  // Informations : celles qui manquent d'abord ; les autres (à corriger ou confirmer) dans un repli.
  const missingFields = (data?.fields ?? []).filter((row) => row.missing.length > 0);
  const otherFields = (data?.fields ?? []).filter((row) => row.missing.length === 0);
  const fieldGroups = (rows: ComposerFieldRow[]) =>
    (["party", "property", "bail"] as const).map((group) => ({ group, rows: rows.filter((row) => row.group === group) })).filter((g) => g.rows.length > 0);
  const who = target === "OWNER" ? "au propriétaire" : "au locataire";

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <DialogTitle className="text-[17px]">{step === "pick" ? `Demander ${who}` : "Aperçu de l'e-mail"}</DialogTitle>
          <DialogDescription className="truncate">
            {data ? `${data.name}${data.email ? ` · ${data.email}` : ""}` : error ? "" : "Chargement du dossier…"}
          </DialogDescription>
          {alsoTarget && step === "pick" && (
            <div role="tablist" aria-label="Personne" className="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {[initialTarget, alsoTarget].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={target === value}
                  disabled={sending}
                  onClick={() => setTarget(value)}
                  className={cn(
                    "h-8 rounded-md text-[13px] font-semibold transition-colors",
                    target === value ? "bg-white text-foreground shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-foreground",
                  )}
                >
                  {value === "OWNER" ? "Propriétaire" : "Locataire"}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {error ? (
            <p className="py-6 text-sm text-red-700">{error}</p>
          ) : !data ? (
            <div className="flex justify-center py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : step === "preview" ? (
            <ComplementEmailPreview
              name={data.greetingName || ""}
              recipientName={data.name}
              email={data.email}
              address={data.address}
              message={message}
              onMessageChange={setCustomMessage}
              items={previewItems}
              reminder={false}
            />
          ) : data.formPending ? (
            <p className="rounded-lg bg-amber-50 px-3.5 py-3 text-[13.5px] leading-relaxed text-amber-900">
              Son formulaire n&apos;est pas encore envoyé. Relancez-le plutôt : le formulaire demande déjà toutes les pièces et informations obligatoires.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {data.openRequest && (
                <p className="rounded-lg bg-blue-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-blue-900">
                  Une demande est déjà en cours. Ce que vous cochez s&apos;y ajoute : l&apos;e-mail repartira avec tout ce qui est encore attendu.
                </p>
              )}
              {!data.email && (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-red-800">
                  Pas d&apos;adresse e-mail pour cette personne : ajoutez-la dans sa fiche avant de lui demander quoi que ce soit.
                </p>
              )}

              <PartTitle title="Pièces" />
              {groups.map(({ group, rows }) => (
                <section key={group} className="flex flex-col gap-1.5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{GROUP_TITLES[target][group]}</h3>
                  <ul className="flex flex-col divide-y rounded-xl border">
                    {rows.map((row) => (
                      <PieceRow key={row.key} row={row} choice={choices.get(row.key)} onToggle={toggle} onChange={update} />
                    ))}
                  </ul>
                </section>
              ))}

              {optionalRows.length > 0 && (
                <section className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowOptional((v) => !v)}
                    className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", showOptional && "rotate-180")} />
                    Pièces facultatives · {optionalRows.length}
                  </button>
                  {showOptional && (
                    <ul className="flex flex-col divide-y rounded-xl border">
                      {optionalRows.map((row) => (
                        <PieceRow key={row.key} row={row} choice={choices.get(row.key)} onToggle={toggle} onChange={update} />
                      ))}
                    </ul>
                  )}
                </section>
              )}

              <section className="flex flex-col gap-2">
                {extras.map((extra) => (
                  <div key={extra.id} className="flex flex-col gap-2 rounded-xl border p-3">
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={extra.label}
                        onChange={(event) => setExtras((list) => list.map((e) => (e.id === extra.id ? { ...e, label: event.target.value } : e)))}
                        placeholder="Nom de la pièce (ex. attestation d'assurance)"
                        maxLength={200}
                        className="h-9 min-w-0 flex-1 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label="Retirer cette pièce"
                        onClick={() => setExtras((list) => list.filter((e) => e.id !== extra.id))}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                    <NoteInput value={extra.note} onChange={(note) => setExtras((list) => list.map((e) => (e.id === extra.id ? { ...e, note } : e)))} />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setExtras((list) => [...list, { id: crypto.randomUUID(), label: "", note: "" }])}
                  className="flex items-center gap-1.5 self-start rounded-md px-1 py-1 text-[13px] font-semibold text-primary hover:underline"
                >
                  <Plus className="size-4" />
                  Autre pièce
                </button>
              </section>

              {(data.fields.length > 0) && (
                <>
                  <PartTitle
                    title="Informations"
                    hint={
                      missingFields.length > 0
                        ? `${missingFields.length} manquante${missingFields.length > 1 ? "s" : ""}`
                        : "Rien ne manque : vous pouvez en faire corriger ou confirmer une"
                    }
                  />
                  {fieldGroups(missingFields).map(({ group, rows }) => (
                    <section key={`f-${group}`} className="flex flex-col gap-1.5">
                      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{GROUP_TITLES[target][group]}</h3>
                      <ul className="flex flex-col divide-y rounded-xl border">
                        {rows.map((row) => (
                          <FieldRow key={row.key} row={row} choice={fieldChoices.get(row.key)} onToggle={toggleField} onChange={updateField} />
                        ))}
                      </ul>
                    </section>
                  ))}
                  {otherFields.length > 0 && (
                    <section className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowOtherFields((v) => !v)}
                        aria-expanded={showOtherFields}
                        className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <ChevronDown className={cn("size-4 transition-transform", showOtherFields && "rotate-180")} />
                        Autres informations · {otherFields.length}
                      </button>
                      {showOtherFields &&
                        fieldGroups(otherFields).map(({ group, rows }) => (
                          <div key={`o-${group}`} className="flex flex-col gap-1.5 pt-1">
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{GROUP_TITLES[target][group]}</h3>
                            <ul className="flex flex-col divide-y rounded-xl border">
                              {rows.map((row) => (
                                <FieldRow key={row.key} row={row} choice={fieldChoices.get(row.key)} onToggle={toggleField} onChange={updateField} />
                              ))}
                            </ul>
                          </div>
                        ))}
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step === "pick" ? (
            <>
              <Button type="button" variant="ghost" className="h-10" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="button" className="h-10" disabled={!data || !data.email || data.formPending || count === 0} onClick={() => setStep("preview")}>
                {count === 0 ? "Choisissez quoi demander" : `Voir l'e-mail · ${complementCountLabel(newItems)}`}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="ghost" className="h-10 gap-1.5" disabled={sending} onClick={() => setStep("pick")}>
                <ArrowLeft className="size-4" />
                Modifier la demande
              </Button>
              <Button type="button" className="h-10 gap-1.5" disabled={sending || !message.trim()} onClick={send}>
                {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Envoyer la demande
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PieceRow({
  row,
  choice,
  onToggle,
  onChange,
}: {
  row: ComposerRow;
  choice?: Choice;
  onToggle: (row: ComposerRow, on: boolean) => void;
  onChange: (key: string, patch: Partial<Choice>) => void;
}) {
  const received = row.documents.length > 0;
  const lastDoc = row.documents[row.documents.length - 1];
  const status = row.pending
    ? { text: "Déjà demandée", tone: "text-blue-700" }
    : received
      ? { text: `Reçue le ${fmtDay(lastDoc.createdAt)}`, tone: "text-muted-foreground" }
      : row.level === "optional"
        ? { text: "Facultative", tone: "text-muted-foreground" }
        : { text: "Manquante", tone: "font-semibold text-red-700" };
  const id = `piece-${row.key}`;

  return (
    <li className={cn("flex flex-col gap-3 px-3.5 py-3 transition-colors", choice && "bg-blue-50/50", row.pending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          className="mt-0.5 size-[18px]"
          checked={!!choice}
          disabled={row.pending}
          onCheckedChange={(on) => onToggle(row, on === true)}
        />
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
          <span className="text-[14px] font-semibold leading-snug">{row.label}</span>
          <span className={cn("text-[12.5px]", status.tone)}>{status.text}</span>
        </label>
      </div>

      {choice && (
        <div className="flex flex-col gap-2.5 pl-[30px]">
          {received && (
            <div role="radiogroup" aria-label="Motif" className="flex flex-wrap gap-1.5">
              {REDO_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  role="radio"
                  aria-checked={choice.reason === reason}
                  onClick={() => onChange(row.key, { reason })}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                    choice.reason === reason
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-border bg-background text-foreground/80 hover:border-foreground/30",
                  )}
                >
                  {REASON_LABELS[reason]}
                </button>
              ))}
            </div>
          )}
          <NoteInput value={choice.note} onChange={(note) => onChange(row.key, { note })} />
          {received && (
            <p className="text-[12px] text-muted-foreground">
              Le fichier actuel restera dans le dossier jusqu&apos;à ce que vous acceptiez le nouveau.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/** Titre d'une partie de la fenêtre (« Pièces », « Informations »). */
function PartTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="-mb-2 flex items-baseline justify-between gap-3 border-b pb-1.5 first:mt-0">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {hint && <span className="text-right text-[12.5px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Information qu'on peut demander : manquante (avec ce qui manque) ou à faire corriger / confirmer. */
function FieldRow({
  row,
  choice,
  onToggle,
  onChange,
}: {
  row: ComposerFieldRow;
  choice?: Choice;
  onToggle: (row: ComposerFieldRow, on: boolean) => void;
  onChange: (key: string, patch: Partial<Choice>) => void;
}) {
  const missing = row.missing.length > 0;
  const id = `field-${row.key}`;
  return (
    <li className={cn("flex flex-col gap-3 px-3.5 py-3 transition-colors", choice && "bg-blue-50/50", row.pending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Checkbox id={id} className="mt-0.5 size-[18px]" checked={!!choice} disabled={row.pending} onCheckedChange={(on) => onToggle(row, on === true)} />
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
          <span className="text-[14px] font-semibold leading-snug">{row.label}</span>
          {row.pending ? (
            <span className="text-[12.5px] text-blue-700">Déjà demandée</span>
          ) : missing ? (
            <span className="text-[12.5px] font-semibold text-red-700">{row.missing.join(" · ")}</span>
          ) : (
            <span className="line-clamp-2 text-[12.5px] text-muted-foreground">{row.current || "Renseignée"}</span>
          )}
        </label>
      </div>
      {choice && (
        <div className="flex flex-col gap-2.5 pl-[30px]">
          {!missing && (
            <div role="radiogroup" aria-label="Motif" className="flex flex-wrap gap-1.5">
              {FIELD_REDO_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  role="radio"
                  aria-checked={choice.reason === reason}
                  onClick={() => onChange(row.key, { reason })}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                    choice.reason === reason ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-foreground/80 hover:border-foreground/30",
                  )}
                >
                  {REASON_LABELS[reason]}
                </button>
              ))}
            </div>
          )}
          <NoteInput
            value={choice.note}
            onChange={(note) => onChange(row.key, { note })}
            placeholder={missing ? "Précision pour le client (facultatif)" : "Ce qui ne va pas, pour le client (facultatif)"}
          />
          {!missing && <p className="text-[12px] text-muted-foreground">Le client verra la valeur actuelle, déjà remplie, et pourra la modifier.</p>}
        </div>
      )}
    </li>
  );
}

function NoteInput({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={COMPLEMENT_NOTE_MAX}
      rows={1}
      placeholder={placeholder ?? "Précision pour le client (facultatif) — ex. recto et verso"}
      className="min-h-9 w-full resize-y rounded-md border bg-background px-3 py-2 text-[13px] leading-snug outline-none placeholder:text-muted-foreground/80 focus-visible:ring-2 focus-visible:ring-ring/40"
    />
  );
}
