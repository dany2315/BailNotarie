"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Clock, Globe, Play, ShieldCheck, Sparkles, Star } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import Image from "next/image";
import {
  AppFrame,
  DossierMockup,
  FloatingDelayCard,
  FloatingExecutoireCard,
  FloatingNotification,
  FloatingPriceCard,
} from "./ui/lp-product-mockups";
import { AuroraBackdrop, GhostButton, NoiseOverlay, SectionLabel, usePointerParallax } from "./ui/lp-primitives";

const AVATARS = [
  "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
  "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
  "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=80&h=80&fit=crop&crop=face",
];

const GUARANTEES = [
  { icon: Globe, label: "100% en ligne", tone: "blue" },
  { icon: Clock, label: "Bail notarié en 1 semaine", tone: "blue" },
  { icon: ShieldCheck, label: "Force exécutoire", tone: "green" },
  { icon: Sparkles, label: "39,90 € TTC, tout compris", tone: "green" },
] as const;

export function LpHero() {
  const sceneRef = React.useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const parallax = usePointerParallax(1);

  // La maquette se redresse à mesure qu'elle entre dans le champ :
  // inclinée quand elle arrive, à plat quand elle est cadrée.
  const { scrollYProgress } = useScroll({
    target: sceneRef,
    offset: ["start end", "center center"],
  });
  const rotateX = useTransform(scrollYProgress, [0, 1], [26, 3]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.86, 1]);
  const translateY = useTransform(scrollYProgress, [0, 1], [56, 0]);

  // Parallaxe curseur : les satellites bougent plus que la fenêtre centrale.
  const frameX = useTransform(parallax.x, (value) => value * -8);
  const frameY = useTransform(parallax.y, (value) => value * -6);
  const cardAX = useTransform(parallax.x, (value) => value * -26);
  const cardAY = useTransform(parallax.y, (value) => value * -18);
  const cardBX = useTransform(parallax.x, (value) => value * 30);
  const cardBY = useTransform(parallax.y, (value) => value * 20);

  const sceneStyle = reduce ? undefined : { rotateX, scale, y: translateY };

  return (
    <section
      aria-labelledby="lp-hero-title"
      className="lp-scene relative overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-[#eef3ff] pb-20 pt-24 sm:pt-28"
    >
      <div aria-hidden className="lp-mesh absolute inset-0" />
      <div aria-hidden className="lp-grid absolute inset-0" />
      <AuroraBackdrop />
      <NoiseOverlay />

      <div className="relative z-10 mx-auto max-w-6xl px-5 sm:px-8">
        {/* ---------- Bloc éditorial ---------- */}
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center"
          >
            <SectionLabel icon={Sparkles}>
              <span className="hidden sm:inline">Nouveau · </span>Signature à distance avec notaire partenaire
            </SectionLabel>
          </motion.div>

          <motion.h1
            id="lp-hero-title"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="lp-title lp-balance mt-5 text-[2.6rem] font-bold text-slate-900 sm:text-6xl lg:text-[4.25rem]"
          >
            Procédure de bail notarié{" "}
            <span className="relative inline-block">
              <span className="lp-gradient-text">100% en ligne</span>
              <svg
                aria-hidden
                viewBox="0 0 320 14"
                className="absolute -bottom-3 left-0 h-3 w-full text-[#4373f5]/45"
                preserveAspectRatio="none"
              >
                <path
                  d="M3 9.5C64 4 142 2.5 317 6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </motion.h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="lp-balance mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600 sm:text-xl"
          >
            Service dédié aux <strong className="font-semibold text-slate-900">propriétaires</strong> pour constituer
            leur dossier de <strong className="font-semibold text-slate-900">bail notarié en France</strong>.
            Constitution du dossier <strong className="font-semibold text-slate-900">100% en ligne</strong>,
            transmission au <strong className="font-semibold text-slate-900">notaire</strong> et{" "}
            <strong className="font-semibold text-slate-900">signature à distance</strong>. Simple, rapide et{" "}
            <strong className="font-semibold text-slate-900">force exécutoire</strong>.
          </motion.p>

          {/* ---------- Actions ---------- */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-col items-center gap-3"
          >
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href="/commencer"
                className="group/btn relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-8 py-4 sm:w-auto text-base font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_40px_-14px_rgba(53,99,233,1)] transition-all duration-300 hover:-translate-y-0.5"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.45)_50%,transparent_62%)] transition-transform duration-700 group-hover/btn:translate-x-full"
                />
                <span className="relative flex items-center gap-2">
                  Constituer mon dossier
                  <ArrowRight className="h-4.5 w-4.5 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </span>
              </Link>
              <GhostButton href="#processus" className="w-full px-7 py-4 sm:w-auto">
                <Play className="h-4 w-4 text-[#4373f5]" />
                Voir le déroulé
              </GhostButton>
            </div>
            <p className="text-[13px] text-slate-500">
              Frais de dossier <strong className="font-semibold text-slate-700">39,90 € TTC</strong> — remboursés si le
              dossier n&apos;aboutit pas*
            </p>
          </motion.div>

          {/* ---------- Preuve sociale ---------- */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-7 flex justify-center"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/70 py-1.5 pl-2 pr-4 shadow-[0_10px_30px_-16px_rgba(30,58,138,0.5)] backdrop-blur-xl">
              <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 shadow-sm">
                <FcGoogle className="h-4 w-4" />
                <Star className="h-3.5 w-3.5 fill-amber-400 stroke-amber-400" />
                <span className="text-[13px] font-semibold text-slate-800">4,9/5</span>
              </span>
              <span className="flex -space-x-2">
                {AVATARS.map((src, index) => (
                  <span key={src} className="relative h-7 w-7 overflow-hidden rounded-full ring-2 ring-white">
                    <Image src={src} alt="" width={28} height={28} className="h-full w-full object-cover" unoptimized />
                    <span className="sr-only">Client {index + 1}</span>
                  </span>
                ))}
              </span>
              <span className="text-[13px] text-slate-600">
                <strong className="font-semibold text-slate-900">+ de 200 propriétaires</strong>
                <span className="hidden sm:inline"> nous font déjà confiance</span>
              </span>
            </div>
          </motion.div>
        </div>

        {/* ---------- Scène 3D ---------- */}
        <div ref={sceneRef} className="relative mt-12 sm:mt-16" style={{ perspective: 1600 }}>
          {/* Halo au sol */}
          <div
            aria-hidden
            className="absolute inset-x-[8%] bottom-[-6%] h-40 rounded-[50%] bg-[#4373f5]/25 blur-[70px]"
          />

          <motion.div style={sceneStyle} className="relative mx-auto max-w-4xl">
            {/* Lueur derrière l'écran */}
            <div
              aria-hidden
              className="absolute -inset-6 rounded-[32px] bg-gradient-to-b from-[#4373f5]/25 via-[#6366f1]/15 to-transparent blur-2xl"
            />

            <motion.div style={reduce ? undefined : { x: frameX, y: frameY }} className="relative">
              <AppFrame url="bailnotarie.fr/commencer" className="relative z-10">
                <DossierMockup />
              </AppFrame>

              {/* Satellites : positionnés hors du cadre, en avant sur l'axe Z */}
              <motion.div
                style={reduce ? undefined : { x: cardAX, y: cardAY }}
                className="lp-anim-float absolute -left-6 top-16 z-20 hidden lg:block xl:-left-28"
              >
                <FloatingNotification />
              </motion.div>

              <motion.div
                style={reduce ? undefined : { x: cardBX, y: cardBY }}
                className="lp-anim-float-slow absolute -right-6 top-6 z-20 hidden lg:block xl:-right-24"
              >
                <FloatingPriceCard />
              </motion.div>

              <motion.div
                style={reduce ? undefined : { x: cardBX, y: cardAY }}
                className="lp-anim-float absolute -bottom-16 right-0 z-20 hidden lg:block [animation-delay:-2s] xl:-right-24"
              >
                <FloatingExecutoireCard />
              </motion.div>

              <motion.div
                style={reduce ? undefined : { x: cardAX, y: cardBY }}
                className="lp-anim-float-slow absolute -bottom-8 left-2 z-20 hidden lg:block [animation-delay:-4s] xl:-left-16"
              >
                <FloatingDelayCard />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Sol en perspective */}
          <div aria-hidden className="lp-floor pointer-events-none absolute inset-x-0 top-full h-56 opacity-60" />
        </div>

        {/* ---------- Garanties ---------- */}
        <div className="relative z-10 mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:mt-16">
          {GUARANTEES.map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-[14px] font-medium text-slate-600">
              <item.icon className={item.tone === "green" ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-[#4373f5]"} />
              {item.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
