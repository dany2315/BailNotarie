"use client";

import * as React from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldInput, type GroupField } from "@/components/admin/inline-field-editor";
import { updatePartyFieldAdmin } from "@/lib/actions/admin-bail";
import { cn } from "@/lib/utils";
import type { CompareSpec } from "@/lib/utils/document-checklist";
import { CompanyRegistryButton } from "@/components/admin/company-registry-button";

export type { CompareSpec };


/**
 * Éléments à comparer avec la pièce, numérotés. « Corriger » ouvre la saisie dans la ligne même
 * (même champ et mêmes règles que la fiche : l'action serveur valide chaque valeur).
 */
export function InlineFields({ spec, locked = false }: { spec: CompareSpec; locked?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted-foreground">À comparer avec la pièce</p>
      <ol className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card">
        {spec.fields.map((field, index) => (
          <InlineFieldRow key={field.field} spec={spec} field={field} index={index} locked={locked} />
        ))}
        {(spec.checks ?? []).map((check, index) => (
          <li key={check.label} className="grid grid-cols-[22px_minmax(0,1fr)] items-center gap-x-3 px-3.5 py-2.5">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[11.5px] font-bold text-primary-foreground">
              {spec.fields.length + index + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[12px] text-muted-foreground">{check.label}</span>
              <span className={cn("break-words text-[15px] font-semibold leading-snug", check.tone === "ok" ? "text-green-800" : "text-amber-800")}>
                {check.tone === "ok" ? "✓ " : "⚠ "}
                {check.value}
              </span>
              {check.auto && <span className="text-[12px] font-medium text-green-700">✓ vérifié par le logiciel</span>}
            </span>
          </li>
        ))}
        {spec.lastCheck && (
          <li className="grid grid-cols-[22px_minmax(0,1fr)] items-center gap-x-3 px-3.5 py-2.5">
            <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[11.5px] font-bold text-primary-foreground">
              {spec.fields.length + (spec.checks?.length ?? 0) + 1}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[12px] text-muted-foreground">Sur la pièce</span>
              <span className="text-[15px] font-semibold leading-snug">{spec.lastCheck}</span>
            </span>
          </li>
        )}
      </ol>
      {spec.registry ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex min-w-0 flex-col">
              <span className="text-[14px] font-semibold">Registre des entreprises</span>
              <span className="text-[12.5px] text-muted-foreground">
                {spec.notes && spec.notes.length > 0 ? "Ce que dit le registre officiel :" : "Pas encore comparée au registre officiel."}
              </span>
            </span>
            {!locked && (
              <CompanyRegistryButton
                entrepriseId={spec.registry.entrepriseId}
                registration={spec.registry.registration}
                representativeName={spec.registry.representativeName}
              />
            )}
          </div>
          {spec.notes && spec.notes.length > 0 && <RegistryNotes notes={spec.notes} />}
        </div>
      ) : (
        spec.notes && spec.notes.length > 0 && <RegistryNotes notes={spec.notes} />
      )}
    </div>
  );
}

function RegistryNotes({ notes }: { notes: string[] }) {
  return (
    <>
      {notes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {notes.map((note) => (
            <span
              key={note}
              className={cn(
                "inline-flex min-h-7 items-center rounded-lg px-2.5 py-1 text-[12.5px] font-semibold leading-tight",
                note.startsWith("Vérifiée") ? "bg-green-50 text-green-800" : note.startsWith("⚠") ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
              )}
            >
              {note.startsWith("Vérifiée") ? `✓ ${note}` : note}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function InlineFieldRow({
  spec,
  field,
  index,
  locked,
}: {
  spec: CompareSpec;
  field: GroupField & { display: string };
  index: number;
  locked: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(field.value ?? "");
  const [saving, setSaving] = React.useState(false);
  const inputId = `inline-${spec.entity}-${spec.id}-${field.field}`;

  React.useEffect(() => {
    if (!editing) setDraft(field.value ?? "");
  }, [field.value, editing]);

  const cancel = () => {
    setDraft(field.value ?? "");
    setEditing(false);
  };
  const save = async () => {
    const value = draft.trim();
    if (value === (field.value ?? "")) return setEditing(false);
    if (!value) {
      toast.error(`${field.label} : la valeur ne peut pas être vide`);
      return;
    }
    setSaving(true);
    const result = await updatePartyFieldAdmin({ entity: spec.entity, id: spec.id, field: field.field, value });
    setSaving(false);
    if (!result.success) {
      toast.error(`${field.label} : ${result.error}`);
      return;
    }
    toast.success(`${field.label} enregistré`);
    setEditing(false);
  };

  return (
    <li
      className={cn("grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 px-3.5 py-2.5", editing && "bg-primary/[0.03]")}
      onKeyDown={(event) => {
        if (editing && event.key === "Escape") {
          event.stopPropagation();
          cancel();
        }
      }}
    >
      <span className="flex size-[22px] items-center justify-center rounded-full bg-primary text-[11.5px] font-bold text-primary-foreground">{index + 1}</span>
      <span className="flex min-w-0 flex-col gap-1">
        <label htmlFor={inputId} className="text-[12px] text-muted-foreground">
          {field.label}
          {field.missing && <span className="ml-1.5 font-semibold text-red-700">manquant</span>}
        </label>
        {editing ? (
          <FieldInput id={inputId} kind={field.kind} value={draft} onChange={setDraft} onEnter={save} />
        ) : (
          <span className={cn("break-words text-[15.5px] font-semibold leading-snug", !field.display && "text-red-700")}>{field.display || "Non renseigné"}</span>
        )}
      </span>
      {locked ? (
        <span />
      ) : editing ? (
        <span className="flex flex-col gap-1 self-end sm:flex-row">
          <Button type="button" size="sm" className="h-8 gap-1 px-2.5" disabled={saving} onClick={save}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" strokeWidth={3} />}
            OK
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2" disabled={saving} onClick={cancel} aria-label="Annuler">
            <X className="size-4" />
          </Button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-semibold text-primary hover:bg-primary/5"
        >
          <Pencil className="size-3.5" />
          {field.display ? "Corriger" : "Saisir"}
        </button>
      )}
    </li>
  );
}
