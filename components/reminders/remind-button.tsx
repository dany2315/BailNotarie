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
}: {
  bailId: string;
  label?: string;
  focus?: "due" | "missing";
  initialPanel?: ReminderPanel;
  only?: ReminderTargetValue;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <RemindDialog bailId={bailId} open={open} onOpenChange={setOpen} focus={focus} initialPanel={initialPanel} only={only} />
    </>
  );
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Carte « Relances » de la fiche dossier : attentes en cours et dernières relances. */
export function ReminderCard({ panel }: { panel: ReminderPanel }) {
  const [open, setOpen] = React.useState(false);
  const due = panel.needs.filter((n) => n.due);
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold">
          <BellRing className="size-4 text-muted-foreground" />
          Relances
        </h2>
        {due.length > 0 && (
          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">{due.length} à faire</span>
        )}
      </div>

      {panel.needs.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Le dossier n'attend rien du client pour l'instant.</p>
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

      <Button type="button" variant={due.length > 0 ? "default" : "outline"} className="h-10" onClick={() => setOpen(true)}>
        Relancer…
      </Button>
      <RemindDialog bailId={panel.bailId} open={open} onOpenChange={setOpen} initialPanel={panel} />
    </section>
  );
}
