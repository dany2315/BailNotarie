"use client";

import * as React from "react";
import { CheckCircle2, Info, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
 * Étape « Le loyer » des formulaires du propriétaire. Dans une commune qui encadre les loyers, le
 * propriétaire est guidé une question à la fois jusqu'au loyer : les réponses se rangent en
 * récapitulatif (modifiable), le maximum est donné comme un conseil. Ailleurs, un simple champ.
 * Le moteur (côté serveur, le même que la fiche admin) dit ce qui manque : une question n'est posée
 * que si sa réponse change le résultat.
 */

const DPE_CLASSES = ["A", "B", "C", "D", "E", "F", "G"];

export interface RentRulesOptions {
  /** Faux tant que le contrôle ne sert pas (pas de bien, pas de type de bail). */
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
  /** « Mettre le loyer à … » : remplace le loyer saisi par le maximum autorisé. */
  onApplyRent?: (rent: number) => void;
  /** Saisie du loyer dans le parcours guidé, et son erreur de validation. */
  onRentChange?: (value: string) => void;
  rentError?: string;
  /**
   * Bouton « Continuer » du formulaire : tant qu'une question sur le loyer est ouverte, il y répond
   * (question suivante) au lieu de changer d'étape. Renvoie vrai quand il a servi au parcours.
   */
  advanceRef?: React.MutableRefObject<(() => boolean) | null>;
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

/** La commune encadre les loyers (zone tendue ou plafond dépassé) : le loyer se fixe en parcours guidé. */
function rentCheckNeeded(result: RentRulesAssessment | null | undefined) {
  return !!result && (result.relocation.notConcerned === null || result.supplement.needed);
}

/** Quelles questions poser, d'après les réponses déjà données et ce qui manque au calcul. */
function questions(rules: RentRules) {
  const { result, values, dpeClass, onDpeChange, supplementChoice } = rules;
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
  const askSupplement = supplementPossible && relocation?.status !== "missing";
  return {
    letBefore: tight,
    dpeBefore: letBefore && dpeMissing,
    previousRent: letBefore && (!(situation === "vacant" && !frozen) || !!values.previousRentAmount),
    rent: true,
    leftAt: letBefore && (missing.includes(RELOCATION_MISSING.leftAt) || !!values.previousTenantLeftAt),
    revised:
      letBefore && situation === "relet" && !frozen && (missing.includes(RELOCATION_MISSING.revised) || !!values.previousRentRevisedRecently),
    reason: askReason,
    worksAmount: askReason && reason === "WORKS",
    worksDate: askReason && reason === "WORKS" && (missing.includes(RELOCATION_MISSING.worksDate) || !!values.worksCompletedAt),
    neighborhood:
      askReason && reason === "UNDERVALUED" && (missing.includes(RELOCATION_MISSING.neighborhood) || !!values.neighborhoodRent),
    dpeAfter: !(letBefore && dpeMissing) && dpeMissing && !!supplement?.needed,
    supplement: askSupplement,
    supplementReason: askSupplement && supplementChoice === "yes",
  };
}

type StepKey = keyof ReturnType<typeof questions>;

const REASON_LABELS: Record<string, string> = {
  WORKS: "J'ai fait des travaux d'amélioration",
  UNDERVALUED: "L'ancien loyer était trop bas pour le quartier",
  NONE: "Aucune de ces raisons",
};

const frenchDay = (value: string) => {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("fr-FR");
};

interface QuestionDef {
  key: StepKey;
  /** Libellé court du récapitulatif. */
  short: string;
  answer: string | null;
  /** Champ texte ou nombre : il faut valider pour passer à la suite (une liste passe toute seule). */
  typed?: boolean;
  /** Réponse donnée mais pas acceptable en l'état (loyer au-dessus du maximum). */
  blocked?: boolean;
  /** next : réponse validée. cancel (modification d'une réponse) : retour à la réponse d'avant. */
  render: (next?: () => void, cancel?: () => void) => React.ReactNode;
}

/** Les questions dans l'ordre où elles se posent, avec la réponse déjà donnée. */
function questionList(rules: RentRules): QuestionDef[] {
  const ask = questions(rules);
  const { values, onChange, showErrors, dpeClass, onDpeChange, result, supplementChoice, setSupplementChoice } = rules;
  const amount = (value: string) => (Number(value) > 0 ? euros(Number(value)) : null);
  // Loyer maximum sans raison de hausse (dernier loyer révisé), et au plus le plafond de la ville.
  const reasonMax =
    result?.relocation.revisedRent != null
      ? Math.min(result.relocation.revisedRent, result.cap.maxRent != null && result.cap.validity === "in" ? result.cap.maxRent : Infinity)
      : null;
  const list: Array<QuestionDef | false> = [
    ask.letBefore && {
      key: "letBefore",
      short: "Déjà loué",
      answer: values.relocationLetBefore === "yes" ? "Oui" : values.relocationLetBefore === "no" ? "Non, première location" : null,
      render: (next, cancel) => (
        <Field
          id="rent-let-before"
          label="Le logement a-t-il déjà été loué ?"
          help="Dans votre commune, le loyer d'un logement déjà loué ne peut pas augmenter librement d'un locataire à l'autre."
          error={showErrors && !values.relocationLetBefore ? "Choisissez une réponse" : undefined}
        >
          <ChoiceSelect
            id="rent-let-before"
            value={values.relocationLetBefore}
            onChange={(value) => {
              onChange({ relocationLetBefore: value as "yes" | "no" });
              next?.();
            }}
            options={[
              { value: "yes", label: "Oui" },
              { value: "no", label: "Non, c'est la première location" },
            ]}
          />
        </Field>
      ),
    },
    (ask.dpeBefore || ask.dpeAfter) && {
      key: ask.dpeBefore ? "dpeBefore" : "dpeAfter",
      short: "Classe énergétique",
      answer: dpeClass ? `Classe ${dpeClass}` : null,
      render: (next, cancel) => (
        <Field
          id="rent-dpe"
          label="Quelle est la classe énergétique (DPE) du logement ?"
          help="La lettre de A à G en première page du diagnostic de performance énergétique."
          error={showErrors && !dpeClass ? "Choisissez la classe énergétique" : undefined}
        >
          <ChoiceSelect
            id="rent-dpe"
            value={dpeClass || ""}
            onChange={(value) => {
              onDpeChange?.(value);
              next?.();
            }}
            placeholder="Choisir la classe énergétique"
            options={DPE_CLASSES.map((cls) => ({ value: cls, label: `Classe ${cls}` }))}
          />
        </Field>
      ),
    },
    ask.previousRent && {
      key: "previousRent",
      short: "Loyer du dernier locataire",
      answer: amount(values.previousRentAmount),
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-previous"
          label="Combien payait le dernier locataire ?"
          help="Son dernier loyer mensuel, sans les charges."
          error={showErrors && !(Number(values.previousRentAmount) > 0) ? "Indiquez son loyer" : undefined}
        >
          <Typed onNext={next} onCancel={cancel}>
            <NumberInputGroup
              value={values.previousRentAmount}
              onChange={(value) => onChange({ previousRentAmount: value ? String(value) : "" })}
              min={0}
              step={1}
              unit="€"
              className="h-11"
            />
          </Typed>
        </Field>
      ),
    },
    {
      key: "rent",
      short: "Loyer demandé",
      answer: rules.rent > 0 ? euros(rules.rent) : null,
      typed: true,
      blocked: !!rentAdvice(rules)?.blocking,
      render: (next, cancel) => (
        <Field
          id="rent-amount"
          label="Quel loyer souhaitez-vous demander ?"
          help="Le loyer mensuel, sans les charges. Les charges se renseignent à l'étape suivante."
          error={rules.rentError || (showErrors && !(rules.rent > 0) ? "Indiquez le loyer" : undefined)}
        >
          <Typed onNext={next} onCancel={cancel}>
            <NumberInputGroup
              value={rules.rentAmount ?? ""}
              onChange={(value) => rules.onRentChange?.(value ? String(value) : "")}
              min={0}
              step={1}
              unit="€"
              className="h-11"
            />
            <RentAdvice rules={rules} />
          </Typed>
        </Field>
      ),
    },
    ask.leftAt && {
      key: "leftAt",
      short: "Départ du dernier locataire",
      answer: values.previousTenantLeftAt ? frenchDay(values.previousTenantLeftAt) : null,
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-left-at"
          label="Quand le dernier locataire est-il parti ?"
          help={`Si le logement est vide depuis plus de ${VACANCY_MONTHS} mois, vous fixez le loyer librement.`}
          error={showErrors && !values.previousTenantLeftAt ? "Indiquez la date de départ" : undefined}
        >
          <Typed onNext={next} onCancel={cancel}>
            <DateInput
              id="rent-left-at"
              value={values.previousTenantLeftAt || undefined}
              onChange={(value) => onChange({ previousTenantLeftAt: value || "" })}
            />
          </Typed>
        </Field>
      ),
    },
    ask.revised && {
      key: "revised",
      short: "Hausse ces 12 derniers mois",
      answer: values.previousRentRevisedRecently === "yes" ? "Oui" : values.previousRentRevisedRecently === "no" ? "Non" : null,
      render: (next, cancel) => (
        <Field
          id="rent-revised"
          label="Son loyer a-t-il été augmenté dans les 12 derniers mois ?"
          help="Si ce n'est pas le cas, vous pouvez ajouter la petite hausse annuelle autorisée par la loi."
          error={showErrors && !values.previousRentRevisedRecently ? "Choisissez une réponse" : undefined}
        >
          <ChoiceSelect
            id="rent-revised"
            value={values.previousRentRevisedRecently}
            onChange={(value) => {
              onChange({ previousRentRevisedRecently: value as "yes" | "no" });
              next?.();
            }}
            options={[
              { value: "no", label: "Non" },
              { value: "yes", label: "Oui" },
            ]}
          />
        </Field>
      ),
    },
    ask.reason && {
      key: "reason",
      short: "Raison de la hausse",
      answer: values.rentIncreaseReason ? REASON_LABELS[values.rentIncreaseReason] : null,
      render: (next, cancel) => (
        <Field
          id="rent-increase-reason"
          label="Pourquoi augmenter le loyer par rapport à l'ancien ?"
          hint={reasonMax !== null ? `Sans raison particulière, vous pouvez demander jusqu'à ${euros(reasonMax)}.` : undefined}
          error={showErrors && !values.rentIncreaseReason ? "Choisissez une réponse" : undefined}
        >
          <ChoiceSelect
            id="rent-increase-reason"
            value={values.rentIncreaseReason}
            onChange={(value) => {
              onChange({ rentIncreaseReason: value as RentRulesFormValues["rentIncreaseReason"] });
              // « Aucune » : le loyer passe directement au maximum autorisé.
              if (value === "NONE" && reasonMax !== null && rules.rent > reasonMax) rules.onApplyRent?.(Math.floor(reasonMax));
              next?.();
            }}
            options={Object.entries(REASON_LABELS).map(([value, label]) => ({
              value,
              label: value === "NONE" && reasonMax !== null ? `Aucune, je demande ${euros(Math.floor(reasonMax))}` : label,
            }))}
          />
        </Field>
      ),
    },
    ask.worksAmount && {
      key: "worksAmount",
      short: "Coût des travaux",
      answer: amount(values.worksAmount),
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-works-amount"
          label="Combien ont coûté les travaux ?"
          help="Le montant total TTC des travaux d'amélioration ou de mise aux normes de décence faits depuis l'arrivée du dernier locataire, dans le logement ou les parties communes."
          error={showErrors && !(Number(values.worksAmount) > 0) ? "Indiquez le coût des travaux" : undefined}
        >
          <Typed onNext={next} onCancel={cancel}>
            <NumberInputGroup
              value={values.worksAmount}
              onChange={(value) => onChange({ worksAmount: value ? String(value) : "" })}
              min={0}
              step={1}
              unit="€"
              className="h-11"
            />
          </Typed>
        </Field>
      ),
    },
    ask.worksDate && {
      key: "worksDate",
      short: "Fin des travaux",
      answer: values.worksCompletedAt ? frenchDay(values.worksCompletedAt) : null,
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-works-date"
          label="Quand les travaux se sont-ils terminés ?"
          help="Des travaux récents (moins de 6 mois) qui coûtent au moins une année de loyer permettent de fixer le loyer librement."
          error={showErrors && !values.worksCompletedAt ? "Indiquez la date de fin des travaux" : undefined}
        >
          <Typed onNext={next} onCancel={cancel}>
            <DateInput
              id="rent-works-date"
              value={values.worksCompletedAt || undefined}
              onChange={(value) => onChange({ worksCompletedAt: value || "" })}
            />
          </Typed>
        </Field>
      ),
    },
    ask.neighborhood && {
      key: "neighborhood",
      short: "Loyer comparable du quartier",
      answer: amount(values.neighborhoodRent),
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-neighborhood"
          label="Quel est le loyer d'un logement comparable du quartier ?"
          help="Le loyer hors charges réellement payé pour un logement comparable du même immeuble ou d'un immeuble semblable du secteur. Vous fournirez ces références : elles seront jointes au bail."
          error={showErrors && !(Number(values.neighborhoodRent) > 0) ? "Indiquez un loyer" : undefined}
        >
          <Typed onNext={next} onCancel={cancel}>
            <NumberInputGroup
              value={values.neighborhoodRent}
              onChange={(value) => onChange({ neighborhoodRent: value ? String(value) : "" })}
              min={0}
              step={1}
              unit="€"
              className="h-11"
            />
          </Typed>
        </Field>
      ),
    },
    ask.supplement && {
      key: "supplement",
      short: "Atouts exceptionnels",
      answer: supplementChoice === "yes" ? "Oui" : supplementChoice === "no" ? "Non" : null,
      render: (next, cancel) => (
        <Field
          id="rent-supplement"
          label="Le logement a-t-il des atouts exceptionnels ?"
          help="Une grande terrasse, une vue rare, des prestations haut de gamme… Seuls ces atouts permettent de louer au-dessus du plafond de la ville."
          error={showErrors && !supplementChoice ? "Choisissez une réponse" : undefined}
        >
          <ChoiceSelect
            id="rent-supplement"
            value={supplementChoice}
            onChange={(value) => {
              setSupplementChoice(value as "yes" | "no");
              if (value === "no") onChange({ rentSupplementReason: "" });
              next?.();
            }}
            options={[
              { value: "yes", label: "Oui" },
              { value: "no", label: "Non" },
            ]}
          />
        </Field>
      ),
    },
    ask.supplementReason && {
      key: "supplementReason",
      short: "Atouts du logement",
      answer: values.rentSupplementReason.trim() || null,
      typed: true,
      render: (next, cancel) => (
        <Field
          id="rent-supplement-reason"
          label="Décrivez ces atouts"
          help={`Le bail indiquera un loyer de ${euros(result?.supplement.base ?? 0)} et ${euros(result?.supplement.amount ?? 0)} pour ces atouts.`}
          error={showErrors && !values.rentSupplementReason.trim() ? "Décrivez les atouts du logement" : undefined}
        >
          <Typed onNext={next} onCancel={cancel} multiline>
            <Textarea
              id="rent-supplement-reason"
              value={values.rentSupplementReason}
              maxLength={1000}
              rows={3}
              placeholder="Ex. : terrasse de 25 m² avec vue dégagée sur la Seine"
              onChange={(event) => onChange({ rentSupplementReason: event.target.value })}
            />
          </Typed>
        </Field>
      ),
    },
  ];
  return list.filter((item): item is QuestionDef => !!item);
}

