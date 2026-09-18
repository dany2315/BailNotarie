"use client";

import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Globe,
  Headphones,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import * as React from "react";
import { Reveal, SectionLabel, SpotlightCard, Tilt3D, useReveal } from "./ui/lp-primitives";
import { cn } from "@/lib/utils";

/** Barre du comparatif : pleine par défaut, elle ne se remplit que si elle
 *  était encore hors champ à l'hydratation. On observe le rail, pas la barre :
 *  à `scaleX(0)` celle-ci n'a plus d'aire et ne serait jamais détectée. */
function RecoveryBar({ width, tone, delay }: { width: string; tone: "slate" | "blue"; delay: number }) {
  const track = React.useRef<HTMLDivElement>(null);
  const bar = React.useRef<HTMLDivElement>(null);
  const targets = React.useCallback(() => [bar.current], []);
  useReveal(track, { targets });

  return (
    <div ref={track} className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        ref={bar}
        style={{ width, ["--lp-delay" as string]: `${delay}s` }}
        className={cn(
          "lp-grow-x h-full rounded-full",
          tone === "blue"
            ? "bg-gradient-to-r from-[#4373f5] to-[#6d8ff9] shadow-[0_0_20px_rgba(67,115,245,0.55)]"
            : "bg-slate-300",
        )}
      />
    </div>
  );
}

const DELAY_COLUMNS = [28, 40, 52, 66, 80, 94, 100];

/** Petit graphe de délai : les colonnes poussent ensemble, en décalé. */
function DelayChart() {
  const row = React.useRef<HTMLDivElement>(null);
  const targets = React.useCallback(
    () => (row.current ? Array.from(row.current.children) : []) as HTMLElement[],
    [],
  );
  useReveal(row, { targets });

  return (
    <div ref={row} className="mt-6 flex items-end gap-1.5">
      {DELAY_COLUMNS.map((height, index) => (
        <span
          key={index}
          style={{ height: `${height * 0.42}px`, ["--lp-delay" as string]: `${index * 0.07}s` }}
          className={cn(
            "lp-grow-y w-full rounded-t-md",
            index === 6 ? "bg-gradient-to-t from-[#4373f5] to-[#7ea1fa]" : "bg-slate-200",
          )}
        />
      ))}
    </div>
  );
}

/* Comparatif de délai de recouvrement : la démonstration la plus parlante
   de la force exécutoire. Deux barres, même échelle. */
const RECOVERY = [
  { label: "Bail sous seing privé", months: "12 à 18 mois", width: "100%", tone: "slate" as const },
  { label: "Bail notarié", months: "2 à 3 mois", width: "18%", tone: "blue" as const },
];

