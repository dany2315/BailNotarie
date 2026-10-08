"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-picker";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { updatePartyFieldAdmin } from "@/lib/actions/admin-bail";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";

export type InlineFieldKind = "text" | "date" | "nationality" | "familyStatus" | "matrimonialRegime" | "phone";

interface InlineFieldEditorProps {
  entity: "person" | "entreprise";
  id: string;
  field: string;
  label: string;
  kind?: InlineFieldKind;
  /** Valeur actuelle (« yyyy-MM-dd » pour une date). */
  value?: string | null;
}

/** Champ de saisie adapté au type de donnée (texte, date, nationalité, listes). */
export function FieldInput({
  id,
  kind = "text",
  value,
  onChange,
  onEnter,
}: {
  id: string;
  kind?: InlineFieldKind;
  value: string;
  onChange: (value: string) => void;
  onEnter?: () => void;
}) {
  const options = kind === "familyStatus" ? FAMILY_STATUS_LABELS : kind === "matrimonialRegime" ? MATRIMONIAL_REGIME_LABELS : null;
  if (kind === "date") {
    return <DateInput id={id} value={value} onChange={onChange} fromYear={new Date().getFullYear() - 120} toYear={new Date().getFullYear()} />;
  }
  if (kind === "nationality") return <NationalitySelect value={value} onValueChange={onChange} />;
  if (kind === "phone") return <PhoneInput id={id} value={value || undefined} onChange={(v) => onChange(v || "")} defaultCountry="FR" />;
  if (options) {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10">
          <SelectValue placeholder="Choisir" />
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
  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

/**
 * Bouton « Saisir » / « Modifier » d'un champ de la fiche : l'administrateur
 * complète la donnée obtenue par téléphone sans quitter le dossier.
 */
export function InlineFieldEditor({ entity, id, field, label, kind = "text", value }: InlineFieldEditorProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(value || "");
  const [saving, setSaving] = React.useState(false);
  const inputId = `inline-${entity}-${id}-${field}`;

  React.useEffect(() => {
    if (open) setDraft(value || "");
  }, [open, value]);

  const save = async () => {
    setSaving(true);
    const result = await updatePartyFieldAdmin({ entity, id, field, value: draft });
    setSaving(false);
    if (result.success) {
      toast.success(`${label} enregistré`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {value ? (
          // Valeur présente : crayon discret, net au survol de la ligne (toujours visible au toucher).
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
            title={`Modifier : ${label}`}
          >
            <Pencil className="size-3.5" />
            <span className="sr-only">Modifier {label}</span>
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 gap-1.5 px-2.5 text-xs">
            <Pencil className="size-3.5" />
            Saisir
            <span className="sr-only"> {label}</span>
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(20rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-3">
          <Label htmlFor={inputId}>{label}</Label>
          <FieldInput id={inputId} kind={kind} value={draft} onChange={setDraft} onEnter={save} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || !draft}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface GroupField {
  field: string;
  label: string;
  kind?: InlineFieldKind;
  /** Valeur actuelle (« yyyy-MM-dd » pour une date). */
  value: string | null;
  missing?: boolean;
}

/**
 * « Saisir » / « Modifier » d'un point de contrôle : tous les champs du point
 * (identité, coordonnées…) dans une même fenêtre. Seuls les champs changés
 * sont enregistrés.
 */
export function GroupFieldEditor({
  entity,
  id,
  title,
  fields,
}: {
  entity: "person" | "entreprise";
  id: string;
  title: string;
  fields: GroupField[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const anyMissing = fields.some((f) => f.missing);

  React.useEffect(() => {
    if (open) setDrafts(Object.fromEntries(fields.map((f) => [f.field, f.value || ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changed = fields.filter((f) => (drafts[f.field] || "") !== (f.value || "") && (drafts[f.field] || "").trim() !== "");

  const save = async () => {
    if (changed.length === 0) return setOpen(false);
    setSaving(true);
    const errors: string[] = [];
    for (const f of changed) {
      const result = await updatePartyFieldAdmin({ entity, id, field: f.field, value: drafts[f.field] });
      if (!result.success) errors.push(`${f.label} : ${result.error}`);
    }
    setSaving(false);
    if (errors.length > 0) {
      toast.error(errors.join(" · "));
    } else {
      toast.success(changed.length > 1 ? `${changed.length} champs enregistrés` : `${changed[0].label} enregistré`);
      setOpen(false);
    }
    router.refresh();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Pencil className="size-3.5" />
          {anyMissing ? "Saisir" : "Modifier"}
          <span className="sr-only"> : {title}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(36rem,80vh)] overflow-y-auto">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold">{title}</p>
          {fields.map((f) => {
            const inputId = `group-${entity}-${id}-${f.field}`;
            return (
              <div key={f.field} className="flex flex-col gap-1.5">
                <Label htmlFor={inputId} className="flex items-center gap-2">
                  {f.label}
                  {f.missing && <span className="text-xs font-semibold text-red-700">Manquant</span>}
                </Label>
                <FieldInput
                  id={inputId}
                  kind={f.kind}
                  value={drafts[f.field] ?? ""}
                  onChange={(value) => setDrafts((prev) => ({ ...prev, [f.field]: value }))}
                  onEnter={save}
                />
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || changed.length === 0}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