/** Réponses au moment où l'on clique « Modifier » : « Annuler » les remet telles quelles. */
interface EditSnapshot {
  key: StepKey;
  values: RentRulesFormValues;
  rentAmount: string;
  dpeClass: string;
  supplementChoice: "" | "yes" | "no";
}

/**
 * Étape « Le loyer ». Commune qui encadre les loyers : les réponses données, dans l'ordre des
 * questions, la seule question en cours, puis le mot de la fin. « Modifier » rouvre la question à sa
 * place, avec « Annuler » pour revenir à la réponse d'avant. Ailleurs : le champ du loyer, tout simplement.
 */
export function RentGuide({ rules }: { rules: RentRules }) {
  // « Continuer » sur une question sans réponse : son message d'erreur s'affiche.
  const [attempted, setAttempted] = React.useState(false);
  const list = questionList(attempted ? { ...rules, showErrors: true } : rules);
  const [activeKey, setActiveKey] = React.useState<StepKey | null>(null);
  const [editing, setEditing] = React.useState<EditSnapshot | null>(null);
  const zoneRef = React.useRef<HTMLDivElement>(null);
  const interacted = React.useRef(false);
  // Moment où la question en cours s'est affichée : un « Continuer » reçu juste avant (double-clic
  // sur l'étape précédente) ne doit pas compter comme une réponse vide.
  const shownAt = React.useRef(0);
  const advance = React.useRef<() => boolean>(() => false);
  const { advanceRef } = rules;
  React.useEffect(() => {
    if (!advanceRef) return;
    advanceRef.current = () => advance.current();
    return () => {
      advanceRef.current = null;
    };
  }, [advanceRef]);
  const firstOpen = list.find((item) => !item.answer)?.key ?? null;
  const activeInList = list.some((item) => item.key === activeKey);
  const current = activeInList ? activeKey : firstOpen;
  // La question en cours reste ouverte pendant la saisie, jusqu'à « Continuer » (ou Entrée). Si une réponse
  // modifiée la rend inutile, on passe à la prochaine question ouverte.
  // On attend le premier calcul : il dit s'il faut d'abord parler de l'ancien locataire.
  const ready = !!rules.result;
  React.useEffect(() => {
    if (ready && !activeInList && activeKey !== firstOpen) setActiveKey(firstOpen);
  }, [ready, activeInList, activeKey, firstOpen]);
  const isEditing = !!editing && editing.key === current;

  const active = list.find((item) => item.key === current);
  const waiting = !active && rules.loading;
  const zone = active ? active.key : waiting ? "waiting" : "result";
  // Après chaque réponse : la question suivante (ou le résultat) reste à l'écran, prête à la saisie.
  React.useEffect(() => {
    setAttempted(false);
    shownAt.current = Date.now();
    if (!interacted.current || !zoneRef.current) return;
    const node = zoneRef.current;
    const frame = requestAnimationFrame(() => {
      node.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const control = node.querySelector<HTMLElement>("input, textarea, [role='combobox']");
      control?.focus({ preventScroll: true });
      if (control instanceof HTMLInputElement && isEditing) control.select();
    });
    return () => cancelAnimationFrame(frame);
    // Seulement quand la question affichée change, pas à chaque frappe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone]);

  advance.current = () => false;
  // Premier calcul pas encore revenu : on ne sait pas encore s'il faut guider.
  if (!rules.result && !rules.error && rules.enabled !== false) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Un instant…
      </p>
    );
  }
  // Pas d'encadrement des loyers : un champ comme les autres.
  if (!rentCheckNeeded(rules.result)) {
    const rentQuestion = list.find((item) => item.key === "rent")!;
    return <>{rentQuestion.render()}</>;
  }

  const next = () => {
    interacted.current = true;
    setEditing(null);
    setActiveKey(null);
  };
  const edit = (key: StepKey) => {
    interacted.current = true;
    setEditing({
      key,
      values: { ...rules.values },
      rentAmount: rules.rentAmount == null ? "" : String(rules.rentAmount),
      dpeClass: rules.dpeClass ?? "",
      supplementChoice: rules.supplementChoice,
    });
    setActiveKey(key);
  };
  // Champ saisi : on passe à la suite seulement avec une réponse acceptable.
  const submit = () => {
    if (!active) return;
    interacted.current = true;
    if (active.answer && !active.blocked) next();
    else setAttempted(true);
  };
  advance.current = () => {
    if (active) {
      if (Date.now() - shownAt.current > 500) submit();
      return true;
    }
    // Calcul en cours après la dernière réponse : le résultat arrive.
    return waiting;
  };
  const cancel = () => {
    if (editing) {
      rules.onChange(editing.values);
      if (editing.rentAmount !== (rules.rentAmount == null ? "" : String(rules.rentAmount))) rules.onRentChange?.(editing.rentAmount);
      if (editing.dpeClass && editing.dpeClass !== (rules.dpeClass ?? "")) rules.onDpeChange?.(editing.dpeClass);
      rules.setSupplementChoice(editing.supplementChoice);
    }
    next();
  };

  // Réponses données (dans l'ordre des questions) et question en cours à sa place ; les questions
  // suivantes restent cachées tant qu'on n'y est pas.
  const blocks: Array<{ rows: QuestionDef[] } | { active: QuestionDef }> = [];
  for (const item of list) {
    if (item.key === current) blocks.push({ active: item });
    else if (item.answer) {
      const last = blocks[blocks.length - 1];
      if (last && "rows" in last) last.rows.push(item);
      else blocks.push({ rows: [item] });
    }
  }

  return (
    <div className="space-y-5">
      {blocks.map((block) =>
        "rows" in block ? (
          <ul key={`rows-${block.rows[0].key}`} className="divide-y rounded-lg border">
            {block.rows.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-1.5 pl-4 pr-2 text-sm">
                <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-400" />
                <span className="min-w-0 flex-1 py-1">
                  <span className="text-muted-foreground">{item.short} : </span>
                  <span className="font-medium break-words">{item.answer}</span>
                </span>
                <button
                  type="button"
                  onClick={() => edit(item.key)}
                  aria-label={`Modifier : ${item.short}`}
                  className="shrink-0 rounded-md px-2 py-1.5 text-[13px] font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Modifier
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div
            key={block.active.key}
            ref={zoneRef}
            className="scroll-mt-24 scroll-mb-28 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {block.active.render(block.active.typed ? submit : next, isEditing ? cancel : undefined)}
            {isEditing && (
              <Button type="button" size="sm" variant="ghost" className="mt-2 -ml-3" onClick={cancel}>
                Annuler
              </Button>
            )}
          </div>
        ),
      )}

      {waiting && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Un instant…
        </p>
      )}

      {!active && !waiting && (
        <div ref={zoneRef} className="scroll-mb-28">
          <RentResult rules={rules} />
        </div>
      )}
    </div>
  );
}

