"use client";

/**
 * Étapes du parcours « bail commercial » du formulaire propriétaire. Les réponses vivent
 * dans le champ « commercial » du formulaire (voir lib/utils/commercial-terms.ts) ;
 * les données du local restent dans les champs property* habituels.
 */

import { useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { BailType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { DateInput } from "@/components/ui/date-picker";
import { FileUpload } from "@/components/ui/file-upload";
import { DocumentUploaded } from "./document-uploaded";
import { computeBailEndDate, dateToIsoDay, formatDateFr } from "@/lib/utils/bail-duration";
import {
  CHARGE_ITEMS,
  CLAUSE_OPTIONS,
  DEROGATORY_MAX_MONTHS,
  EMPTY_WORK_LINE,
  FEES_PAID_BY_LABELS,
  INDEXATION_LABELS,
  OWNER_ONLY_CHARGES,
  PAYER_LABELS,
  PREMISES_TYPES,
  PREMISES_TYPE_HINTS,
  PREMISES_TYPE_LABELS,
  RENT_PERIODICITY_LABELS,
  commercialDocuments,
  defaultIndexation,
  type WorkLine,
} from "@/lib/utils/commercial-terms";

type FormLike = any;

const errorOf = (form: FormLike, path: string): string | undefined => {
  const parts = path.split(".");
  let node: any = form.formState.errors;
  for (const part of parts) node = node?.[part];
  return node?.message as string | undefined;
};

function FieldError({ form, path }: { form: FormLike; path: string }) {
  const message = errorOf(form, path);
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/** En-tête d'étape ; masqué quand l'étape est posée seule (demande de complément). */
function StepHeader({ title, subtitle, hidden = false }: { title: string; subtitle: string; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div>
      <p className="text-xl font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

/** Choix exclusif en grosses cartes, comme le reste du formulaire. */
function ChoiceCards({
  value,
  options,
  onChange,
  columns = 1,
}: {
  value: string | undefined;
  options: Array<{ value: string; label: string; hint?: string }>;
  onChange: (value: string) => void;
  columns?: 1 | 2;
}) {
  return (
    <div className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "w-full flex items-center justify-between gap-3 p-3 rounded-xl border-2 text-left text-sm transition-all",
            value === option.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/40",
          )}
        >
          <span className="min-w-0">
            <span className="font-medium block">{option.label}</span>
            {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
          </span>
          {value === option.value && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
        </button>
      ))}
    </div>
  );
}

const YES_NO = [
  { value: "yes", label: "Oui" },
  { value: "no", label: "Non" },
];

const COMPLEX_OPTIONS = [
  { value: "no", label: "Dans un immeuble ou une rue", hint: "Local indépendant, hors de tout ensemble géré en commun" },
  { value: "shopping_center", label: "Dans un centre commercial", hint: "Centre commercial ou galerie marchande, avec un règlement intérieur" },
  { value: "estate_complex", label: "Dans un autre ensemble immobilier", hint: "Parc d'activités, zone ou ensemble géré par une association syndicale (ASL, AFUL)" },
];

/** Question oui / non sur un champ « commercial.* ». */
function YesNoQuestion({ form, name, label, hint }: { form: FormLike; name: string; label: string; hint?: string }) {
  const path = `commercial.${name}`;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <ChoiceCards
            value={field.value}
            options={YES_NO}
            columns={2}
            onChange={(value) => {
              field.onChange(value);
              form.clearErrors(path);
            }}
          />
        )}
      />
      <FieldError form={form} path={path} />
    </div>
  );
}

