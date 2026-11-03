"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { AlertCircle, Building2, CheckCircle2, Loader2, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type CompanyLookupResult,
  type RegistryCompany,
  formatRegistrationNumber,
  normalizeRegistrationNumber,
  sirenFromRegistration,
} from "@/lib/utils/company-registry";

type Mode = "search" | "details" | "unregistered";
type Lookup =
  | { state: "idle" | "loading" }
  | { state: "done"; result: CompanyLookupResult };

type CompanyRegistryLookupProps = {
  form: UseFormReturn<any>;
  token: string;
  /** Bail commercial : représentant légal (nom, fonction). */
  showRepresentative: boolean;
  /** Bail commercial côté locataire : la société peut être en cours de création. */
  allowUnregistered: boolean;
  /** Formulaire propriétaire : le nom commercial suit la société, il n'est plus demandé. */
  syncTradeName: boolean;
};

/**
 * Étape « Informations de l'entreprise » : le client saisit son SIREN ou SIRET,
 * confirme la société trouvée au registre, et seuls les champs utiles restent à compléter.
 * Si la recherche n'aboutit pas, la saisie manuelle reste toujours possible.
 */
export function CompanyRegistryLookup({
  form,
  token,
  showRepresentative,
  allowUnregistered,
  syncTradeName,
}: CompanyRegistryLookupProps) {
  const errors = (form.formState.errors.entreprise ?? {}) as Record<string, { message?: string } | undefined>;
  const [mode, setMode] = useState<Mode>(() => {
    const entreprise = form.getValues("entreprise") ?? {};
    if (allowUnregistered && entreprise.isRegistered === "no") return "unregistered";
    if (entreprise.registryConfirmed || String(entreprise.legalName ?? "").trim()) return "details";
    return "search";
  });
  const [lookup, setLookup] = useState<Lookup>({ state: "idle" });
  const [company, setCompany] = useState<RegistryCompany | null>(null);
  const requestId = useRef(0);

  const registration: string = form.watch("entreprise.registration") ?? "";
  const confirmed: boolean = !!form.watch("entreprise.registryConfirmed");
  const digits = normalizeRegistrationNumber(registration);
  const looksComplete = digits.length === 9 || digits.length === 14;
  const isValidNumber = !!sirenFromRegistration(registration);

  const set = useCallback(
    (name: string, value: unknown) =>
      form.setValue(`entreprise.${name}`, value, { shouldDirty: true, shouldValidate: false }),
    [form],
  );

  const runLookup = useCallback(
    async (value: string) => {
      const id = ++requestId.current;
      setLookup({ state: "loading" });
      let result: CompanyLookupResult;
      try {
        const response = await fetch(
          `/api/intakes/${encodeURIComponent(token)}/company-lookup?q=${encodeURIComponent(value)}`,
        );
        result = response.status === 404 ? { found: false, reason: "unavailable" } : await response.json();
      } catch {
        result = { found: false, reason: "unavailable" };
      }
      if (id === requestId.current) setLookup({ state: "done", result });
    },
    [token],
  );

  // Recherche dès qu'un numéro complet et valide est saisi
  useEffect(() => {
    if (mode !== "search") return;
    if (!isValidNumber) {
      requestId.current++;
      setLookup({ state: "idle" });
      return;
    }
    const timer = setTimeout(() => runLookup(digits), 300);
    return () => clearTimeout(timer);
  }, [mode, digits, isValidNumber, runLookup]);

  // Dossier repris en saisie manuelle : une société avec numéro est immatriculée
  useEffect(() => {
    if (allowUnregistered && mode === "details" && !form.getValues("entreprise.isRegistered")) {
      set("isRegistered", "yes");
    }
  }, [allowUnregistered, mode, form, set]);

  const applyCompany = (found: RegistryCompany) => {
    setCompany(found);
    set("registryConfirmed", true);
    set("legalName", found.legalName);
    if (found.headOfficeAddress) set("fullAddress", found.headOfficeAddress);
    if (syncTradeName) set("name", found.tradeName ?? found.legalName);
    if (allowUnregistered) set("isRegistered", "yes");
    // Un seul représentant légal (ou un seul dirigeant) : il est choisi d'office, le client peut changer
    const legal = found.representatives.filter((r) => r.isLegalRepresentative);
    const preselected = legal.length === 1 ? legal[0] : found.representatives.length === 1 ? found.representatives[0] : null;
    if (showRepresentative && preselected) {
      set("representativeName", preselected.name);
      set("representativeRole", preselected.role ?? "");
    }
    form.clearErrors("entreprise");
    setMode("details");
  };

  const backToSearch = () => {
    set("registryConfirmed", false);
    set("registration", "");
    if (allowUnregistered) set("isRegistered", "");
    setCompany(null);
    setLookup({ state: "idle" });
    setMode("search");
  };

  const enterManually = () => {
    set("registryConfirmed", false);
    if (allowUnregistered) set("isRegistered", "yes");
    setMode("details");
  };

  const markUnregistered = () => {
    // Pas encore de SIREN : le numéro n'est plus exigé quand isRegistered vaut « no »
    set("registryConfirmed", false);
    set("registration", "");
    set("isRegistered", "no");
    setCompany(null);
    setMode("unregistered");
  };

  const fieldError = (name: string) =>
    errors[name]?.message ? <p className="text-sm text-destructive">{errors[name]?.message}</p> : null;

  const legalNameField = (
    <div className="space-y-2">
      <Label htmlFor="entreprise.legalName">
        {mode === "unregistered" ? "Nom de la société (prévu) *" : "Raison sociale *"}
      </Label>
      <Input
        id="entreprise.legalName"
        className="h-11"
        {...form.register("entreprise.legalName", {
          onChange: (e) => {
            if (syncTradeName && !company?.tradeName) set("name", e.target.value);
          },
        })}
      />
      {fieldError("legalName")}
    </div>
  );

  const addressField = (
    <div className="space-y-2">
      <Label htmlFor="entreprise.fullAddress">Adresse du siège social *</Label>
      <Textarea id="entreprise.fullAddress" {...form.register("entreprise.fullAddress")} />
      {fieldError("fullAddress")}
    </div>
  );

  const candidates = company?.representatives ?? [];
  const representativeFields = showRepresentative && (
    <div className="space-y-3">
      {candidates.length > 1 && (
        <div className="space-y-2">
          <Label>Qui signe pour la société ?</Label>
          <div className="grid gap-2 sm:grid-cols-2">
            {candidates.map((candidate) => {
              const selected = form.watch("entreprise.representativeName") === candidate.name;
              return (
                <button
                  key={`${candidate.name}-${candidate.role}`}
                  type="button"
                  onClick={() => {
                    set("representativeName", candidate.name);
                    set("representativeRole", candidate.role ?? "");
                    form.clearErrors("entreprise.representativeName");
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left text-sm transition-all",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/40",
                  )}
                >
                  <span className={cn("mt-0.5 rounded-lg p-1.5 shrink-0", selected ? "bg-primary/10" : "bg-muted")}>
                    {candidate.isCompany ? (
                      <Building2 className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                    ) : (
                      <UserRound className={cn("h-4 w-4", selected ? "text-primary" : "text-muted-foreground")} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium block">{candidate.name}</span>
                    {candidate.role && <span className="block text-xs text-muted-foreground">{candidate.role}</span>}
                    {candidate.isLegalRepresentative && (
                      <span className="mt-1 inline-block rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                        Représentant légal
                      </span>
                    )}
                  </span>
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entreprise.representativeName">Représentant légal *</Label>
          <Input
            id="entreprise.representativeName"
            className="h-11"
            placeholder="Prénom et nom"
            {...form.register("entreprise.representativeName", {
              onChange: () => form.clearErrors("entreprise.representativeName"),
            })}
          />
          {fieldError("representativeName")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="entreprise.representativeRole">Fonction</Label>
          <Input
            id="entreprise.representativeRole"
            className="h-11"
            placeholder="Ex. : gérant, président"
            {...form.register("entreprise.representativeRole")}
          />
        </div>
      </div>
    </div>
  );

  if (mode === "unregistered") {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border bg-muted/40 p-4 text-sm">
          <p className="font-medium">Société en cours de création</p>
          <p className="text-muted-foreground mt-1">Le Kbis ne vous sera pas demandé.</p>
          <button type="button" onClick={backToSearch} className="mt-2 text-primary underline underline-offset-2">
            Rechercher ma société par son numéro
          </button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="entreprise.registration">SIREN/SIRET (si vous l&apos;avez déjà)</Label>
          <Input id="entreprise.registration" className="h-11" inputMode="numeric" {...form.register("entreprise.registration")} />
          {fieldError("registration")}
        </div>
        {legalNameField}
        {addressField}
        {representativeFields}
      </div>
    );
  }

  if (mode === "details") {
    return (
      <div className="space-y-4">
        {confirmed ? (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Société retrouvée au registre</p>
              <p className="text-muted-foreground">
                SIREN {formatRegistrationNumber(sirenFromRegistration(registration))}
                {company?.legalFormLabel ? ` · ${company.legalFormLabel}` : ""}
              </p>
              <p className="text-muted-foreground mt-1">Vérifiez les informations ci-dessous, elles restent modifiables.</p>
            </div>
            <button type="button" onClick={backToSearch} className="shrink-0 text-primary underline underline-offset-2">
              Changer
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="entreprise.registration">SIREN ou SIRET *</Label>
            <Input id="entreprise.registration" className="h-11" inputMode="numeric" {...form.register("entreprise.registration")} />
            {fieldError("registration")}
            <button type="button" onClick={backToSearch} className="text-sm text-primary underline underline-offset-2">
              Rechercher ma société à partir de ce numéro
            </button>
          </div>
        )}
        {legalNameField}
        {addressField}
        {representativeFields}
      </div>
    );
  }

  // Mode recherche : seul le numéro est demandé
  const result = lookup.state === "done" ? lookup.result : null;
  const found = result?.found ? result.company : null;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="entreprise.registration">Numéro SIREN ou SIRET de votre société *</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="entreprise.registration"
            className="h-11 pl-9"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ex. : 443 855 085"
            {...form.register("entreprise.registration")}
          />
          {lookup.state === "loading" && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          9 chiffres (SIREN) ou 14 chiffres (SIRET), indiqués sur votre Kbis. Nous retrouvons le reste pour vous.
        </p>
        {looksComplete && !isValidNumber && (
          <p className="text-sm text-destructive">Ce numéro n&apos;est pas valide, vérifiez-le.</p>
        )}
        {fieldError("registration")}
        {!errors.registration && (errors.legalName || errors.fullAddress || errors.isRegistered || errors.representativeName) && (
          <p className="text-sm text-destructive">Confirmez votre société pour continuer.</p>
        )}
      </div>

      {found && found.isActive && !found.isIndividual && (
        <div className="rounded-xl border-2 border-primary/30 p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Est-ce bien votre société ?</p>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-primary/10 p-2">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-semibold text-base">{found.legalName}</p>
              {found.legalFormLabel && <p className="text-muted-foreground">{found.legalFormLabel}</p>}
              {found.headOfficeAddress && <p>Siège : {found.headOfficeAddress}</p>}
              <p className="text-muted-foreground">SIREN {formatRegistrationNumber(found.siren)}</p>
              {found.representatives.length > 0 && (
                <p className="text-muted-foreground">
                  {found.representatives.map((r) => (r.role ? `${r.name} (${r.role})` : r.name)).join(", ")}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="sm:flex-1" onClick={() => applyCompany(found)}>
              Oui, c&apos;est ma société
            </Button>
            <Button type="button" variant="outline" className="sm:flex-1" onClick={backToSearch}>
              Non, modifier le numéro
            </Button>
          </div>
        </div>
      )}

      {found && !found.isActive && (
        <Notice tone="error">
          Cette société est fermée au registre. Vérifiez le numéro saisi.
        </Notice>
      )}

      {found && found.isActive && found.isIndividual && (
        <Notice tone="error">
          Ce numéro correspond à une entreprise individuelle : vous signez le bail en votre nom propre.
          Revenez à l&apos;étape précédente et choisissez « Particulier ».
        </Notice>
      )}

      {result && !result.found && result.reason !== "invalid" && (
        <Notice tone="info">
          {result.reason === "not_found"
            ? "Nous n'avons pas retrouvé cette société automatiquement."
            : "La recherche est momentanément indisponible."}
          <button type="button" onClick={enterManually} className="ml-1 text-primary underline underline-offset-2">
            Compléter les informations moi-même
          </button>
        </Notice>
      )}

      {allowUnregistered && (
        <button type="button" onClick={markUnregistered} className="text-sm text-primary underline underline-offset-2">
          Ma société n&apos;est pas encore immatriculée
        </button>
      )}
    </div>
  );
}

function Notice({ tone, children }: { tone: "info" | "error"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-3 text-sm",
        tone === "error" ? "border-destructive/40 bg-destructive/5 text-destructive" : "bg-muted/40",
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
