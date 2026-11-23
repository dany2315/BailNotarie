"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, Loader2, Plus, Search, Send, X } from "lucide-react";
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
import { questionsForDataFields, type QuestionScope } from "@/lib/rules/complement-questions";
import { fieldComplementKey } from "@/lib/utils/complement";
import { cn } from "@/lib/utils";

type Target = "OWNER" | "TENANT";

/** Lignes cochées à l'ouverture (on vient d'une ligne de la fiche : une pièce, ou des informations). */
export interface ComplementPreselect {
  key?: string;
  keys?: string[];
  /** Réclamation préparée dans le contrôle guidé : chaque ligne avec son motif et sa précision. */
  items?: Array<{ key: string; reason: ComplementReasonValue; note?: string }>;
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

/**
 * « Demander » sur une ligne de la fiche où il manque des données : la fenêtre s'ouvre avec les
 * informations correspondantes déjà cochées. Rien n'est affiché si ces données ne se demandent pas.
 */
export function AskFieldsButton({
  bailId,
  target,
  scope,
  targetId,
  fields,
  commercial,
  primaryPerson,
}: {
  bailId: string;
  target: Target;
  scope: QuestionScope;
  /** Id de la personne, de la société, du bien ou du bail. */
  targetId: string;
  /** Champs manquants, sous leur nom en base. */
  fields: string[];
  commercial?: boolean;
  primaryPerson?: boolean;
}) {
  const questions = questionsForDataFields(scope, fields, { commercial, primaryPerson });
  if (questions.length === 0) return null;
  const ids =
    scope === "person"
      ? { personId: targetId }
      : scope === "entreprise"
        ? { entrepriseId: targetId }
        : scope === "property"
          ? { propertyId: targetId }
          : { bailId: targetId };
  return (
    <ComplementRequestButton
      bailId={bailId}
      target={target}
      preselect={{ keys: questions.map((id) => fieldComplementKey(id, ids)) }}
      label="Demander"
    />
  );
}

export function ComplementComposer({
  bailId,
  target: initialTarget,
  alsoTarget,
  preselect,
  open,
  onOpenChange,
  onSent,
}: {
  bailId: string;
  target: Target;
  alsoTarget?: Target;
  preselect?: ComplementPreselect;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Après l'envoi : clés des lignes envoyées (pour vider la réclamation préparée). */
  onSent?: (keys: string[]) => void;
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
  const [query, setQuery] = React.useState("");
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
      const keys = new Set(target === initialTarget && preselect ? [preselect.key, ...(preselect.keys ?? [])].filter(Boolean) : []);
      const row = result.data.rows.find((r) => keys.has(r.key) && !r.pending);
      if (row) {
        setChoices(new Map([[row.key, { reason: row.documents.length > 0 ? "ILLEGIBLE" : "MISSING", note: "" }]]));
        if (row.level === "optional") setShowOptional(true);
        if (row.documents.length > 0) setShowOtherFields(true);
      }
      const fields = result.data.fields.filter((r) => keys.has(r.key) && !r.pending);
      if (fields.length > 0) {
        setFieldChoices(new Map(fields.map((field) => [field.key, { reason: field.missing.length > 0 ? "MISSING" : "WRONG_VALUE", note: "" }])));
        if (fields.some((field) => field.missing.length === 0)) setShowOtherFields(true);
      }
      // Réclamation préparée : toutes ses lignes cochées, avec le motif et la précision choisis.
      const prepared = target === initialTarget ? (preselect?.items ?? []) : [];
      if (prepared.length > 0) {
        const byKey = new Map(prepared.map((item) => [item.key, item]));
        const docRows = result.data.rows.filter((r) => byKey.has(r.key) && !r.pending);
        const fieldRows = result.data.fields.filter((r) => byKey.has(r.key) && !r.pending);
        // Motif cohérent avec la ligne : une pièce absente est « manquante », une information vide aussi.
        const docReason = (row: ComposerRow, wanted: ComplementReasonValue): ComplementReasonValue =>
          row.documents.length === 0 ? "MISSING" : REDO_REASONS.includes(wanted) ? wanted : "ILLEGIBLE";
        const fieldReason = (row: ComposerFieldRow, wanted: ComplementReasonValue): ComplementReasonValue =>
          row.missing.length > 0 ? "MISSING" : FIELD_REDO_REASONS.includes(wanted) ? wanted : "WRONG_VALUE";
        setChoices(new Map(docRows.map((row) => [row.key, { reason: docReason(row, byKey.get(row.key)!.reason), note: byKey.get(row.key)!.note ?? "" }])));
        setFieldChoices(
          new Map(fieldRows.map((row) => [row.key, { reason: fieldReason(row, byKey.get(row.key)!.reason), note: byKey.get(row.key)!.note ?? "" }])),
        );
        if (docRows.some((row) => row.level === "optional")) setShowOptional(true);
        if (fieldRows.some((row) => row.missing.length === 0) || docRows.some((row) => row.documents.length > 0)) setShowOtherFields(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [bailId, target, initialTarget, preselect?.key, preselect?.keys?.join("|"), preselect?.items?.map((i) => `${i.key}:${i.reason}:${i.note ?? ""}`).join("|")]);

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
    onSent?.([...selectedRows.map((row) => row.key), ...selectedFields.map((row) => row.key)]);
    onOpenChange(false);
    router.refresh();
  };

  // Rangement par intention : ce qui manque, puis ce qu'on fait refaire ou corriger, puis le reste.
  const q = query.trim().toLowerCase();
  const match = (label: string) => !q || label.toLowerCase().includes(q);
  const ORDER = { party: 0, property: 1, bail: 2 } as const;
  const byGroup = <T extends { group: ComposerRow["group"] }>(a: T, b: T) => ORDER[a.group] - ORDER[b.group];
  const mainRows = (data?.rows ?? []).filter((row) => row.level !== "optional" || row.documents.length > 0);
  const missingPieces = mainRows.filter((row) => row.documents.length === 0 && match(row.label)).sort(byGroup);
  const receivedPieces = mainRows.filter((row) => row.documents.length > 0 && match(row.label)).sort(byGroup);
  const optionalRows = (data?.rows ?? []).filter((row) => row.level === "optional" && row.documents.length === 0 && match(row.label));
  const missingFields = (data?.fields ?? []).filter((row) => row.missing.length > 0 && match(row.label)).sort(byGroup);
  const otherFields = (data?.fields ?? []).filter((row) => row.missing.length === 0 && match(row.label)).sort(byGroup);
  const missingCount = missingPieces.length + missingFields.length;
  const fixCount = receivedPieces.length + otherFields.length;
  const who = target === "OWNER" ? "au propriétaire" : "au locataire";
  const pieceRow = (row: ComposerRow) => (
    <ChoiceRow
      key={row.key}
      id={`piece-${row.key}`}
      label={row.label}
      where={GROUP_TITLES[target][row.group]}
      kind="Pièce"
      status={
        row.pending
          ? { text: "Déjà demandée", tone: "text-blue-700" }
          : row.documents.length > 0
            ? { text: `Reçue le ${fmtDay(row.documents[row.documents.length - 1].createdAt)}`, tone: "text-muted-foreground" }
            : row.level === "optional"
              ? { text: "Facultative", tone: "text-muted-foreground" }
              : { text: "Manquante", tone: "font-semibold text-red-700" }
      }
      pending={row.pending}
      choice={choices.get(row.key)}
      reasons={row.documents.length > 0 ? REDO_REASONS : null}
      onToggle={(on) => toggle(row, on)}
      onChange={(patch) => update(row.key, patch)}
      footnote={row.documents.length > 0 ? "Le fichier actuel reste dans le dossier jusqu'à ce que vous acceptiez le nouveau." : undefined}
    />
  );
  const fieldRow = (row: ComposerFieldRow) => (
    <ChoiceRow
      key={row.key}
      id={`field-${row.key}`}
      label={row.label}
      where={GROUP_TITLES[target][row.group]}
      kind="Information"
      status={
        row.pending
          ? { text: "Déjà demandée", tone: "text-blue-700" }
          : row.missing.length > 0
            ? { text: row.missing.join(" · "), tone: "font-semibold text-red-700" }
            : { text: row.current || "Renseignée", tone: "text-muted-foreground" }
      }
      pending={row.pending}
      choice={fieldChoices.get(row.key)}
      reasons={row.missing.length > 0 ? null : FIELD_REDO_REASONS}
      notePlaceholder={row.missing.length > 0 ? "Précision pour le client (facultatif)" : "Ce qui ne va pas, pour le client (facultatif)"}
      onToggle={(on) => toggleField(row, on)}
      onChange={(patch) => updateField(row.key, patch)}
      footnote={row.missing.length > 0 ? undefined : "Le client verra la valeur actuelle, déjà remplie, et pourra la modifier."}
    />
  );
  // Récapitulatif de la demande, en bas de la fenêtre : on voit ce qui part, on peut retirer une ligne.
  const summaryChips = [
    ...selectedRows.map((row) => ({ key: row.key, label: row.label, remove: () => toggle(row, false) })),
    ...validExtras.map((extra) => ({ key: extra.id, label: extra.label.trim(), remove: () => setExtras((list) => list.filter((e) => e.id !== extra.id)) })),
    ...selectedFields.map((row) => ({ key: row.key, label: row.label, remove: () => toggleField(row, false) })),
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => !sending && onOpenChange(next)}>
      <DialogContent className="flex max-h-[min(92dvh,860px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[600px]">
        <DialogHeader className="border-b px-5 pb-4 pt-5 text-left sm:px-6">
          <DialogTitle className="text-[17px]">{step === "pick" ? `Demander ${who}` : "Aperçu de l'e-mail"}</DialogTitle>
          <DialogDescription className="truncate">
            {data ? `${data.name}${data.email ? ` · ${data.email}` : ""}` : error ? "" : "Chargement du dossier…"}
          </DialogDescription>
          <ol aria-label="Étapes" className="mt-2 flex items-center gap-2 text-[12.5px] font-semibold">
            <li className={cn("flex items-center gap-1.5", step === "pick" ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px]", step === "pick" ? "bg-primary text-primary-foreground" : "bg-muted")}>1</span>
              Choisir quoi demander
            </li>
            <li aria-hidden className="h-px w-6 bg-border" />
            <li className={cn("flex items-center gap-1.5", step === "preview" ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex size-5 items-center justify-center rounded-full text-[11px]", step === "preview" ? "bg-primary text-primary-foreground" : "bg-muted")}>2</span>
              Relire l&apos;e-mail et envoyer
            </li>
          </ol>
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

              <label className="relative block">
                <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <span className="sr-only">Rechercher</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher une pièce ou une information"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>

              {/* 1. Ce qui manque */}
              <section className="flex flex-col gap-2">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[15px] font-semibold">Ce qui manque</h2>
                  <span className={cn("text-[12.5px]", missingCount > 0 ? "font-semibold text-red-700" : "text-muted-foreground")}>
                    {missingCount > 0 ? `${missingCount} élément${missingCount > 1 ? "s" : ""}` : q ? "Aucun résultat" : "Rien ne manque"}
                  </span>
                </div>
                {missingCount > 0 && (
                  <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
                    {missingPieces.map(pieceRow)}
                    {missingFields.map(fieldRow)}
                  </ul>
                )}
              </section>

              {/* 2. À faire refaire ou corriger */}
              {fixCount > 0 && (
                <section className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setShowOtherFields((v) => !v)}
                    aria-expanded={showOtherFields || !!q}
                    className="flex items-baseline justify-between gap-3 text-left"
                  >
                    <span className="flex flex-col">
                      <span className="text-[15px] font-semibold">À faire refaire ou corriger</span>
                      <span className="text-[12.5px] text-muted-foreground">Une pièce reçue illisible, une information fausse…</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-primary">
                      {fixCount} élément{fixCount > 1 ? "s" : ""}
                      <ChevronDown className={cn("size-4 transition-transform", (showOtherFields || q) && "rotate-180")} />
                    </span>
                  </button>
                  {(showOtherFields || !!q) && (
                    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
                      {receivedPieces.map(pieceRow)}
                      {otherFields.map(fieldRow)}
                    </ul>
                  )}
                </section>
              )}

              {/* 3. Autre chose */}
              <section className="flex flex-col gap-2">
                <h2 className="text-[15px] font-semibold">Autre chose</h2>
                {optionalRows.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowOptional((v) => !v)}
                      aria-expanded={showOptional || !!q}
                      className="flex items-center gap-1.5 self-start text-[13px] font-semibold text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn("size-4 transition-transform", (showOptional || q) && "rotate-180")} />
                      Pièces facultatives · {optionalRows.length}
                    </button>
                    {(showOptional || !!q) && <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">{optionalRows.map(pieceRow)}</ul>}
                  </div>
                )}
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
                  Une pièce qui n&apos;est pas dans la liste
                </button>
              </section>
            </div>
          )}
        </div>

        {step === "pick" && summaryChips.length > 0 && (
          <div className="flex flex-col gap-1.5 border-t bg-blue-50/60 px-5 py-2.5 sm:px-6">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-blue-900">
              Votre demande · {complementCountLabel(newItems)}
            </span>
            <div className="flex max-h-[76px] flex-wrap gap-1.5 overflow-y-auto">
              {summaryChips.map((chip) => (
                <span key={chip.key} className="inline-flex max-w-full items-center gap-1 rounded-full bg-white py-0.5 pl-2.5 pr-1 text-[12.5px] font-medium ring-1 ring-blue-200">
                  <span className="truncate">{chip.label}</span>
                  <button type="button" aria-label={`Retirer ${chip.label}`} onClick={chip.remove} className="rounded-full p-0.5 text-muted-foreground hover:bg-muted">
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t bg-muted/30 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          {step === "pick" ? (
            <>
              <Button type="button" variant="ghost" className="h-10" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="button" className="h-10" disabled={!data || !data.email || data.formPending || count === 0} onClick={() => setStep("preview")}>
                {count === 0 ? "Cochez ce que vous voulez demander" : `Relire l'e-mail · ${complementCountLabel(newItems)}`}
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

/** Une ligne à cocher : pièce ou information. Cochée, elle montre le motif (en un clic) et la précision. */
function ChoiceRow({
  id,
  label,
  where,
  kind,
  status,
  pending,
  choice,
  reasons,
  notePlaceholder,
  footnote,
  onToggle,
  onChange,
}: {
  id: string;
  label: string;
  /** « Le propriétaire », « Le bien », « Le bail ». */
  where: string;
  kind: "Pièce" | "Information";
  status: { text: string; tone: string };
  pending: boolean;
  choice?: Choice;
  /** Motifs proposés (pièce reçue, information remplie) ; aucun pour ce qui manque. */
  reasons: readonly ComplementReasonValue[] | null;
  notePlaceholder?: string;
  footnote?: string;
  onToggle: (on: boolean) => void;
  onChange: (patch: Partial<Choice>) => void;
}) {
  const [withNote, setWithNote] = React.useState(false);
  const noteOpen = withNote || !!choice?.note;
  return (
    <li className={cn("flex flex-col gap-2.5 px-3.5 py-3 transition-colors", choice && "bg-blue-50/60", pending && "opacity-60")}>
      <div className="flex items-start gap-3">
        <Checkbox id={id} className="mt-0.5 size-[18px]" checked={!!choice} disabled={pending} onCheckedChange={(on) => onToggle(on === true)} />
        <label htmlFor={id} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5">
          <span className="text-[14px] font-semibold leading-snug">{label}</span>
          <span className="text-[12px] text-muted-foreground">
            {kind} · {where}
          </span>
        </label>
        <span className={cn("max-w-[45%] shrink-0 truncate pt-0.5 text-right text-[12.5px]", status.tone)} title={status.text}>
          {status.text}
        </span>
      </div>

      {choice && (
        <div className="flex flex-col gap-2 pl-[30px]">
          {reasons && (
            <div role="radiogroup" aria-label="Ce qui ne va pas" className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  role="radio"
                  aria-checked={choice.reason === reason}
                  onClick={() => onChange({ reason })}
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
          {noteOpen ? (
            <NoteInput value={choice.note} onChange={(note) => onChange({ note })} placeholder={notePlaceholder} />
          ) : (
            <button type="button" onClick={() => setWithNote(true)} className="flex w-fit items-center gap-1 text-[12.5px] font-semibold text-primary hover:underline">
              <Plus className="size-3.5" />
              Ajouter une précision pour le client
            </button>
          )}
          {footnote && <p className="text-[12px] text-muted-foreground">{footnote}</p>}
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
