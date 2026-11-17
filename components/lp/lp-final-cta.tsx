"use client";

import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { Reveal } from "./ui/lp-primitives";
import { WithDossierCta } from "./lp-user-menu";

/** Encre de la dalle (et de la barre du haut quand elle la survole). */
const INK = "#0a0f1f";

const STEPS = [
  { n: "01", title: "Votre dossier en ligne", note: "Quelques minutes, sauvegarde automatique" },
  { n: "02", title: "L'acte rédigé par le notaire", note: "Sécurité juridique maximale" },
  { n: "03", title: "Signature à distance", note: "Bail notarié en 1 semaine" },
];

const WORDS = ["Acte authentique", "Force exécutoire", "100 % en ligne", "Habitation", "Commercial"];

/**
 * Dernier appel avant le contact : une dalle sombre posée dans la page, un très grand titre,
 * le bouton, trois étapes sur une ligne, et une bande de mots qui défile en bas.
 */
export function LpFinalCta() {
  const band = [...WORDS, ...WORDS];
  return (
    <section aria-labelledby="lp-final-title" data-lp-chrome="#ffffff" className="bg-white px-3 py-3 sm:px-5 sm:py-5">
      <div
        data-lp-chrome={INK}
        className="relative isolate overflow-hidden rounded-[28px] text-white sm:rounded-[40px]"
        style={{ backgroundColor: INK }}
      >
        {/* Une lumière bleue dans l'angle et une trame de points très légère. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[34rem] w-[34rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(67,115,245,0.55), transparent)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.35) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
            maskImage: "linear-gradient(to bottom, black, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black, transparent 75%)",
          }}
        />

        <div className="mx-auto max-w-6xl px-6 pb-14 pt-14 sm:px-10 sm:pt-20 lg:px-12 lg:pt-24">
          <Reveal>
            <div className="flex items-center justify-between gap-4 text-[12px] font-medium uppercase tracking-[0.18em] text-white/50">
              <span className="flex items-center gap-2.5">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[#4373f5] opacity-60 motion-reduce:animate-none" />
                  <span className="relative size-2 rounded-full bg-[#4373f5]" />
                </span>
                Bail notarié en ligne
              </span>
              <span className="hidden sm:inline">Habitation · Commercial</span>
            </div>

            <h2
              id="lp-final-title"
              className="mt-8 text-[clamp(2.75rem,9vw,7.25rem)] font-semibold leading-[0.92] tracking-[-0.055em]"
            >
              Sécurisez
              <br />
              votre <span className="text-[#6f93ff]">location.</span>
            </h2>

            <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:items-end">
              <p className="max-w-md text-[16px] leading-relaxed text-white/60 sm:text-[17px] lg:col-span-6">
                Constituez votre dossier en ligne en quelques minutes. Notre notaire partenaire s&apos;occupe de
                l&apos;acte, vous signez à distance.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-6 lg:justify-end">
                <WithDossierCta>
                  {(cta) => (
                    <Link
                      href={cta.href}
                      className="group inline-flex h-14 items-center justify-between gap-6 rounded-full bg-white pl-7 pr-2 text-[15px] font-semibold text-[#0a0f1f] transition-colors duration-300 hover:bg-[#dfe7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0f1f]"
                    >
                      {cta.connected ? cta.label : "Constituer mon dossier"}
                      <span className="flex size-10 items-center justify-center rounded-full bg-[#4373f5] text-white transition-transform duration-300 group-hover:rotate-45">
                        <ArrowUpRight className="h-[18px] w-[18px]" />
                      </span>
                    </Link>
                  )}
                </WithDossierCta>
                <a
                  href="tel:0768098624"
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-white/15 px-6 text-[15px] font-medium text-white transition-colors hover:border-white/40 hover:bg-white/[0.06]"
                >
                  <Phone className="h-4 w-4 text-white/60" />
                  <span className="tabular-nums">07 68 09 86 24</span>
                </a>
              </div>
            </div>

            {/* Trois étapes sur une ligne, séparées par un filet. */}
            <ol className="mt-14 grid border-t border-white/10 sm:grid-cols-3 lg:mt-20">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="flex gap-4 border-b border-white/10 py-5 sm:block sm:border-b-0 sm:border-r sm:py-6 sm:pr-6 sm:last:border-r-0 sm:[&:not(:first-child)]:pl-6"
                >
                  <span className="text-[13px] font-medium tabular-nums text-[#6f93ff]">{step.n}</span>
                  <span className="sm:mt-3 sm:block">
                    <span className="block text-[15px] font-semibold">{step.title}</span>
                    <span className="mt-1 block text-[13px] text-white/45">{step.note}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-[13px] text-white/45">
              Frais de dossier dès <span className="font-semibold text-white">39,90 € TTC</span>, remboursés si le dossier
              n&apos;aboutit pas*
            </p>
          </Reveal>
        </div>

        {/* Bande de mots qui défile, en contour. */}
        <div aria-hidden className="relative overflow-hidden border-t border-white/10 py-6 sm:py-8">
          <div
            className="flex w-max items-center gap-8 whitespace-nowrap motion-reduce:animate-none sm:gap-12"
            style={{ animation: "lp-marquee-x 36s linear infinite" }}
          >
            {band.map((word, index) => (
              <span key={`${word}-${index}`} className="flex items-center gap-8 sm:gap-12">
                <span
                  className="text-[2.75rem] font-semibold tracking-[-0.04em] text-transparent sm:text-[4.5rem]"
                  style={{ WebkitTextStroke: "1px rgba(255,255,255,0.28)" }}
                >
                  {word}
                </span>
                <span className="size-2.5 rounded-full bg-[#4373f5] sm:size-3" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
