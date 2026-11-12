"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { updateCommercialTermsAdmin } from "@/lib/actions/admin-bail-edit";
import {
  CHARGE_ITEMS,
  CLAUSE_OPTIONS,
  DEROGATORY_MAX_MONTHS,
  EMPTY_WORK_LINE,
  FEES_PAID_BY_LABELS,
  INDEXATION_LABELS,
  OWNER_ONLY_CHARGES,
  PAYER_LABELS,
  RENT_PERIODICITY_LABELS,
  type CommercialFormValues,
  type WorkLine,
} from "@/lib/utils/commercial-terms";
import { cn } from "@/lib/utils";

/**
 * « Conditions commerciales » de la fiche dossier : chaque ligne se corrige sur place (crayon à droite),
 * avec les mêmes règles et la même conversion que le formulaire propriétaire. Après l'enregistrement,
 * les conséquences sur le reste du dossier sont affichées (date de fin, règles à revalider, dépôt, pièces).
 */

const YES_NO: Record<string, string> = { yes: "Oui", no: "Non" };
type Field = keyof CommercialFormValues;

function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-9 w-full sm:w-64">
        <SelectValue placeholder="Non renseigné" />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(options).map(([key, optionLabel]) => (
          <SelectItem key={key} value={key}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Works({ lines, onChange }: { lines: WorkLine[]; onChange: (lines: WorkLine[]) => void }) {
  const update = (index: number, patch: Partial<WorkLine>) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_6rem_4.5rem_auto] items-center gap-2">
          <Input
            aria-label="Nature des travaux"
            placeholder="Nature des travaux"
            className="h-9"
            value={line.label}
            onChange={(e) => update(index, { label: e.target.value })}
          />
          <Input
            aria-label="Montant en euros"
            placeholder="Montant €"
            inputMode="numeric"
            className="h-9"
            value={line.amount}
            onChange={(e) => update(index, { amount: e.target.value.replace(/[^\d]/g, "") })}
          />
          <Input
            aria-label="Année"
            placeholder="Année"
            inputMode="numeric"
            className="h-9"
            value={line.year}
            maxLength={4}
            onChange={(e) => update(index, { year: e.target.value.replace(/[^\d]/g, "") })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Retirer la ligne"
            onClick={() => onChange(lines.filter((_, i) => i !== index))}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" onClick={() => onChange([...lines, { ...EMPTY_WORK_LINE }])}>
        <Plus className="size-3.5" />
        Ajouter des travaux
      </Button>
    </div>
  );
}

const euros = (value: string | number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value));
const frDate = (iso: string) =>
  iso
    ? new Date(`${iso}T00:00:00Z`).toLocaleDateString("fr-FR", {
        timeZone: "UTC",
      })
    : "";
const worksText = (lines: WorkLine[]) =>
  lines
    .map((line) => [line.label, line.year ? `(${line.year})` : null, line.amount ? euros(line.amount) : null].filter(Boolean).join(" "))
    .join(" ; ");

type Editor = (props: {
  draft: CommercialFormValues;
  set: <K extends Field>(key: K, value: CommercialFormValues[K]) => void;
  id: string;
}) => React.ReactNode;

interface RowDef {
  key: string;
  label: string;
  /** Réponses enregistrées par la ligne. */
  fields: Field[];
  display: (v: CommercialFormValues) => string;
  editor: Editor;
}

const textEditor = (field: Field, rows = 2): Editor =>
  function TextEditor({ draft, set, id }) {
    return <Textarea id={id} rows={rows} value={draft[field] as string} onChange={(e) => set(field, e.target.value as never)} autoFocus />;
  };

const yesNoText = (value: string) => YES_NO[value] ?? "";