/** Conclusion de l'étape : le loyer respecte la loi, ou ce qu'il faut faire. */
function RentResult({ rules }: { rules: RentRules }) {
  const { result, onApplyRent, supplementChoice, rent, error } = rules;
  if (!result) {
    return error ? <ResultBox tone="neutral" title="Vérification indisponible" text={`${error} Notre équipe vérifiera le loyer.`} /> : null;
  }
  const { relocation, supplement, maxRent, overBy } = result;
  const supplementPossible = supplement.needed && !supplement.forbidden && relocation.status !== "over";
  const apply = (value: number) =>
    onApplyRent ? (
      <Button type="button" size="sm" className="mt-3" onClick={() => onApplyRent(value)}>
        Mettre le loyer à {euros(value)}
      </Button>
    ) : null;

  if (!rent) return null;
  if (supplement.needed && supplement.forbidden && relocation.status !== "over" && supplement.base !== null) {
    return (
      <ResultBox
        tone="error"
        title="Ce loyer est un peu trop élevé"
        text={`Pour un logement classé F ou G, vous pouvez demander jusqu'à ${euros(supplement.base)} hors charges.`}
      >
        {apply(supplement.base)}
      </ResultBox>
    );
  }
  if (overBy !== null && overBy > 0 && maxRent !== null && supplementPossible && supplement.base !== null) {
    if (supplementChoice === "yes") {
      return <ResultBox tone="neutral" title="Décrivez les atouts du logement" text="Ils permettent de demander plus que le plafond de la ville." />;
    }
    return (
      <ResultBox
        tone="error"
        title="Ce loyer est un peu trop élevé"
        text={`Sans atout exceptionnel, vous pouvez demander jusqu'à ${euros(supplement.base)} hors charges.`}
      >
        {apply(supplement.base)}
      </ResultBox>
    );
  }
  if (overBy !== null && overBy > 0 && maxRent !== null) {
    return (
      <ResultBox
        tone="error"
        title="Ce loyer est un peu trop élevé"
        text={`Pour ce logement, vous pouvez demander jusqu'à ${euros(maxRent)} hors charges.`}
        detail={<Detail result={result} />}
      >
        {apply(Math.floor(maxRent))}
      </ResultBox>
    );
  }
  if (supplement.accepted && supplement.base !== null) {
    return (
      <ResultBox
        tone="ok"
        title="C'est tout bon pour le loyer"
        text={`${euros(supplement.base)} de loyer + ${euros(supplement.amount ?? 0)} pour les atouts du logement.`}
      />
    );
  }
  if (maxRent !== null) {
    const provisional = relocation.provisional && relocation.maxRent === maxRent;
    return (
      <ResultBox
        tone="ok"
        title="C'est tout bon pour le loyer"
        text={provisional ? `${euros(rent)} hors charges.` : `${euros(rent)} hors charges, pour un maximum de ${euros(maxRent)}.`}
        detail={provisional ? null : <Detail result={result} />}
      />
    );
  }
  const free =
    relocation.freeReason === "first"
      ? "Pour une première location, vous fixez le loyer librement."
      : relocation.freeReason === "vacant"
        ? `Le logement est vide depuis plus de ${VACANCY_MONTHS} mois : vous fixez le loyer librement.`
        : relocation.freeReason === "works"
          ? "Après vos travaux, vous fixez le loyer librement."
          : undefined;
  return <ResultBox tone="ok" title="C'est tout bon pour le loyer" text={free} />;
}

