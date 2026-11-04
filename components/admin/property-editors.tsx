"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import type { AddressData } from "@/lib/types/address";
import { updatePropertyDetailsAdmin, updatePropertyFurnitureAdmin } from "@/lib/actions/admin-property";

const TYPE_OPTIONS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison", BOUTIQUE: "Boutique", BUREAU: "Bureau", LOCAL_ACTIVITE: "Local d'activité", ENTREPOT: "Entrepôt", AUTRE_LOCAL: "Autre local" };
const LEGAL_OPTIONS: Record<string, string> = {
  PLEIN_PROPRIETE: "Monopropriété",
  CO_PROPRIETE: "Copropriété",
  LOTISSEMENT: "Lotissement",
};

export interface PropertyDetailsValues {
  label: string | null;
  fullAddress: string | null;
  type: string | null;
  surfaceM2: number | null;
  legalStatus: string | null;
  syndicName?: string | null;
  syndicEmail?: string | null;
  syndicPhone?: string | null;
  subdivisionOver10Years?: string | null;
  /** NONE (immeuble ou rue) | SHOPPING_CENTER | ESTATE_COMPLEX ; null : pas encore répondu. */
  complexType?: string | null;
  outbuildings?: string | null;
}

const SUBDIVISION_OPTIONS: Record<string, string> = {
  YES: "Autorisé il y a plus de 10 ans",
  NO: "Autorisé il y a moins de 10 ans",
  UNKNOWN: "Ancienneté inconnue",
};
const COMPLEX_OPTIONS: Record<string, string> = {
  NONE: "Dans un immeuble ou une rue",
  SHOPPING_CENTER: "Dans un centre commercial",
  ESTATE_COMPLEX: "Dans un autre ensemble immobilier",
};

/**
 * Modification en place de l'adresse et de la description du bien. L'adresse se choisit dans
 * les suggestions (le bien reste localisé) ; seuls les champs changés sont envoyés.
 */