function rowsFor(context: { derogatory: boolean; asksMarriage: boolean; values: CommercialFormValues }): RowDef[] {
  const rows: RowDef[] = [
    {
      key: "activity",
      label: "Activité autorisée",
      fields: ["activity"],
      display: (v) => v.activity,
      editor: textEditor("activity"),
    },
    {
      key: "ancillary",
      label: "Activités annexes ou restrictions",
      fields: ["ancillaryActivities"],
      display: (v) => v.ancillaryActivities,
      editor: textEditor("ancillaryActivities"),
    },
    {
      key: "previous",
      label: "Location précédente",
      fields: ["previouslyLet", "previousActivity", "currentlyVacant"],
      display: (v) =>
        v.previouslyLet === "no"
          ? "Première location"
          : v.previouslyLet === "yes"
            ? [
                v.previousActivity || "Déjà loué",
                v.currentlyVacant === "yes" ? "local libre" : v.currentlyVacant === "no" ? "local encore occupé" : null,
              ]
                .filter(Boolean)
                .join(" · ")
            : "",
      editor: ({ draft, set }) => (
        <div className="flex flex-col gap-2">
          <Choice
            label="Local déjà loué"
            value={draft.previouslyLet}
            options={{ yes: "Déjà loué", no: "Première location" }}
            onChange={(v) => set("previouslyLet", v as never)}
          />
          {draft.previouslyLet === "yes" && (
            <>
              <Input
                aria-label="Activité du locataire précédent"
                placeholder="Activité du locataire précédent"
                className="h-9"
                value={draft.previousActivity}
                onChange={(e) => set("previousActivity", e.target.value)}
              />
              <Choice
                label="Local libre aujourd'hui"
                value={draft.currentlyVacant}
                options={{ yes: "Local libre", no: "Local encore occupé" }}
                onChange={(v) => set("currentlyVacant", v as never)}
              />
            </>
          )}
        </div>
      ),
    },
  ];
  if (context.derogatory) {
    rows.push({
      key: "derogatory",
      label: "Durée du bail dérogatoire",
      fields: ["derogatoryMonths"],
      display: (v) => (v.derogatoryMonths ? `${v.derogatoryMonths} mois` : ""),
      editor: ({ draft, set, id }) => (
        <div className="flex items-center gap-2">
          <Input
            id={id}
            inputMode="numeric"
            className="h-9 w-24"
            value={draft.derogatoryMonths}
            onChange={(e) => set("derogatoryMonths", e.target.value.replace(/[^\d]/g, ""))}
            autoFocus
          />
          <span className="text-sm text-muted-foreground">mois ({DEROGATORY_MAX_MONTHS} au plus)</span>
        </div>
      ),
    });
  }
  rows.push(
    {
      key: "keys",
      label: "Remise des clés",
      fields: ["keysHandoverDate"],
      display: (v) => frDate(v.keysHandoverDate),
      editor: ({ draft, set, id }) => (
        <Input id={id} type="date" className="h-9 w-48" value={draft.keysHandoverDate} onChange={(e) => set("keysHandoverDate", e.target.value)} />
      ),
    },
    {
      key: "rentFree",
      label: "Franchise de loyer",
      fields: ["rentFree", "rentFreeMonths"],
      display: (v) => (v.rentFree === "yes" ? `${v.rentFreeMonths} mois` : v.rentFree === "no" ? "Aucune" : ""),
      editor: ({ draft, set }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Choice
            label="Franchise de loyer"
            value={draft.rentFree}
            options={{ yes: "Oui", no: "Aucune" }}
            onChange={(v) => set("rentFree", v as never)}
          />
          {draft.rentFree === "yes" && (
            <span className="inline-flex items-center gap-2">
              <Input
                aria-label="Mois sans loyer"
                inputMode="numeric"
                className="h-9 w-20"
                value={draft.rentFreeMonths}
                onChange={(e) => set("rentFreeMonths", e.target.value.replace(/[^\d]/g, ""))}
              />
              <span className="text-sm text-muted-foreground">mois</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "periodicity",
      label: "Paiement du loyer",
      fields: ["rentPeriodicity"],
      display: (v) => (v.rentPeriodicity ? RENT_PERIODICITY_LABELS[v.rentPeriodicity] : ""),
      editor: ({ draft, set }) => (
        <Choice
          label="Paiement du loyer"
          value={draft.rentPeriodicity}
          options={RENT_PERIODICITY_LABELS}
          onChange={(v) => set("rentPeriodicity", v as never)}
        />
      ),
    },
    {
      key: "vat",
      label: "TVA sur le loyer",
      fields: ["vat"],
      display: (v) => yesNoText(v.vat),
      editor: ({ draft, set }) => <Choice label="TVA sur le loyer" value={draft.vat} options={YES_NO} onChange={(v) => set("vat", v as never)} />,
    },
    {
      key: "indexation",
      label: "Révision du loyer",
      fields: ["indexation"],
      display: (v) => (v.indexation ? INDEXATION_LABELS[v.indexation] : ""),
      editor: ({ draft, set }) => (
        <Choice label="Révision du loyer" value={draft.indexation} options={INDEXATION_LABELS} onChange={(v) => set("indexation", v as never)} />
      ),
    },
    {
      key: "entryFee",
      label: "Pas-de-porte",
      fields: ["entryFee", "entryFeeAmount"],
      display: (v) => (v.entryFee === "yes" && v.entryFeeAmount ? euros(v.entryFeeAmount) : v.entryFee === "no" ? "Aucun" : ""),
      editor: ({ draft, set }) => (
        <div className="flex flex-wrap items-center gap-2">
          <Choice label="Pas-de-porte" value={draft.entryFee} options={{ yes: "Oui", no: "Aucun" }} onChange={(v) => set("entryFee", v as never)} />
          {draft.entryFee === "yes" && (
            <span className="inline-flex items-center gap-2">
              <Input
                aria-label="Montant du pas-de-porte"
                inputMode="numeric"
                className="h-9 w-32"
                value={draft.entryFeeAmount}
                onChange={(e) => set("entryFeeAmount", e.target.value.replace(/[^\d]/g, ""))}
              />
              <span className="text-sm text-muted-foreground">€</span>
            </span>
          )}
        </div>
      ),
    },
    {
      key: "fees",
      label: "Frais d'acte payés par",
      fields: ["feesPaidBy"],
      display: (v) => (v.feesPaidBy ? FEES_PAID_BY_LABELS[v.feesPaidBy] : ""),
      editor: ({ draft, set }) => (
        <Choice
          label="Frais d'acte payés par"
          value={draft.feesPaidBy}
          options={FEES_PAID_BY_LABELS}
          onChange={(v) => set("feesPaidBy", v as never)}
        />
      ),
    },
    {
      key: "charges",
      label: "Charges, impôts et taxes",
      fields: ["charges"],
      display: (v) => {
        const of = (payer: string) => CHARGE_ITEMS.filter((item) => (v.charges[item.key] ?? item.defaultPayer) === payer).map((item) => item.label);
        const owner = [...of("OWNER"), ...OWNER_ONLY_CHARGES.map((item) => item.label)];
        return `Locataire : ${of("TENANT").join(", ") || "aucune"}\nPropriétaire : ${owner.join(", ")}`;
      },
      editor: ({ draft, set }) => (
        <div className="grid gap-2">
          {CHARGE_ITEMS.map((item) => (
            <div key={item.key} className="grid items-center gap-1 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-3">
              <span className="text-sm">{item.label}</span>
              <Select
                value={draft.charges[item.key] ?? item.defaultPayer}
                onValueChange={(v) =>
                  set("charges", {
                    ...draft.charges,
                    [item.key]: v as "OWNER" | "TENANT",
                  })
                }
              >
                <SelectTrigger aria-label={item.label} className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYER_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <span className="text-xs text-muted-foreground">
            Toujours au propriétaire : {OWNER_ONLY_CHARGES.map((item) => item.label.toLowerCase()).join(", ")}.
          </span>
        </div>
      ),
    },
    {
      key: "pastWorks",
      label: "Travaux des 3 dernières années",
      fields: ["hasPastWorks", "pastWorks"],
      display: (v) => (v.hasPastWorks === "yes" ? worksText(v.pastWorks) : v.hasPastWorks === "no" ? "Aucun" : ""),
      editor: ({ draft, set }) => (
        <div className="flex flex-col gap-2">
          <Choice
            label="Travaux des 3 dernières années"
            value={draft.hasPastWorks}
            options={{ yes: "Oui", no: "Aucun" }}
            onChange={(v) => set("hasPastWorks", v as never)}
          />
          {draft.hasPastWorks === "yes" && <Works lines={draft.pastWorks} onChange={(lines) => set("pastWorks", lines)} />}
        </div>
      ),
    },
    {
      key: "plannedWorks",
      label: "Travaux prévus dans les 3 ans",
      fields: ["hasPlannedWorks", "plannedWorks"],
      display: (v) => (v.hasPlannedWorks === "yes" ? worksText(v.plannedWorks) : v.hasPlannedWorks === "no" ? "Aucun" : ""),
      editor: ({ draft, set }) => (
        <div className="flex flex-col gap-2">
          <Choice
            label="Travaux prévus dans les 3 ans"
            value={draft.hasPlannedWorks}
            options={{ yes: "Oui", no: "Aucun" }}
            onChange={(v) => set("hasPlannedWorks", v as never)}
          />
          {draft.hasPlannedWorks === "yes" && <Works lines={draft.plannedWorks} onChange={(lines) => set("plannedWorks", lines)} />}
        </div>
      ),
    },
    {
      key: "guarantor",
      label: "Garant",
      fields: ["hasGuarantor", "guarantorName", "guarantorEmail"],
      display: (v) =>
        v.hasGuarantor === "yes" ? [v.guarantorName, v.guarantorEmail].filter(Boolean).join(" · ") : v.hasGuarantor === "no" ? "Aucun" : "",
      editor: ({ draft, set }) => (
        <div className="flex flex-col gap-2">
          <Choice label="Garant" value={draft.hasGuarantor} options={{ yes: "Oui", no: "Aucun" }} onChange={(v) => set("hasGuarantor", v as never)} />
          {draft.hasGuarantor === "yes" && (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Nom du garant"
                placeholder="Nom du garant"
                className="h-9"
                value={draft.guarantorName}
                onChange={(e) => set("guarantorName", e.target.value)}
              />
              <Input
                aria-label="E-mail du garant"
                type="email"
                placeholder="E-mail du garant"
                className="h-9"
                value={draft.guarantorEmail}
                onChange={(e) => set("guarantorEmail", e.target.value)}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "clauses",
      label: "Clauses particulières",
      fields: ["clauses", "clausesNote"],
      display: (v) =>
        [
          CLAUSE_OPTIONS.filter((c) => v.clauses.includes(c.key))
            .map((c) => c.label)
            .join(", "),
          v.clausesNote,
        ]
          .filter(Boolean)
          .join(" — "),
      editor: ({ draft, set }) => (
        <div className="flex flex-col gap-2">
          {CLAUSE_OPTIONS.map((clause) => (
            <label key={clause.key} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.clauses.includes(clause.key)}
                onCheckedChange={(checked) =>
                  set("clauses", checked ? [...draft.clauses, clause.key] : draft.clauses.filter((key) => key !== clause.key))
                }
              />
              {clause.label}
            </label>
          ))}
          <Textarea
            aria-label="Précisions sur les clauses"
            placeholder="Précisions"
            rows={2}
            value={draft.clausesNote}
            onChange={(e) => set("clausesNote", e.target.value)}
          />
        </div>
      ),
    },
  );
  if (context.asksMarriage || context.values.boughtDuringMarriage) {
    rows.push({
      key: "marriage",
      label: "Local acheté pendant le mariage",
      fields: ["boughtDuringMarriage"],
      display: (v) => (v.boughtDuringMarriage === "yes" ? "Oui (le conjoint signe aussi)" : v.boughtDuringMarriage === "no" ? "Non" : ""),
      editor: ({ draft, set }) => (
        <Choice
          label="Local acheté pendant le mariage"
          value={draft.boughtDuringMarriage}
          options={{ yes: "Oui (le conjoint signe aussi)", no: "Non" }}
          onChange={(v) => set("boughtDuringMarriage", v as never)}
        />
      ),
    });
  }
  return rows;
}

/** Identifiant d'ancre d'une ligne (« Modifier » depuis la Conformité légale). */
export const termsRowAnchor = (row: string) => `condition-${row}`;

/** Lien « Modifier » d'une règle de la Conformité légale : amène à la ligne concernée et l'ouvre. */
export function EditTermsLink({ row }: { row: string }) {
  return (
    <Button asChild type="button" variant="outline" size="sm" className="h-9 gap-1.5">
      <a href={`#${termsRowAnchor(row)}`}>
        <Pencil className="size-3.5" />
        Modifier
      </a>
    </Button>
  );
}

export function CommercialTermsInline({
  bailId,
  values,
  derogatory,
  asksMarriage,
  annualRent,
  locked,
}: {
  bailId: string;
  /** Réponses actuelles, au format du formulaire (commercialTermsToForm). */
  values: CommercialFormValues;
  derogatory: boolean;
  /** Propriétaire marié en communauté : la question « acheté pendant le mariage » s'affiche. */
  asksMarriage: boolean;
  /** Loyer annuel hors taxes (se modifie dans « Le bail »). */
  annualRent: number | null;
  /** Dossier chez le notaire : lecture seule. */
  locked: boolean;
}) {
  const pathname = usePathname();
  const rows = rowsFor({ derogatory, asksMarriage, values });
  const [editing, setEditing] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<CommercialFormValues>(values);
  const [saving, startSaving] = React.useTransition();
  const [errors, setErrors] = React.useState<string[]>([]);
  const [effects, setEffects] = React.useState<{
    row: string;
    lines: string[];
  } | null>(null);

  const open = React.useCallback(
    (key: string) => {
      setDraft(values);
      setErrors([]);
      setEditing(key);
    },
    [values],
  );

  // « Modifier » depuis la Conformité légale : #condition-<ligne> ouvre la ligne.
  React.useEffect(() => {
    if (locked) return;
    const fromHash = () => {
      const match = window.location.hash.match(/^#condition-([\w-]+)$/);
      if (match && rows.some((row) => row.key === match[1])) open(match[1]);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  const set = <K extends Field>(key: K, value: CommercialFormValues[K]) => setDraft((current) => ({ ...current, [key]: value }));

  // Dans une transition : la ligne affiche la nouvelle valeur dès que la page est revalidée.
  const save = (row: RowDef) =>
    startSaving(async () => {
      const changed = Object.fromEntries(row.fields.map((field) => [field, draft[field]]));
      const result = await updateCommercialTermsAdmin({
        bailId,
        values: changed,
        revalidate: pathname,
      });
      if (!result.success) {
        setErrors(result.error.split("\n"));
        return;
      }
      setEditing(null);
      if (result.data.effects.length > 0) {
        setEffects({ row: row.key, lines: result.data.effects });
        toast.warning(
          `${row.label} enregistré : ${result.data.effects.length} conséquence${result.data.effects.length > 1 ? "s" : ""} sur le dossier`,
        );
      } else {
        setEffects(null);
        toast.success(`${row.label} enregistré`);
      }
    });

  return (
    <dl className="divide-y">
      {rows.map((row, index) => {
        const isEditing = editing === row.key;
        const value = row.display(values);
        return (
          <React.Fragment key={row.key}>
            {/* Loyer annuel : affiché à sa place, modifiable dans « Le bail ». */}
            {annualRent != null && rows[index - 1]?.key === "rentFree" && (
              <div className="grid gap-1 px-5 py-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start sm:gap-4">
                <dt className="text-sm text-muted-foreground">Loyer annuel hors taxes</dt>
                <dd className="text-sm">{euros(annualRent)}</dd>
                <span className="text-xs text-muted-foreground sm:pt-0.5">Se modifie dans « Le bail »</span>
              </div>
            )}
            <div
              id={termsRowAnchor(row.key)}
              className={cn(
                "grid scroll-mt-24 gap-1 px-5 py-3 sm:grid-cols-[minmax(0,14rem)_1fr_auto] sm:items-start sm:gap-4",
                isEditing && "bg-muted/40",
              )}
            >
              <dt className="text-sm text-muted-foreground sm:pt-0.5">{row.label}</dt>
              <dd className="min-w-0 text-sm">
                {isEditing ? (
                  <form
                    className="flex flex-col gap-2.5"
                    onSubmit={(event) => {
                      event.preventDefault();
                      save(row);
                    }}
                  >
                    {row.editor({
                      draft,
                      set,
                      id: `commercial-${bailId}-${row.key}`,
                    })}
                    {errors.length > 0 && (
                      <ul role="alert" className="list-disc space-y-0.5 pl-5 text-[13px] text-destructive">
                        {errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    )}
                    <div className="flex gap-1.5">
                      <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={saving}>
                        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                        Enregistrer
                      </Button>
                      <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5" disabled={saving} onClick={() => setEditing(null)}>
                        <X className="size-3.5" />
                        Annuler
                      </Button>
                    </div>
                  </form>
                ) : (
                  <span className={cn("whitespace-pre-line break-words", !value && "text-muted-foreground")}>{value || "Non renseigné"}</span>
                )}
                {effects?.row === row.key && !isEditing && (
                  <div
                    role="status"
                    className="mt-2 flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900"
                  >
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <AlertTriangle className="size-3.5" />
                      Cette modification a des conséquences sur le dossier
                    </span>
                    <ul className="list-disc space-y-0.5 pl-5">
                      {effects.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="w-fit text-[12.5px] font-medium underline-offset-2 hover:underline"
                      onClick={() => setEffects(null)}
                    >
                      J&apos;ai compris
                    </button>
                  </div>
                )}
              </dd>
              {!locked && !isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 justify-self-start sm:justify-self-end"
                  aria-label={`Modifier : ${row.label}`}
                  title="Modifier cette ligne"
                  disabled={editing !== null && editing !== row.key}
                  onClick={() => open(row.key)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </dl>
  );
}