/** Conseil sous le loyer pendant la saisie : jusqu'où aller pour ce logement. */
function rentAdvice(rules: RentRules): { tone: "muted" | "error"; text: string; apply?: number; blocking?: boolean; detail?: boolean } | null {
  const { result, rent } = rules;
  if (!result || !rent || !rentCheckNeeded(result)) return null;
  const { relocation, supplement, maxRent, overBy } = result;
  const supplementPossible = supplement.needed && !supplement.forbidden && relocation.status !== "over";
  if (supplement.needed && supplement.forbidden && relocation.status !== "over" && supplement.base !== null) {
    return {
      tone: "error",
      text: `Pour un logement classé F ou G, le loyer peut aller jusqu'à ${euros(supplement.base)}.`,
      apply: supplement.base,
      blocking: true,
    };
  }
  if (supplementPossible && supplement.base !== null) {
    return { tone: "muted", text: `Le plafond de la ville pour ce logement est de ${euros(supplement.base)}. Au-delà, il faut des atouts exceptionnels.` };
  }
  if (maxRent === null || relocation.status === "missing" || relocation.provisional) return null;
  if (overBy !== null && overBy > 0) {
    // Raison d'une hausse encore possible (travaux, loyer trop bas) : la question suit.
    const reasonOpen = relocation.status === "over" && !relocation.frozen && relocation.situation === "relet" && !relocation.increase;
    return {
      tone: "error",
      text: `Pour ce logement, vous pouvez demander jusqu'à ${euros(maxRent)}.`,
      apply: Math.floor(maxRent),
      blocking: !reasonOpen,
      detail: true,
    };
  }
  return { tone: "muted", text: `Pour ce logement, vous pouvez demander jusqu'à ${euros(maxRent)}.`, detail: true };
}

