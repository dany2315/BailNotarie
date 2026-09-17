"use client";

import Link from "next/link";
import { ArrowRight, Clock, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { AuroraBackdrop, NoiseOverlay, Reveal, usePointerParallax } from "./ui/lp-primitives";
import { FloatingDelayCard, FloatingNotification, FloatingPriceCard } from "./ui/lp-product-mockups";

export function LpFinalCta() {
  const reduce = useReducedMotion();
  const parallax = usePointerParallax(1);
  const leftX = useTransform(parallax.x, (value) => value * -22);
  const leftY = useTransform(parallax.y, (value) => value * -14);
  const rightX = useTransform(parallax.x, (value) => value * 24);
  const rightY = useTransform(parallax.y, (value) => value * 16);

  return (
    <section
      aria-labelledby="lp-final-title"
      className="lp-scene relative overflow-hidden bg-gradient-to-br from-[#3563e9] via-[#4373f5] to-[#6d8ff9] py-24 text-white sm:py-32"
    >
      <div aria-hidden className="lp-grid-dark absolute inset-0 opacity-70" />
      <AuroraBackdrop tone="dark" />
      <NoiseOverlay opacity={0.06} />

      {/* Satellites en profondeur */}
      <motion.div
        style={reduce ? undefined : { x: leftX, y: leftY }}
        className="lp-anim-float-slow pointer-events-none absolute left-[6%] top-[18%] hidden xl:block"
      >
        <div className="rotate-[-8deg] opacity-95">
          <FloatingNotification />
        </div>
      </motion.div>

      <motion.div
        style={reduce ? undefined : { x: rightX, y: rightY }}
        className="lp-anim-float pointer-events-none absolute right-[7%] top-[22%] hidden xl:block"
      >
        <div className="rotate-[7deg] opacity-95">
          <FloatingPriceCard />
        </div>
      </motion.div>

      <motion.div
        style={reduce ? undefined : { x: leftX, y: rightY }}
        className="lp-anim-float pointer-events-none absolute bottom-[14%] right-[14%] hidden [animation-delay:-3s] xl:block"
      >
        <div className="rotate-[-5deg] opacity-95">
          <FloatingDelayCard />
        </div>
      </motion.div>

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-blue-50 backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Dossier constitué en quelques minutes
          </span>

          <h2 id="lp-final-title" className="lp-title lp-balance mt-7 text-4xl font-bold sm:text-[3.5rem]">
            Prêt à sécuriser votre location ?
          </h2>

          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-50/90">
            Rejoignez les propriétaires qui ont choisi la tranquillité d&apos;esprit avec un bail notarié. Constituez
            votre dossier en ligne, nous nous occupons du reste avec notre notaire partenaire.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/commencer"
              className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-semibold text-[#1e3a8a] shadow-[0_20px_50px_-20px_rgba(2,6,23,0.6)] transition-transform duration-300 hover:-translate-y-0.5"
            >
              Constituer mon dossier — 39,90 € TTC
              <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href="tel:0749387756"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
            >
              <Phone className="h-4.5 w-4.5" />
              07 49 38 77 56
            </a>
          </div>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[14px] text-blue-50/85">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Sécurité juridique maximale
            </span>
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bail notarié en 1 semaine
            </span>
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Remboursé si le dossier n&apos;aboutit pas*
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
