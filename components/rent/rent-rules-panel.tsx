"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { DateInput } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkRentRules } from "@/lib/actions/rent-check";
import type { RentRulesAssessment } from "@/lib/rent-rules";
import type { RentRulesFormValues } from "@/lib/utils/rent-draft";
import { PROOF_LABELS, VACANCY_MONTHS, euros, isFrozenDpe, relocationSituation, relocationSummaryLines } from "@/lib/utils/rent-relocation";
import { cn } from "@/lib/utils";

const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

export interface RentRulesPanelProps {
  /** Formulaire propriétaire (lien d'intake) ou espace client (bien du propriétaire connecté). */
  token?: string;
  propertyId?: string;
  rentAmount: string | number | null | undefined;
  bailType: string | null | undefined;
  bailFamily?: string | null;
  effectiveDate?: string | null;
  /** Classe DPE du bien. Sans valeur et avec onDpeChange, le panneau la demande quand elle sert au calcul. */
  dpeClass?: string | null;
  onDpeChange?: (value: string) => void;
  values: RentRulesFormValues;
  onChange: (patch: Partial<RentRulesFormValues>) => void;
  /** Résultat du contrôle (null pendant le calcul) : le parent bloque l'étape si ownerBlocking. */
  onResult?: (result: RentRulesAssessment | null) => void;
  /** Après une tentative de validation : met en évidence les réponses manquantes. */
  showErrors?: boolean;
  /** « Mettre le loyer à … » : remplace le loyer saisi par le maximum autorisé. */
  onApplyRent?: (rent: number) => void;
}

type Tone = "neutral" | "ok" | "warn" | "error";

/**
 * Vérification du loyer dans les formulaires du propriétaire, en langage simple : une réponse
 * en haut (le loyer respecte la loi, ou ce qu'il faut faire), puis seulement les questions utiles,
 * une à la fois. Le calcul (plafond de l'arrêté, relocation en zone tendue, complément de loyer)
 * se fait côté serveur avec le même moteur que la fiche admin.
 */