function TextField({
  form,
  name,
  label,
  placeholder,
  multiline,
  type,
}: {
  form: FormLike;
  name: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  type?: string;
}) {
  const register = form.register(name, { onChange: () => form.clearErrors(name) });
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {multiline ? (
        <Textarea id={name} rows={3} placeholder={placeholder} {...register} />
      ) : (
        <Input id={name} type={type} className="h-11" placeholder={placeholder} {...register} />
      )}
      <FieldError form={form} path={name} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Le local » : type de local                                  */
/* ------------------------------------------------------------------ */

export function PremisesTypeField({ form }: { form: FormLike }) {
  return (
    <div className="space-y-2">
      <Label>Type de local *</Label>
      <Controller
        name="propertyType"
        control={form.control}
        render={({ field }) => (
          <ChoiceCards
            value={typeof field.value === "string" ? field.value : undefined}
            columns={2}
            options={PREMISES_TYPES.map((type) => ({ value: type, label: PREMISES_TYPE_LABELS[type], hint: PREMISES_TYPE_HINTS[type] }))}
            onChange={(value) => {
              field.onChange(value);
              form.clearErrors("propertyType");
            }}
          />
        )}
      />
      <FieldError form={form} path="propertyType" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Caractéristiques du local »                                 */
/* ------------------------------------------------------------------ */

export function CommercialPropertyDetails({ form }: { form: FormLike }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Où se trouve le local ? *</Label>
        <Controller
          name="propertyInShoppingCenter"
          control={form.control}
          render={({ field }) => (
            <ChoiceCards
              value={field.value === "yes" ? "shopping_center" : field.value}
              options={COMPLEX_OPTIONS}
              onChange={(value) => {
                field.onChange(value);
                form.clearErrors("propertyInShoppingCenter");
              }}
            />
          )}
        />
        <FieldError form={form} path="propertyInShoppingCenter" />
      </div>
      <TextField
        form={form}
        name="propertyOutbuildings"
        label="Dépendances louées avec le local (facultatif)"
        placeholder="Ex. : cave n° 12, place de parking n° 4, réserve"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « L'activité »                                                */
/* ------------------------------------------------------------------ */

export function CommercialActivityStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const previouslyLet = useWatch({ control: form.control, name: "commercial.previouslyLet" });
  return (
    <div className="space-y-5">
      <StepHeader hidden={bare} title="L'activité" subtitle="L'activité qui sera exercée dans le local, et sa situation actuelle." />
      <TextField
        form={form}
        name="commercial.activity"
        label="Activité autorisée dans le local *"
        placeholder="Ex. : boulangerie-pâtisserie avec vente sur place, cabinet d'expertise comptable…"
        multiline
      />
      <TextField
        form={form}
        name="commercial.ancillaryActivities"
        label="Activités annexes ou restrictions (facultatif)"
        placeholder="Ex. : vente à emporter autorisée, pas de cuisson sur place…"
        multiline
      />
      <YesNoQuestion form={form} name="previouslyLet" label="Le local a-t-il déjà été loué ? *" />
      {previouslyLet === "yes" && (
        <>
          <TextField form={form} name="commercial.previousActivity" label="Activité du locataire précédent *" placeholder="Ex. : prêt-à-porter" />
          <YesNoQuestion form={form} name="currentlyVacant" label="Le local est-il libre aujourd'hui ? *" />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Durée et dates »                                            */
/* ------------------------------------------------------------------ */

const DURATION_OPTIONS = [
  { value: BailType.COMMERCIAL_3_6_9, label: "Bail commercial 3-6-9", hint: "9 ans, le locataire peut partir tous les 3 ans" },
  { value: BailType.COMMERCIAL_DEROGATOIRE, label: "Bail dérogatoire (courte durée)", hint: `${DEROGATORY_MAX_MONTHS} mois au plus, sans droit au renouvellement` },
];

export function CommercialDurationStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const bailType = useWatch({ control: form.control, name: "bailType" });
  const effectiveDate = useWatch({ control: form.control, name: "bailEffectiveDate" });
  const months = useWatch({ control: form.control, name: "commercial.derogatoryMonths" });
  const monthsNum = parseInt(String(months ?? ""), 10);
  const endDate = useMemo(
    () => computeBailEndDate(effectiveDate as any, bailType as any, Number.isFinite(monthsNum) ? monthsNum : null),
    [effectiveDate, bailType, monthsNum],
  );
  useEffect(() => {
    form.setValue("bailEndDate", endDate ? dateToIsoDay(endDate) : "", { shouldDirty: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endDate]);

  return (
    <div className="space-y-5">
      <StepHeader hidden={bare} title="Durée et dates" subtitle="La durée du bail, sa prise d'effet et la remise des clés." />
      <div className="space-y-2">
        <Label>Durée du bail *</Label>
        <Controller
          name="bailType"
          control={form.control}
          render={({ field }) => (
            <ChoiceCards
              value={field.value}
              options={DURATION_OPTIONS}
              onChange={(value) => {
                field.onChange(value);
                form.clearErrors("bailType");
              }}
            />
          )}
        />
        <FieldError form={form} path="bailType" />
      </div>
      {bailType === BailType.COMMERCIAL_DEROGATOIRE && (
        <div className="space-y-2">
          <Label>Durée du bail dérogatoire (en mois) *</Label>
          <NumberInputGroup
            field={form.register("commercial.derogatoryMonths", { onChange: () => form.clearErrors("commercial.derogatoryMonths") })}
            min={1}
            max={DEROGATORY_MAX_MONTHS}
            step={1}
            unit="mois"
            className="h-11"
          />
          <FieldError form={form} path="commercial.derogatoryMonths" />
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="bailEffectiveDate">Date de prise d&apos;effet *</Label>
        <Controller
          name="bailEffectiveDate"
          control={form.control}
          render={({ field }) => (
            <DateInput
              id="bailEffectiveDate"
              name={field.name}
              value={field.value ? dateValue(field.value) : undefined}
              onChange={(val) => field.onChange(val || "")}
              onBlur={field.onBlur}
              aria-invalid={!!form.formState.errors.bailEffectiveDate}
            />
          )}
        />
        <FieldError form={form} path="bailEffectiveDate" />
        {endDate && (
          <p className="text-sm text-muted-foreground">
            Le bail se terminera le <span className="font-medium text-foreground">{formatDateFr(endDate)}</span>.
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="commercialKeys">Remise des clés (facultatif)</Label>
        <p className="text-xs text-muted-foreground">Laissez vide si les clés sont remises le jour de la prise d&apos;effet.</p>
        <Controller
          name="commercial.keysHandoverDate"
          control={form.control}
          render={({ field }) => (
            <DateInput
              id="commercialKeys"
              name={field.name}
              value={field.value ? dateValue(field.value) : undefined}
              onChange={(val) => field.onChange(val || "")}
              onBlur={field.onBlur}
            />
          )}
        />
      </div>
      <div className="space-y-2">
        <Label>Jour de paiement du loyer *</Label>
        <NumberInputGroup field={form.register("bailPaymentDay")} min={1} max={28} step={1} className="h-11" />
        <FieldError form={form} path="bailPaymentDay" />
      </div>
    </div>
  );
}

const dateValue = (value: unknown): string | undefined => {
  if (!value) return undefined;
  if (typeof value === "string") return value.includes("T") ? value.split("T")[0] : value;
  if (value instanceof Date) return value.toISOString().split("T")[0];
  return undefined;
};

/* ------------------------------------------------------------------ */
/* Étape « Le loyer »                                                  */
/* ------------------------------------------------------------------ */

export function CommercialRentStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const rent = useWatch({ control: form.control, name: "bailRentAmount" });
  const rentFree = useWatch({ control: form.control, name: "commercial.rentFree" });
  const indexation = useWatch({ control: form.control, name: "commercial.indexation" });
  const premisesType = useWatch({ control: form.control, name: "propertyType" });
  const rentNum = parseInt(String(rent ?? ""), 10);

  // Indice proposé selon le type de local, tant que le propriétaire n'a rien choisi
  useEffect(() => {
    if (!indexation) form.setValue("commercial.indexation", defaultIndexation(premisesType));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <StepHeader hidden={bare} title="Le loyer" subtitle="Le loyer hors taxes et ses conditions de paiement." />
      <div className="space-y-2">
        <Label>Loyer mensuel hors taxes et hors charges *</Label>
        <NumberInputGroup field={form.register("bailRentAmount")} min={0} step={1} unit="€" className="h-11" />
        {Number.isFinite(rentNum) && rentNum > 0 && (
          <p className="text-xs text-muted-foreground">Soit {(rentNum * 12).toLocaleString("fr-FR")} € par an.</p>
        )}
        <FieldError form={form} path="bailRentAmount" />
      </div>
      <div className="space-y-2">
        <Label>Paiement du loyer *</Label>
        <Controller
          name="commercial.rentPeriodicity"
          control={form.control}
          render={({ field }) => (
            <ChoiceCards
              value={field.value}
              columns={2}
              options={Object.entries(RENT_PERIODICITY_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={(value) => {
                field.onChange(value);
                form.clearErrors("commercial.rentPeriodicity");
              }}
            />
          )}
        />
        <FieldError form={form} path="commercial.rentPeriodicity" />
      </div>
      <YesNoQuestion
        form={form}
        name="vat"
        label="Le loyer est-il soumis à la TVA ? *"
        hint="Oui si vous avez choisi de soumettre la location à la TVA (option fiscale) ; en cas de doute, demandez à votre comptable."
      />
      <div className="space-y-2">
        <Label>Révision du loyer *</Label>
        <p className="text-xs text-muted-foreground">L&apos;indice adapté à votre type de local est déjà proposé.</p>
        <Controller
          name="commercial.indexation"
          control={form.control}
          render={({ field }) => (
            <ChoiceCards
              value={field.value}
              options={Object.entries(INDEXATION_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={(value) => {
                field.onChange(value);
                form.clearErrors("commercial.indexation");
              }}
            />
          )}
        />
        <FieldError form={form} path="commercial.indexation" />
      </div>
      <YesNoQuestion form={form} name="rentFree" label="Une période sans loyer (franchise) est-elle prévue ? *" />
      {rentFree === "yes" && (
        <div className="space-y-2">
          <Label>Nombre de mois sans loyer *</Label>
          <NumberInputGroup
            field={form.register("commercial.rentFreeMonths", { onChange: () => form.clearErrors("commercial.rentFreeMonths") })}
            min={1}
            max={120}
            step={1}
            unit="mois"
            className="h-11"
          />
          <FieldError form={form} path="commercial.rentFreeMonths" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Dépôt et frais »                                            */
/* ------------------------------------------------------------------ */

export function CommercialDepositStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const entryFee = useWatch({ control: form.control, name: "commercial.entryFee" });
  return (
    <div className="space-y-5">
      <StepHeader hidden={bare} title="Dépôt et frais" subtitle="La provision pour charges, le dépôt de garantie et les frais de l'acte." />
      <div className="space-y-2">
        <Label>Provision mensuelle pour charges *</Label>
        <p className="text-xs text-muted-foreground">Mettez 0 s&apos;il n&apos;y en a pas.</p>
        <NumberInputGroup field={form.register("bailMonthlyCharges")} min={0} step={1} unit="€" className="h-11" />
        <FieldError form={form} path="bailMonthlyCharges" />
      </div>
      <div className="space-y-2">
        <Label>Dépôt de garantie *</Label>
        <p className="text-xs text-muted-foreground">Souvent l&apos;équivalent de 3 mois de loyer hors taxes.</p>
        <NumberInputGroup field={form.register("bailSecurityDeposit")} min={0} step={1} unit="€" className="h-11" />
        <FieldError form={form} path="bailSecurityDeposit" />
      </div>
      <YesNoQuestion form={form} name="entryFee" label="Un pas-de-porte (droit d'entrée) est-il demandé ? *" />
      {entryFee === "yes" && (
        <div className="space-y-2">
          <Label>Montant du pas-de-porte *</Label>
          <NumberInputGroup
            field={form.register("commercial.entryFeeAmount", { onChange: () => form.clearErrors("commercial.entryFeeAmount") })}
            min={1}
            step={1}
            unit="€"
            className="h-11"
          />
          <FieldError form={form} path="commercial.entryFeeAmount" />
        </div>
      )}
      <div className="space-y-2">
        <Label>Qui paie les frais de l&apos;acte notarié ? *</Label>
        <Controller
          name="commercial.feesPaidBy"
          control={form.control}
          render={({ field }) => (
            <ChoiceCards
              value={field.value}
              options={Object.entries(FEES_PAID_BY_LABELS).map(([value, label]) => ({ value, label }))}
              onChange={(value) => {
                field.onChange(value);
                form.clearErrors("commercial.feesPaidBy");
              }}
            />
          )}
        />
        <FieldError form={form} path="commercial.feesPaidBy" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Charges et travaux » (loi Pinel)                            */
/* ------------------------------------------------------------------ */

function WorksList({ form, name }: { form: FormLike; name: "pastWorks" | "plannedWorks" }) {
  const path = `commercial.${name}`;
  const lines = (useWatch({ control: form.control, name: path }) as WorkLine[] | undefined) ?? [];
  const setLines = (next: WorkLine[]) => form.setValue(path, next, { shouldDirty: true });
  useEffect(() => {
    if (lines.length === 0) setLines([{ ...EMPTY_WORK_LINE }]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="grid gap-2 grid-cols-[1fr_auto] sm:grid-cols-[1fr_7rem_6rem_auto] items-start rounded-xl border p-3">
          <Input
            aria-label="Intitulé des travaux"
            placeholder="Ex. : réfection de la toiture"
            value={line.label}
            onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, label: event.target.value } : l)))}
            className="h-10 col-span-2 sm:col-span-1"
          />
          <Input
            aria-label="Coût en euros"
            inputMode="numeric"
            placeholder={name === "pastWorks" ? "Coût (€)" : "Budget (€)"}
            value={line.amount}
            onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, amount: event.target.value.replace(/[^\d]/g, "") } : l)))}
            className="h-10"
          />
          <Input
            aria-label="Année"
            inputMode="numeric"
            placeholder="Année"
            value={line.year}
            onChange={(event) => setLines(lines.map((l, i) => (i === index ? { ...l, year: event.target.value.replace(/[^\d]/g, "").slice(0, 4) } : l)))}
            className="h-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Retirer ces travaux"
            onClick={() => setLines(lines.filter((_, i) => i !== index))}
            disabled={lines.length === 1}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" className="w-full h-10 gap-2 border-dashed" onClick={() => setLines([...lines, { ...EMPTY_WORK_LINE }])}>
        <Plus className="h-4 w-4" />
        Ajouter des travaux
      </Button>
    </div>
  );
}

export function CommercialChargesStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const hasPastWorks = useWatch({ control: form.control, name: "commercial.hasPastWorks" });
  const hasPlannedWorks = useWatch({ control: form.control, name: "commercial.hasPlannedWorks" });
  return (
    <div className="space-y-5">
      <StepHeader hidden={bare}
        title="Charges et travaux"
        subtitle="La loi impose de préciser qui paie chaque charge, et les travaux passés et prévus."
      />
      <div className="space-y-2">
        <Label>Qui paie quoi ?</Label>
        <p className="text-xs text-muted-foreground">Pré-rempli selon l&apos;usage, modifiez si besoin.</p>
        <div className="rounded-xl border divide-y">
          {CHARGE_ITEMS.map((item) => (
            <Controller
              key={item.key}
              name={`commercial.charges.${item.key}`}
              control={form.control}
              render={({ field }) => (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex gap-1 shrink-0">
                    {(["OWNER", "TENANT"] as const).map((payer) => (
                      <button
                        key={payer}
                        type="button"
                        onClick={() => field.onChange(payer)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                          (field.value ?? item.defaultPayer) === payer
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:bg-muted/40",
                        )}
                      >
                        {PAYER_LABELS[payer]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            />
          ))}
          {OWNER_ONLY_CHARGES.map((item) => (
            <div key={item.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-muted/30">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-xs text-muted-foreground shrink-0">Toujours au propriétaire (loi)</span>
            </div>
          ))}
        </div>
      </div>
      <YesNoQuestion form={form} name="hasPastWorks" label="Avez-vous fait des travaux dans le local ces 3 dernières années ? *" />
      {hasPastWorks === "yes" && <WorksList form={form} name="pastWorks" />}
      <YesNoQuestion form={form} name="hasPlannedWorks" label="Prévoyez-vous des travaux dans les 3 prochaines années ? *" />
      {hasPlannedWorks === "yes" && <WorksList form={form} name="plannedWorks" />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Garanties et clauses »                                      */
/* ------------------------------------------------------------------ */

export function CommercialClausesStep({ form, bare = false }: { form: FormLike; bare?: boolean }) {
  const hasGuarantor = useWatch({ control: form.control, name: "commercial.hasGuarantor" });
  return (
    <div className="space-y-5">
      <StepHeader hidden={bare} title="Garanties et clauses" subtitle="Un garant éventuel et les clauses particulières que vous souhaitez." />
      <YesNoQuestion form={form} name="hasGuarantor" label="Une personne se porte-t-elle garante du locataire ? *" />
      {hasGuarantor === "yes" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="commercial.guarantorName" label="Nom du garant *" />
          <TextField form={form} name="commercial.guarantorEmail" label="E-mail du garant" type="email" />
        </div>
      )}
      <div className="space-y-2">
        <Label>Clauses particulières (facultatif)</Label>
        <Controller
          name="commercial.clauses"
          control={form.control}
          render={({ field }) => {
            const selected: string[] = Array.isArray(field.value) ? field.value : [];
            return (
              <div className="grid gap-2">
                {CLAUSE_OPTIONS.map((option) => (
                  <label key={option.key} className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer text-sm">
                    <Checkbox
                      checked={selected.includes(option.key)}
                      onCheckedChange={(checked) =>
                        field.onChange(checked ? [...selected, option.key] : selected.filter((key) => key !== option.key))
                      }
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            );
          }}
        />
      </div>
      <TextField
        form={form}
        name="commercial.clausesNote"
        label="Autres souhaits pour le bail (facultatif)"
        placeholder="Ex. : enseigne autorisée en façade, horaires d'ouverture…"
        multiline
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Informations client » : conjoint                            */
/* ------------------------------------------------------------------ */

export function BoughtDuringMarriageQuestion({ form }: { form: FormLike }) {
  return (
    <YesNoQuestion
      form={form}
      name="boughtDuringMarriage"
      label="Le local a-t-il été acheté pendant votre mariage ? *"
      hint="Un local acheté pendant le mariage appartient aux deux époux : votre conjoint devra aussi signer le bail. Un local hérité ou reçu en donation n'est pas concerné."
    />
  );
}

/* ------------------------------------------------------------------ */
/* Étape « Documents » : pièces du bail commercial                     */
/* ------------------------------------------------------------------ */

export function CommercialDocumentUploads({
  form,
  intakeLink,
  isCompany,
  onUploadStateChange,
}: {
  form: FormLike;
  intakeLink: { token: string; clientId: string };
  isCompany: boolean;
  onUploadStateChange?: (isUploading: boolean) => void;
}) {
  const previouslyLet = useWatch({ control: form.control, name: "commercial.previouslyLet" });
  const legalStatus = useWatch({ control: form.control, name: "propertyLegalStatus" });
  const inShoppingCenter = useWatch({ control: form.control, name: "propertyInShoppingCenter" });
  const surface = useWatch({ control: form.control, name: "propertySurfaceM2" });
  const premisesType = useWatch({ control: form.control, name: "propertyType" });
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const rules = commercialDocuments({
    previouslyLet,
    legalStatus,
    inShoppingCenter: !!inShoppingCenter && inShoppingCenter !== "no",
    complexType: inShoppingCenter === "estate_complex" ? "ESTATE_COMPLEX" : "SHOPPING_CENTER",
    surfaceM2: parseFloat(String(surface ?? "")) || null,
    premisesType,
    isCompany,
  });
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Pièces du bail commercial</h3>
        <p className="text-sm text-muted-foreground">Celles marquées d&apos;un astérisque sont obligatoires ; les autres aident le notaire si vous les avez.</p>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
        {rules.map((rule) => (
          <div key={rule.kind} className="min-w-0 w-full overflow-visible space-y-1">
            <DocumentUploaded token={intakeLink.token} documentKind={rule.kind}>
              <FileUpload
                label={`${rule.label}${rule.required ? " *" : ""}`}
                multiple
                value={files[rule.kind] ?? null}
                onChange={(file) => setFiles((prev) => ({ ...prev, [rule.kind]: file }))}
                uploadToken={intakeLink.token}
                documentKind={rule.kind as any}
                documentClientId={intakeLink.clientId}
                onUploadStateChange={onUploadStateChange}
              />
            </DocumentUploaded>
            {rule.hint && <p className="text-xs text-muted-foreground">{rule.hint}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
