"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, FileCheck2, LayoutDashboard, MonitorSmartphone, PenTool, Radar, Upload } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
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

/**
 * Le produit, écran par écran.
 *
 * La section se fige le temps de parcourir les cinq écrans : une piste haute
 * de 5 écrans (70svh chacun sur mobile, 85svh au-delà), un panneau en
 * `position: sticky` par-dessus, et l'avancement du scroll dans la piste
 * choisit l'écran affiché. Le scroll natif n'est jamais
 * détourné — rien n'est intercepté ni annulé — donc la molette, le trackpad,
 * le doigt, la barre de défilement et le clavier gardent leur comportement
 * habituel, et la page repart d'elle-même une fois le dernier écran passé.
 */
export function LpShowcase() {
  const [active, setActive] = React.useState(0);
  const reduce = useReducedMotion();
  const isDesktop = useIsDesktop();

  const trackRef = React.useRef<HTMLDivElement>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  // Avancement à l'intérieur de l'écran courant : alimente la jauge de l'onglet.
  const screenProgress = useMotionValue(0);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const raw = progress * TABS.length;
    const index = Math.min(TABS.length - 1, Math.max(0, Math.floor(raw)));
    screenProgress.set(Math.min(1, Math.max(0, raw - index)));
    setActive((previous) => (previous === index ? previous : index));
  });

  // Sur mobile la bande d'onglets défile : on ramène l'onglet actif dans le
  // champ de vision sans faire bouger la page.
  React.useEffect(() => {
    const strip = tabsRef.current;
    const tab = tabRefs.current[active];
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return;
    const target = tab.offsetLeft - (strip.clientWidth - tab.clientWidth) / 2;
    strip.scrollTo({ left: Math.max(0, target), behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  /** Amène le scroll au milieu du segment de l'écran demandé. */
  const jumpTo = React.useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const top = track.getBoundingClientRect().top + window.scrollY;
      const distance = track.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: top + ((index + 0.5) / TABS.length) * distance,
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [reduce],
  );

  const current = TABS[active];

  return (
    <section
      id="interface"
      aria-labelledby="lp-showcase-title"
      className="relative scroll-mt-24 bg-[#070c1a] text-white"
    >
      {/* Décor commun à toute la section : une couche de la hauteur du viewport
          qui suit le scroll, pour que le titre, le panneau figé et les chiffres
          partagent exactement le même fond, sans limite visible. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="lp-screen-panel sticky top-0 w-full overflow-hidden">
          <div className="lp-mesh-dark absolute inset-0" />
          <div className="lp-grid-dark absolute inset-0" />
          <AuroraBackdrop tone="dark" />
          <NoiseOverlay opacity={0.05} />
        </div>
      </div>

      {/* Entrée depuis la section claire qui précède : un dégradé court évite
          la coupure franche au changement de fond. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f7f9ff] to-transparent"
      />

      {/* ---------- Titre (défile normalement) ---------- */}
      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <Reveal className="relative mx-auto max-w-3xl text-center">
          <SectionLabel tone="dark" icon={MonitorSmartphone}>
            L&apos;interface BailNotarie
          </SectionLabel>
          <h2 id="lp-showcase-title" className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]">
            Le produit, <span className="lp-gradient-text-light">écran par écran</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Une plateforme conçue pour une démarche notariale sans papier. Faites défiler : les écrans se suivent au
            rythme de votre scroll.
          </p>
        </Reveal>
      </div>

      {/* ---------- Piste de défilement ---------- */}
      <div
        ref={trackRef}
        className="lp-screen-track relative mt-10 sm:mt-14"
        style={{ ["--lp-screens" as string]: TABS.length }}
      >
        <div className="lp-screen-panel sticky top-0 flex items-center overflow-hidden">
          {/* La barre de navigation est flottante : on se réserve sa hauteur
              réelle, publiée par LpNav dans --lp-nav-h, plus une respiration.
              Une valeur en dur passait sous la barre selon les appareils. */}
          <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-5 pb-4 pt-[calc(var(--lp-nav-h,78px)+1.25rem)] sm:px-8 lg:h-auto lg:pb-0 lg:pt-0">
            <div className="flex min-h-0 flex-1 flex-col gap-4 sm:gap-5 lg:grid lg:flex-none lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14">
              {/* ---------- Sélecteur + texte ---------- */}
              <div className="min-w-0 shrink-0">
                <div className="relative">
                  <div
                    ref={tabsRef}
                    role="tablist"
                    aria-label="Écrans de l'interface BailNotarie"
                    className="lp-scrollbar-none lp-fade-right -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:flex-col lg:gap-2 lg:overflow-visible lg:px-0 lg:pb-0"
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
                          onClick={() => jumpTo(index)}
                          className={cn(
                            "group relative shrink-0 overflow-hidden rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300 lg:w-full lg:px-4 lg:py-3.5",
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

                          {/* Jauge : avancement du scroll dans cet écran. */}
                          {selected && (
                            <motion.span
                              aria-hidden
                              style={{ scaleX: screenProgress }}
                              className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-gradient-to-r from-[#5b85f7] to-[#8fb0ff]"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 lg:mt-6 lg:min-h-[128px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.id}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <h3 className="text-[17px] font-semibold leading-snug text-white sm:text-xl">
                        {current.title}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-blue-100/70 sm:line-clamp-none sm:text-[15px]">
                        {current.text}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  <Link
                    href="/commencer"
                    className="group mt-4 hidden items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white lg:inline-flex"
                  >
                    Essayer la constitution de dossier
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>

              {/* ---------- Écran ---------- */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col lg:block lg:flex-none">
                <div className="relative min-h-0 flex-1 lg:flex-none" style={{ perspective: 1600 }}>
                  <div
                    aria-hidden
                    className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#4373f5]/30 via-[#6366f1]/15 to-transparent blur-3xl sm:-inset-8"
                  />

                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: 28 }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      rotateX: isDesktop ? 6 : 0,
                      rotateY: isDesktop ? -8 : 0,
                    }}
                    viewport={{ once: true, margin: "-10%" }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-full lg:h-auto"
                  >
                    <div
                      role="tabpanel"
                      id={`lp-panel-${current.id}`}
                      aria-labelledby={`lp-tab-${current.id}`}
                      className="relative h-full lg:h-auto"
                    >
                      <AppFrame
                        url={current.url}
                        className="relative z-10 flex h-full flex-col ring-1 ring-white/10 lg:h-auto lg:block"
                        bodyClassName="min-h-0 flex-1 overflow-hidden lg:flex-none lg:overflow-visible"
                      >
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={current.id}
                            initial={reduce ? false : { opacity: 0, scale: 0.985 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={reduce ? undefined : { opacity: 0, scale: 1.01 }}
                            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full bg-white lg:h-auto lg:min-h-[360px]"
                          >
                            {current.render()}
                          </motion.div>
                        </AnimatePresence>
                      </AppFrame>

                      {/* Coupe basse sur petit écran : la maquette continue
                          sous le pli plutôt que d'être écrasée. */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 rounded-b-[20px] bg-gradient-to-t from-white to-transparent sm:hidden"
                      />

                      {/* Reflet posé sous l'écran */}
                      <div
                        aria-hidden
                        className="lp-reflection absolute inset-x-6 top-full hidden h-28 rounded-[20px] bg-gradient-to-b from-white/25 to-transparent lg:block"
                      />
                    </div>
                  </motion.div>
                </div>

                {/* Repère de position : indique où l'on en est dans la série. */}
                <div className="mt-3 flex shrink-0 items-center justify-center gap-1 lg:hidden">
                  {TABS.map((tab, index) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => jumpTo(index)}
                      aria-label={`Aller à l'écran : ${tab.label}`}
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
          </div>
        </div>
      </div>

      {/* ---------- Chiffres ---------- */}
      <div className="relative mx-auto max-w-6xl px-5 pb-24 sm:px-8 sm:pb-32">
        <Reveal>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-4">
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

        <div className="mt-8 text-center lg:hidden">
          <Link
            href="/commencer"
            className="group inline-flex items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white"
          >
            Essayer la constitution de dossier
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
