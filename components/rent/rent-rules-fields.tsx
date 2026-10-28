"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { DateInput } from "@/components/ui/date-picker";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkRentRules } from "@/lib/actions/rent-check";
import type { RentRulesAssessment } from "@/lib/rent-rules";
import type { RentRulesFormValues } from "@/lib/utils/rent-draft";
import { RELOCATION_MISSING, VACANCY_MONTHS, euros, isFrozenDpe, relocationSituation } from "@/lib/utils/rent-relocation";
import useIsMobile from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

/**
 * Contrôle du loyer dans les formulaires du propriétaire, sous forme de champs ordinaires :
 * - avant le loyer : « déjà loué ? » et le loyer du dernier locataire (zone tendue) ;
 * - sous le loyer : le maximum autorisé, comme pour le dépôt de garantie ;
 * - après le loyer : seulement les questions dont la réponse change le résultat.
 * Le moteur (côté serveur, le même que la fiche admin) dit ce qui manque : une question n'apparaît
 * que s'il en a besoin.
 */

const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

export interface RentRulesOptions {
  /** Faux tant que l'étape loyer n'est pas affichée. */
  enabled?: boolean;
  /** Formulaire propriétaire (lien d'intake) ou espace client (bien du propriétaire connecté). */
  token?: string;
  propertyId?: string;
  rentAmount: string | number | null | undefined;
  bailType: string | null | undefined;
  bailFamily?: string | null;
  effectiveDate?: string | null;
  /** Classe DPE du bien. Sans valeur et avec onDpeChange, elle est demandée quand elle sert au calcul. */
  dpeClass?: string | null;
  onDpeChange?: (value: string) => void;
  values: RentRulesFormValues;
  onChange: (patch: Partial<RentRulesFormValues>) => void;
  /** Résultat du contrôle (null pendant le calcul) : le parent bloque l'étape si ownerBlocking. */
  onResult?: (result: RentRulesAssessment | null) => void;
  /** Après une tentative de validation : affiche les réponses manquantes. */
  showErrors?: boolean;
  /** « Mettre … » : remplace le loyer saisi par le maximum autorisé. */
  onApplyRent?: (rent: number) => void;
}

export interface RentRules extends RentRulesOptions {
  rent: number;
  result: RentRulesAssessment | null;
  loading: boolean;
  error: string | null;
  /** Atouts exceptionnels (complément de loyer) : « oui » ouvre la description. */
  supplementChoice: "" | "yes" | "no";
  setSupplementChoice: (value: "" | "yes" | "no") => void;
}

