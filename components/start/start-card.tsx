"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Carte du parcours « Commencer », partagée par les deux étapes.

   Elle porte l'habillage — anneau dégradé, verre, ombre portée du design de
   l'accueil — et le fil d'étapes. Les formulaires n'ont donc à décrire que
   leurs champs, et les deux écrans ne peuvent pas diverger.
   ========================================================================= */

/* Libellés courts : à trois étapes sur la largeur d'une carte, un intitulé de
   deux mots est tronqué avant d'être lu. */
const STEPS = [
  { key: "email", label: "E-mail" },
  { key: "otp", label: "Code" },
  { key: "dossier", label: "Dossier" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

function Stepper({ current }: { current: StepKey }) {
  const index = STEPS.findIndex((step) => step.key === current);

  return (
    <ol className="mb-6 flex items-center gap-2" aria-label="Étapes de la création de votre dossier">
      {STEPS.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold transition-colors duration-300",
                done && "bg-emerald-500 text-white",
                active && "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_6px_16px_-8px_rgba(53,99,233,1)]",
                !done && !active && "bg-slate-100 text-slate-400",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "truncate text-[12.5px] font-medium transition-colors duration-300",
                active ? "text-slate-900" : "text-slate-400",
                // Sous 400 px, seul le libellé de l'étape en cours tient.
                active ? "inline" : "hidden min-[420px]:inline",
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span aria-hidden className={cn("ml-1 h-px flex-1 rounded-full", done ? "bg-emerald-300" : "bg-slate-200")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StartCard({
  step,
  title,
  description,
  children,
}: {
  step: StepKey;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ ["--lp-delay" as string]: "0.08s" }} className="lp-enter-up relative">
      {/* Lueur au sol, comme sous la maquette du hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 -bottom-6 h-24 rounded-[50%] bg-[#4373f5]/20 blur-[60px]"
      />
      <div className="lp-ring-gradient relative overflow-hidden rounded-[26px] bg-white/95 p-5 shadow-[0_40px_100px_-50px_rgba(30,58,138,0.6)] backdrop-blur-xl sm:p-7">
        <div aria-hidden className="lp-sheen pointer-events-none absolute inset-x-0 top-0 h-px" />
        <Stepper current={step} />
        {(title || description) && (
          <div className="mb-5">
            {title && <h2 className="text-[19px] font-semibold leading-snug text-slate-900">{title}</h2>}
            {description && <div className="mt-1.5 text-[14px] leading-relaxed text-slate-600">{description}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/** Bouton principal : celui de l'accueil, avec son reflet au survol. */
export function StartSubmit({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group/cta relative inline-flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-[15.5px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_40px_-16px_rgba(53,99,233,1)] transition-transform duration-300 hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.45)_50%,transparent_62%)] transition-transform duration-700 group-hover/cta:translate-x-full"
      />
      <span className="relative flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
            {loadingLabel}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