export function LpBenefits() {
  return (
    <section
      id="avantages"
      aria-labelledby="lp-benefits-title"
      data-lp-chrome="#ffffff"
      className="relative scroll-mt-24 overflow-hidden bg-white py-24 sm:py-32"
    >
      <div aria-hidden className="lp-grid absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel icon={Sparkles}>Vos avantages</SectionLabel>
          <h2 id="lp-benefits-title" className="lp-title lp-balance mt-6 text-4xl font-bold text-slate-900 sm:text-[3.25rem]">
            Pourquoi choisir <span className="lp-gradient-text">BailNotarie</span> ?
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
            La solution la plus simple et rapide pour obtenir votre bail notarié : 100% en ligne, prêt en 1 semaine, par
            nos notaires partenaires certifiés et spécialisés en droit immobilier.
          </p>
        </Reveal>

        {/* ---------- Bento ---------- */}
        <div className="mt-16 grid gap-4 lg:grid-cols-6">
          {/* Carte principale : force exécutoire + comparatif */}
          <Reveal className="lg:col-span-4 lg:row-span-1">
            <Tilt3D intensity={5} lift={12} className="h-full">
              <SpotlightCard className="lp-sheen h-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-[#f5f8ff] p-7 sm:p-9">
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4373f5] to-[#3563e9] text-white shadow-[0_12px_28px_-14px_rgba(53,99,233,1)]">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
                      Acte authentique
                    </span>
                  </div>

                  <h3 className="lp-title mt-6 text-2xl font-bold text-slate-900 sm:text-3xl">
                    Force exécutoire immédiate
                  </h3>
                  <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-slate-600">
                    En cas d&apos;impayés, le bail notarié permet d&apos;engager le recouvrement sans passer par une
                    procédure judiciaire préalable. Le gain de temps est décisif.
                  </p>

                  <div className="mt-7 space-y-4">
                    {RECOVERY.map((row, index) => (
                      <div key={row.label}>
                        <div className="mb-1.5 flex items-baseline justify-between gap-4">
                          <span
                            className={cn(
                              "text-[13.5px] font-medium",
                              row.tone === "blue" ? "text-slate-900" : "text-slate-500",
                            )}
                          >
                            {row.label}
                          </span>
                          <span
                            className={cn(
                              "text-[13.5px] font-semibold tabular-nums",
                              row.tone === "blue" ? "text-[#3563e9]" : "text-slate-400",
                            )}
                          >
                            {row.months}
                          </span>
                        </div>
                        <RecoveryBar width={row.width} tone={row.tone} delay={0.15 * index} />
                      </div>
                    ))}
                    <p className="pt-1 text-[12.5px] text-slate-400">
                      Délais indicatifs de recouvrement constatés, hors délais propres à chaque situation.
                    </p>
                  </div>
                </div>
              </SpotlightCard>
            </Tilt3D>
          </Reveal>

          {/* 100% en ligne */}
          <Reveal delay={0.08} className="lg:col-span-2">
            <Tilt3D intensity={7} lift={14} className="h-full">
              <SpotlightCard className="lp-sheen relative h-full overflow-hidden rounded-3xl border border-[#4373f5]/20 bg-gradient-to-br from-[#4373f5] to-[#3563e9] p-7 text-white">
                <div aria-hidden className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
                <div className="relative">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                    <Globe className="h-5 w-5" />
                  </span>
                  <h3 className="lp-title mt-6 text-2xl font-bold">100% en ligne</h3>
                  <p className="mt-3 text-[14.5px] leading-relaxed text-blue-50/85">
                    Aucun déplacement. Tout se fait depuis chez vous, en quelques minutes : dossier, pièces,
                    signature.
                  </p>
                  <div className="mt-7 flex items-center gap-2 text-[13px] font-medium text-blue-50/80">
                    <ScanLine className="h-4 w-4" />
                    Pièces contrôlées automatiquement
                  </div>
                </div>
              </SpotlightCard>
            </Tilt3D>
          </Reveal>

          {/* 1 semaine */}
          <Reveal delay={0.12} className="lg:col-span-2">
            <Tilt3D intensity={7} lift={14} className="h-full">
              <SpotlightCard className="lp-sheen h-full rounded-3xl border border-slate-200 bg-white p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4373f5]/10 text-[#3563e9]">
                  <Clock className="h-5 w-5" />
                </span>
                <h3 className="lp-title mt-6 text-2xl font-bold text-slate-900">Prêt en 1 semaine</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
                  Transmission automatique au notaire dès la validation de votre dossier, puis signature en
                  visioconférence.
                </p>
                <DelayChart />
                <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                  <span>J+0</span>
                  <span>J+7 · signature</span>
                </div>
              </SpotlightCard>
            </Tilt3D>
          </Reveal>

          {/* Tarif */}
          <Reveal delay={0.16} className="lg:col-span-2">
            <Tilt3D intensity={7} lift={14} className="h-full">
              <SpotlightCard className="lp-sheen h-full rounded-3xl border border-slate-200 bg-white p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </span>
                <h3 className="lp-title mt-6 text-2xl font-bold text-slate-900">Tarif transparent</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
                  39,90 € TTC de frais de dossier, remboursés si le dossier n&apos;aboutit pas*. Les frais notariés
                  restent réglementés par l&apos;État.
                </p>
                <Link
                  href="/simulateur-prix-bail-notarie"
                  className="group mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#3563e9]"
                >
                  Simuler le prix de mon bail
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </SpotlightCard>
            </Tilt3D>
          </Reveal>

          {/* Support */}
          <Reveal delay={0.2} className="lg:col-span-2">
            <Tilt3D intensity={7} lift={14} className="h-full">
              <SpotlightCard className="lp-sheen h-full rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-[#f7f9ff] p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4373f5]/10 text-[#3563e9]">
                  <Headphones className="h-5 w-5" />
                </span>
                <h3 className="lp-title mt-6 text-2xl font-bold text-slate-900">Support dédié</h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">
                  Une équipe joignable par téléphone à chaque étape de votre démarche de bail authentifié.
                </p>
                <a
                  href="tel:0749387756"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
                >
                  07 49 38 77 56
                </a>
              </SpotlightCard>
            </Tilt3D>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
