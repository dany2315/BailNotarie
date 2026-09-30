"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Atomes de l'espace client — version « studio ».

   Même vocabulaire visuel que les maquettes produit de la page d'accueil
   (composants de `lp-product-mockups`) : surfaces blanches posées sur le
   fond du site, anneau 1px froid, ombre bleutée diffuse, micro-libellés en
   capitales, chiffres en `tabular-nums`, un seul accent bleu.

   Ces atomes ne portent aucune logique métier : ils reçoivent des données
   déjà calculées. Toute la logique reste dans les pages.
   ========================================================================= */

/* ---------- Fond de page -------------------------------------------------- */

/** Le canevas commun aux trois pages : dégradé très doux + halo bleu discret
    en haut, pour que la barre de navigation flottante ait quelque chose à
    laisser deviner derrière elle. */
export function OwnerCanvas({
  children,
  className,
  /** Faux quand une barre au-dessus réserve déjà la hauteur de la barre du site. */
  navOffset = true,
}: {
  children: React.ReactNode;
  className?: string;
  navOffset?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative min-h-full",
        navOffset && "pt-[calc(var(--lp-nav-h,76px)+0.5rem)] sm:pt-0",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[#4373f5]/[0.11] blur-[110px]" />
        <div className="absolute -top-24 right-[8%] h-[260px] w-[260px] rounded-full bg-[#8b5cf6]/[0.09] blur-[100px]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

/* ---------- Surface ------------------------------------------------------- */

type SurfaceTone = "plain" | "raised" | "quiet" | "accent" | "warn";

const SURFACE_TONES: Record<SurfaceTone, string> = {
  plain: "border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  raised:
    "border-slate-200/70 bg-white shadow-[0_2px_4px_rgba(15,23,42,0.04),0_26px_60px_-34px_rgba(30,58,138,0.32)]",
  quiet: "border-slate-200/70 bg-white/70 backdrop-blur-sm shadow-none",
  accent: "border-[#4373f5]/20 bg-[#4373f5]/[0.045] shadow-none",
  warn: "border-amber-200/80 bg-amber-50/70 shadow-none",
};

export function Surface({
  tone = "plain",
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { tone?: SurfaceTone }) {
  return (
    <div className={cn("rounded-[20px] border", SURFACE_TONES[tone], className)} {...rest}>
      {children}
    </div>
  );
}

/* ---------- Typographie --------------------------------------------------- */

export function MicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400", className)}>
      {children}
    </p>
  );
}

export function SectionHeading({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 px-1", className)}>
      <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-tight text-slate-900">
        {title}
        {count != null && count > 0 && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

/* ---------- Pastilles ----------------------------------------------------- */

export type Tone = "blue" | "amber" | "emerald" | "slate" | "violet";

const PILL_TONES: Record<Tone, string> = {
  blue: "bg-[#4373f5]/10 text-[#3563e9]",
  amber: "bg-amber-100/80 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100/70 text-violet-700",
};

export function Pill({
  tone = "slate",
  icon: Icon,
  children,
  className,
}: {
  tone?: Tone;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        PILL_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

const TILE_TONES: Record<Tone, string> = {
  blue: "bg-[#4373f5]/10 text-[#3563e9]",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  slate: "bg-slate-100 text-slate-500",
  violet: "bg-violet-100 text-violet-600",
};

export function IconTile({
  icon: Icon,
  tone = "slate",
  size = "md",
  className,
}: {
  icon: React.ElementType;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl",
        size === "sm" ? "h-7 w-7" : size === "lg" ? "h-11 w-11 rounded-2xl" : "h-9 w-9",
        TILE_TONES[tone],
        className,
      )}
    >
      <Icon className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4"} />
    </span>
  );
}

/* ---------- Boutons ------------------------------------------------------- */

/** Le bouton principal de l'espace client : exactement le dégradé des CTA de
    la page d'accueil, pour qu'un propriétaire retrouve le même geste. */
export const PrimaryAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function PrimaryAction({ className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-2.5 text-[13px] font-semibold text-white",
        "shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_10px_24px_-10px_rgba(53,99,233,0.7)]",
        "transition-[transform,box-shadow] duration-200 hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_14px_30px_-10px_rgba(53,99,233,0.8)] active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

export const QuietAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(function QuietAction({ className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12.5px] font-semibold text-slate-700",
        "transition-colors hover:border-slate-300 hover:bg-slate-50 active:translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/40 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/* ---------- Bandeau de chiffres ------------------------------------------- */

export type StatItem = {
  label: string;
  value: number;
  tone?: Tone;
  onClick?: () => void;
  hint?: string;
};

/** Trois chiffres dans une seule surface fine : on lit l'état du compte d'un
    coup d'œil sans que les chiffres volent la vedette aux actions. */
export function StatRail({ items, className }: { items: StatItem[]; className?: string }) {
  return (
    <Surface tone="raised" className={cn("grid grid-cols-3 divide-x divide-slate-100 overflow-hidden", className)}>
      {items.map((item) => {
        const interactive = Boolean(item.onClick) && item.value > 0;
        const content = (
          <>
            <span
              className={cn(
                "text-[26px] font-bold leading-none tabular-nums",
                item.tone === "amber"
                  ? "text-amber-500"
                  : item.tone === "emerald"
                    ? "text-emerald-600"
                    : item.tone === "blue"
                      ? "text-[#3563e9]"
                      : "text-slate-900",
              )}
            >
              {item.value}
            </span>
            <span className="text-[11px] font-medium text-slate-500">{item.label}</span>
          </>
        );
        return interactive ? (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            className="flex flex-col items-center gap-1.5 px-2 py-4 transition-colors hover:bg-slate-50/80 sm:py-5"
          >
            {content}
          </button>
        ) : (
          <div key={item.label} className="flex flex-col items-center gap-1.5 px-2 py-4 sm:py-5">
            {content}
          </div>
        );
      })}
    </Surface>
  );
}

/* ---------- Champ en lecture seule ---------------------------------------- */

export function ReadField({
  label,
  value,
  wide = false,
}: {
  label: string;
  value?: string | null;
  wide?: boolean;
}) {
  if (!value) return null;
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <MicroLabel className="mb-1">{label}</MicroLabel>
      <p className="break-words text-[14px] font-medium leading-snug text-slate-800">{value}</p>
    </div>
  );
}

export function FieldGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-x-8 gap-y-5 sm:grid-cols-2", className)}>{children}</div>;
}

/* ---------- État vide ----------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#4373f5]/8 text-[#4373f5] ring-1 ring-[#4373f5]/10">
        <Icon className="h-5 w-5" />
      </span>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold text-slate-900">{title}</p>
        {description && <p className="mx-auto max-w-[34ch] text-[13px] leading-snug text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Divers -------------------------------------------------------- */
