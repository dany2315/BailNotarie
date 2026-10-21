"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Ban, Loader2, Mail, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { updatePropertyRentCapAdmin } from "@/lib/actions/admin-property";
import { setRentCapExemptionAdmin, setRentSupplementAdmin } from "@/lib/actions/admin-bail-edit";
import { sendBailReminders } from "@/lib/actions/reminders";
import { EXEMPTION_LABELS, OUTSIDE_PERIMETER, PERIOD_LABELS, ROOMS_LABELS } from "@/lib/utils/rent-cap";

const AUTO = "auto";
const NONE = "none";

/**
 * Catégorie du logement au sens de l'arrêté : pièces principales, époque de
 * construction et, si la carte ne suffit pas, zone choisie par l'équipe.
 */
export function RentCapEditor({
  propertyId,
  periods,
  zones,
  zoneMode,
  detectedZone,
  allowOutside = false,
  zoneHint = null,
  values,
}: {
  propertyId: string;
  periods: string[];
  zones: Array<{ code: string; label: string }>;
  zoneMode: string;
  /** Zone trouvée sur la carte, le cas échéant. */
  detectedZone: string | null;
  /** Commune encadrée en partie : le logement peut être hors du périmètre. */
  allowOutside?: boolean;
  /** Zone probable, à confirmer sur la carte officielle (adresse proche d'une limite). */
  zoneHint?: string | null;
  values: { mainRooms: number | null; constructionPeriod: string | null; rentCapZone: string | null };
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [rooms, setRooms] = React.useState(NONE);
  const [period, setPeriod] = React.useState(NONE);
  const [zone, setZone] = React.useState(AUTO);
  const [saving, setSaving] = React.useState(false);
  const filled = !!values.mainRooms && !!values.constructionPeriod && (zoneMode === "polygon" || !!values.rentCapZone);
  const zoneRequired = zoneMode === "manual";

  React.useEffect(() => {
    if (!open) return;
    setRooms(values.mainRooms ? String(values.mainRooms) : NONE);
    setPeriod(values.constructionPeriod && periods.includes(values.constructionPeriod) ? values.constructionPeriod : NONE);
    setZone(values.rentCapZone || AUTO);
  }, [open, values, periods]);

  const save = async () => {
    setSaving(true);
    const result = await updatePropertyRentCapAdmin({
      propertyId,
      mainRooms: rooms === NONE ? null : Number(rooms),
      constructionPeriod: period === NONE ? null : period,
      rentCapZone: zone === AUTO ? null : zone,
      revalidate: pathname,
    });
    setSaving(false);
    if (result.success) {
      toast.success("Catégorie du logement enregistrée");
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
          <span className="sr-only"> : catégorie du logement</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={16} className="w-[min(23rem,calc(100vw-2rem))]">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold">Catégorie du logement</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`cap-rooms-${propertyId}`}>Pièces principales</Label>
            <Select value={rooms} onValueChange={setRooms}>
              <SelectTrigger id={`cap-rooms-${propertyId}`} className="h-10 w-full">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non renseigné</SelectItem>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {ROOMS_LABELS[n]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">Pièces de séjour ou de sommeil (cuisine et salle de bains exclues).</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`cap-period-${propertyId}`}>Époque de construction</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger id={`cap-period-${propertyId}`} className="h-10 w-full">
                <SelectValue placeholder="Choisir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non renseignée</SelectItem>
                {periods.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PERIOD_LABELS[p] || p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`cap-zone-${propertyId}`}>{zoneRequired ? "Zone (carte de l'arrêté)" : "Zone"}</Label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger id={`cap-zone-${propertyId}`} className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>
                  {zoneRequired ? "À choisir" : `Selon l'adresse${detectedZone ? ` (${detectedZone})` : ""}`}
                </SelectItem>
                {zones.map((z) => (
                  <SelectItem key={z.code} value={z.code}>
                    {z.label}
                  </SelectItem>
                ))}
                {allowOutside && <SelectItem value={OUTSIDE_PERIMETER}>Hors du périmètre encadré</SelectItem>}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {zoneHint
                ? `Adresse en limite : zone probable « ${zoneHint} », à confirmer sur la carte officielle (lien ci-dessous).`
                : zoneRequired
                  ? "Repérez la zone du logement sur les cartes de l'arrêté (lien ci-dessous)."
                  : "Trouvée automatiquement à partir de l'adresse ; à forcer seulement en cas d'erreur."}
            </span>
          </div>
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

/** Complément de loyer justifié : motif gardé avec le dossier, retirable. */
export function RentSupplementButton({ bailId, reason }: { bailId: string; reason: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) setText(reason || "");
  }, [open, reason]);

  const save = async (value: string | null) => {
    setSaving(true);
    const result = await setRentSupplementAdmin({ bailId, reason: value, revalidate: pathname });
    setSaving(false);
    if (result.success) {
      toast.success(value ? "Complément de loyer enregistré" : "Complément de loyer retiré");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)}>
        <ShieldCheck className="size-3.5" />
        {reason ? "Complément justifié" : "Complément justifié…"}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Complément de loyer justifié</DialogTitle>
            <DialogDescription>
              Possible seulement si le logement présente des caractéristiques exceptionnelles (localisation, confort, vue,
              terrasse…) par rapport aux logements de la même catégorie. Indiquez ce que le propriétaire a fourni.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`supplement-${bailId}`}>Motif</Label>
            <Textarea
              id={`supplement-${bailId}`}
              rows={4}
              maxLength={2000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Ex. : terrasse de 30 m² avec vue dégagée, justificatifs reçus le 12/10."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {reason && (
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => save(null)} disabled={saving}>
                Retirer le complément
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="button" onClick={() => save(text.trim())} disabled={saving || text.trim().length < 10}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const NOT_EXEMPT = "none";

/** Logement exclu de l'encadrement : le plafond ne s'applique pas (motif gardé avec le dossier, retirable). */
export function RentCapExemptionButton({
  bailId,
  exemption,
  note,
}: {
  bailId: string;
  exemption: string | null;
  note: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState(NOT_EXEMPT);
  const [text, setText] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCode(exemption || NOT_EXEMPT);
    setText(note || "");
  }, [open, exemption, note]);

  const save = async (value: string | null) => {
    setSaving(true);
    const result = await setRentCapExemptionAdmin({ bailId, exemption: value, note: value ? text.trim() || null : null, revalidate: pathname });
    setSaving(false);
    if (result.success) {
      toast.success(value ? "Logement exclu de l'encadrement" : "Encadrement des loyers rétabli");
      setOpen(false);
    } else {
      toast.error(result.error);
    }
  };
  const chosen = code === NOT_EXEMPT ? null : code;

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)}>
        <Ban className="size-3.5" />
        {exemption ? "Logement exclu" : "Logement exclu…"}
      </Button>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Logement exclu de l'encadrement</DialogTitle>
            <DialogDescription>
              Le plafond ne s'applique pas aux logements sociaux, aux logements conventionnés APL ou Anah (loyer fixé par la
              convention) ni aux logements soumis à la loi de 1948. Indiquez le motif à partir des pièces du dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`exemption-${bailId}`}>Motif</Label>
              <Select value={code} onValueChange={setCode}>
                <SelectTrigger id={`exemption-${bailId}`} className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NOT_EXEMPT}>Choisir</SelectItem>
                  {Object.entries(EXEMPTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`exemption-note-${bailId}`}>{chosen === "OTHER" ? "Précision" : "Précision (facultatif)"}</Label>
              <Textarea
                id={`exemption-note-${bailId}`}
                rows={3}
                maxLength={2000}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Ex. : convention Anah n° 2025-123 jointe au dossier."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {exemption && (
              <Button type="button" variant="ghost" className="sm:mr-auto" onClick={() => save(null)} disabled={saving}>
                Rétablir l'encadrement
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={() => save(chosen)}
              disabled={saving || !chosen || (chosen === "OTHER" && text.trim().length < 10)}
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Prévenir le propriétaire du dépassement (e-mail tracé avec le détail du calcul). */
export function RentCapNotifyButton({
  bailId,
  owner,
  lines,
}: {
  bailId: string;
  owner: { name: string; email: string | null } | null;
  lines: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    setSending(true);
    const result = await sendBailReminders({ bailId, sends: [{ target: "OWNER", reason: "RENT_CAP" }] });
    setSending(false);
    if (!result.success) return toast.error(result.error);
    if (result.data.failed.length) return toast.error(result.data.failed.map((f) => f.error).join(" · "));
    toast.success(`Propriétaire prévenu (${result.data.sent[0]?.email})`);
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setOpen(true)} disabled={!owner?.email}>
        <Mail className="size-3.5" />
        Prévenir le propriétaire
      </Button>
      <Dialog open={open} onOpenChange={(next) => !sending && setOpen(next)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Prévenir le propriétaire du dépassement</DialogTitle>
            <DialogDescription>
              {owner?.name} ({owner?.email}) recevra un e-mail avec le détail ci-dessous, et le choix entre ramener le loyer au
              plafond ou justifier un complément de loyer. L'envoi est gardé dans le suivi des relances.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex list-disc flex-col gap-1 rounded-lg bg-muted/60 py-3 pl-8 pr-4 text-sm">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button type="button" onClick={send} disabled={sending}>
              {sending && <Loader2 className="size-4 animate-spin" />}
              Envoyer l'e-mail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
