"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileCheck2, LayoutDashboard, MonitorSmartphone, PenTool, Radar, Upload } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AppFrame,
  DashboardMockup,
  DocumentsMockup,
  DossierMockup,
  SignatureMockup,
  SuiviMockup,
} from "./ui/lp-product-mockups";
import { AuroraBackdrop, CountUp, NoiseOverlay, Reveal, SectionLabel } from "./ui/lp-primitives";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "dossier",
    icon: LayoutDashboard,
    label: "Constitution du dossier",
    title: "Un formulaire guidé, pensé pour les propriétaires",
    text: "Adresse du bien, loyer, parties au contrat : chaque champ est vérifié à la saisie et votre progression est sauvegardée automatiquement.",
    url: "bailnotarie.fr/commencer",
    render: () => <DossierMockup />,
  },
  {
    id: "pieces",
    icon: Upload,
    label: "Pièces justificatives",
    title: "Vos documents déposés et contrôlés en ligne",
    text: "Titre de propriété, diagnostics, pièces d'identité : vous déposez, la plateforme contrôle la lisibilité et la complétude avant transmission.",
    url: "bailnotarie.fr/client/documents",
    render: () => <DocumentsMockup />,
  },
  {
    id: "suivi",
    icon: Radar,
    label: "Suivi en temps réel",
    title: "Vous savez exactement où en est votre bail",
    text: "Dossier transmis, acte en cours de rédaction, créneau de signature proposé : chaque étape est horodatée et notifiée.",
    url: "bailnotarie.fr/client/suivi",
    render: () => <SuiviMockup />,
  },
  {
    id: "signature",
    icon: PenTool,
    label: "Signature à distance",
    title: "La signature authentique, en visioconférence",
    text: "Vous signez avec le notaire partenaire depuis chez vous. L'acte authentique est délivré avec force exécutoire immédiate.",
    url: "bailnotarie.fr/client/signature",
    render: () => <SignatureMockup />,
  },
  {
    id: "espace",
    icon: FileCheck2,
    label: "Espace client",
    title: "Tous vos baux et vos biens au même endroit",
    text: "Baux actifs, dossiers en cours, biens et documents : votre espace client centralise l'ensemble de votre patrimoine locatif.",
    url: "bailnotarie.fr/client",
    render: () => <DashboardMockup />,
  },
];

const AUTOPLAY_MS = 7000;

export function LpShowcase() {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (paused || reduce) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % TABS.length), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused, reduce]);

  const current = TABS[active];

  return (
    <section
      id="interface"
      aria-labelledby="lp-showcase-title"
      className="lp-scene relative scroll-mt-24 overflow-hidden bg-[#070c1a] py-24 text-white sm:py-32"
    >
      <div aria-hidden className="lp-mesh-dark absolute inset-0" />
      <div aria-hidden className="lp-grid-dark absolute inset-0" />
      <AuroraBackdrop tone="dark" />
      <NoiseOverlay opacity={0.05} />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#4373f5]/70 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel tone="dark" icon={MonitorSmartphone}>
            L&apos;interface BailNotarie
          </SectionLabel>
          <h2
            id="lp-showcase-title"
            className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]"
          >
            Le produit, <span className="lp-gradient-text-light">écran par écran</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Une plateforme conçue pour une démarche notariale sans papier : constitution, contrôle des pièces, suivi et
            signature à distance.
          </p>
        </Reveal>

        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14"
        >
          {/* ---------- Sélecteur ---------- */}
          <div className="order-2 lg:order-1">
            <div
              role="tablist"
              aria-label="Écrans de l'interface BailNotarie"
              className="lp-scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 pb-2 lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0"
            >
              {TABS.map((tab, index) => {
                const selected = index === active;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    type="button"
                    id={`lp-tab-${tab.id}`}
                    aria-selected={selected}
                    aria-controls={`lp-panel-${tab.id}`}
                    onClick={() => setActive(index)}
                    className={cn(
                      "group relative shrink-0 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-all duration-300 lg:w-full",
                      selected
                        ? "border-white/20 bg-white/[0.08] shadow-[0_20px_50px_-30px_rgba(67,115,245,0.9)]"
                        : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                          selected
                            ? "bg-gradient-to-br from-[#5b85f7] to-[#3563e9] text-white"
                            : "bg-white/[0.06] text-blue-100/60 group-hover:text-blue-100",
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                      </span>
                      <span
                        className={cn(
                          "whitespace-nowrap text-[14.5px] font-semibold transition-colors lg:whitespace-normal",
                          selected ? "text-white" : "text-blue-100/70",
                        )}
                      >
                        {tab.label}
                      </span>
                    </span>

                    {/* Barre de progression de l'autoplay */}
                    {selected && !reduce && (
                      <motion.span
                        key={`${tab.id}-${active}-${paused}`}
                        aria-hidden
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: paused ? 0 : 1 }}
                        transition={{ duration: AUTOPLAY_MS / 1000, ease: "linear" }}
                        className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-[#5b85f7] to-transparent"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 min-h-[128px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.id}
                  initial={reduce ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="text-xl font-semibold text-white">{current.title}</h3>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-blue-100/70">{current.text}</p>
                </motion.div>
              </AnimatePresence>

              <Link
                href="/commencer"
                className="group mt-5 inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white"
              >
                Essayer la constitution de dossier
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* ---------- Écran 3D ---------- */}
          <div className="order-1 lg:order-2">
            {/* Pas de `preserve-3d` ici : le halo est un frère de l'écran incliné,
                un contexte 3D les ferait trier par profondeur et le halo passerait
                devant l'écran. La perspective seule suffit à l'inclinaison. */}
            <div className="relative" style={{ perspective: 1600 }}>
              <div
                aria-hidden
                className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-[#4373f5]/30 via-[#6366f1]/15 to-transparent blur-3xl"
              />

              <motion.div
                initial={reduce ? false : { opacity: 0, rotateX: 16, rotateY: -14, y: 40 }}
                whileInView={{ opacity: 1, rotateX: 6, rotateY: -8, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div
                  role="tabpanel"
                  id={`lp-panel-${current.id}`}
                  aria-labelledby={`lp-tab-${current.id}`}
                  className="relative"
                >
                  <AppFrame url={current.url} className="relative z-10 ring-1 ring-white/10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={current.id}
                        initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, scale: 1.01 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="min-h-[360px] bg-white"
                      >
                        {current.render()}
                      </motion.div>
                    </AnimatePresence>
                  </AppFrame>

                  {/* Reflet posé sous l'écran */}
                  <div
                    aria-hidden
                    className="lp-reflection absolute inset-x-6 top-full h-28 rounded-[20px] bg-gradient-to-b from-white/25 to-transparent"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ---------- Chiffres ---------- */}
        <Reveal delay={0.1}>
          <dl className="mt-20 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              { value: <CountUp to={200} suffix="+" />, label: "dossiers constitués" },
              { value: <CountUp to={150} suffix="+" />, label: "notaires partenaires" },
              { value: <><CountUp to={4.9} decimals={1} />/5</>, label: "note moyenne" },
              { value: "1 sem.", label: "délai moyen" },
            ].map((stat, index) => (
              <div key={index} className="bg-[#070c1a] px-5 py-7 text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <div className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{stat.value}</div>
                  <div className="mt-1.5 text-[13px] text-blue-100/60">{stat.label}</div>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
