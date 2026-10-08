import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Briques de la fiche de vérification : un bloc (« Le bail », « Propriétaire »…)
 * contient des points de contrôle, chacun avec son état, ses données et ses
 * actions. Composants de présentation, utilisables côté serveur.
 */

/** ok : renseigné / présent · missing : manquant · todo : à contrôler par nous. */
export type PointState = "ok" | "missing" | "todo";

export function PointIcon({ state }: { state: PointState }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 flex size-[22px] shrink-0 items-center justify-center rounded-full text-xs font-bold",
        state === "ok" && "bg-green-100 text-green-800",
        state === "missing" && "bg-red-100 text-red-800",
        state === "todo" && "border-2 border-slate-300 bg-background",
      )}
    >
      {state === "ok" ? <Check className="size-3.5" strokeWidth={3} /> : state === "missing" ? "!" : null}
    </span>
  );
}

export function CheckPoint({
  state,
  label,
  children,
  note,
  actions,
}: {
  state: PointState;
  label: ReactNode;
  /** Données du point (une ligne par élément, retours à la ligne conservés). */
  children?: ReactNode;
  /** Ce qui manque, en rouge sous les données. */
  note?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-2.5 px-5 py-3.5 sm:grid-cols-[22px_minmax(0,1fr)_auto]">
      <PointIcon state={state} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[14.5px] font-semibold leading-snug">{label}</span>
        {children && <div className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">{children}</div>}
        {note && <span className="text-[13px] font-semibold text-red-700">{note}</span>}
      </div>
      {actions && (
        <div className="col-span-2 flex flex-wrap items-start gap-2 sm:col-span-1 sm:justify-end [&>*]:flex-1 sm:[&>*]:flex-none">
          {actions}
        </div>
      )}
    </li>
  );
}

export function CheckList({ children }: { children: ReactNode }) {
  return <ul className="flex flex-col divide-y">{children}</ul>;
}

export type ChipTone = "ok" | "missing" | "todo" | "neutral";

export function StateChip({ tone, children, className }: { tone: ChipTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-semibold",
        tone === "ok" && "bg-green-100 text-green-800",
        tone === "missing" && "bg-red-100 text-red-800",
        tone === "todo" && "bg-slate-200 text-slate-700",
        tone === "neutral" && "bg-slate-100 text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function CheckSection({
  id,
  title,
  subtitle,
  headerRight,
  children,
  footer,
}: {
  id?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    // scroll-mt : les ancres du sommaire ne passent pas sous l'en-tête collant.
    <section id={id} className="scroll-mt-64 overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[17px] font-semibold leading-snug">{title}</h2>
          {subtitle && <p className="text-[13px] text-muted-foreground">{subtitle}</p>}
        </div>
        {headerRight && <div className="flex flex-wrap items-center gap-2">{headerRight}</div>}
      </header>
      {children}
      {footer && <div className="border-t px-5 py-4">{footer}</div>}
    </section>
  );
}
