"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-picker";
import { updateBailTermsAdmin } from "@/lib/actions/admin-bail-edit";

export type BailTermField =
  | "bailType"
  | "bailFamily"
  | "effectiveDate"
  | "endDate"
  | "rentAmount"
  | "monthlyCharges"
  | "securityDeposit"
  | "paymentDay";

export interface BailTermInput {
  field: BailTermField;
  label: string;
  /** Valeur actuelle : « yyyy-MM-dd » pour une date, euros entiers pour un montant. */
  value: string;
  missing?: boolean;
  /** Peut être laissé vide (date de fin). */
  optional?: boolean;
  help?: string;
}

const OPTIONS: Partial<Record<BailTermField, Record<string, string>>> = {
  bailType: {
    BAIL_NU_3_ANS: "Bail nu 3 ans",
    BAIL_NU_6_ANS: "Bail nu 6 ans",
    BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
    BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
  },
  bailFamily: { HABITATION: "Habitation", COMMERCIAL: "Commercial" },
};
const MONEY: BailTermField[] = ["rentAmount", "monthlyCharges", "securityDeposit"];

/**
 * Modification en place d'un point « Le bail » (type et durée, loyer, dépôt) :
 * seuls les champs changés sont envoyés, en un seul enregistrement.
 */
export function BailTermsEditor({ bailId, title, fields }: { bailId: string; title: string; fields: BailTermInput[] }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const anyMissing = fields.some((f) => f.missing);
  const year = new Date().getFullYear();

  React.useEffect(() => {
    if (open) setDrafts(Object.fromEntries(fields.map((f) => [f.field, f.value])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changed = fields.filter((f) => {
    const next = (drafts[f.field] ?? "").trim();
    return next !== f.value && (next !== "" || f.optional);
  });

  const save = async () => {
    if (changed.length === 0) return setOpen(false);
    setSaving(true);
    // La réponse de l'action (qui revalide la page) met la fiche à jour : pas de router.refresh().
    const result = await updateBailTermsAdmin({
      bailId,
      values: Object.fromEntries(changed.map((f) => [f.field, (drafts[f.field] ?? "").trim()])),
      revalidate: pathname,
    });
    setSaving(false);
    if (result.success) {
      toast.success(changed.length > 1 ? `${changed.length} champs enregistrés` : `${changed[0].label} enregistré`);
      setOpen(false);
    } else {
      toast.error(result.error);
    }
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
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="text-sm font-semibold">{title}</p>
          {fields.map((f) => {
            const id = `bail-${bailId}-${f.field}`;
            const value = drafts[f.field] ?? "";
            const set = (next: string) => setDrafts((prev) => ({ ...prev, [f.field]: next }));
            const options = OPTIONS[f.field];
            return (
              <div key={f.field} className="flex flex-col gap-1.5">
                <Label htmlFor={id} className="flex items-center gap-2">
                  {f.label}
                  {f.missing && <span className="text-xs font-semibold text-red-700">Manquant</span>}
                </Label>
                {options ? (
                  <Select value={value} onValueChange={set}>
                    <SelectTrigger id={id} className="h-10 w-full">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(options).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.field === "effectiveDate" || f.field === "endDate" ? (
                  <DateInput id={id} value={value} onChange={set} fromYear={year - 30} toYear={year + 30} />
                ) : (
                  <div className="relative">
                    <Input
                      id={id}
                      inputMode="numeric"
                      autoComplete="off"
                      className="h-10 pr-16"
                      value={value}
                      onChange={(event) => set(event.target.value.replace(/[^\d]/g, ""))}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                      {MONEY.includes(f.field) ? "€" : "du mois"}
                    </span>
                  </div>
                )}
                {f.help && <span className="text-xs text-muted-foreground">{f.help}</span>}
                {f.optional && value && (
                  <button type="button" className="w-fit text-xs font-medium text-primary underline-offset-2 hover:underline" onClick={() => set("")}>
                    Retirer la date
                  </button>
                )}
              </div>
            );
          })}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving || changed.length === 0}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
