"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-picker";
import { setRentRulesAdmin } from "@/lib/actions/admin-bail-edit";
import { RENT_INCREASE_LABELS, RENT_INCREASE_REASONS, relocationSituation } from "@/lib/utils/rent-relocation";
import type { RentRulesFormValues } from "@/lib/utils/rent-draft";

const NONE = "__none";

/**
 * Relocation en zone tendue : l'équipe complète ou corrige les réponses du propriétaire. Le maximum
 * se recalcule sur la fiche après l'enregistrement.
 */
export function RentRulesEditor({ bailId, values, missing }: { bailId: string; values: RentRulesFormValues; missing?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<RentRulesFormValues>(values);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const set = (patch: Partial<RentRulesFormValues>) => setDraft((prev) => ({ ...prev, ...patch }));
  const amount = (value: string) => value.replace(/[^\d]/g, "");
  const situation = relocationSituation({
    relocationLetBefore: draft.relocationLetBefore === "yes" ? true : draft.relocationLetBefore === "no" ? false : null,
    previousTenantLeftAt: draft.previousTenantLeftAt || null,
  });

  const save = async () => {
    setSaving(true);
    // La réponse de l'action (qui revalide la page) met la fiche à jour : pas de router.refresh().
    const result = await setRentRulesAdmin({ bailId, values: draft, revalidate: pathname });
    setSaving(false);
    if (result.success) {
      toast.success("Évolution du loyer enregistrée");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  const yesNo = (value: "" | "yes" | "no", onValue: (next: "" | "yes" | "no") => void, yes: string, no: string, id: string) => (
    <Select value={value || NONE} onValueChange={(next) => onValue(next === NONE ? "" : (next as "yes" | "no"))}>
      <SelectTrigger id={id} className="h-10 w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Non renseigné</SelectItem>
        <SelectItem value="yes">{yes}</SelectItem>
        <SelectItem value="no">{no}</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Pencil className="size-3.5" />
          {missing ? "Saisir" : "Modifier"}
          <span className="sr-only"> : évolution du loyer</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(26rem,calc(100vw-2rem))] max-h-[min(40rem,80vh)] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="text-sm font-semibold">Évolution du loyer (zone tendue)</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`relet-${bailId}`}>Logement déjà loué</Label>
            {yesNo(draft.relocationLetBefore, (next) => set({ relocationLetBefore: next }), "Oui, déjà loué", "Non, première location", `relet-${bailId}`)}
          </div>
          {draft.relocationLetBefore === "yes" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label>Départ du locataire précédent</Label>
                <DateInput
                  value={draft.previousTenantLeftAt || undefined}
                  onChange={(value) => set({ previousTenantLeftAt: value })}
                  aria-label="Départ du locataire précédent"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`previous-rent-${bailId}`}>Dernier loyer hors charges</Label>
                <div className="relative">
                  <Input
                    id={`previous-rent-${bailId}`}
                    inputMode="numeric"
                    autoComplete="off"
                    className="h-10 pr-8"
                    value={draft.previousRentAmount}
                    onChange={(event) => set({ previousRentAmount: amount(event.target.value) })}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">€</span>
                </div>
              </div>
              {situation === "relet" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`revised-${bailId}`}>Révisé au cours des 12 derniers mois</Label>
                    {yesNo(
                      draft.previousRentRevisedRecently,
                      (next) => set({ previousRentRevisedRecently: next }),
                      "Oui",
                      "Non (révision IRL calculée)",
                      `revised-${bailId}`,
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`increase-${bailId}`}>Hausse au-delà du dernier loyer</Label>
                    <Select
                      value={draft.rentIncreaseReason || "NONE"}
                      onValueChange={(next) => set({ rentIncreaseReason: next as RentRulesFormValues["rentIncreaseReason"] })}
                    >
                      <SelectTrigger id={`increase-${bailId}`} className="h-10 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RENT_INCREASE_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {RENT_INCREASE_LABELS[reason]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {draft.rentIncreaseReason === "WORKS" && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`works-${bailId}`}>Coût TTC des travaux</Label>
                        <Input
                          id={`works-${bailId}`}
                          inputMode="numeric"
                          autoComplete="off"
                          className="h-10"
                          value={draft.worksAmount}
                          onChange={(event) => set({ worksAmount: amount(event.target.value) })}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Fin des travaux</Label>
                        <DateInput
                          value={draft.worksCompletedAt || undefined}
                          onChange={(value) => set({ worksCompletedAt: value })}
                          aria-label="Fin des travaux"
                        />
                      </div>
                    </div>
                  )}
                  {draft.rentIncreaseReason === "UNDERVALUED" && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`neighborhood-${bailId}`}>Loyer du voisinage (hors ville encadrée)</Label>
                      <Input
                        id={`neighborhood-${bailId}`}
                        inputMode="numeric"
                        autoComplete="off"
                        className="h-10"
                        value={draft.neighborhoodRent}
                        onChange={(event) => set({ neighborhoodRent: amount(event.target.value) })}
                      />
                      <span className="text-xs text-muted-foreground">Dans une ville encadrée, le loyer de référence de l&apos;arrêté est utilisé.</span>
                    </div>
                  )}
                </>
              )}
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
