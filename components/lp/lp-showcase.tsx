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
    short: "Dossier",
    title: "Un formulaire guidé, pensé pour les propriétaires",
    text: "Adresse du bien, loyer, parties au contrat : chaque champ est vérifié à la saisie et votre progression est sauvegardée automatiquement.",
    url: "bailnotarie.fr/commencer",
    render: () => <DossierMockup />,
  },
  {
    id: "pieces",
    icon: Upload,
    label: "Pièces justificatives",
    short: "Pièces",
    title: "Vos documents déposés et contrôlés en ligne",
    text: "Titre de propriété, diagnostics, pièces d'identité : vous déposez, la plateforme contrôle la lisibilité et la complétude avant transmission.",
    url: "bailnotarie.fr/client/documents",
    render: () => <DocumentsMockup />,
  },
  {
    id: "suivi",
    icon: Radar,
    label: "Suivi en temps réel",
    short: "Suivi",
    title: "Vous savez exactement où en est votre bail",
    text: "Dossier transmis, acte en cours de rédaction, créneau de signature proposé : chaque étape est horodatée et notifiée.",
    url: "bailnotarie.fr/client/suivi",
    render: () => <SuiviMockup />,
  },
  {
    id: "signature",
    icon: PenTool,
    label: "Signature à distance",
    short: "Signature",
    title: "La signature authentique, en visioconférence",
    text: "Vous signez avec le notaire partenaire depuis chez vous. L'acte authentique est délivré avec force exécutoire immédiate.",
    url: "bailnotarie.fr/client/signature",
    render: () => <SignatureMockup />,
  },
  {
    id: "espace",
    icon: FileCheck2,
    label: "Espace client",
    short: "Espace client",
    title: "Tous vos baux et vos biens au même endroit",
    text: "Baux actifs, dossiers en cours, biens et documents : votre espace client centralise l'ensemble de votre patrimoine locatif.",
    url: "bailnotarie.fr/client",
    render: () => <DashboardMockup />,
  },
];

const AUTOPLAY_MS = 7000;
const SWIPE_THRESHOLD = 44;