export function useRentRules(options: RentRulesOptions): RentRules {
  const { enabled = true, token, propertyId, bailType, bailFamily, effectiveDate, dpeClass, values } = options;
  const rent = Number(String(options.rentAmount ?? "").replace(",", ".")) || 0;
  const [result, setResult] = React.useState<RentRulesAssessment | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [supplementChoice, setSupplementChoice] = React.useState<"" | "yes" | "no">(
    values.rentSupplementReason.trim() ? "yes" : "",
  );
  const onResultRef = React.useRef(options.onResult);
  onResultRef.current = options.onResult;

  const answersKey = JSON.stringify(values);
  React.useEffect(() => {
    if (!enabled || !bailType || (!token && !propertyId)) return;
    let cancelled = false;
    setLoading(true);
    onResultRef.current?.(null);
    const timer = setTimeout(async () => {
      try {
        const response = await checkRentRules({
          token,
          propertyId,
          rentAmount: Math.round(rent),
          bailType,
          bailFamily: bailFamily ?? null,
          effectiveDate: effectiveDate || null,
          dpeClass: (dpeClass || null) as any,
          answers: JSON.parse(answersKey),
        });
        if (cancelled) return;
        if (response.success) {
          setResult(response.data);
          setError(null);
          onResultRef.current?.(response.data);
        } else {
          setError(response.error);
          onResultRef.current?.(null);
        }
      } catch {
        if (!cancelled) setError("Impossible de vérifier le loyer pour le moment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, token, propertyId, rent, bailType, bailFamily, effectiveDate, dpeClass, answersKey]);

  return { ...options, rent, result, loading, error, supplementChoice, setSupplementChoice };
}

/** Quelles questions poser, d'après les réponses déjà données et ce qui manque au calcul. */
function questions(rules: RentRules) {
  const { result, values, dpeClass, onDpeChange } = rules;
  const relocation = result?.relocation;
  const supplement = result?.supplement;
  const missing = relocation?.missing ?? [];
  const tight = !!relocation && relocation.notConcerned === null;
  const frozen = isFrozenDpe(dpeClass);
  const letBefore = tight && values.relocationLetBefore === "yes";
  const situation = relocationSituation({
    relocationLetBefore: values.relocationLetBefore === "yes" ? true : values.relocationLetBefore === "no" ? false : null,
    previousTenantLeftAt: values.previousTenantLeftAt || null,
  });
  const dpeMissing = !dpeClass && !!onDpeChange;
  const reason = values.rentIncreaseReason;
  const askReason =
    letBefore && situation === "relet" && !frozen && (relocation?.status === "over" || reason === "WORKS" || reason === "UNDERVALUED");
  const supplementPossible = !!supplement?.needed && !supplement.forbidden && supplement.base !== null && relocation?.status !== "over";
  return {
    letBefore: tight,
    previousRent: letBefore && (!(situation === "vacant" && !frozen) || !!values.previousRentAmount),
    dpeBefore: letBefore && dpeMissing,
    leftAt: letBefore && (missing.includes(RELOCATION_MISSING.leftAt) || !!values.previousTenantLeftAt),
    revised:
      letBefore && situation === "relet" && !frozen && (missing.includes(RELOCATION_MISSING.revised) || !!values.previousRentRevisedRecently),
    reason: askReason,
    worksAmount: askReason && reason === "WORKS",
    worksDate: askReason && reason === "WORKS" && (missing.includes(RELOCATION_MISSING.worksDate) || !!values.worksCompletedAt),
    neighborhood:
      askReason && reason === "UNDERVALUED" && (missing.includes(RELOCATION_MISSING.neighborhood) || !!values.neighborhoodRent),
    dpeAfter: !(letBefore && dpeMissing) && dpeMissing && !!supplement?.needed,
    supplement: supplementPossible && relocation?.status !== "missing",
  };
}

/** Questions à poser avant le loyer : le logement a-t-il déjà été loué, et à quel loyer. */
export function RentHistoryFields({ rules }: { rules: RentRules }) {
  const ask = questions(rules);
  const { values, onChange, showErrors } = rules;
  if (!ask.letBefore) return null;
  return (
    <>
      <Field
        id="rent-let-before"
        label="Le logement a-t-il déjà été loué ? *"
        help="Dans votre commune, le loyer d'un logement déjà loué ne peut pas augmenter librement d'un locataire à l'autre."
        error={showErrors && !values.relocationLetBefore ? "Indiquez si le logement a déjà été loué" : undefined}
      >
        <ChoiceSelect
          id="rent-let-before"
          value={values.relocationLetBefore}
          onChange={(value) => onChange({ relocationLetBefore: value as "yes" | "no" })}
          options={[
            { value: "yes", label: "Oui" },
            { value: "no", label: "Non, c'est la première location" },
          ]}
        />
      </Field>
      {ask.dpeBefore && <DpeField rules={rules} />}
      {ask.previousRent && (
        <Field
          id="rent-previous"
          label="Loyer du dernier locataire *"
          help="Son dernier loyer mensuel, sans les charges."
          error={showErrors && !(Number(values.previousRentAmount) > 0) ? "Indiquez le loyer du dernier locataire" : undefined}
        >
          <NumberInputGroup
            value={values.previousRentAmount}
            onChange={(value) => onChange({ previousRentAmount: value ? String(value) : "" })}
            min={0}
            step={1}
            unit="€"
            className="h-11"
          />
        </Field>
      )}
    </>
  );
}

/** Sous le loyer : le maximum autorisé, ou ce qui ne va pas (comme le dépôt de garantie). */
export function RentLimitHint({ rules }: { rules: RentRules }) {
  const { result, loading, error, rent, onApplyRent, supplementChoice } = rules;
  if (!rent) return null;
  if (!result) {
    if (error) return <p className="text-xs text-muted-foreground">{error} Notre équipe vérifiera le loyer.</p>;
    return loading ? (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Vérification du loyer…
      </p>
    ) : null;
  }

  const { relocation, supplement, maxRent, overBy } = result;
  const apply = (value: number) =>
    onApplyRent ? (
      <button
        type="button"
        onClick={() => onApplyRent(value)}
        className="ml-1 font-semibold underline underline-offset-2 hover:no-underline"
      >
        Mettre {euros(value)}
      </button>
    ) : null;
  const over = overBy !== null && overBy > 0 && maxRent !== null;
  const supplementPossible = supplement.needed && !supplement.forbidden && relocation.status !== "over";

  // Plafond de la ville dépassé dans un logement F ou G : pas de complément possible.
  if (supplement.needed && supplement.forbidden && relocation.status !== "over" && supplement.base !== null) {
    return (
      <Problem
        limit={`Maximum pour ce logement : ${euros(supplement.base)}`}
        text="Un logement classé F ou G ne peut pas être loué plus cher."
        action={apply(supplement.base)}
      />
    );
  }
  if (supplement.needed && supplement.dpeUnknown && relocation.status !== "over") {
    return <p className="text-xs text-muted-foreground">Indiquez la classe énergétique ci-dessous pour vérifier ce loyer.</p>;
  }
  if (over && supplementPossible && supplement.base !== null) {
    if (relocation.status === "missing") {
      return <p className="text-xs text-muted-foreground">Plafond de la ville pour ce logement : {euros(supplement.base)}</p>;
    }
    if (supplementChoice === "yes") {
      return (
        <p className="text-xs text-muted-foreground">
          Plafond de la ville pour ce logement : {euros(supplement.base)}. Décrivez ci-dessous ce qui justifie les{" "}
          {euros(supplement.amount ?? 0)} en plus.
        </p>
      );
    }
    return (
      <Problem
        tone={supplementChoice === "no" ? "error" : "warn"}
        limit={`Plafond de la ville pour ce logement : ${euros(supplement.base)}`}
        text={`Votre loyer le dépasse de ${euros(supplement.amount ?? 0)}.`}
        action={apply(supplement.base)}
      />
    );
  }
  if (over) {
    return (
      <Problem
        limit={`Maximum pour ce logement : ${euros(maxRent!)}`}
        text={`Votre loyer le dépasse de ${euros(overBy!)}.`}
        action={apply(Math.floor(maxRent!))}
      />
    );
  }
  if (relocation.status === "missing") return null;
  if (supplement.accepted && supplement.base !== null) {
    return (
      <Fine>
        Loyer de {euros(supplement.base)} + {euros(supplement.amount ?? 0)} pour les atouts du logement.
      </Fine>
    );
  }
  if (maxRent !== null) {
    if (relocation.provisional && relocation.maxRent === maxRent) {
      return <Fine>Loyer conforme : il ne dépasse pas celui du dernier locataire.</Fine>;
    }
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Maximum pour ce logement : {euros(maxRent)}
        <Detail result={result} />
      </p>
    );
  }
  if (relocation.freeReason === "first") return <Fine>Première location : vous fixez le loyer librement.</Fine>;
  if (relocation.freeReason === "vacant") return <Fine>Logement vide depuis plus de {VACANCY_MONTHS} mois : vous fixez le loyer librement.</Fine>;
  if (relocation.freeReason === "works") return <Fine>Après vos travaux, vous fixez le loyer librement.</Fine>;
  return null;
}

/** Questions à poser après le loyer, seulement quand la réponse change le résultat. */
export function RentFollowUpFields({ rules }: { rules: RentRules }) {
  const ask = questions(rules);
  const { values, onChange, showErrors, result, supplementChoice, setSupplementChoice } = rules;
  const capBase = result?.supplement.base ?? null;
  return (
    <>
      {ask.leftAt && (
        <Field
          id="rent-left-at"
          label="Date de départ du dernier locataire *"
          help={`Si le logement est vide depuis plus de ${VACANCY_MONTHS} mois, vous fixez le loyer librement.`}
          error={showErrors && !values.previousTenantLeftAt ? "Indiquez la date de départ du dernier locataire" : undefined}
        >
          <DateInput
            id="rent-left-at"
            value={values.previousTenantLeftAt || undefined}
            onChange={(value) => onChange({ previousTenantLeftAt: value || "" })}
          />
        </Field>
      )}

      {ask.revised && (
        <Field
          id="rent-revised"
          label="Son loyer a-t-il augmenté au cours des 12 derniers mois ? *"
          help="Si ce n'est pas le cas, vous pouvez ajouter la petite hausse annuelle autorisée par la loi."
          error={showErrors && !values.previousRentRevisedRecently ? "Indiquez si son loyer a augmenté" : undefined}
        >
          <ChoiceSelect
            id="rent-revised"
            value={values.previousRentRevisedRecently}
            onChange={(value) => onChange({ previousRentRevisedRecently: value as "yes" | "no" })}
            options={[
              { value: "no", label: "Non" },
              { value: "yes", label: "Oui" },
            ]}
          />
        </Field>
      )}

      {ask.reason && (
        <Field
          id="rent-increase-reason"
          label="Pourquoi augmentez-vous le loyer ? *"
          help="Sans l'une de ces raisons, le loyer ne peut pas dépasser celui du dernier locataire, plus la hausse annuelle autorisée."
          error={showErrors && !values.rentIncreaseReason ? "Choisissez une réponse ou baissez le loyer" : undefined}
        >
          <ChoiceSelect
            id="rent-increase-reason"
            value={values.rentIncreaseReason}
            onChange={(value) => onChange({ rentIncreaseReason: value as RentRulesFormValues["rentIncreaseReason"] })}
            options={[
              { value: "WORKS", label: "J'ai fait des travaux d'amélioration" },
              { value: "UNDERVALUED", label: "L'ancien loyer était trop bas pour le quartier" },
              { value: "NONE", label: "Aucune de ces raisons" },
            ]}
          />
        </Field>
      )}

      {ask.worksAmount && (
        <Field
          id="rent-works-amount"
          label="Coût des travaux *"
          help="Le montant total payé, toutes taxes comprises."
          error={showErrors && !(Number(values.worksAmount) > 0) ? "Indiquez le coût des travaux" : undefined}
        >
          <NumberInputGroup
            value={values.worksAmount}
            onChange={(value) => onChange({ worksAmount: value ? String(value) : "" })}
            min={0}
            step={1}
            unit="€"
            className="h-11"
          />
        </Field>
      )}

      {ask.worksDate && (
        <Field
          id="rent-works-date"
          label="Date de fin des travaux *"
          help="Des travaux récents (moins de 6 mois) qui coûtent au moins une année de loyer permettent de fixer le loyer librement."
          error={showErrors && !values.worksCompletedAt ? "Indiquez la date de fin des travaux" : undefined}
        >
          <DateInput
            id="rent-works-date"
            value={values.worksCompletedAt || undefined}
            onChange={(value) => onChange({ worksCompletedAt: value || "" })}
          />
        </Field>
      )}

      {ask.neighborhood && (
        <Field
          id="rent-neighborhood"
          label="Loyer d'un logement comparable du quartier *"
          help="Même surface et même nombre de pièces, dans le même quartier, sans les charges."
          error={showErrors && !(Number(values.neighborhoodRent) > 0) ? "Indiquez le loyer d'un logement comparable" : undefined}
        >
          <NumberInputGroup
            value={values.neighborhoodRent}
            onChange={(value) => onChange({ neighborhoodRent: value ? String(value) : "" })}
            min={0}
            step={1}
            unit="€"
            className="h-11"
          />
        </Field>
      )}

      {ask.dpeAfter && <DpeField rules={rules} />}

      {ask.supplement && capBase !== null && (
        <>
          <Field
            id="rent-supplement"
            label="Le logement a-t-il des atouts exceptionnels ? *"
            help="Une grande terrasse, une vue rare, des prestations haut de gamme… Seuls ces atouts permettent de louer au-dessus du plafond de la ville."
            error={showErrors && !supplementChoice ? "Indiquez si le logement a des atouts exceptionnels" : undefined}
          >
            <ChoiceSelect
              id="rent-supplement"
              value={supplementChoice}
              onChange={(value) => {
                setSupplementChoice(value as "yes" | "no");
                if (value === "no") onChange({ rentSupplementReason: "" });
              }}
              options={[
                { value: "yes", label: "Oui" },
                { value: "no", label: "Non" },
              ]}
            />
          </Field>
          {supplementChoice === "yes" && (
            <Field
              id="rent-supplement-reason"
              label="Décrivez ces atouts *"
              error={showErrors && !values.rentSupplementReason.trim() ? "Décrivez les atouts du logement" : undefined}
            >
              <Textarea
                id="rent-supplement-reason"
                value={values.rentSupplementReason}
                maxLength={1000}
                rows={3}
                placeholder="Ex. : terrasse de 25 m² avec vue dégagée sur la Seine"
                onChange={(event) => onChange({ rentSupplementReason: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Le bail indiquera un loyer de {euros(capBase)} et {euros(result?.supplement.amount ?? 0)} pour ces atouts.
              </p>
            </Field>
          )}
        </>
      )}
    </>
  );
}

function DpeField({ rules }: { rules: RentRules }) {
  const { dpeClass, onDpeChange, showErrors } = rules;
  return (
    <Field
      id="rent-dpe"
      label="Classe énergétique (DPE) *"
      help="La lettre de A à G en première page du diagnostic de performance énergétique."
      error={showErrors && !dpeClass ? "Indiquez la classe énergétique du logement" : undefined}
    >
      <ChoiceSelect
        id="rent-dpe"
        value={dpeClass || ""}
        onChange={(value) => onDpeChange?.(value)}
        placeholder="Choisir la classe énergétique"
        options={DPE_CLASSES.map((cls) => ({ value: cls, label: `Classe ${cls}` }))}
      />
    </Field>
  );
}

/** Calcul du maximum, en phrases simples, dans l'info-bulle à côté du maximum. */
function Detail({ result }: { result: RentRulesAssessment }) {
  const isMobile = useIsMobile();
  const { cap, relocation } = result;
  const lines: string[] = [];
  const relocationMax = relocation.maxRent != null && relocation.previousRent ? relocation.maxRent : null;
  const capMax = cap.maxRent != null && cap.surface && cap.validity === "in" ? cap.maxRent : null;
  if (relocationMax !== null) {
    lines.push(`Loyer du dernier locataire : ${euros(relocation.previousRent!)}.`);
    if (relocation.irl.applied && relocation.revisedRent != null) {
      lines.push(
        `Avec la hausse annuelle autorisée (+ ${((relocation.irl.rate ?? 0) * 100).toFixed(2).replace(".", ",")} %) : ${euros(relocation.revisedRent)}.`,
      );
    }
    if (relocation.increase?.accepted && relocation.increase.amount != null) {
      lines.push(
        `${relocation.increase.kind === "undervalued" ? "Rattrapage sur le loyer du quartier" : "Hausse permise par vos travaux"} : + ${euros(relocation.increase.amount)}.`,
      );
    }
  }
  if (capMax !== null) lines.push(`Plafond fixé par la ville pour ${cap.surface} m² : ${euros(capMax)}.`);
  if (relocationMax !== null && capMax !== null) lines.push("Le montant le plus bas s'applique.");
  if (!lines.length) return null;
  return (
    <InfoTooltip
      content={
        <ul className="space-y-1">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      }
      className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}
    >
      <button type="button" className="inline-flex items-center" aria-label="Comment ce maximum est calculé">
        <Info className="size-3.5 text-muted-foreground" />
      </button>
    </InfoTooltip>
  );
}

function Problem({
  limit,
  text,
  action,
  tone = "error",
}: {
  limit: string;
  text: string;
  action: React.ReactNode;
  tone?: "error" | "warn";
}) {
  const color = tone === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-300";
  return (
    <>
      <p className={cn("text-xs font-medium", color)}>{limit}</p>
      <p className={cn("flex flex-wrap items-center gap-x-1 text-sm", color)}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        {text}
        {action}
      </p>
    </>
  );
}

function Fine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
      <CheckCircle2 className="size-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** Un champ comme les autres du formulaire : libellé, aide en info-bulle, contrôle, erreur. */
function Field({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id}>{label}</Label>
        {help && (
          <InfoTooltip content={<p>{help}</p>} className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}>
            <button type="button" className="inline-flex items-center" aria-label={`Aide : ${label.replace(" *", "")}`}>
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          </InfoTooltip>
        )}
      </div>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ChoiceSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Choisir",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="h-11 w-full">
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
  );
}
