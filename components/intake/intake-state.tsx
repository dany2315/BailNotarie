import * as React from "react";

import { cn } from "@/lib/utils";
import { LpNav } from "@/components/lp/lp-nav";
import { Footer } from "@/components/footer";
import { MicroLabel, Surface } from "@/components/client-v2/owner-ui";

/* =========================================================================
   Les pages d'état d'un formulaire : c'est fait, c'est en cours, c'est déjà
   soumis.

   Ce sont des pages qu'on lit en dix secondes, souvent après un effort — un
   formulaire rempli, un paiement. Elles ne doivent donc rien demander de
   plus que de comprendre où l'on en est et quoi faire ensuite : une icône,
   un titre, une phrase, et au plus deux gestes possibles.

   Même canevas que l'espace client : la barre du site flotte au-dessus, le
   fond de la page remonte derrière elle.
   ========================================================================= */

export type StateTone = "success" | "progress" | "info";

const HALO: Record<StateTone, string> = {
  success: "bg-emerald-400/[0.10]",
  progress: "bg-amber-400/[0.12]",
  info: "bg-[#4373f5]/[0.11]",
};

const BADGE: Record<StateTone, string> = {
  success:
    "bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_14px_30px_-12px_rgba(16,185,129,0.8)]",
  progress:
    "bg-gradient-to-b from-amber-400 to-amber-500 shadow-[0_14px_30px_-12px_rgba(245,158,11,0.75)]",
  info: "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] shadow-[0_14px_30px_-12px_rgba(53,99,233,0.8)]",
};

/** Le décor de page : barre flottante, halo teinté par l'état, pied de page. */
export function IntakeShell({
  tone = "info",
  width = "narrow",
  children,
}: {
  tone?: StateTone;
  /** `wide` pour les pages qui portent un formulaire ou un reçu. */
  width?: "narrow" | "wide";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LpNav overlay />
      <main className="relative flex flex-1 justify-center overflow-hidden px-4 pb-16 pt-[calc(var(--lp-nav-h,76px)+2.5rem)] sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[460px]">
          <div
            className={cn(
              "absolute -top-48 left-1/2 h-[460px] w-[820px] -translate-x-1/2 rounded-full blur-[120px]",
              HALO[tone],
            )}
          />
        </div>
        <div className={cn("relative w-full", width === "wide" ? "max-w-2xl" : "max-w-xl")}>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}

/** L'en-tête : une icône, un sur-titre, un titre, une phrase. Rien d'autre. */
export function IntakeHero({
  tone = "info",
  icon: Icon,
  kicker,
  title,
  description,
}: {
  tone?: StateTone;
  icon: React.ElementType;
  kicker: string;
  title: string;
  description?: React.ReactNode;
}) {
  return (
    <header className="text-center">
      <span
        className={cn(
          "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-white",
          BADGE[tone],
        )}
      >
        <Icon className="h-6 w-6" />
      </span>
      <MicroLabel className="mt-5">{kicker}</MicroLabel>
      <h1 className="lp-title mt-2 text-[27px] font-bold text-slate-900 sm:text-[33px]">{title}</h1>
      {description && (
        <p className="mx-auto mt-3 max-w-[48ch] text-[14px] leading-relaxed text-slate-500">
          {description}
        </p>
      )}
    </header>
  );
}

/** Les prochaines étapes, numérotées — la seule liste de ces pages. */
export function IntakeSteps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <Surface tone="raised" className="p-5 sm:p-6">
      <MicroLabel className="mb-4">{title}</MicroLabel>
      <ol className="relative space-y-4">
        <span
          aria-hidden
          className="absolute left-[11px] top-4 bottom-4 w-px bg-gradient-to-b from-[#4373f5]/35 to-slate-200"
        />
        {steps.map((step, index) => (
          <li key={step} className="relative flex items-start gap-3">
            <span className="relative z-10 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
              {index + 1}
            </span>
            <span className="pt-0.5 text-[13.5px] leading-snug text-slate-700">{step}</span>
          </li>
        ))}
      </ol>
    </Surface>
  );
}

/** Une précision qu'il faut donner sans la mettre sur le chemin. */
export function IntakeNote({
  icon: Icon,
  title,
  children,
  tone = "info",
}: {
  icon: React.ElementType;
  title?: string;
  children: React.ReactNode;
  tone?: StateTone;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border px-4 py-3.5",
        tone === "success"
          ? "border-emerald-200/70 bg-emerald-50/60"
          : tone === "progress"
            ? "border-amber-200/70 bg-amber-50/60"
            : "border-[#4373f5]/20 bg-[#4373f5]/[0.045]",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          tone === "success"
            ? "text-emerald-600"
            : tone === "progress"
              ? "text-amber-600"
              : "text-[#3563e9]",
        )}
      />
      <div className="min-w-0">
        {title && <p className="text-[13px] font-semibold text-slate-800">{title}</p>}
        <p className={cn("text-[12.5px] leading-snug text-slate-600", title && "mt-0.5")}>
          {children}
        </p>
      </div>
    </div>
  );
}

/** Les gestes possibles : le principal, puis l'autre. Jamais plus de deux. */
export function IntakeActions({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">{children}</div>;
}

/** Un lien qui se comporte comme le bouton principal du site. */
export function IntakePrimaryLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-5 py-3 text-[13.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_10px_24px_-10px_rgba(53,99,233,0.7)] transition-[transform,box-shadow] duration-200 hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_14px_30px_-10px_rgba(53,99,233,0.8)] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2";
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

export function IntakeQuietLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/40 focus-visible:ring-offset-2";
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}