/** Vrai à partir de lg : sert à ne pas incliner l'écran sur un petit écran. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function LpShowcase() {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();

  const tabsRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const swipeStart = React.useRef<{ x: number; y: number } | null>(null);

  React.useEffect(() => {
    if (paused || reduce) return;
    const timer = window.setTimeout(() => setActive((index) => (index + 1) % TABS.length), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, paused, reduce]);

  // Sur mobile la bande d'onglets défile : on ramène l'onglet actif dans le
  // champ de vision sans faire bouger la page.
  React.useEffect(() => {
    const strip = tabsRef.current;
    const tab = tabRefs.current[active];
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    const target = tab.offsetLeft - (strip.clientWidth - tab.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  const go = React.useCallback((direction: 1 | -1) => {
    setActive((index) => (index + direction + TABS.length) % TABS.length);
  }, []);

  // Balayage horizontal sur l'écran (mobile).
  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    setPaused(true);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    setPaused(false);
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // On ignore les gestes plutôt verticaux : c'est un scroll, pas un balayage.
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  };

  const current = TABS[active];

  return (
    <section
      id="interface"
      aria-labelledby="lp-showcase-title"
      className="relative scroll-mt-24 overflow-hidden bg-[#070c1a] py-24 text-white sm:py-32"
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
          <h2 id="lp-showcase-title" className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]">
            Le produit, <span className="lp-gradient-text-light">écran par écran</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Une plateforme conçue pour une démarche notariale sans papier : constitution, contrôle des pièces, suivi et
            signature à distance.
          </p>
        </Reveal>

        {/* Ordre de lecture identique partout : on choisit, on lit, on voit.
            Sur mobile, l'écran arrivait avant son libellé. */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="mt-12 grid gap-8 sm:mt-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14"
        >
          {/* ---------- Sélecteur + texte ---------- */}
          <div className="min-w-0">
            <div className="relative">
              {/* Dégradé de bord : signale que la bande défile. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#070c1a] to-transparent lg:hidden"
              />
              <div
                ref={tabsRef}
                role="tablist"
                aria-label="Écrans de l'interface BailNotarie"
                className="lp-scrollbar-none -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0"
              >
                {TABS.map((tab, index) => {
                  const selected = index === active;
                  return (
                    <button
                      key={tab.id}
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      role="tab"
                      type="button"
                      id={`lp-tab-${tab.id}`}
                      aria-selected={selected}
                      aria-controls={`lp-panel-${tab.id}`}
                      onClick={() => setActive(index)}
                      className={cn(
                        "group relative shrink-0 snap-center overflow-hidden rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300 lg:w-full lg:px-4 lg:py-3.5",
                        selected
                          ? "border-white/20 bg-white/[0.08] shadow-[0_20px_50px_-30px_rgba(67,115,245,0.9)]"
                          : "border-white/8 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]",
                      )}
                    >
                      <span className="flex items-center gap-2.5 lg:gap-3">
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors duration-300 lg:h-9 lg:w-9",
                            selected
                              ? "bg-gradient-to-br from-[#5b85f7] to-[#3563e9] text-white"
                              : "bg-white/[0.06] text-blue-100/60 group-hover:text-blue-100",
                          )}
                        >
                          <tab.icon className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            "whitespace-nowrap text-[13.5px] font-semibold transition-colors lg:whitespace-normal lg:text-[14.5px]",
                            selected ? "text-white" : "text-blue-100/70",
                          )}
                        >
                          <span className="lg:hidden">{tab.short}</span>
                          <span className="hidden lg:inline">{tab.label}</span>
                        </span>
                      </span>

                      {/* Barre de progression de la lecture automatique */}
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
            </div>

            <div className="mt-6 min-h-[124px] lg:min-h-[128px]">
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

          {/* ---------- Écran ---------- */}
          <div className="min-w-0">
            <div className="relative" style={{ perspective: 1600 }}>
              <div
                aria-hidden
                className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#4373f5]/30 via-[#6366f1]/15 to-transparent blur-3xl sm:-inset-8"
              />

              <motion.div
                initial={reduce ? false : { opacity: 0, y: 32 }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                  rotateX: isDesktop ? 6 : 0,
                  rotateY: isDesktop ? -8 : 0,
                }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                className="relative"
              >
                <div
                  role="tabpanel"
                  id={`lp-panel-${current.id}`}
                  aria-labelledby={`lp-tab-${current.id}`}
                  onPointerDown={onPointerDown}
                  onPointerUp={onPointerUp}
                  onPointerCancel={() => {
                    swipeStart.current = null;
                    setPaused(false);
                  }}
                  className="relative touch-pan-y"
                >
                  <AppFrame url={current.url} className="relative z-10 ring-1 ring-white/10">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={current.id}
                        initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={reduce ? undefined : { opacity: 0, scale: 1.01 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="min-h-[300px] bg-white sm:min-h-[360px]"
                      >
                        {current.render()}
                      </motion.div>
                    </AnimatePresence>
                  </AppFrame>

                  {/* Reflet posé sous l'écran */}
                  <div
                    aria-hidden
                    className="lp-reflection absolute inset-x-6 top-full hidden h-28 rounded-[20px] bg-gradient-to-b from-white/25 to-transparent lg:block"
                  />
                </div>
              </motion.div>
            </div>

            {/* Pagination tactile : repère de position, et cible de rechange
                pour qui ne balaie pas. */}
            <div className="mt-5 flex items-center justify-center gap-1 lg:hidden">
              {TABS.map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Voir l'écran : ${tab.label}`}
                  aria-current={index === active}
                  className="flex h-8 items-center px-1.5"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      index === active ? "w-6 bg-[#5b85f7]" : "w-1.5 bg-white/25",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Chiffres ---------- */}
        <Reveal delay={0.1}>
          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:mt-20 sm:grid-cols-4">
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
