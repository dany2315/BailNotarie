"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateInput } from "@/components/ui/date-picker";
import { updatePropertyDpeAdmin } from "@/lib/actions/admin-property";
import { ENERGY_CLASSES } from "@/lib/utils/dpe";

const NO_GES = "none";

/**
 * Saisie manuelle du DPE d'un bien : classe énergie, classe climat (GES) et
 * date d'établissement, lues dans le diagnostic. La validité se calcule
 * depuis la date.
 */
export function DpeEditor({
  propertyId,
  dpeClass,
  gesClass,
  dpeDate,
}: {
  propertyId: string;
  dpeClass: string | null;
  gesClass: string | null;
  /** « yyyy-MM-dd » */
  dpeDate: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [cls, setCls] = React.useState(dpeClass || "");
  const [ges, setGes] = React.useState(gesClass || NO_GES);
  const [date, setDate] = React.useState(dpeDate || "");
  const [saving, setSaving] = React.useState(false);
  const filled = !!dpeClass && !!dpeDate;

  React.useEffect(() => {
    if (!open) return;
    setCls(dpeClass || "");
    setGes(gesClass || NO_GES);
    setDate(dpeDate || "");
  }, [open, dpeClass, gesClass, dpeDate]);

  const save = async () => {
    setSaving(true);
    // La réponse de l'action (qui revalide la page) met la fiche à jour : pas de router.refresh().
    const result = await updatePropertyDpeAdmin({
      propertyId,
      dpeClass: cls,
      gesClass: ges === NO_GES ? null : ges,
      dpeDate: date,
      revalidate: pathname,
    });
    setSaving(false);
    if (result.success) {
      toast.success("DPE enregistré");
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
          {filled ? "Modifier" : "Saisir"}
          <span className="sr-only"> le DPE</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold">DPE du bien</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`dpe-class-${propertyId}`}>Classe énergie</Label>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger id={`dpe-class-${propertyId}`} className="h-10 w-full">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`dpe-ges-${propertyId}`}>Classe climat (GES)</Label>
            <Select value={ges} onValueChange={setGes}>
              <SelectTrigger id={`dpe-ges-${propertyId}`} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_GES}>Non renseignée</SelectItem>
                {ENERGY_CLASSES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`dpe-date-${propertyId}`}>Date d&apos;établissement</Label>
            <DateInput
              id={`dpe-date-${propertyId}`}
              value={date}
              onChange={setDate}
              fromYear={2006}
              toYear={new Date().getFullYear()}
            />
            <span className="text-xs text-muted-foreground">La validité se calcule à partir de cette date.</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || !cls || !date}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
