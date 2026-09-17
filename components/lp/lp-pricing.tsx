"use client";

import Link from "next/link";
import { ArrowRight, BadgeEuro, Calculator, Check, Landmark, Scale } from "lucide-react";
import { Reveal, SectionLabel, Tilt3D } from "./ui/lp-primitives";

const INCLUDED = [
  "Constitution du dossier 100% en ligne",
  "Vérification des pièces justificatives",
  "Transmission à l'étude notariale partenaire",
  "Suivi du dossier en temps réel",
  "Coordination jusqu'à la signature",
  "Support téléphonique dédié",
];

export function LpPricing() {
  return (
    <section
      id="tarif"
      aria-labelledby="lp-pricing-title"
      className="lp-scene relative scroll-mt-24 overflow-hidden bg-[#070c1a] py-24 text-white sm:py-32"
    >
      <div aria-hidden className="lp-mesh-dark absolute inset-0" />
      <div aria-hidden className="lp-grid-dark absolute inset-0" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel tone="dark" icon={BadgeEuro}>
            Tarif
          </SectionLabel>
          <h2 id="lp-pricing-title" className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]">
            Un prix clair, <span className="lp-gradient-text-light">sans surprise</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Deux lignes, pas une de plus : nos frais de dossier, et les frais notariés fixés par l&apos;État.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch">
          {/* ---------- Carte BailNotarie ---------- */}
          <Reveal>
            <Tilt3D intensity={6} lift={20} className="h-full">
              <div className="lp-ring-gradient relative h-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#132043] via-[#101a36] to-[#0b1228] p-8 sm:p-10">
                <div
                  aria-hidden
                  className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[#4373f5]/30 blur-3xl"
                />
                <div className="relative">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-blue-100">
                      <Scale className="h-3.5 w-3.5" />
                      Frais de dossier BailNotarie
                    </span>
                    <span className="rounded-full bg-emerald-400/15 px-3 py-1.5 text-[12.5px] font-semibold text-emerald-300">
                      Forfaitaire
                    </span>
                  </div>

                  <div className="mt-8 flex items-end gap-2">
                    <span className="text-[68px] font-bold leading-none tracking-tight sm:text-[84px]">39,90</span>
                    <span className="pb-2 text-2xl font-semibold text-blue-100/80">€ TTC</span>
                  </div>
                  <p className="mt-3 text-[15px] text-blue-100/70">
                    Payés une seule fois, à la constitution du dossier.{" "}
                    <strong className="font-semibold text-white">Remboursés si le dossier n&apos;aboutit pas*</strong>.
                  </p>

                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {INCLUDED.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-[14.5px] text-blue-50/85">
                        <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/commencer"
                      className="group inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-[15px] font-semibold text-[#1e3a8a] transition-transform duration-300 hover:-translate-y-0.5"
                    >
                      Constituer mon dossier
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                    <Link
                      href="/simulateur-prix-bail-notarie"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/[0.06] px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.12]"
                    >
                      <Calculator className="h-4 w-4" />
                      Simuler le prix
                    </Link>
                  </div>
                </div>
              </div>
            </Tilt3D>
          </Reveal>

          {/* ---------- Carte frais notariés ---------- */}
          <Reveal delay={0.1}>
            <div className="h-full rounded-3xl border border-white/10 bg-white/[0.03] p-8 backdrop-blur sm:p-10">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-medium text-blue-100">
                <Landmark className="h-3.5 w-3.5" />
                Frais notariés
              </span>

              <div className="mt-8 text-[40px] font-bold leading-none tracking-tight sm:text-[44px]">
                ≈ ½ loyer
                <span className="ml-2 align-middle text-lg font-medium text-blue-100/60">mensuel HC</span>
              </div>

              <p className="mt-4 text-[15px] leading-relaxed text-blue-100/70">
                Ces frais sont <strong className="font-semibold text-white">réglementés par l&apos;État</strong> et
                facturés directement par l&apos;étude notariale. Ils sont indépendants de BailNotarie et correspondent à
                la rédaction et à l&apos;authentification de l&apos;acte.
              </p>

              <div className="mt-7 space-y-3 border-t border-white/10 pt-7">
                {[
                  "Tarif fixé par décret, identique partout en France",
                  "Partage possible entre bailleur et locataire",
                  "Procuration authentique à distance : ~40 € si nécessaire",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-[14px] text-blue-100/70">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#4373f5]" />
                    {item}
                  </div>
                ))}
              </div>

              <Link
                href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
                className="group mt-8 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white"
              >
                Comprendre le coût d&apos;un bail notarié
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </Reveal>
        </div>

        <p className="mt-8 text-center text-[13px] text-blue-100/50">
          *Sous conditions, voir{" "}
          <Link href="/cgv" className="underline underline-offset-4 hover:text-blue-100">
            CGV
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
