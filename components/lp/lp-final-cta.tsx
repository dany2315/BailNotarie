"use client";

import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { Reveal } from "./ui/lp-primitives";
import { WithDossierCta } from "./lp-user-menu";

const STEPS = [
  { n: "01", title: "Votre dossier en ligne", note: "Quelques minutes, sauvegarde automatique" },
  { n: "02", title: "L'acte rédigé par le notaire", note: "Sécurité juridique maximale" },
  { n: "03", title: "Signature à distance", note: "Bail notarié en 1 semaine" },
];

const WORDS = ["Acte authentique", "Force exécutoire", "100 % en ligne", "Habitation", "Commercial"];

/**
 * Dernier appel avant le contact : une dalle au bleu de la marque posée dans la page (elle tranche
 * sur les sections claires qui l'entourent), la trame fine du héros en blanc, un très grand titre,
 * le bouton, trois étapes sur une ligne et une bande de mots qui défile en bas.
 */
export function LpFinalCta() {
  const band = [...WORDS, ...WORDS];
  return (
    <section aria-labelledby="lp-final-title" data-lp-chrome="#ffffff" className="bg-white px-3 py-3 sm:px-5 sm:py-5">
      <div
        data-lp-chrome="#4373f5"
        className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#4f7cf7] via-[#4373f5] to-[#2f58dc] text-white sm:rounded-[40px]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "radial-gradient(ellipse 80% 70% at 30% 0%, black 30%, transparent 80%)",
            WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 30% 0%, black 30%, transparent 80%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 -top-40 -z-10 h-[30rem] w-[30rem] rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(255,255,255,0.28), transparent)" }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-14 pt-14 sm:px-10 sm:pt-20 lg:px-12 lg:pt-24">
          <Reveal>
            <div className="flex items-center justify-between gap-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/75">
              <span className="flex items-center gap-2.5">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-white opacity-60 motion-reduce:animate-none" />
                  <span className="relative size-2 rounded-full bg-white" />
                </span>
                Bail notarié en ligne
              </span>
              <span className="hidden sm:inline">Habitation · Commercial</span>
            </div>

            <h2
              id="lp-final-title"
              className="mt-8 text-[clamp(2.75rem,9vw,7.25rem)] font-semibold leading-[0.92] tracking-[-0.055em] text-white"
            >
              Sécurisez
              <br />
              votre <span className="text-[#c9d8ff]">location.</span>
            </h2>

            <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:items-end">
              <p className="max-w-md text-[16px] leading-relaxed text-white/80 sm:text-[17px] lg:col-span-6">
                Constituez votre dossier en ligne en quelques minutes. Nos notaires partenaires s&apos;occupent de
                l&apos;acte, vous signez à distance.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:col-span-6 lg:justify-end">
                <WithDossierCta>
                  {(cta) => (
                    <Link
                      href={cta.href}
                      className="group inline-flex h-14 items-center justify-between gap-6 rounded-full bg-white pl-7 pr-2 text-[15px] font-semibold text-[#1f45c4] shadow-[0_18px_40px_-18px_rgba(10,25,80,0.7)] transition-colors duration-300 hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4373f5]"
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
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-white/30 bg-white/10 px-6 text-[15px] font-medium text-white transition-colors hover:border-white/60 hover:bg-white/15"
                >
                  <Phone className="h-4 w-4 text-white/80" />
                  <span className="tabular-nums">07 68 09 86 24</span>
                </a>
              </div>
            </div>

            {/* Trois étapes sur une ligne, séparées par un filet. */}
            <ol className="mt-14 grid border-t border-white/20 sm:grid-cols-3 lg:mt-20">
              {STEPS.map((step) => (
                <li
                  key={step.n}
                  className="flex gap-4 border-b border-white/20 py-5 sm:block sm:border-b-0 sm:border-r sm:border-white/20 sm:py-6 sm:pr-6 sm:last:border-r-0 sm:[&:not(:first-child)]:pl-6"
                >
                  <span className="text-[13px] font-semibold tabular-nums text-[#c9d8ff]">{step.n}</span>
                  <span className="sm:mt-3 sm:block">
                    <span className="block text-[15px] font-semibold text-white">{step.title}</span>
                    <span className="mt-1 block text-[13px] text-white/70">{step.note}</span>
                  </span>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-[13px] text-white/75">
              Frais de dossier dès <span className="font-semibold text-white">39,90 € TTC</span>, remboursés si le
              dossier n&apos;aboutit pas*
            </p>
          </Reveal>
        </div>

        {/* Bande de mots qui défile, en contour blanc. */}
        <div aria-hidden className="relative overflow-hidden border-t border-white/20 py-6 sm:py-8">
          <div
            className="flex w-max items-center gap-8 whitespace-nowrap motion-reduce:animate-none sm:gap-12"
            style={{ animation: "lp-marquee-x 36s linear infinite" }}
          >
            {band.map((word, index) => (
              <span key={`${word}-${index}`} className="flex items-center gap-8 sm:gap-12">
                <span
                  className="text-[2.75rem] font-semibold tracking-[-0.04em] text-transparent sm:text-[4.5rem]"
                  style={{ WebkitTextStroke: "1px rgba(255,255,255,0.45)" }}
                >
                  {word}
                </span>
                <span className="size-2.5 rounded-full bg-white/80 sm:size-3" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