export function PropertyDetailsEditor({
  propertyId,
  values,
  missing,
  commercial = false,
}: {
  propertyId: string;
  values: PropertyDetailsValues;
  missing?: boolean;
  /** Bail commercial : situation du local et dépendances. */
  commercial?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [label, setLabel] = React.useState("");
  const [addressText, setAddressText] = React.useState("");
  const [address, setAddress] = React.useState<AddressData | null>(null);
  const [type, setType] = React.useState("");
  const [surface, setSurface] = React.useState("");
  const [legalStatus, setLegalStatus] = React.useState("");
  const [syndicName, setSyndicName] = React.useState("");
  const [syndicEmail, setSyndicEmail] = React.useState("");
  const [syndicPhone, setSyndicPhone] = React.useState("");
  const [subdivision, setSubdivision] = React.useState("");
  const [complex, setComplex] = React.useState("");
  const [outbuildings, setOutbuildings] = React.useState("");
  const [addressError, setAddressError] = React.useState<string | undefined>();
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLabel(values.label ?? "");
    setAddressText(values.fullAddress ?? "");
    setAddress(null);
    setType(values.type ?? "");
    setSurface(values.surfaceM2 != null ? String(values.surfaceM2).replace(".", ",") : "");
    setLegalStatus(values.legalStatus ?? "");
    setSyndicName(values.syndicName ?? "");
    setSyndicEmail(values.syndicEmail ?? "");
    setSyndicPhone(values.syndicPhone ?? "");
    setSubdivision(values.subdivisionOver10Years ?? "");
    setComplex(values.complexType ?? "");
    setOutbuildings(values.outbuildings ?? "");
    setAddressError(undefined);
  }, [open, values]);

  const save = async () => {
    const next: Record<string, unknown> = {};
    if (label.trim() !== (values.label ?? "")) next.label = label.trim() || null;
    const addressChanged = addressText.trim() !== (values.fullAddress ?? "");
    if (addressChanged) {
      if (!address || address.fullAddress !== addressText) {
        setAddressError("Choisissez l'adresse dans la liste proposée");
        return;
      }
      next.address = address;
    }
    if (type && type !== values.type) next.type = type;
    const surfaceValue = surface.trim() ? Number(surface.replace(",", ".")) : null;
    if (surface.trim() && (Number.isNaN(surfaceValue) || (surfaceValue ?? 0) <= 0)) {
      toast.error("Surface invalide");
      return;
    }
    if (surfaceValue != null && surfaceValue !== values.surfaceM2) next.surfaceM2 = surfaceValue;
    if (legalStatus && legalStatus !== values.legalStatus) next.legalStatus = legalStatus;
    // Champs propres au régime choisi et au bail commercial : envoyés seulement s'ils changent.
    const changed = (value: string, before: string | null | undefined) => value.trim() !== (before ?? "");
    if (legalStatus === "CO_PROPRIETE") {
      if (changed(syndicName, values.syndicName)) next.syndicName = syndicName.trim() || null;
      if (changed(syndicEmail, values.syndicEmail)) next.syndicEmail = syndicEmail.trim() || null;
      if (changed(syndicPhone, values.syndicPhone)) next.syndicPhone = syndicPhone.trim() || null;
    }
    if (legalStatus === "LOTISSEMENT" && subdivision && subdivision !== values.subdivisionOver10Years) {
      next.subdivisionOver10Years = subdivision;
    }
    if (commercial) {
      if (complex && complex !== values.complexType) next.complexType = complex;
      if (changed(outbuildings, values.outbuildings)) next.outbuildings = outbuildings.trim() || null;
    }
    if (Object.keys(next).length === 0) return setOpen(false);

    setSaving(true);
    // La réponse de l'action (qui revalide la page) met la fiche à jour : pas de router.refresh().
    const result = await updatePropertyDetailsAdmin({ propertyId, values: next, revalidate: pathname });
    setSaving(false);
    if (result.success) {
      toast.success("Bien mis à jour");
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
          {missing ? "Saisir" : "Modifier"}
          <span className="sr-only"> : adresse et description du bien</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(26rem,calc(100vw-2rem))] max-h-[min(38rem,80vh)] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="text-sm font-semibold">Adresse et description</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`property-${propertyId}-label`}>Libellé (facultatif)</Label>
            <Input id={`property-${propertyId}-label`} className="h-10" value={label} maxLength={200} onChange={(event) => setLabel(event.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Adresse</Label>
            <AddressAutocomplete
              value={addressText}
              onChange={(value) => {
                setAddressText(value);
                setAddress(null);
                setAddressError(undefined);
              }}
              onAddressSelect={(data) => {
                setAddressText(data.fullAddress);
                setAddress(data);
                setAddressError(undefined);
              }}
              placeholder="Rechercher une adresse..."
              error={addressError}
            />
            <span className="text-xs text-muted-foreground">Une nouvelle commune remet à zéro la zone d'encadrement choisie à la main.</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`property-${propertyId}-type`}>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id={`property-${propertyId}-type`} className="h-10 w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_OPTIONS).map(([key, optionLabel]) => (
                    <SelectItem key={key} value={key}>
                      {optionLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`property-${propertyId}-surface`}>{commercial ? "Surface" : "Surface habitable"}</Label>
              <div className="relative">
                <Input
                  id={`property-${propertyId}-surface`}
                  inputMode="decimal"
                  autoComplete="off"
                  className="h-10 pr-10"
                  value={surface}
                  onChange={(event) => setSurface(event.target.value.replace(/[^\d.,]/g, ""))}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">m²</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`property-${propertyId}-legal`}>Régime juridique</Label>
            <Select value={legalStatus} onValueChange={setLegalStatus}>
              <SelectTrigger id={`property-${propertyId}-legal`} className="h-10 w-full">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEGAL_OPTIONS).map(([key, optionLabel]) => (
                  <SelectItem key={key} value={key}>
                    {optionLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {legalStatus === "CO_PROPRIETE" && (
            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <p className="text-[13px] font-semibold">Syndic de copropriété</p>
              <Input aria-label="Nom du syndic" placeholder="Nom du syndic" className="h-10" value={syndicName} maxLength={200} onChange={(event) => setSyndicName(event.target.value)} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input aria-label="E-mail du syndic" type="email" placeholder="E-mail" className="h-10" value={syndicEmail} maxLength={200} onChange={(event) => setSyndicEmail(event.target.value)} />
                <Input aria-label="Téléphone du syndic" type="tel" placeholder="Téléphone" className="h-10" value={syndicPhone} maxLength={40} onChange={(event) => setSyndicPhone(event.target.value)} />
              </div>
            </div>
          )}
          {legalStatus === "LOTISSEMENT" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`property-${propertyId}-subdivision`}>Ancienneté du lotissement</Label>
              <Select value={subdivision} onValueChange={setSubdivision}>
                <SelectTrigger id={`property-${propertyId}-subdivision`} className="h-10 w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SUBDIVISION_OPTIONS).map(([key, optionLabel]) => (
                    <SelectItem key={key} value={key}>
                      {optionLabel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Plus de 10 ans : le règlement du lotissement n&apos;est plus demandé.</span>
            </div>
          )}
          {commercial && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`property-${propertyId}-complex`}>Situation du local</Label>
                <Select value={complex} onValueChange={setComplex}>
                  <SelectTrigger id={`property-${propertyId}-complex`} className="h-10 w-full">
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMPLEX_OPTIONS).map(([key, optionLabel]) => (
                      <SelectItem key={key} value={key}>
                        {optionLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`property-${propertyId}-outbuildings`}>Dépendances (facultatif)</Label>
                <Input
                  id={`property-${propertyId}-outbuildings`}
                  className="h-10"
                  placeholder="Cave, parking, réserve…"
                  value={outbuildings}
                  maxLength={500}
                  onChange={(event) => setOutbuildings(event.target.value)}
                />
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" size="sm" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Équipements du logement meublé : cases à cocher, un seul enregistrement. */
export function PropertyFurnitureEditor({
  propertyId,
  items,
}: {
  propertyId: string;
  items: Array<{ key: string; label: string; present: boolean }>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setChecked(Object.fromEntries(items.map((item) => [item.key, item.present])));
  }, [open, items]);

  const save = async () => {
    const changed = items.filter((item) => checked[item.key] !== item.present);
    if (changed.length === 0) return setOpen(false);
    setSaving(true);
    const result = await updatePropertyFurnitureAdmin({
      propertyId,
      values: Object.fromEntries(changed.map((item) => [item.key, !!checked[item.key]])),
      revalidate: pathname,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Équipements enregistrés");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
          <Pencil className="size-3.5" />
          Modifier
          <span className="sr-only"> : équipements du meublé</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(24rem,calc(100vw-2rem))] max-h-[min(36rem,80vh)] overflow-y-auto">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Équipements du meublé</p>
            <button
              type="button"
              className="text-xs font-medium text-primary underline-offset-2 hover:underline"
              onClick={() => setChecked(Object.fromEntries(items.map((item) => [item.key, true])))}
            >
              Tout cocher
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((item) => {
              const id = `furniture-${propertyId}-${item.key}`;
              return (
                <li key={item.key} className="flex items-center gap-2.5">
                  <Checkbox
                    id={id}
                    checked={!!checked[item.key]}
                    onCheckedChange={(value) => setChecked((prev) => ({ ...prev, [item.key]: value === true }))}
                  />
                  <Label htmlFor={id} className="text-[13px] font-normal">
                    {item.label}
                  </Label>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
