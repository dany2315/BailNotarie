"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Carte du parcours « Commencer », partagée par les deux étapes.

   Elle porte l'habillage — anneau dégradé, verre, ombre portée du design de
   l'accueil — et le repère d'avancement. Les formulaires n'ont donc à décrire
   que leurs champs, et les deux écrans ne peuvent pas diverger.

   Le repère compte les étapes qui restent réellement à faire : quand
   l'adresse a été saisie sur l'accueil, le parcours n'en a plus que deux, et
   afficher la première comme franchie reviendrait à montrer un chemin que ce
   visiteur n'a jamais emprunté.
   ========================================================================= */

function Progress({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className="shrink-0 text-[11.5px] font-semibold uppercase tracking-[0.13em] text-slate-400">
        Étape {current} / {total}
      </span>
      <span
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Étape ${current} sur ${total}`}
        className="flex flex-1 items-center gap-1.5"
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-colors duration-500",
              index < current ? "bg-gradient-to-r from-[#5b85f7] to-[#3563e9]" : "bg-slate-200/90",
            )}
          />
        ))}
      </span>
    </div>
  );
}

export function StartCard({
  current,
  total,
  title,
  description,
  children,
}: {
  current: number;
  total: number;
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
        <Progress current={current} total={total} />
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