function RentAdvice({ rules }: { rules: RentRules }) {
  const advice = rentAdvice(rules);
  if (!advice) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", advice.tone === "error" ? "text-destructive" : "text-muted-foreground")}>
      <span>{advice.text}</span>
      {advice.apply !== undefined && rules.onApplyRent && (
        <button
          type="button"
          onClick={() => rules.onApplyRent?.(advice.apply!)}
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Mettre {euros(advice.apply)}
        </button>
      )}
      {advice.detail && rules.result && <Detail result={rules.result} />}
    </div>
  );
}

/** Calcul du maximum, en phrases simples, dans l'info-bulle. */
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
      <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-primary" aria-label="Comment ce maximum est calculé">
        <Info className="size-3.5" />
        Voir le calcul
      </button>
    </InfoTooltip>
  );
}

const RESULT_TONES = {
  ok: { box: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800", icon: "text-green-700 dark:text-green-300", Icon: CheckCircle2 },
  error: { box: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800", icon: "text-red-700 dark:text-red-300", Icon: XCircle },
  neutral: { box: "bg-muted/50 border-border", icon: "text-muted-foreground", Icon: Info },
} as const;

function ResultBox({
  tone,
  title,
  text,
  detail,
  children,
}: {
  tone: keyof typeof RESULT_TONES;
  title: string;
  text?: string;
  detail?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { box, icon, Icon } = RESULT_TONES[tone];
  return (
    <div className={cn("flex gap-3 rounded-lg border p-4 animate-in fade-in duration-300", box)} role="status" aria-live="polite">
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {text && <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>}
        {detail && <div className="mt-1.5">{detail}</div>}
        {children}
      </div>
    </div>
  );
}

/**
 * Champ texte, nombre ou date. Dans le parcours guidé, Entrée répond à la question, comme le bouton
 * « Continuer » du formulaire ; Échap annule la modification d'une réponse.
 */
function Typed({
  onNext,
  onCancel,
  multiline,
  children,
}: {
  onNext?: () => void;
  onCancel?: () => void;
  multiline?: boolean;
  children: React.ReactNode;
}) {
  if (!onNext) return <div className="space-y-2">{children}</div>;
  return (
    <div
      className="space-y-2"
      onKeyDown={(event) => {
        const inField = (event.target as HTMLElement).matches("input, textarea");
        if (!inField) return;
        if (event.key === "Escape" && onCancel) {
          event.preventDefault();
          onCancel();
          return;
        }
        if (event.key !== "Enter" || (multiline && !event.metaKey && !event.ctrlKey)) return;
        // Entrée répond à la question sans passer l'étape du formulaire.
        event.preventDefault();
        event.stopPropagation();
        onNext();
      }}
    >
      {children}
    </div>
  );
}

/** Un champ comme les autres du formulaire : libellé, aide en info-bulle, contrôle, erreur. */
function Field({
  id,
  label,
  help,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  help?: string;
  /** Phrase visible sous la question (contexte utile pour répondre). */
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const isMobile = useIsMobile();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={id} className="text-base">
          {label}
        </Label>
        {help && (
          <InfoTooltip content={<p>{help}</p>} className={isMobile ? "bg-background text-foreground max-w-xs" : "max-w-xs"}>
            <button type="button" className="inline-flex items-center" aria-label={`Aide : ${label}`}>
              <Info className="h-4 w-4 text-muted-foreground" />
            </button>
          </InfoTooltip>
        )}
      </div>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
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
