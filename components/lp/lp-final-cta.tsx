"use client";

import Link from "next/link";
import { ArrowRight, Phone } from "lucide-react";
import { Reveal } from "./ui/lp-primitives";
import { WithDossierCta } from "./lp-user-menu";

/** Fond de la section : un bleu nuit teinté de la couleur de la marque (même valeur pour la barre du haut). */
const NIGHT = "#0f1d45";

/**
 * Dernier appel avant le pied de page. Sobre : un fond uni bleu nuit, une seule lumière douce,
 * un titre, une phrase, un bouton ; le prix, le téléphone et les garanties en petit dessous.
 */
export function LpFinalCta() {
  return (
    <section
      aria-labelledby="lp-final-title"
      data-lp-chrome={NIGHT}
      className="relative overflow-hidden py-20 text-white sm:py-28"
      style={{ backgroundColor: NIGHT }}
    >
      {/* Une seule lumière, venue du haut, dans le bleu de la marque. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 50% 0%, rgba(67,115,245,0.28), transparent 70%)" }}
      />
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-white/10" />

      <div className="relative mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-[#9db5fb]">Bail notarié en ligne</p>

          <h2 id="lp-final-title" className="lp-title lp-balance mt-4 text-[2rem] font-semibold leading-tight sm:text-5xl">
            Prêt à sécuriser votre location ?
          </h2>

          <p className="lp-balance mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Constituez votre dossier en ligne, en quelques minutes. Nous nous occupons du reste avec notre notaire
            partenaire.
          </p>

          <div className="mt-9 flex flex-col items-center gap-4">
            <WithDossierCta>
              {(cta) => (
                <Link
                  href={cta.href}
                  className="group inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-[#4373f5] px-7 text-[15px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(67,115,245,0.8)] transition-colors duration-200 hover:bg-[#3563e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1d45] sm:w-auto"
                >
                  {cta.connected ? cta.label : "Constituer mon dossier"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              )}
            </WithDossierCta>

            <p className="text-[14px] text-slate-400">
              À partir de <span className="font-medium text-slate-200">39,90 € TTC</span>, remboursé si le dossier
              n&apos;aboutit pas*
            </p>

            <a
              href="tel:0768098624"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-[14px] text-slate-300 transition-colors hover:text-white"
            >
              <Phone className="h-4 w-4" />
              Ou par téléphone : <span className="font-medium text-white underline decoration-white/30 underline-offset-4">07 68 09 86 24</span>
            </a>
          </div>

          <ul className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 border-t border-white/10 pt-6 text-[13px] text-slate-400">
            <li>Sécurité juridique maximale</li>
            <li aria-hidden className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
            <li>Bail notarié en 1 semaine</li>
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
