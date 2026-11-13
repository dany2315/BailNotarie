"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useWatch } from "react-hook-form";
import { AlertCircle, Check, CheckCircle2, Loader2, PencilLine, TextCursorInput } from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { DateInput } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { NationalitySelect } from "@/components/ui/nationality-select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressData } from "@/lib/types/address";
import {
  BoughtDuringMarriageQuestion,
  CommercialActivityStep,
  CommercialChargesStep,
  CommercialClausesStep,
  CommercialDepositStep,
  CommercialDurationStep,
  CommercialPropertyDetails,
  CommercialRentStep,
  PremisesTypeField,
} from "@/components/intakes/commercial-steps";
import { IconTile, Pill, PrimaryAction, Surface } from "./owner-ui";
import { answerComplementField, type ClientComplementItem } from "@/lib/actions/complement-requests";
import {

  questionErrors,
  questionPaths,
  spouseRequired,
  questionSummary,
  type QuestionContext,
  type QuestionRef,
} from "@/lib/rules/complement-questions";
import { FURNITURE_KEYS, isFurnishedBail, maxSecurityDeposit } from "@/lib/rules/dossier-rules";
import { asksBoughtDuringMarriage } from "@/lib/utils/commercial-terms";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { OWNER_PERIODS, PERIOD_LABELS, ROOMS_LABELS } from "@/lib/utils/rent-cap";
import { REASON_LABELS, reasonSentence } from "@/lib/utils/complement";
import { RENT_INCREASE_LABELS } from "@/lib/utils/rent-relocation";
import { cn } from "@/lib/utils";

type FormLike = any;

const getAt = (values: any, path: string) => path.split(".").reduce((node: any, key) => (node == null ? undefined : node[key]), values);

const GEO_PATHS = [
  "propertyHousenumber",
  "propertyStreet",
  "propertyCity",
  "propertyPostalCode",
  "propertyDistrict",
  "propertyInseeCode",
  "propertyDepartment",
  "propertyRegion",
  "propertyLatitude",
  "propertyLongitude",
];

/** Messages qui ne se rattachent à aucun champ affiché (montrés en bas de la carte). */
const GENERAL_PATHS = new Set(["persons", "phone", "email", "entreprise"]);

/** Réponse envoyée au serveur : les champs de la question, et le conjoint à ajouter s'il y en a un. */
function buildAnswer(ref: QuestionRef, values: any, ctx: QuestionContext) {
  const answer: Record<string, unknown> = {};
  for (const path of questionPaths(ref, values, ctx)) {
    if (path === "persons" || path === "entreprise") continue;
    const person = /^persons\.(\d+)\./.exec(path);
    if (person && values.persons?.[Number(person[1])]?.isNew) continue;
    answer[path] = getAt(values, path);
  }
  if (ref.id === "property.address") for (const path of GEO_PATHS) answer[path] = getAt(values, path);
  const spouse = ref.id === "person.family" ? values.persons?.find((p: any) => p?.isNew) : null;
  if (spouse) answer.spouse = spouse;
  return answer;
}

/**
 * Information demandée par l'équipe : les mêmes champs que le formulaire, avec ses dépendances
 * (régime si marié, syndic si copropriété, mobilier si meublé…). Enregistrée tout de suite dans le dossier.
 */