export function RentRulesPanel(props: RentRulesPanelProps) {
  const { token, propertyId, bailType, bailFamily, effectiveDate, dpeClass, onDpeChange, values, onChange, onResult, showErrors, onApplyRent } =
    props;
  const rent = Number(String(props.rentAmount ?? "").replace(",", ".")) || 0;
  const [result, setResult] = React.useState<RentRulesAssessment | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Complément de loyer : « oui, je décris les atouts » ouvre la zone de texte.
  const [describeSupplement, setDescribeSupplement] = React.useState(!!values.rentSupplementReason.trim());
  const onResultRef = React.useRef(onResult);
  onResultRef.current = onResult;

  const answersKey = JSON.stringify(values);
  React.useEffect(() => {
    if (!bailType || (!token && !propertyId)) return;
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
  }, [token, propertyId, rent, bailType, bailFamily, effectiveDate, dpeClass, answersKey]);

  if (error && !result) {
    return (
      <Shell tone="neutral" icon={Info} title="Vérification du loyer indisponible" text={`${error} Notre équipe le vérifiera.`} />
    );
  }
  if (!result) {
    return <Shell tone="neutral" icon={Loader2} spin title="Nous vérifions votre loyer…" />;
  }

  const { cap, relocation, supplement } = result;
  const tight = relocation.notConcerned === null;
  const frozen = isFrozenDpe(dpeClass);
  const situation = relocationSituation({
    relocationLetBefore: values.relocationLetBefore === "yes" ? true : values.relocationLetBefore === "no" ? false : null,
    previousTenantLeftAt: values.previousTenantLeftAt || null,
  });
  const askPreviousRent = situation === "relet" || (situation === "vacant" && frozen);
  const askRevised = situation === "relet" && !frozen;
  const previousRentKnown = Number(values.previousRentAmount) > 0;
  // Raison d'une hausse : seulement si le loyer dépasse le maximum (ou si une raison est déjà donnée).
  const askIncrease =
    askRevised &&
    previousRentKnown &&
    !!values.previousRentRevisedRecently &&
    (relocation.status === "over" || values.rentIncreaseReason === "WORKS" || values.rentIncreaseReason === "UNDERVALUED");
  const dpeNeeded = !dpeClass && !!onDpeChange && (supplement.needed || (tight && values.relocationLetBefore === "yes"));
  const supplementPossible = supplement.needed && !supplement.forbidden && relocation.status !== "over";
  const capBase = supplement.base;
  const required = (empty: boolean) => !!showErrors && empty;

  // Questions encore sans réponse (pour l'en-tête).
  const pending = [
    tight && !values.relocationLetBefore,
    tight && values.relocationLetBefore === "yes" && !values.previousTenantLeftAt,
    tight && askPreviousRent && !previousRentKnown,
    tight && askRevised && !values.previousRentRevisedRecently,
    dpeNeeded,
    relocation.status === "missing" && values.rentIncreaseReason === "WORKS" && (!values.worksAmount || !values.worksCompletedAt),
    relocation.status === "missing" && values.rentIncreaseReason === "UNDERVALUED" && !values.neighborhoodRent,
  ].filter(Boolean).length;

  const verdict = buildVerdict(result, { rent, pending, supplementPossible, describeSupplement });
  // Le loyer maximum à appliquer d'un clic quand le loyer saisi est trop élevé.
  const applyTo =
    rent > 0 && result.overBy !== null && result.overBy > 0 && result.maxRent !== null
      ? supplementPossible && capBase !== null
        ? capBase
        : Math.floor(result.maxRent)
      : null;

  const detailLines = [
    ...(cap.maxRent != null && cap.surface ? [`Plafond fixé par la ville pour ${cap.surface} m² : ${euros(cap.maxRent)} hors charges.`] : []),
    ...(tight ? relocationSummaryLines(relocation) : []),
  ];
  const proofs = relocation.proofs;
  const hasQuestions = tight || dpeNeeded || supplementPossible || (supplement.needed && supplement.forbidden);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Verdict tone={verdict.tone} icon={verdict.icon} title={verdict.title} text={verdict.text} loading={loading}>
        {applyTo !== null && onApplyRent && !describeSupplement && (
          <Button type="button" size="sm" variant={verdict.tone === "error" ? "default" : "outline"} className="mt-3 h-9" onClick={() => onApplyRent(applyTo)}>
            Mettre le loyer à {euros(applyTo)}
          </Button>
        )}
      </Verdict>

      {hasQuestions && (
        <div className="flex flex-col gap-5 border-t px-4 py-4 sm:px-5">
          {tight && (
            <Question
              label="Le logement a-t-il déjà été loué ?"
              hint="Dans votre commune, le loyer d'un logement reloué ne peut pas trop augmenter par rapport au précédent."
              error={required(!values.relocationLetBefore)}
            >
              <Choices
                value={values.relocationLetBefore}
                onChange={(value) => onChange({ relocationLetBefore: value as "yes" | "no" })}
                options={[
                  { value: "yes", label: "Oui, il a déjà eu un locataire" },
                  { value: "no", label: "Non, c'est la première location" },
                ]}
              />
            </Question>
          )}

          {tight && values.relocationLetBefore === "yes" && (
            <Question
              label="Quand le dernier locataire est-il parti ?"
              hint="La date de l'état des lieux de sortie."
              error={required(!values.previousTenantLeftAt)}
            >
              <DateInput
                value={values.previousTenantLeftAt || undefined}
                onChange={(value) => onChange({ previousTenantLeftAt: value })}
                aria-label="Date de départ du dernier locataire"
              />
            </Question>
          )}

          {dpeNeeded && (
            <Question
              label="Quelle est la classe énergétique (DPE) du logement ?"
              hint="La lettre de A à G en première page du diagnostic de performance énergétique."
              error={required(true)}
            >
              <Select value={dpeClass || ""} onValueChange={(value) => onDpeChange?.(value)}>
                <SelectTrigger className="h-11 w-full sm:w-64">
                  <SelectValue placeholder="Choisir la classe" />
                </SelectTrigger>
                <SelectContent>
                  {DPE_CLASSES.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      Classe {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Question>
          )}

          {tight && askPreviousRent && (
            <Question label="Combien payait-il de loyer, hors charges ?" hint="Son dernier loyer mensuel, sans les charges." error={required(!previousRentKnown)}>
              <NumberInputGroup
                value={values.previousRentAmount}
                onChange={(value) => onChange({ previousRentAmount: value ? String(value) : "" })}
                min={0}
                step={1}
                unit="€"
                className="h-11 sm:w-64"
              />
            </Question>
          )}

          {tight && askRevised && previousRentKnown && (
            <Question
              label="Avez-vous augmenté ce loyer au cours des 12 derniers mois ?"
              hint="Si ce n'est pas le cas, nous ajoutons automatiquement l'augmentation annuelle autorisée."
              error={required(!values.previousRentRevisedRecently)}
            >
              <Choices
                value={values.previousRentRevisedRecently}
                onChange={(value) => onChange({ previousRentRevisedRecently: value as "yes" | "no" })}
                options={[
                  { value: "no", label: "Non" },
                  { value: "yes", label: "Oui, il a déjà été augmenté" },
                ]}
              />
            </Question>
          )}

          {tight && askIncrease && (
            <Question label="Votre loyer est plus élevé que celui autorisé. Avez-vous une raison de l'augmenter ?">
              <Choices
                value={values.rentIncreaseReason || "NONE"}
                onChange={(value) => onChange({ rentIncreaseReason: value as RentRulesFormValues["rentIncreaseReason"] })}
                options={[
                  { value: "WORKS", label: "Oui, j'ai fait des travaux d'amélioration" },
                  { value: "UNDERVALUED", label: "Oui, l'ancien loyer était trop bas pour le quartier" },
                  { value: "NONE", label: "Non, je baisse le loyer" },
                ]}
                stacked
              />
            </Question>
          )}

          {tight && askIncrease && values.rentIncreaseReason === "WORKS" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Question label="Coût total des travaux, TTC" error={required(!values.worksAmount)}>
                <NumberInputGroup
                  value={values.worksAmount}
                  onChange={(value) => onChange({ worksAmount: value ? String(value) : "" })}
                  min={0}
                  step={1}
                  unit="€"
                  className="h-11"
                />
              </Question>
              <Question label="Fin des travaux" error={required(!values.worksCompletedAt)}>
                <DateInput
                  value={values.worksCompletedAt || undefined}
                  onChange={(value) => onChange({ worksCompletedAt: value })}
                  aria-label="Date de fin des travaux"
                />
              </Question>
            </div>
          )}

          {tight && askIncrease && values.rentIncreaseReason === "UNDERVALUED" && !(cap.reference && cap.surface) && (
            <Question
              label="Loyer d'un logement comparable dans le quartier, hors charges"
              hint="Même surface et nombre de pièces, dans le même quartier."
              error={required(!values.neighborhoodRent)}
            >
              <NumberInputGroup
                value={values.neighborhoodRent}
                onChange={(value) => onChange({ neighborhoodRent: value ? String(value) : "" })}
                min={0}
                step={1}
                unit="€"
                className="h-11 sm:w-64"
              />
            </Question>
          )}

          {supplementPossible && capBase !== null && pending === 0 && relocation.status !== "missing" && (
            <Question
              label="Votre logement a-t-il des atouts exceptionnels ?"
              hint="Une terrasse, une vue rare, des prestations haut de gamme… Ils permettent de demander un complément au-delà du maximum."
            >
              <Choices
                value={describeSupplement ? "yes" : values.rentSupplementReason.trim() ? "yes" : ""}
                onChange={(value) => {
                  if (value === "yes") {
                    setDescribeSupplement(true);
                    return;
                  }
                  setDescribeSupplement(false);
                  onChange({ rentSupplementReason: "" });
                  onApplyRent?.(capBase);
                }}
                options={[
                  { value: "yes", label: "Oui, je les décris" },
                  { value: "no", label: `Non, je mets le loyer à ${euros(capBase)}` },
                ]}
                stacked
              />
              {describeSupplement && (
                <div className="mt-3 space-y-2">
                  <Textarea
                    id="rent-supplement-reason"
                    aria-label="Atouts qui justifient le complément de loyer"
                    value={values.rentSupplementReason}
                    maxLength={1000}
                    rows={3}
                    placeholder="Ex. : terrasse de 25 m² avec vue dégagée sur la Seine"
                    onChange={(event) => onChange({ rentSupplementReason: event.target.value })}
                    className={cn(required(!values.rentSupplementReason.trim()) && "border-destructive")}
                  />
                  <p className="text-xs text-muted-foreground">
                    Le bail indiquera un loyer de {euros(capBase)} et un complément de {euros(supplement.amount ?? 0)}.
                  </p>
                </div>
              )}
            </Question>
          )}
        </div>
      )}

      {(proofs.length > 0 || detailLines.length > 0) && (
        <div className="flex flex-col gap-3 border-t bg-muted/40 px-4 py-3.5 text-sm sm:px-5">
          {proofs.length > 0 && (
            <div>
              <p className="font-medium">Justificatif{proofs.length > 1 ? "s" : ""} à fournir, même plus tard :</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                {proofs.map((kind) => (
                  <li key={kind}>
                    {PROOF_LABELS[kind]?.label} ({PROOF_LABELS[kind]?.hint.charAt(0).toLowerCase()}
                    {PROOF_LABELS[kind]?.hint.slice(1).replace(/\.$/, "")})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {detailLines.length > 0 && (
            <details className="group">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-primary">
                Voir le détail du calcul
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="mt-2 space-y-1 text-[13px] text-muted-foreground">
                {detailLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** Ce que voit le propriétaire en premier : la réponse, en une phrase. */
function buildVerdict(
  result: RentRulesAssessment,
  ctx: { rent: number; pending: number; supplementPossible: boolean; describeSupplement: boolean },
): { tone: Tone; icon: React.ComponentType<{ className?: string }>; title: string; text?: string } {
  const { cap, relocation, supplement, maxRent, overBy } = result;
  const tight = relocation.notConcerned === null;

  if (!cap.territory && !tight) {
    if (relocation.notConcerned === "commercial") return { tone: "ok", icon: CheckCircle2, title: "Bail commercial : le loyer est libre" };
    if (relocation.notConcerned === "no_address")
      return { tone: "neutral", icon: Info, title: "Nous vérifierons le loyer avec l'adresse du bien", text: "Vous pouvez continuer." };
    return { tone: "ok", icon: CheckCircle2, title: "Vous fixez le loyer librement", text: "Votre commune n'impose pas de plafond de loyer." };
  }
  if (!ctx.rent) {
    return { tone: "neutral", icon: Info, title: "Indiquez le loyer", text: "Nous vérifions aussitôt qu'il respecte la loi de votre commune." };
  }
  const waiting = ctx.pending > 0 || relocation.status === "missing";
  const questionsVerdict = () => {
    const n = Math.max(ctx.pending, 1);
    return {
      tone: "neutral" as Tone,
      icon: Info,
      title: n > 1 ? `Encore ${n} questions pour vérifier votre loyer` : "Encore une question pour vérifier votre loyer",
      text: "Votre commune encadre les loyers : vos réponses nous permettent de calculer le maximum autorisé.",
    };
  };
  if (supplement.needed && supplement.dpeUnknown && relocation.status !== "over") {
    return { tone: "warn", icon: AlertTriangle, title: "Indiquez la classe énergétique (DPE) du logement" };
  }
  if (supplement.needed && supplement.forbidden && relocation.status !== "over") {
    return {
      tone: "error",
      icon: XCircle,
      title: `Votre loyer dépasse le maximum de ${euros(supplement.base ?? 0)}`,
      text: "Un logement classé F ou G ne peut pas avoir de complément de loyer : baissez le loyer pour continuer.",
    };
  }
  if (overBy !== null && overBy > 0 && maxRent !== null) {
    if (ctx.supplementPossible && waiting) {
      return {
        tone: "warn",
        icon: AlertTriangle,
        title: `Votre loyer dépasse le maximum de ${euros(supplement.base ?? maxRent)}`,
        text: "Baissez-le, ou répondez d'abord aux questions ci-dessous.",
      };
    }
    if (ctx.supplementPossible) {
      return ctx.describeSupplement
        ? {
            tone: "warn",
            icon: AlertTriangle,
            title: "Décrivez les atouts du logement",
            text: `Votre loyer dépasse le maximum de ${euros(supplement.base ?? maxRent)} : le complément doit être justifié.`,
          }
        : {
            tone: "warn",
            icon: AlertTriangle,
            title: `Votre loyer dépasse le maximum de ${euros(supplement.base ?? maxRent)}`,
            text: "Baissez-le, ou indiquez ci-dessous ce qui rend le logement exceptionnel.",
          };
    }
    return {
      tone: "error",
      icon: XCircle,
      title: `Votre loyer dépasse le maximum autorisé de ${euros(overBy)}`,
      text: `Pour ce logement, le loyer peut aller jusqu'à ${euros(maxRent)} hors charges.`,
    };
  }
  if (waiting) return questionsVerdict();
  if (supplement.accepted) {
    return {
      tone: "ok",
      icon: CheckCircle2,
      title: "Loyer accepté avec un complément",
      text: `Loyer de ${euros(supplement.base ?? 0)} et complément de ${euros(supplement.amount ?? 0)}. Notre équipe vérifiera la justification.`,
    };
  }
  if (maxRent !== null) {
    return {
      tone: "ok",
      icon: CheckCircle2,
      title: "Votre loyer respecte la loi",
      text: `Maximum autorisé pour ce logement : ${euros(maxRent)} hors charges.`,
    };
  }
  if (relocation.freeReason === "first") return { tone: "ok", icon: CheckCircle2, title: "Votre loyer respecte la loi", text: "Première location : le loyer est libre." };
  if (relocation.freeReason === "vacant")
    return { tone: "ok", icon: CheckCircle2, title: "Votre loyer respecte la loi", text: `Logement vide depuis ${VACANCY_MONTHS} mois ou plus : le loyer est libre.` };
  if (relocation.freeReason === "works")
    return { tone: "ok", icon: CheckCircle2, title: "Votre loyer respecte la loi", text: "Après d'importants travaux récents, le loyer est libre." };
  if (cap.territory && cap.maxRent == null && cap.status !== "not_concerned") {
    return { tone: "neutral", icon: Info, title: "Notre équipe vérifiera le plafond de loyer", text: "Vous pouvez continuer." };
  }
  return { tone: "ok", icon: CheckCircle2, title: "Votre loyer respecte la loi" };
}

const TONES: Record<Tone, { box: string; icon: string }> = {
  neutral: { box: "bg-muted/50", icon: "text-muted-foreground" },
  ok: { box: "bg-green-50 dark:bg-green-950/40", icon: "text-green-700 dark:text-green-400" },
  warn: { box: "bg-amber-50 dark:bg-amber-950/40", icon: "text-amber-700 dark:text-amber-400" },
  error: { box: "bg-red-50 dark:bg-red-950/40", icon: "text-red-700 dark:text-red-400" },
};

function Verdict({
  tone,
  icon: Icon,
  title,
  text,
  loading,
  spin,
  children,
}: {
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text?: string;
  loading?: boolean;
  spin?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-3.5 sm:px-5", TONES[tone].box)} role="status" aria-live="polite">
      <Icon className={cn("mt-0.5 size-5 shrink-0", TONES[tone].icon, spin && "animate-spin")} />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold leading-snug">{title}</p>
        {text && <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>}
        {children}
      </div>
      {loading && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Calcul en cours" />}
    </div>
  );
}

/** Verdict seul (chargement, erreur). */
function Shell(props: { tone: Tone; icon: React.ComponentType<{ className?: string }>; title: string; text?: string; spin?: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Verdict {...props} />
    </div>
  );
}

function Question({ label, hint, error, children }: { label: string; hint?: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <p className={cn("text-sm font-medium", error && "text-destructive")}>{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-destructive">Réponse obligatoire</p>}
    </div>
  );
}

function Choices({
  value,
  onChange,
  options,
  stacked = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  stacked?: boolean;
}) {
  return (
    <RadioGroup value={value} onValueChange={onChange} className={cn("grid gap-2", !stacked && "sm:grid-cols-2")}>
      {options.map((option) => (
        <ChoiceItem key={option.value} value={option.value} label={option.label} selected={value === option.value} />
      ))}
    </RadioGroup>
  );
}

function ChoiceItem({ value, label, selected }: { value: string; label: string; selected: boolean }) {
  const id = React.useId();
  return (
    <Label
      htmlFor={id}
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm font-normal transition-colors hover:bg-accent/50",
        selected && "border-primary bg-primary/5",
      )}
    >
      <RadioGroupItem id={id} value={value} />
      {label}
    </Label>
  );
}
