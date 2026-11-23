"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Gavel, ScrollText, ShieldCheck } from "lucide-react";
import { Reveal, SpotlightCard } from "./ui/lp-primitives";

const PILLARS = [
  {
    icon: Gavel,
    title: "Acte authentique",
    text: "Signé devant notaire, il a la même valeur qu'une décision de justice.",
  },
  {
    icon: ShieldCheck,
    title: "Force exécutoire",
    text: "En cas d'impayés, le recouvrement démarre sans jugement préalable.",
  },
  {
    icon: ScrollText,
    title: "Date certaine",
    text: "Conservé par l'étude notariale, le bail est incontestable et archivé.",
  },
];

export function LpDefinition() {
  return (
    <section
      aria-labelledby="lp-definition-title"
      data-lp-chrome="#ffffff"
      className="relative overflow-hidden border-y border-slate-200/60 bg-white py-20 sm:py-24"
    >
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4373f5]/40 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#4373f5]/15 bg-[#4373f5]/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-[#3563e9]">
              <BookOpen className="h-3.5 w-3.5" />
              Définition
            </div>

            <h2
              id="lp-definition-title"
              className="lp-title mt-5 text-3xl font-bold text-slate-900 sm:text-[2.6rem]"
            >
              Bail notarié : définition
            </h2>

            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              Un <strong className="font-semibold text-slate-900">bail notarié</strong> est un{" "}
              <strong className="font-semibold text-slate-900">bail de location en France</strong> signé devant{" "}
              <strong className="font-semibold text-slate-900">notaire</strong> en{" "}
              <strong className="font-semibold text-slate-900">acte authentique</strong>. Il peut offrir une{" "}
              <strong className="font-semibold text-slate-900">force exécutoire</strong>, utile en cas d&apos;impayés.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
              >
                Prix (2026)
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
              >
                Étapes
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/blog/force-executoire-lavantage-majeur-du-bail-notarie"
                className="group inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] font-medium text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9]"
              >
                Force exécutoire
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>

          <div className="space-y-3">
            {PILLARS.map((pillar, index) => (
              <Reveal key={pillar.title} delay={0.08 * index}>
                <SpotlightCard className="rounded-2xl border border-slate-200 bg-white p-5 transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_-28px_rgba(30,58,138,0.45)]">
                  <div className="relative flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4373f5] to-[#3563e9] text-white shadow-[0_10px_24px_-12px_rgba(53,99,233,0.9)]">
                      <pillar.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="text-[15px] font-semibold text-slate-900">{pillar.title}</h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-slate-600">{pillar.text}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