export function ComplementFieldCard({
  item,
  form,
  ctx,
  disabled,
}: {
  item: ClientComplementItem;
  form: FormLike;
  ctx: QuestionContext;
  disabled: boolean;
}) {
  const router = useRouter();
  const ref = item.question!;
  // Enregistrée : tout de suite, sans attendre le rechargement de la page.
  const [savedHere, setSavedHere] = React.useState(false);
  const answered = item.status === "PROVIDED" || savedHere;
  const [editing, setEditing] = React.useState(!answered);
  const [saving, setSaving] = React.useState(false);
  const [general, setGeneral] = React.useState<string[]>([]);
  const problem = item.reason !== "MISSING";
  // Valeurs suivies en direct (dépendances entre champs).
  useWatch({ control: form.control });

  const save = async () => {
    // Le conjoint ajouté est marié, sous le même régime (comme le serveur l'enregistrera).
    (form.getValues("persons") ?? []).forEach((person: any, index: number) => {
      if (!person?.isNew) return;
      form.setValue(`persons.${index}.familyStatus`, "MARIE");
      form.setValue(`persons.${index}.matrimonialRegime`, form.getValues(`persons.${ref.personIndex ?? 0}.matrimonialRegime`) ?? "");
    });
    const values = form.getValues();
    const paths = questionPaths(ref, values, ctx);
    form.clearErrors(paths.filter((path) => !GENERAL_PATHS.has(path)));
    const errors = questionErrors(ref, values, ctx);
    const show = (fieldErrors: Record<string, string>) => {
      const generalMessages: string[] = [];
      for (const [path, message] of Object.entries(fieldErrors)) {
        if (GENERAL_PATHS.has(path)) generalMessages.push(message);
        else form.setError(path, { type: "manual", message });
      }
      setGeneral(generalMessages);
    };
    if (Object.keys(errors).length > 0) {
      show(errors);
      return;
    }
    setGeneral([]);
    setSaving(true);
    const result = await answerComplementField({ itemId: item.id, answer: buildAnswer(ref, values, ctx) });
    setSaving(false);
    if (!result.success) {
      if ("fieldErrors" in result && result.fieldErrors) show(result.fieldErrors);
      toast.error("Non enregistré", { description: result.error });
      return;
    }
    // Conjoint ajouté : il fait désormais partie du dossier.
    (values.persons ?? []).forEach((person: any, index: number) => {
      if (person?.isNew) form.setValue(`persons.${index}.isNew`, false);
    });
    const added = result.data.addedDocuments;
    if (added.length > 0) {
      toast.success("C'est enregistré", {
        description: `Avec cette réponse, il faut aussi : ${added.join(", ")}. ${added.length > 1 ? "Elles sont ajoutées" : "Elle est ajoutée"} à votre demande.`,
      });
    } else {
      toast.success("C'est enregistré");
    }
    setSavedHere(true);
    setEditing(false);
    router.refresh();
  };

  const summary = answered ? questionSummary(ref, form.getValues(), ctx) : "";
  const busy = saving || disabled;

  return (
    <li>
      <Surface tone={answered && !editing ? "plain" : "raised"} className="overflow-hidden">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-5">
          <IconTile icon={answered ? Check : problem ? AlertCircle : TextCursorInput} tone={answered ? "emerald" : problem ? "amber" : "blue"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[14.5px] font-semibold leading-snug text-slate-900">{item.label}</h2>
              {answered ? <Pill tone="emerald">Renseignée</Pill> : <Pill tone={problem ? "amber" : "slate"}>{problem ? REASON_LABELS[item.reason] : "À compléter"}</Pill>}
            </div>
            {!answered && (
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                {reasonSentence(item.reason, "FIELD")}
                {item.note ? <span className="text-slate-700"> {item.note}</span> : null}
              </p>
            )}
            {answered && editing && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">Modifiez votre réponse, puis enregistrez.</p>}
            {answered && !editing && summary && <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-slate-600">{summary}</p>}
          </div>
        </div>

        {editing ? (
          <div className="flex flex-col gap-4 px-4 pb-4 pt-1 sm:px-5">
            <QuestionFields refQ={ref} form={form} ctx={ctx} />
            {general.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl bg-red-50 px-3 py-2.5 text-[13px] font-medium text-red-800">
                {general.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
              {answered && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                  className="h-10 rounded-xl px-4 text-[13px] font-semibold text-slate-500 hover:text-slate-800"
                >
                  Annuler
                </button>
              )}
              <PrimaryAction onClick={save} disabled={busy} className="h-11 w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Enregistrer
              </PrimaryAction>
            </div>
          </div>
        ) : (
          <div className="px-4 pb-4 pt-0 sm:px-5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-[13px] font-semibold text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-700 disabled:opacity-60"
            >
              <PencilLine className="h-4 w-4" />
              Modifier
            </button>
          </div>
        )}
      </Surface>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Les champs                                 */
/* -------------------------------------------------------------------------- */

function errorAt(form: FormLike, path: string): string | undefined {
  let node: any = form.formState.errors;
  for (const part of path.split(".")) node = node?.[part];
  return node?.message as string | undefined;
}

function FieldError({ form, path }: { form: FormLike; path: string }) {
  const message = errorAt(form, path);
  return message ? <p className="text-[13px] font-medium text-red-700">{message}</p> : null;
}

function Field({ form, path, label, hint, children }: { form: FormLike; path: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={path} className="text-[13.5px]">
        {label}
      </Label>
      {children}
      {hint && <p className="text-[12.5px] leading-relaxed text-slate-500">{hint}</p>}
      <FieldError form={form} path={path} />
    </div>
  );
}

function TextField({ form, path, label, type, placeholder, multiline, hint }: { form: FormLike; path: string; label: string; type?: string; placeholder?: string; multiline?: boolean; hint?: string }) {
  const register = form.register(path, { onChange: () => form.clearErrors(path) });
  return (
    <Field form={form} path={path} label={label} hint={hint}>
      {multiline ? <Textarea id={path} rows={2} placeholder={placeholder} {...register} /> : <Input id={path} type={type} className="h-11" placeholder={placeholder} {...register} />}
    </Field>
  );
}

function SelectField({ form, path, label, options, placeholder, hint, numeric }: { form: FormLike; path: string; label: string; options: Array<{ value: string; label: string }>; placeholder: string; hint?: string; numeric?: boolean }) {
  return (
    <Field form={form} path={path} label={label} hint={hint}>
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <Select
            value={field.value !== undefined && field.value !== null && field.value !== "" ? String(field.value) : undefined}
            onValueChange={(value) => {
              field.onChange(numeric ? Number(value) : value);
              form.clearErrors(path);
            }}
          >
            <SelectTrigger id={path} className="h-11 w-full">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </Field>
  );
}

function ChoiceField({ form, path, label, options, hint }: { form: FormLike; path: string; label: string; options: Array<{ value: string; label: string; hint?: string }>; hint?: string }) {
  return (
    <Field form={form} path={path} label={label} hint={hint}>
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <div className="grid gap-2 sm:grid-cols-2">
            {options.map((option) => {
              const selected = field.value === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    field.onChange(option.value);
                    form.clearErrors(path);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl border-2 p-3 text-left text-sm transition-all",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/40",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-medium">{option.label}</span>
                    {option.hint && <span className="text-xs text-muted-foreground">{option.hint}</span>}
                  </span>
                  {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      />
    </Field>
  );
}

function DateField({ form, path, label, birth }: { form: FormLike; path: string; label: string; birth?: boolean }) {
  const year = new Date().getFullYear();
  return (
    <Field form={form} path={path} label={label}>
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <DateInput
            id={path}
            name={field.name}
            value={field.value ? String(field.value).slice(0, 10) : undefined}
            onChange={(value) => {
              field.onChange(value || "");
              form.clearErrors(path);
            }}
            onBlur={field.onBlur}
            {...(birth ? { autoComplete: "bday", fromYear: year - 120, toYear: year } : {})}
          />
        )}
      />
    </Field>
  );
}

function NumberField({ form, path, label, unit, hint, min = 0, max, decimal }: { form: FormLike; path: string; label: string; unit?: string; hint?: string; min?: number; max?: number; decimal?: boolean }) {
  return (
    <Field form={form} path={path} label={label} hint={hint}>
      <NumberInputGroup
        field={form.register(path, { onChange: () => form.clearErrors(path) })}
        min={min}
        max={max}
        step={decimal ? 0.01 : 1}
        isDecimal={decimal}
        unit={unit}
        className="h-11"
      />
    </Field>
  );
}

function PhoneField({ form, path, label }: { form: FormLike; path: string; label: string }) {
  return (
    <Field form={form} path={path} label={label}>
      <Controller
        name={path}
        control={form.control}
        render={({ field }) => (
          <PhoneInput
            id={path}
            value={field.value || undefined}
            onChange={(value: any) => {
              field.onChange(value || "");
              form.clearErrors(path);
            }}
          />
        )}
      />
    </Field>
  );
}

const FURNITURE_LABELS: Record<string, string> = {
  hasLiterie: "Literie avec couette ou couverture",
  hasRideaux: "Volets ou rideaux dans les chambres",
  hasPlaquesCuisson: "Plaques de cuisson",
  hasFour: "Four ou four à micro-ondes",
  hasRefrigerateur: "Réfrigérateur",
  hasCongelateur: "Congélateur ou compartiment à congélation (-6° max)",
  hasVaisselle: "Vaisselle en nombre suffisant",
  hasUstensilesCuisine: "Ustensiles de cuisine",
  hasTable: "Table",
  hasSieges: "Sièges",
  hasEtageresRangement: "Étagères de rangement",
  hasLuminaires: "Luminaires",
  hasMaterielEntretien: "Matériel d'entretien ménager adapté",
};

function FurnitureChecklist({ form }: { form: FormLike }) {
  const missing = FURNITURE_KEYS.filter((key) => !!errorAt(form, key)).length;
  return (
    <div className="space-y-2">
      <div>
        <p className="text-[13.5px] font-medium">Mobilier obligatoire d&apos;un logement meublé</p>
        <p className="text-[12.5px] text-slate-500">Cochez ce qui est fourni : tout est exigé par la loi pour une location meublée.</p>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {FURNITURE_KEYS.map((key) => (
          <Controller
            key={key}
            name={key}
            control={form.control}
            render={({ field }) => (
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-[13px] transition-colors",
                  field.value ? "border-primary/40 bg-primary/5" : errorAt(form, key) ? "border-red-200 bg-red-50/60" : "border-border hover:bg-muted/40",
                )}
              >
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(on) => {
                    field.onChange(on === true);
                    form.clearErrors(key);
                  }}
                />
                {FURNITURE_LABELS[key]}
              </label>
            )}
          />
        ))}
      </div>
      {missing > 0 && <p className="text-[13px] font-medium text-red-700">Tout le mobilier listé est requis pour un bail meublé.</p>}
    </div>
  );
}

const PERSON_SPOUSE_FIELDS = { firstName: "", lastName: "", email: "", phone: "", fullAddress: "", profession: "", nationality: "", birthPlace: "", birthDate: "" };

/** Le conjoint qui doit aussi signer le bail commercial (bien commun). */
function SpouseFields({ form, index }: { form: FormLike; index: number }) {
  const p = (field: string) => `persons.${index}.${field}`;
  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/40 p-3.5">
      <div>
        <p className="text-[13.5px] font-semibold text-slate-900">Votre conjoint</p>
        <p className="text-[12.5px] leading-relaxed text-slate-500">
          Le local est un bien commun : votre conjoint doit aussi signer le bail commercial. Sa pièce d&apos;identité sera ajoutée à votre demande.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField form={form} path={p("firstName")} label="Prénom" />
        <TextField form={form} path={p("lastName")} label="Nom" />
        <TextField form={form} path={p("email")} label="E-mail" type="email" />
        <PhoneField form={form} path={p("phone")} label="Téléphone" />
        <DateField form={form} path={p("birthDate")} label="Date de naissance" birth />
        <TextField form={form} path={p("birthPlace")} label="Lieu de naissance" />
        <TextField form={form} path={p("profession")} label="Profession" />
        <Field form={form} path={p("nationality")} label="Nationalité">
          <Controller
            name={p("nationality")}
            control={form.control}
            render={({ field }) => <NationalitySelect value={field.value || undefined} onValueChange={field.onChange} />}
          />
        </Field>
      </div>
      <TextField form={form} path={p("fullAddress")} label="Adresse" multiline />
    </div>
  );
}

const SUBDIVISION_OPTIONS = [
  { value: "YES", label: "Oui, il y a plus de 10 ans" },
  { value: "NO", label: "Non, il y a moins de 10 ans" },
  { value: "UNKNOWN", label: "Je ne sais pas" },
];

const HABITATION_TYPES = [
  { value: "BAIL_NU_3_ANS", label: "Location vide", hint: "3 ans" },
  { value: "BAIL_NU_6_ANS", label: "Location vide (SCI)", hint: "6 ans" },
  { value: "BAIL_MEUBLE_1_ANS", label: "Location meublée", hint: "1 an" },
  { value: "BAIL_MEUBLE_9_MOIS", label: "Location meublée étudiant", hint: "9 mois" },
];

/** Dépôt de garantie, montré quand il dépasse le maximum (ou une fois montré). */
function DepositIfNeeded({ form, always = false }: { form: FormLike; always?: boolean }) {
  const values = form.getValues();
  const rent = Number.parseInt(String(values.bailRentAmount ?? ""), 10) || 0;
  const deposit = Number.parseInt(String(values.bailSecurityDeposit ?? ""), 10) || 0;
  const max = maxSecurityDeposit({ bailFamily: values.bailFamily, bailType: values.bailType, rentAmount: rent });
  const tooHigh = max !== null && deposit > max;
  const [shown, setShown] = React.useState(always || tooHigh);
  React.useEffect(() => {
    if (tooHigh) setShown(true);
  }, [tooHigh]);
  if (!shown && !errorAt(form, "bailSecurityDeposit")) return null;
  return (
    <NumberField
      form={form}
      path="bailSecurityDeposit"
      label="Dépôt de garantie"
      unit="€"
      hint={max !== null ? `Maximum ${max.toLocaleString("fr-FR")} € (${isFurnishedBail(values.bailType) ? "2 mois" : "1 mois"} de loyer hors charges).` : undefined}
    />
  );
}

function QuestionFields({ refQ, form, ctx }: { refQ: QuestionRef; form: FormLike; ctx: QuestionContext }) {
  const values = form.getValues();
  const i = refQ.personIndex ?? 0;
  const p = (field: string) => `persons.${i}.${field}`;
  const commercial = ctx.bailFamily === "COMMERCIAL";

  // Bail commercial d'un bien commun : le conjoint s'ajoute (ou se retire) selon les réponses.
  const needsSpouse = refQ.id === "person.family" && spouseRequired(values, ctx);
  const persons: any[] = values.persons ?? [];
  const spouseIndex = persons.findIndex((person) => person?.isNew);
  React.useEffect(() => {
    if (refQ.id !== "person.family") return;
    const current: any[] = form.getValues("persons") ?? [];
    const existing = current.findIndex((person) => person?.isNew);
    if (needsSpouse && current.length < 2 && existing < 0) form.setValue("persons", [...current, { ...PERSON_SPOUSE_FIELDS, isNew: true }]);
    if (!needsSpouse && existing >= 0) form.setValue("persons", current.filter((_, index) => index !== existing));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsSpouse]);

  switch (refQ.id) {
    case "person.identity":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} path={p("firstName")} label="Prénom" />
          <TextField form={form} path={p("lastName")} label="Nom" />
        </div>
      );
    case "person.birth":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField form={form} path={p("birthDate")} label="Date de naissance" birth />
          <TextField form={form} path={p("birthPlace")} label="Lieu de naissance" placeholder="Ex. : Lyon (69)" />
        </div>
      );
    case "person.nationality":
      return (
        <Field form={form} path={p("nationality")} label="Nationalité">
          <Controller
            name={p("nationality")}
            control={form.control}
            render={({ field }) => (
              <NationalitySelect
                value={field.value || undefined}
                onValueChange={(value: string) => {
                  field.onChange(value);
                  form.clearErrors(p("nationality"));
                }}
              />
            )}
          />
        </Field>
      );
    case "person.profession":
      return <TextField form={form} path={p("profession")} label="Profession" />;
    case "person.address":
      return <TextField form={form} path={p("fullAddress")} label="Adresse complète" multiline placeholder="Numéro, rue, code postal et ville" />;
    case "person.phone":
      return <PhoneField form={form} path={p("phone")} label="Téléphone" />;
    case "person.email":
      return <TextField form={form} path={p("email")} label="Adresse e-mail" type="email" />;
    case "person.family": {
      const status = values.persons?.[i]?.familyStatus;
      const regime = values.persons?.[i]?.matrimonialRegime;
      return (
        <div className="flex flex-col gap-4">
          <div className={cn("grid gap-3", status === "MARIE" && "sm:grid-cols-2")}>
            <Field form={form} path={p("familyStatus")} label="Situation familiale">
              <Controller
                name={p("familyStatus")}
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(value) => {
                      field.onChange(value);
                      form.clearErrors(p("familyStatus"));
                      if (value !== "MARIE") form.setValue(p("matrimonialRegime"), "");
                    }}
                  >
                    <SelectTrigger id={p("familyStatus")} className="h-11 w-full">
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(FAMILY_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            {status === "MARIE" && (
              <SelectField
                form={form}
                path={p("matrimonialRegime")}
                label="Régime matrimonial"
                placeholder="Choisir"
                options={Object.entries(MATRIMONIAL_REGIME_LABELS).map(([value, label]) => ({ value, label }))}
                hint="Sans contrat signé chez un notaire : « Communauté réduite aux acquêts »."
              />
            )}
          </div>
          {i === 0 && commercial && ctx.target === "OWNER" && asksBoughtDuringMarriage(status, regime) && (
            <>
              <BoughtDuringMarriageQuestion form={form} />
              <FieldError form={form} path="commercial.boughtDuringMarriage" />
            </>
          )}
          {needsSpouse && spouseIndex >= 0 && <SpouseFields form={form} index={spouseIndex} />}
        </div>
      );
    }
    case "company.identity":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField form={form} path="entreprise.legalName" label="Raison sociale" />
            <TextField form={form} path="entreprise.name" label="Nom commercial" />
          </div>
          <TextField form={form} path="entreprise.registration" label="Numéro d'immatriculation (SIREN ou SIRET)" />
          {ctx.target === "TENANT" && commercial && (
            <ChoiceField
              form={form}
              path="entreprise.isRegistered"
              label="La société est-elle déjà immatriculée ?"
              options={[
                { value: "yes", label: "Oui" },
                { value: "no", label: "Non, en cours de création" },
              ]}
            />
          )}
          <TextField form={form} path="entreprise.fullAddress" label="Adresse du siège" multiline />
        </div>
      );
    case "company.phone":
      return <PhoneField form={form} path="entreprise.phone" label="Téléphone de la société" />;
    case "company.representative":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} path="entreprise.representativeName" label="Nom du représentant légal" />
          <TextField form={form} path="entreprise.representativeRole" label="Sa qualité" placeholder="Ex. : gérant, président" />
        </div>
      );
    case "property.address":
      return (
        <Field form={form} path="propertyFullAddress" label="Adresse du bien">
          <AddressAutocomplete
            value={values.propertyFullAddress || ""}
            onAddressSelect={(address: AddressData) => {
              form.setValue("propertyFullAddress", address.fullAddress);
              form.setValue("propertyHousenumber", address.housenumber || "");
              form.setValue("propertyStreet", address.street || "");
              form.setValue("propertyCity", address.city);
              form.setValue("propertyPostalCode", address.postalCode);
              form.setValue("propertyDistrict", address.district || "");
              form.setValue("propertyInseeCode", address.inseeCode);
              form.setValue("propertyDepartment", address.department || "");
              form.setValue("propertyRegion", address.region || "");
              form.setValue("propertyLatitude", address.latitude ? String(address.latitude) : "");
              form.setValue("propertyLongitude", address.longitude ? String(address.longitude) : "");
              form.clearErrors("propertyFullAddress");
            }}
            onChange={(value: string) => {
              // Texte modifié à la main : la commune n'est plus connue tant qu'une suggestion n'est pas choisie.
              form.setValue("propertyFullAddress", value);
              form.setValue("propertyInseeCode", "");
              form.setValue("propertyLatitude", "");
              form.setValue("propertyLongitude", "");
            }}
            placeholder="Rechercher l'adresse…"
          />
        </Field>
      );
    case "property.surface":
      return (
        <div className="flex flex-col gap-4">
          {commercial ? (
            <PremisesTypeField form={form} />
          ) : (
            <ChoiceField
              form={form}
              path="propertyType"
              label="Type de logement"
              options={[
                { value: "APPARTEMENT", label: "Appartement", hint: "Dans un immeuble collectif" },
                { value: "MAISON", label: "Maison", hint: "Maison ou pavillon" },
              ]}
            />
          )}
          <NumberField
            form={form}
            path="propertySurfaceM2"
            label="Surface"
            unit="m²"
            decimal
            hint={commercial ? undefined : "Surface habitable (loi Boutin), indiquée dans les diagnostics."}
          />
        </div>
      );
    case "property.legalStatus":
      return (
        <div className="flex flex-col gap-4">
          <SelectField
            form={form}
            path="propertyLegalStatus"
            label="Régime juridique"
            placeholder="Choisir"
            options={[
              { value: "PLEIN_PROPRIETE", label: "Monopropriété" },
              { value: "CO_PROPRIETE", label: "Copropriété" },
              { value: "LOTISSEMENT", label: "Lotissement" },
            ]}
          />
          {values.propertyLegalStatus === "CO_PROPRIETE" && (
            <div className="space-y-3 rounded-xl border p-3.5">
              <div>
                <p className="text-[13.5px] font-semibold">Syndic de copropriété</p>
                <p className="text-[12.5px] text-slate-500">Le notaire peut lui demander directement certains documents de l&apos;immeuble.</p>
              </div>
              <TextField form={form} path="propertySyndicName" label="Nom du syndic" placeholder="Ex. : Foncia Paris 15, ou nom du syndic bénévole" />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField form={form} path="propertySyndicEmail" label="E-mail du syndic" type="email" />
                <TextField form={form} path="propertySyndicPhone" label="Téléphone du syndic" type="tel" />
              </div>
            </div>
          )}
          {values.propertyLegalStatus === "LOTISSEMENT" && (
            <ChoiceField
              form={form}
              path="propertySubdivisionOver10Years"
              label="Le lotissement a-t-il été créé il y a plus de 10 ans ?"
              hint="La date figure dans votre acte d'achat (arrêté de lotissement ou permis d'aménager)."
              options={SUBDIVISION_OPTIONS}
            />
          )}
        </div>
      );
    case "property.category":
      return (
        <div className="flex flex-col gap-3">
          <SelectField
            form={form}
            path="propertyMainRooms"
            label="Nombre de pièces principales"
            placeholder="Choisir"
            numeric
            hint="Séjour et chambres ; la cuisine et la salle de bains ne comptent pas."
            options={[1, 2, 3, 4].map((n) => ({ value: String(n), label: ROOMS_LABELS[n] }))}
          />
          <SelectField
            form={form}
            path="propertyConstructionPeriod"
            label="Époque de construction"
            placeholder="Choisir"
            options={OWNER_PERIODS.map((code) => ({ value: code, label: PERIOD_LABELS[code] }))}
          />
          <SelectField
            form={form}
            path="propertyDpeClass"
            label="Classe énergétique (DPE)"
            placeholder="Choisir"
            hint="Lettre de A à G, en première page de votre diagnostic de performance énergétique."
            options={["A", "B", "C", "D", "E", "F", "G"].map((cls) => ({ value: cls, label: `Classe ${cls}` }))}
          />
        </div>
      );
    case "property.shoppingCenter":
      return <CommercialPropertyDetails form={form} />;
    case "property.furniture":
      return <FurnitureChecklist form={form} />;
    case "bail.type":
      return (
        <div className="flex flex-col gap-4">
          <ChoiceField form={form} path="bailType" label="Type de location" options={HABITATION_TYPES} />
          {isFurnishedBail(values.bailType) && <FurnitureChecklist form={form} />}
          <DepositIfNeeded form={form} />
        </div>
      );
    case "bail.rent":
      return (
        <div className="flex flex-col gap-4">
          <NumberField form={form} path="bailRentAmount" label="Loyer mensuel hors charges" unit="€" min={1} />
          <DepositIfNeeded form={form} />
        </div>
      );
    case "bail.charges":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField form={form} path="bailMonthlyCharges" label="Charges mensuelles" unit="€" hint="Mettez 0 s'il n'y en a pas." />
          <DepositIfNeeded form={form} always />
        </div>
      );
    case "bail.dates":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <DateField form={form} path="bailEffectiveDate" label="Date de prise d'effet" />
          <NumberField form={form} path="bailPaymentDay" label="Jour de paiement du loyer" min={1} max={31} hint="Ex. : 5 pour le 5 de chaque mois." />
        </div>
      );
    case "bail.rentRules": {
      const r = values.rentRules ?? {};
      const leftAt = r.previousTenantLeftAt ? new Date(String(r.previousTenantLeftAt)) : null;
      const vacant = !!leftAt && !Number.isNaN(leftAt.getTime()) && leftAt <= new Date(new Date().setMonth(new Date().getMonth() - 18));
      return (
        <div className="flex flex-col gap-4">
          <p className="text-[12.5px] leading-relaxed text-slate-500">
            Le logement est en zone tendue : à la relocation, le nouveau loyer dépend en principe du loyer du locataire précédent.
          </p>
          <ChoiceField
            form={form}
            path="rentRules.relocationLetBefore"
            label="Le logement a-t-il déjà été loué ?"
            options={[
              { value: "yes", label: "Oui, il a déjà été loué" },
              { value: "no", label: "Non, première location" },
            ]}
          />
          {r.relocationLetBefore === "yes" && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <DateField form={form} path="rentRules.previousTenantLeftAt" label="Départ du locataire précédent" />
                <NumberField form={form} path="rentRules.previousRentAmount" label="Son dernier loyer hors charges" unit="€" />
              </div>
              {leftAt && !vacant && (
                <>
                  <ChoiceField
                    form={form}
                    path="rentRules.previousRentRevisedRecently"
                    label="Ce loyer a-t-il été révisé au cours des 12 derniers mois ?"
                    options={[
                      { value: "yes", label: "Oui" },
                      { value: "no", label: "Non" },
                    ]}
                  />
                  <SelectField
                    form={form}
                    path="rentRules.rentIncreaseReason"
                    label="Le nouveau loyer est-il plus élevé que le dernier ?"
                    placeholder="Choisir"
                    options={Object.entries(RENT_INCREASE_LABELS).map(([value, label]) => ({ value, label }))}
                  />
                  {r.rentIncreaseReason === "WORKS" && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <NumberField form={form} path="rentRules.worksAmount" label="Coût TTC des travaux" unit="€" />
                      <DateField form={form} path="rentRules.worksCompletedAt" label="Fin des travaux" />
                    </div>
                  )}
                  {r.rentIncreaseReason === "UNDERVALUED" && (
                    <NumberField
                      form={form}
                      path="rentRules.neighborhoodRent"
                      label="Loyer du voisinage pour un logement comparable"
                      unit="€"
                    />
                  )}
                </>
              )}
            </>
          )}
        </div>
      );
    }
    case "commercial.activity":
      return <CommercialActivityStep form={form} bare />;
    case "commercial.duration":
      return <CommercialDurationStep form={form} bare />;
    case "commercial.rent":
      return <CommercialRentStep form={form} bare />;
    case "commercial.deposit":
      return <CommercialDepositStep form={form} bare />;
    case "commercial.charges":
      return <CommercialChargesStep form={form} bare />;
    case "commercial.clauses":
      return <CommercialClausesStep form={form} bare />;
  }
}
