"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  PAYER_LABELS,
  RENT_PERIODICITY_LABELS,
  type CommercialFormValues,
  type WorkLine,
  type YesNo,
} from "@/lib/utils/commercial-terms";

/**
 * Conditions du bail commercial corrigées par l'équipe : les mêmes réponses que l'étape du
 * formulaire propriétaire, enregistrées par la même conversion. Rien n'est renvoyé au client.
 */

const YES_NO: Record<string, string> = { yes: "Oui", no: "Non" };

function Choice({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-10 w-full">
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
    </div>
  );
}

function Works({ id, lines, onChange }: { id: string; lines: WorkLine[]; onChange: (lines: WorkLine[]) => void }) {
  const update = (index: number, patch: Partial<WorkLine>) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  return (
    <div className="flex flex-col gap-2">
      {lines.map((line, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,1fr)_6.5rem_5rem_auto] items-center gap-2">
          <Input aria-label="Nature des travaux" placeholder="Nature des travaux" className="h-9" value={line.label} onChange={(e) => update(index, { label: e.target.value })} />
          <Input aria-label="Montant en euros" placeholder="Montant €" inputMode="numeric" className="h-9" value={line.amount} onChange={(e) => update(index, { amount: e.target.value.replace(/[^\d]/g, "") })} />
          <Input aria-label="Année" placeholder="Année" inputMode="numeric" className="h-9" value={line.year} maxLength={4} onChange={(e) => update(index, { year: e.target.value.replace(/[^\d]/g, "") })} />
          <Button type="button" variant="ghost" size="icon" className="size-9" aria-label="Retirer la ligne" onClick={() => onChange(lines.filter((_, i) => i !== index))}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit gap-1.5" id={id} onClick={() => onChange([...lines, { ...EMPTY_WORK_LINE }])}>
        <Plus className="size-3.5" />
        Ajouter des travaux
      </Button>
    </div>
  );
}

export function CommercialTermsEditor({
  bailId,
  values,
  derogatory,
  disabled,
}: {
  bailId: string;
  /** Réponses actuelles, au format du formulaire (commercialTermsToForm). */
  values: CommercialFormValues;
  /** Bail dérogatoire : durée en mois. */
  derogatory: boolean;
  disabled?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<CommercialFormValues>(values);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setForm(values);
  }, [open, values]);

  const set = <K extends keyof CommercialFormValues>(key: K, value: CommercialFormValues[K]) => setForm((current) => ({ ...current, [key]: value }));
  const yesNo = (key: keyof CommercialFormValues) => (value: string) => set(key, value as YesNo as never);

  const save = async () => {
    setSaving(true);
    const result = await updateCommercialTermsAdmin({ bailId, values: form, revalidate: pathname });
    setSaving(false);
    if (result.success) {
      toast.success("Conditions commerciales mises à jour");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const id = (name: string) => `commercial-${bailId}-${name}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled={disabled}>
          <Pencil className="size-3.5" />
          Modifier
          <span className="sr-only"> : conditions commerciales</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Conditions commerciales</DialogTitle>
          <DialogDescription>Les réponses du propriétaire, corrigées ici sans lui renvoyer le formulaire.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Activité et local</h3>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("activity")}>Activité autorisée</Label>
              <Textarea id={id("activity")} rows={2} value={form.activity} onChange={(e) => set("activity", e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("ancillary")}>Activités annexes ou restrictions</Label>
              <Textarea id={id("ancillary")} rows={2} value={form.ancillaryActivities} onChange={(e) => set("ancillaryActivities", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Choice id={id("previously-let")} label="Local déjà loué" value={form.previouslyLet} options={YES_NO} onChange={yesNo("previouslyLet")} />
              {form.previouslyLet === "yes" && (
                <Choice id={id("vacant")} label="Local libre aujourd'hui" value={form.currentlyVacant} options={YES_NO} onChange={yesNo("currentlyVacant")} />
              )}
            </div>
            {form.previouslyLet === "yes" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("previous-activity")}>Activité du locataire précédent</Label>
                <Input id={id("previous-activity")} className="h-10" value={form.previousActivity} onChange={(e) => set("previousActivity", e.target.value)} />
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Durée et loyer</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {derogatory && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id("derogatory")}>Durée du bail dérogatoire (mois)</Label>
                  <Input
                    id={id("derogatory")}
                    inputMode="numeric"
                    className="h-10"
                    value={form.derogatoryMonths}
                    onChange={(e) => set("derogatoryMonths", e.target.value.replace(/[^\d]/g, ""))}
                  />
                  <span className="text-xs text-muted-foreground">{DEROGATORY_MAX_MONTHS} mois au plus.</span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("keys")}>Remise des clés</Label>
                <Input id={id("keys")} type="date" className="h-10" value={form.keysHandoverDate} onChange={(e) => set("keysHandoverDate", e.target.value)} />
              </div>
              <Choice id={id("periodicity")} label="Paiement du loyer" value={form.rentPeriodicity} options={RENT_PERIODICITY_LABELS} onChange={(v) => set("rentPeriodicity", v as CommercialFormValues["rentPeriodicity"])} />
              <Choice id={id("vat")} label="TVA sur le loyer" value={form.vat} options={YES_NO} onChange={yesNo("vat")} />
              <Choice id={id("indexation")} label="Révision du loyer" value={form.indexation} options={INDEXATION_LABELS} onChange={(v) => set("indexation", v as CommercialFormValues["indexation"])} />
              <Choice id={id("rent-free")} label="Franchise de loyer" value={form.rentFree} options={YES_NO} onChange={yesNo("rentFree")} />
              {form.rentFree === "yes" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id("rent-free-months")}>Mois sans loyer</Label>
                  <Input id={id("rent-free-months")} inputMode="numeric" className="h-10" value={form.rentFreeMonths} onChange={(e) => set("rentFreeMonths", e.target.value.replace(/[^\d]/g, ""))} />
                </div>
              )}
              <Choice id={id("entry-fee")} label="Pas-de-porte" value={form.entryFee} options={YES_NO} onChange={yesNo("entryFee")} />
              {form.entryFee === "yes" && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={id("entry-fee-amount")}>Montant du pas-de-porte (€)</Label>
                  <Input id={id("entry-fee-amount")} inputMode="numeric" className="h-10" value={form.entryFeeAmount} onChange={(e) => set("entryFeeAmount", e.target.value.replace(/[^\d]/g, ""))} />
                </div>
              )}
              <Choice id={id("fees")} label="Frais d'acte payés par" value={form.feesPaidBy} options={FEES_PAID_BY_LABELS} onChange={(v) => set("feesPaidBy", v as CommercialFormValues["feesPaidBy"])} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Charges, impôts et taxes</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CHARGE_ITEMS.map((item) => (
                <Choice
                  key={item.key}
                  id={id(`charge-${item.key}`)}
                  label={item.label}
                  value={form.charges[item.key] ?? item.defaultPayer}
                  options={PAYER_LABELS}
                  onChange={(v) => set("charges", { ...form.charges, [item.key]: v as "OWNER" | "TENANT" })}
                />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Travaux</h3>
            <Choice id={id("past-works")} label="Travaux des 3 dernières années" value={form.hasPastWorks} options={YES_NO} onChange={yesNo("hasPastWorks")} />
            {form.hasPastWorks === "yes" && <Works id={id("past-works-add")} lines={form.pastWorks} onChange={(lines) => set("pastWorks", lines)} />}
            <Choice id={id("planned-works")} label="Travaux prévus dans les 3 ans" value={form.hasPlannedWorks} options={YES_NO} onChange={yesNo("hasPlannedWorks")} />
            {form.hasPlannedWorks === "yes" && <Works id={id("planned-works-add")} lines={form.plannedWorks} onChange={(lines) => set("plannedWorks", lines)} />}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">Garant et clauses</h3>
            <Choice id={id("guarantor")} label="Garant" value={form.hasGuarantor} options={YES_NO} onChange={yesNo("hasGuarantor")} />
            {form.hasGuarantor === "yes" && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input aria-label="Nom du garant" placeholder="Nom du garant" className="h-10" value={form.guarantorName} onChange={(e) => set("guarantorName", e.target.value)} />
                <Input aria-label="E-mail du garant" type="email" placeholder="E-mail du garant" className="h-10" value={form.guarantorEmail} onChange={(e) => set("guarantorEmail", e.target.value)} />
              </div>
            )}
            <div className="flex flex-col gap-2">
              {CLAUSE_OPTIONS.map((clause) => (
                <label key={clause.key} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.clauses.includes(clause.key)}
                    onCheckedChange={(checked) =>
                      set("clauses", checked ? [...form.clauses, clause.key] : form.clauses.filter((key) => key !== clause.key))
                    }
                  />
                  {clause.label}
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("clauses-note")}>Précisions sur les clauses</Label>
              <Textarea id={id("clauses-note")} rows={2} value={form.clausesNote} onChange={(e) => set("clausesNote", e.target.value)} />
            </div>
            <Choice
              id={id("marriage")}
              label="Local acheté pendant le mariage (le conjoint signe aussi)"
              value={form.boughtDuringMarriage}
              options={YES_NO}
              onChange={yesNo("boughtDuringMarriage")}
            />
          </section>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
