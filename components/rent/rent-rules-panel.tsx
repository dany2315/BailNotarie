"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { NumberInputGroup } from "@/components/ui/number-input-group";
import { DateInput } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { checkRentRules } from "@/lib/actions/rent-check";
import type { RentRulesAssessment } from "@/lib/rent-rules";
import type { RentRulesFormValues } from "@/lib/utils/rent-draft";
import {
  PROOF_LABELS,
  RENT_INCREASE_LABELS,
  RENT_INCREASE_REASONS,
  VACANCY_MONTHS,
  euros,
  isFrozenDpe,
  relocationSituation,
  relocationSummaryLines,
} from "@/lib/utils/rent-relocation";
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
}

/**
 * Loyer maximal en direct dans les formulaires du propriétaire : plafond de l'arrêté (villes
 * encadrées), relocation en zone tendue (dernier loyer, IRL, travaux, loyer sous-évalué) et
 * complément de loyer. Le calcul se fait côté serveur avec le même moteur que la fiche admin.
 */
export function RentRulesPanel(props: RentRulesPanelProps) {
  const { token, propertyId, bailType, bailFamily, effectiveDate, dpeClass, onDpeChange, values, onChange, onResult, showErrors } = props;
  const rent = Number(String(props.rentAmount ?? "").replace(",", ".")) || 0;
  const [result, setResult] = React.useState<RentRulesAssessment | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
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
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }
  if (!result) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Vérification du loyer…
      </p>
    );
  }

  const { cap, relocation, supplement } = result;
  const tight = relocation.notConcerned === null;
  const frozen = isFrozenDpe(dpeClass);
  const situation = relocationSituation({
    relocationLetBefore: values.relocationLetBefore === "yes" ? true : values.relocationLetBefore === "no" ? false : null,
    previousTenantLeftAt: values.previousTenantLeftAt || null,
  });
  const needsPreviousRent = situation === "relet" || (situation === "vacant" && frozen);
  const dpeNeeded = !dpeClass && !!onDpeChange && (supplement.needed || (tight && values.relocationLetBefore === "yes"));
  const missingCls = (empty: boolean) => (showErrors && empty ? "text-destructive" : "");
  const capComputed = cap.reference && cap.maxRent != null;

  // Ni ville encadrée ni zone tendue (ou bail commercial) : le loyer est libre.
  if (!cap.territory && !tight) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" />
        {relocation.notConcerned === "commercial"
          ? "Bail commercial : pas d'encadrement du loyer."
          : relocation.notConcerned === "no_address"
            ? "Adresse non localisée : notre équipe vérifiera l'encadrement du loyer."
            : "Commune hors zone tendue : le loyer est fixé librement."}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Contrôle du loyer</p>
          <p className="text-xs text-muted-foreground">Calculé automatiquement selon la loi et l&apos;adresse du bien.</p>
        </div>
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="Calcul en cours" />}
      </div>

      {/* Plafond de l'arrêté d'encadrement */}
      {cap.territory && (
        <div className="space-y-1 text-sm">
          <p className="font-medium">
            Ville encadrée : {cap.territory.label}
            {cap.zone ? ` · ${cap.zone.label}` : ""}
          </p>
          {capComputed ? (
            <p className="text-muted-foreground">
              Plafond (loyer de référence majoré) : {cap.reference!.max.toFixed(2).replace(".", ",")} €/m² × {cap.surface} m², soit{" "}
              <strong className="font-semibold text-foreground">{euros(cap.maxRent!)}</strong> hors charges au maximum.
            </p>
          ) : cap.status === "not_concerned" ? (
            <p className="text-muted-foreground">Ce logement n&apos;a pas de plafond à respecter.</p>
          ) : (
            <p className="text-muted-foreground">Le plafond de ce logement sera vérifié par notre équipe.</p>
          )}
        </div>
      )}

      {/* Classe énergétique, quand le bien n'en a pas et qu'elle sert au calcul */}
      {dpeNeeded && (
        <div className="space-y-2">
          <Label className={missingCls(true)}>Classe énergétique du logement (DPE) *</Label>
          <Select value={dpeClass || ""} onValueChange={(value) => onDpeChange?.(value)}>
            <SelectTrigger className="h-11 w-full">
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
          <p className="text-xs text-muted-foreground">Indiquée en première page de votre diagnostic de performance énergétique.</p>
        </div>
      )}

      {/* Relocation en zone tendue */}
      {tight && (
        <div className="space-y-4 border-t pt-4">
          <div>
            <p className="text-sm font-medium">Zone tendue : évolution du loyer entre deux locataires</p>
            <p className="text-xs text-muted-foreground">
              Si le logement a été loué il y a moins de {VACANCY_MONTHS} mois, le nouveau loyer ne peut pas dépasser celui du locataire précédent, sauf exceptions.
            </p>
          </div>

          <div className="space-y-2">
            <Label className={missingCls(!values.relocationLetBefore)}>Le logement a-t-il déjà été loué ? *</Label>
            <RadioGroup
              value={values.relocationLetBefore}
              onValueChange={(value) => onChange({ relocationLetBefore: value as "yes" | "no" })}
              className="grid gap-2 sm:grid-cols-2"
            >
              <ChoiceItem value="yes" label="Oui, il a déjà été loué" />
              <ChoiceItem value="no" label="Non, c'est une première location" />
            </RadioGroup>
          </div>

          {values.relocationLetBefore === "yes" && (
            <div className="space-y-2">
              <Label className={missingCls(!values.previousTenantLeftAt)}>Date de départ du dernier locataire *</Label>
              <DateInput
                value={values.previousTenantLeftAt || undefined}
                onChange={(value) => onChange({ previousTenantLeftAt: value })}
                aria-label="Date de départ du dernier locataire"
              />
              <p className="text-xs text-muted-foreground">Indiquée sur l&apos;état des lieux de sortie.</p>
            </div>
          )}

          {needsPreviousRent && (
            <div className="space-y-2">
              <Label className={missingCls(!values.previousRentAmount)}>Dernier loyer du locataire précédent, hors charges *</Label>
              <NumberInputGroup
                value={values.previousRentAmount}
                onChange={(value) => onChange({ previousRentAmount: value ? String(value) : "" })}
                min={0}
                step={1}
                unit="€"
                className="h-11"
              />
            </div>
          )}

          {situation === "relet" && !frozen && (
            <>
              <div className="space-y-2">
                <Label className={missingCls(!values.previousRentRevisedRecently)}>
                  Ce loyer a-t-il été révisé (indexé) au cours des 12 derniers mois ? *
                </Label>
                <RadioGroup
                  value={values.previousRentRevisedRecently}
                  onValueChange={(value) => onChange({ previousRentRevisedRecently: value as "yes" | "no" })}
                  className="grid gap-2 sm:grid-cols-2"
                >
                  <ChoiceItem value="yes" label="Oui" />
                  <ChoiceItem value="no" label="Non" />
                </RadioGroup>
                <p className="text-xs text-muted-foreground">Si non, la révision selon l&apos;indice de référence des loyers (IRL) est calculée automatiquement.</p>
              </div>

              <div className="space-y-2">
                <Label>Souhaitez-vous augmenter le loyer au-delà ?</Label>
                <RadioGroup
                  value={values.rentIncreaseReason || "NONE"}
                  onValueChange={(value) => onChange({ rentIncreaseReason: value as RentRulesFormValues["rentIncreaseReason"] })}
                  className="grid gap-2"
                >
                  {RENT_INCREASE_REASONS.map((reason) => (
                    <ChoiceItem key={reason} value={reason} label={RENT_INCREASE_LABELS[reason]} />
                  ))}
                </RadioGroup>
              </div>

              {values.rentIncreaseReason === "WORKS" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className={missingCls(!values.worksAmount)}>Coût des travaux TTC *</Label>
                    <NumberInputGroup
                      value={values.worksAmount}
                      onChange={(value) => onChange({ worksAmount: value ? String(value) : "" })}
                      min={0}
                      step={1}
                      unit="€"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={missingCls(!values.worksCompletedAt)}>Date de fin des travaux *</Label>
                    <DateInput
                      value={values.worksCompletedAt || undefined}
                      onChange={(value) => onChange({ worksCompletedAt: value })}
                      aria-label="Date de fin des travaux"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    Travaux d&apos;amélioration ou de mise en conformité réalisés depuis la signature du bail du locataire précédent.
                  </p>
                </div>
              )}

              {values.rentIncreaseReason === "UNDERVALUED" &&
                (cap.reference && cap.surface ? (
                  <p className="text-sm text-muted-foreground">
                    Loyer du voisinage retenu : le loyer de référence de l&apos;arrêté, {cap.reference.ref.toFixed(2).replace(".", ",")} €/m², soit{" "}
                    {euros(Math.round(cap.reference.ref * cap.surface * 100) / 100)} pour {cap.surface} m².
                  </p>
                ) : (
                  <div className="space-y-2">
                    <Label className={missingCls(!values.neighborhoodRent)}>Loyer mensuel d&apos;un logement comparable du voisinage, hors charges *</Label>
                    <NumberInputGroup
                      value={values.neighborhoodRent}
                      onChange={(value) => onChange({ neighborhoodRent: value ? String(value) : "" })}
                      min={0}
                      step={1}
                      unit="€"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Moyenne de loyers de logements comparables (même quartier, surface, nombre de pièces, époque).
                    </p>
                  </div>
                ))}
            </>
          )}

          <RelocationSummary result={result} />
        </div>
      )}

      {/* Complément de loyer : loyer au-dessus du plafond de l'arrêté */}
      {supplement.needed && relocation.status !== "over" && (
        <div className="space-y-3 border-t pt-4">
          {supplement.forbidden ? (
            <Verdict tone="error" icon={XCircle}>
              Le loyer dépasse le plafond de {euros(cap.maxRent!)} et un complément de loyer est interdit pour un logement classé F ou G :
              ramenez le loyer à {euros(supplement.base!)} au plus.
            </Verdict>
          ) : (
            <>
              <div className="space-y-1 text-sm">
                <p className="font-medium">Complément de loyer</p>
                <p className="text-muted-foreground">
                  Le loyer dépasse le plafond. C&apos;est possible seulement si le logement a des caractéristiques exceptionnelles de localisation ou de
                  confort (terrasse, vue, prestations rares…). Le bail indiquera :
                </p>
                <p>
                  Loyer de base <strong className="font-semibold">{euros(supplement.base!)}</strong> + complément de loyer{" "}
                  <strong className="font-semibold">{euros(supplement.amount!)}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rent-supplement-reason" className={missingCls(!values.rentSupplementReason.trim())}>
                  Caractéristiques qui justifient le complément *
                </Label>
                <Textarea
                  id="rent-supplement-reason"
                  value={values.rentSupplementReason}
                  maxLength={1000}
                  rows={3}
                  placeholder="Ex. : terrasse de 25 m² avec vue dégagée sur la Seine"
                  onChange={(event) => onChange({ rentSupplementReason: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">Sinon, ramenez le loyer à {euros(supplement.base!)} au plus.</p>
              </div>
            </>
          )}
        </div>
      )}

      <FinalVerdict result={result} />
    </div>
  );
}

function ChoiceItem({ value, label }: { value: string; label: string }) {
  const id = React.useId();
  return (
    <Label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-normal hover:bg-accent/50">
      <RadioGroupItem id={id} value={value} />
      {label}
    </Label>
  );
}

function Verdict({ tone, icon: Icon, children }: { tone: "ok" | "warn" | "error"; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-md p-3 text-sm",
        tone === "ok" && "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-300",
        tone === "warn" && "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
        tone === "error" && "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}

/** Détail du maximum à la relocation : dernier loyer, révision IRL, hausse. */
function RelocationSummary({ result }: { result: RentRulesAssessment }) {
  const { relocation } = result;
  const lines = relocationSummaryLines(relocation);
  if (!lines.length && !relocation.proofs.length) return null;
  return (
    <div className="space-y-2 rounded-md bg-muted/50 p-3 text-sm">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
      {relocation.proofs.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Justificatifs à fournir (vous pourrez les déposer plus tard) :</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {relocation.proofs.map((kind) => (
              <li key={kind}>
                {PROOF_LABELS[kind]?.label} : {PROOF_LABELS[kind]?.hint}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FinalVerdict({ result }: { result: RentRulesAssessment }) {
  const { relocation, supplement, rent, maxRent, overBy } = result;
  if (!rent) return null;
  if (relocation.status === "missing") {
    return (
      <Verdict tone="warn" icon={AlertTriangle}>
        Répondez aux questions ci-dessus pour vérifier le loyer.
      </Verdict>
    );
  }
  if (supplement.needed && supplement.dpeUnknown && relocation.status !== "over") {
    return (
      <Verdict tone="warn" icon={AlertTriangle}>
        Indiquez la classe énergétique du logement : un complément de loyer est interdit pour un logement classé F ou G.
      </Verdict>
    );
  }
  if (overBy !== null && overBy > 0 && maxRent !== null) {
    if (supplement.needed && !supplement.forbidden && relocation.status !== "over") {
      return (
        <Verdict tone="warn" icon={ShieldAlert}>
          Loyer au-dessus du plafond de {euros(maxRent)} : décrivez les caractéristiques qui justifient le complément, ou baissez le loyer.
        </Verdict>
      );
    }
    return (
      <Verdict tone="error" icon={XCircle}>
        Le loyer dépasse le maximum autorisé de {euros(maxRent)} hors charges ({euros(overBy)} de trop par mois). Baissez-le pour continuer.
      </Verdict>
    );
  }
  if (supplement.accepted) {
    return (
      <Verdict tone="ok" icon={CheckCircle2}>
        Loyer accepté avec un complément de loyer de {euros(supplement.amount!)}. Notre équipe vérifiera sa justification.
      </Verdict>
    );
  }
  if (maxRent !== null) {
    return (
      <Verdict tone="ok" icon={CheckCircle2}>
        Loyer conforme : {euros(maxRent)} hors charges au maximum.
      </Verdict>
    );
  }
  if (relocation.status === "free" || result.cap.territory) {
    return (
      <Verdict tone="ok" icon={CheckCircle2}>
        Loyer conforme.
      </Verdict>
    );
  }
  return null;
}
