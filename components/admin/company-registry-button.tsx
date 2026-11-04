"use client";

import * as React from "react";
import { Building2, CheckCircle2, Loader2, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { applyCompanyRegistryAdmin, lookupCompanyAdmin } from "@/lib/actions/admin-company-registry";
import {
  formatRegistrationNumber,
  normalizeRegistrationNumber,
  sirenFromRegistration,
  type CompanyLookupResult,
  type RegistryRepresentative,
} from "@/lib/utils/company-registry";

/**
 * « Registre » d'une société : l'équipe saisit le SIREN ou le SIRET, retrouve la société
 * au registre (même outil que le formulaire du client) et remplace ses informations.
 */
export function CompanyRegistryButton({
  entrepriseId,
  registration,
  representativeName,
}: {
  entrepriseId: string;
  registration: string | null;
  /** Représentant actuel, présélectionné s'il figure au registre. */
  representativeName?: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [number, setNumber] = React.useState(registration ?? "");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<CompanyLookupResult | null>(null);
  const [chosen, setChosen] = React.useState<RegistryRepresentative | null>(null);
  const [saving, setSaving] = React.useState(false);

  const valid = !!sirenFromRegistration(number);

  const search = async (value = number) => {
    if (!sirenFromRegistration(value)) return;
    setLoading(true);
    setResult(null);
    try {
      const found = await lookupCompanyAdmin(normalizeRegistrationNumber(value));
      setResult(found);
      if (found.found) {
        const reps = found.company.representatives;
        const same = reps.find((r) => r.name.toLowerCase() === (representativeName ?? "").trim().toLowerCase());
        const legal = reps.filter((r) => r.isLegalRepresentative);
        setChosen(same ?? (legal.length === 1 ? legal[0] : reps.length === 1 ? reps[0] : null));
      }
    } catch {
      setResult({ found: false, reason: "unavailable" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open) return;
    setNumber(registration ?? "");
    setResult(null);
    setChosen(null);
    if (sirenFromRegistration(registration)) void search(registration ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const company = result?.found ? result.company : null;
  const usable = !!company && !company.isIndividual;

  const apply = async () => {
    if (!company) return;
    setSaving(true);
    const response = await applyCompanyRegistryAdmin({
      entrepriseId,
      registration: normalizeRegistrationNumber(number),
      representativeName: chosen?.name ?? null,
      representativeRole: chosen?.role ?? null,
    });
    setSaving(false);
    if (response.success) {
      toast.success("Société mise à jour depuis le registre");
      setOpen(false);
    } else {
      toast.error(response.error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Search className="size-3.5" />
          Registre
          <span className="sr-only"> : rechercher la société au registre des entreprises</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Rechercher au registre</DialogTitle>
          <DialogDescription>
            Même recherche que dans le formulaire du client. Les informations trouvées remplacent celles de la société.
          </DialogDescription>
        </DialogHeader>

        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void search();
          }}
        >
          <Label htmlFor={`registry-${entrepriseId}`}>SIREN ou SIRET</Label>
          <div className="flex gap-2">
            <Input
              id={`registry-${entrepriseId}`}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              placeholder="Ex. : 443 855 085"
              className="h-10"
            />
            <Button type="submit" className="h-10" disabled={!valid || loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              Rechercher
            </Button>
          </div>
          {normalizeRegistrationNumber(number).length >= 9 && !valid && (
            <p className="text-sm text-destructive">Ce numéro n&apos;est pas valide.</p>
          )}
        </form>

        {result && !result.found && (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm">
            {result.reason === "not_found"
              ? "Société introuvable au registre. Vérifiez le numéro, ou modifiez les champs à la main."
              : result.reason === "invalid"
                ? "Numéro invalide."
                : "Le registre est momentanément indisponible, réessayez."}
          </p>
        )}

        {company && (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 rounded-lg bg-primary/10 p-2">
                <Building2 className="size-4 text-primary" />
              </span>
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="text-base font-semibold">{company.legalName}</p>
                {company.tradeName && company.tradeName !== company.legalName && <p>« {company.tradeName} »</p>}
                <p className="text-muted-foreground">
                  {[company.legalFormLabel, `SIREN ${formatRegistrationNumber(company.siren)}`].filter(Boolean).join(" · ")}
                </p>
                {company.headOfficeAddress && <p>Siège : {company.headOfficeAddress}</p>}
              </div>
            </div>
            {!company.isActive && <p className="text-sm font-semibold text-red-700">Société fermée au registre.</p>}
            {company.inLiquidation && <p className="text-sm font-semibold text-amber-800">Un liquidateur figure parmi les dirigeants.</p>}
            {company.partialDiffusion && (
              <p className="text-sm text-muted-foreground">Diffusion partielle : adresse et dirigeants masqués au registre.</p>
            )}
            {company.isIndividual && (
              <p className="text-sm font-semibold text-red-700">Entreprise individuelle : ce n&apos;est pas une société.</p>
            )}
            {usable && company.representatives.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Représentant qui signe le bail</p>
                <div className="grid gap-2">
                  {company.representatives.map((rep) => {
                    const selected = chosen?.name === rep.name && chosen?.role === rep.role;
                    return (
                      <button
                        key={`${rep.name}-${rep.role}`}
                        type="button"
                        onClick={() => setChosen(selected ? null : rep)}
                        aria-pressed={selected}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border-2 p-2.5 text-left text-sm transition-colors",
                          selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40",
                        )}
                      >
                        {rep.isCompany ? (
                          <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{rep.name}</span>
                          {rep.role && <span className="block text-xs text-muted-foreground">{rep.role}</span>}
                        </span>
                        {rep.isLegalRepresentative && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">Représentant légal</span>
                        )}
                        {selected && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sans choix, le représentant actuel est gardé. Il reste modifiable à la main.
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={apply} disabled={!usable || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Remplacer les informations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
