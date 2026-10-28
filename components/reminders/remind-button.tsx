"use client";

import * as React from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RemindDialog, ReminderHistoryList } from "@/components/reminders/remind-dialog";
import type { ReminderPanel } from "@/lib/actions/reminders";
import { REASON_LABELS, TARGET_LABELS, reminderRank, type ReminderTargetValue } from "@/lib/utils/reminders";
import { cn } from "@/lib/utils";

/** Bouton « Relancer » : ouvre la fenêtre qui dit qui sera relancé et pourquoi. */
export function RemindButton({
  bailId,
  label = "Relancer",
  focus = "due",
  initialPanel,
  only,
  variant = "outline",
  size = "sm",
  className,
  title,
  rentCapLines,
  icon = false,
}: {
  bailId: string;
  label?: string;
  focus?: "due" | "missing" | "all";
  initialPanel?: ReminderPanel;
  only?: ReminderTargetValue;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  className?: string;
  title?: string;
  rentCapLines?: string[] | null;
  icon?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {icon && <BellRing className="size-4" />}
        <span className="truncate">{label}</span>
      </Button>
      <RemindDialog
        bailId={bailId}
        open={open}
        onOpenChange={setOpen}
        focus={focus}
        initialPanel={initialPanel}
        only={only}
        title={title}
        rentCapLines={rentCapLines}
      />
    </>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/**
 * Relances de la fiche dossier, dans la carte « Suivi » : ce que le dossier
 * attend et les dernières relances. En lecture seule : on relance depuis le
 * bouton de l'en-tête.
 */
export function ReminderSummary({ panel }: { panel: ReminderPanel }) {
  const due = panel.needs.filter((n) => n.due);
  const missingCount = panel.missing.OWNER.length + panel.missing.TENANT.length;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <BellRing className="size-4 text-muted-foreground" />
          Relances
        </h3>
        {due.length > 0 && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{due.length} à faire</span>
        )}
      </div>

      {panel.needs.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          {missingCount > 0
            ? `Pas de relance automatique en cours. ${missingCount} élément${missingCount > 1 ? "s" : ""} manquant${missingCount > 1 ? "s" : ""} à demander avec le bouton en haut de la fiche.`
            : "Le dossier n'attend rien du client pour l'instant."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {panel.needs.map((need) => (
            <li key={`${need.target}-${need.reason}`} className="flex flex-col gap-0.5 text-[13px]">
              <span className="font-semibold">
                {TARGET_LABELS[need.target]} · {REASON_LABELS[need.reason].toLowerCase()}
              </span>
              <span className={cn(need.due ? "font-semibold text-amber-800" : "text-muted-foreground")}>
                {need.snoozedUntil
                  ? `Rappels reportés jusqu'au ${fmtDate(need.snoozedUntil)}`
                  : need.due
                    ? `${reminderRank(need.contacts)} à faire${need.lastContactAt ? ` · dernier contact le ${fmtDate(need.lastContactAt)}` : ""}`
                    : `${need.contacts ? `Relancé ${need.contacts} fois · ` : ""}prochaine relance le ${fmtDate(need.dueAt)}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {panel.history.length > 0 && <ReminderHistoryList history={panel.history} limit={3} />}
    </div>
  );
}
