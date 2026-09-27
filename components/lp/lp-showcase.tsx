"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  LayoutDashboard,
  MonitorSmartphone,
  PenTool,
  Radar,
  Upload,
} from "lucide-react";
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

/* =========================================================================
   Le produit, écran par écran.

   La section se fige le temps de parcourir les cinq écrans, puis la page
   repart. Mécanique : une piste haute de cinq écrans de défilement, un panneau
   en `position: sticky` par-dessus, et la position du scroll dans la piste
   choisit l'écran affiché.

   Le scroll natif n'est jamais détourné : rien n'est intercepté ni annulé.
   Molette, trackpad, doigt, barre de défilement et clavier gardent leur
   comportement, et la page reprend son cours après le dernier écran.

   L'avancement est calculé à la main dans une boucle rAF plutôt que par une
   bibliothèque de mouvement : la position vient du rectangle de la piste et de
   la hauteur réelle du panneau, donc elle reste juste même quand la barre
   d'URL mobile change la hauteur visible. Seul le changement d'écran provoque
   un rendu React ; la jauge est écrite directement dans le style du nœud.
   ========================================================================= */

const SCREENS = [
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

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Suit l'avancement du scroll dans la piste.
 *
 * Retourne l'index de l'écran courant et une fonction pour se rendre à un
 * écran donné. La jauge est mise à jour hors de React, par écriture directe
 * dans le style, pour ne pas provoquer un rendu à chaque image.
 */
function useScreenProgress(
  count: number,
  refs: {
    track: React.RefObject<HTMLDivElement | null>;
    panel: React.RefObject<HTMLDivElement | null>;
    gauge: React.RefObject<HTMLSpanElement | null>;
  },
) {
  const [active, setActive] = React.useState(0);
  const activeRef = React.useRef(0);

  /** Course utile : ce qui reste à parcourir une fois le panneau collé. */
  const distance = React.useCallback(() => {
    const track = refs.track.current;
    const panel = refs.panel.current;
    if (!track || !panel) return 0;
    return Math.max(track.offsetHeight - panel.offsetHeight, 0);
  }, [refs.panel, refs.track]);

  React.useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const track = refs.track.current;
      const span = distance();
      if (!track || span === 0) return;

      const progress = clamp(-track.getBoundingClientRect().top / span, 0, 1);
      const raw = progress * count;
      const index = Math.min(count - 1, Math.floor(raw));

      if (refs.gauge.current) {
        refs.gauge.current.style.transform = `scaleX(${clamp(raw - index, 0, 1)})`;
      }
      if (activeRef.current !== index) {
        activeRef.current = index;
        setActive(index);
      }
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [count, distance, refs.gauge, refs.track]);

  /** Amène le scroll au milieu du segment de l'écran demandé. */
  const goTo = React.useCallback(
    (index: number) => {
      const track = refs.track.current;
      const span = distance();
      if (!track || span === 0) return;
      const top = track.getBoundingClientRect().top + window.scrollY;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({
        top: top + ((index + 0.5) / count) * span,
        behavior: reduce ? "auto" : "smooth",
      });
    },
    [count, distance, refs.track],
  );

  return { active, goTo };
}

export function LpShowcase() {
  const trackRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const gaugeRef = React.useRef<HTMLSpanElement>(null);

  const { active, goTo } = useScreenProgress(SCREENS.length, {
    track: trackRef,
    panel: panelRef,
    gauge: gaugeRef,
  });

  const current = SCREENS[active];

  return (
    <section
      id="visite-guidee"
      aria-labelledby="lp-showcase-title"
      data-lp-chrome="#070c1a"
      className="relative scroll-mt-24 bg-[#070c1a] text-white"
    >
      {/* Décor commun à toute la section : une couche de la hauteur du viewport
          qui suit le scroll, pour que le titre, le panneau figé et les chiffres
          partagent exactement le même fond, sans limite visible.

          Le fond sombre est répété ici, sur cette couche, et pas seulement sur
          la section. La section fait trois mille pixels de haut ; cette couche,
          elle, fait une hauteur d'écran et porte des flous animés, donc le
          navigateur la compose à part. En défilement rapide, il l'affichait
          déjà quand le fond de la grande section n'était pas encore peint : on
          voyait les halos bleus sur du blanc. Les deux voyageant désormais
          ensemble, le cas ne peut plus se produire. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="lp-panel sticky top-0 w-full overflow-hidden bg-[#070c1a]">
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

      {/* ---------- Titre, en flux normal ---------- */}
      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel tone="dark" icon={MonitorSmartphone}>
            L&apos;interface BailNotarie
          </SectionLabel>
          <h2 id="lp-showcase-title" className="lp-title lp-balance mt-6 text-4xl font-bold sm:text-[3.25rem]">
            Le produit, <span className="lp-gradient-text-light">écran par écran</span>
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-blue-100/70">
            Une plateforme conçue pour une démarche notariale sans papier.
          </p>
        </Reveal>
      </div>

      {/* ---------- Piste de défilement ---------- */}
      <div ref={trackRef} className="lp-track relative mt-10 sm:mt-14" style={{ ["--lp-screens" as string]: SCREENS.length }}>
        <div ref={panelRef} className="lp-panel sticky top-0 flex items-center overflow-hidden">
          {/* La barre de navigation flotte au-dessus : on se réserve sa hauteur
              réelle, publiée par LpNav dans --lp-nav-h, plus une respiration. */}
          <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-5 pb-5 pt-[calc(var(--lp-nav-h,78px)+1.25rem)] sm:px-8 lg:h-auto lg:flex-row lg:items-center lg:gap-14 lg:pb-0 lg:pt-0">
            {/* ---------- Colonne de gauche ---------- */}
            <div className="shrink-0 lg:w-[38%]">
              {/* Sommaire vertical, à partir de lg : les cinq écrans visibles
                  d'un coup, l'actif souligné par sa jauge d'avancement. */}
              <ol className="hidden lg:block" aria-label="Écrans de l'interface BailNotarie">
                {SCREENS.map((screen, index) => {
                  const selected = index === active;
                  return (
                    <li key={screen.id}>
                      <button
                        type="button"
                        onClick={() => goTo(index)}
                        aria-current={selected ? "true" : undefined}
                        className={cn(
                          "group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-colors duration-300",
                          selected
                            ? "border-white/20 bg-white/[0.08]"
                            : "border-transparent hover:border-white/10 hover:bg-white/[0.04]",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-300",
                            selected
                              ? "bg-gradient-to-br from-[#5b85f7] to-[#3563e9] text-white"
                              : "bg-white/[0.06] text-blue-100/60 group-hover:text-blue-100",
                          )}
                        >
                          <screen.icon className="h-4 w-4" />
                        </span>
                        <span
                          className={cn(
                            "text-[14.5px] font-semibold transition-colors duration-300",
                            selected ? "text-white" : "text-blue-100/70",
                          )}
                        >
                          {screen.label}
                        </span>
                        {selected && (
                          <span
                            ref={gaugeRef}
                            aria-hidden
                            className="lp-gauge absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-[#5b85f7] to-[#8fb0ff]"
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Sous lg, pas de liste : un compteur et le nom de l'écran.
                  Rien ne défile horizontalement, la lecture reste verticale. */}
              <div className="lg:hidden">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#5b85f7] to-[#3563e9] text-white">
                    <current.icon className="h-4 w-4" />
                  </span>
                  <span className="text-[12.5px] font-semibold uppercase tracking-wide text-[#8fb0ff]">
                    Écran {active + 1} sur {SCREENS.length}
                  </span>
                </div>
              </div>

              {/* Texte de l'écran courant. La clé React rejoue l'animation
                  d'apparition à chaque changement, sans bibliothèque. */}
              <div key={current.id} className="lp-swap mt-4 lg:mt-7">
                <h3 className="text-[19px] font-semibold leading-snug text-white sm:text-xl">{current.title}</h3>
                <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-blue-100/70 sm:line-clamp-none sm:text-[15px]">
                  {current.text}
                </p>
              </div>

              <Link
                href="/commencer"
                className="group mt-4 hidden items-center gap-2 text-[14.5px] font-semibold text-[#8fb0ff] transition-colors hover:text-white lg:mt-6 lg:inline-flex"
              >
                Essayer la constitution de dossier
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* ---------- Écran ---------- */}
            <div className="mt-4 flex min-h-0 flex-1 flex-col lg:mt-0 lg:block">
              <div className="relative min-h-0 flex-1 lg:flex-none" style={{ perspective: 1600 }}>
                <div
                  aria-hidden
                  className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-[#4373f5]/30 via-[#6366f1]/15 to-transparent blur-3xl sm:-inset-8"
                />

                {/* Inclinaison posée en CSS : présente dès le premier rendu,
                    au lieu d'être appliquée par le JS après hydratation. */}
                <div className="lp-screen-tilt relative h-full lg:h-auto">
                  <AppFrame
                    url={current.url}
                    className="relative z-10 flex h-full flex-col ring-1 ring-white/10 lg:block lg:h-auto"
                    bodyClassName="min-h-0 flex-1 overflow-hidden lg:flex-none lg:overflow-visible"
                  >
                    <div key={current.id} className="lp-swap-screen h-full bg-white lg:h-auto lg:min-h-[360px]">
                      {current.render()}
                    </div>
                  </AppFrame>

                  {/* Coupe basse sur petit écran : la maquette continue sous le
                      pli plutôt que d'être écrasée. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-14 rounded-b-[20px] bg-gradient-to-t from-white to-transparent lg:hidden"
                  />

                  <div
                    aria-hidden
                    className="lp-reflection absolute inset-x-6 top-full hidden h-28 rounded-[20px] bg-gradient-to-b from-white/25 to-transparent lg:block"
                  />
                </div>
              </div>

              {/* Repère de position, sous lg. */}
              <div className="mt-4 flex shrink-0 items-center justify-center gap-1 lg:hidden">
                {SCREENS.map((screen, index) => (
                  <button
                    key={screen.id}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Aller à l'écran : ${screen.label}`}
                    aria-current={index === active ? "true" : undefined}
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

      {/* ---------- Chiffres ---------- */}
      <div className="relative mx-auto max-w-6xl px-5 pb-24 sm:px-8 sm:pb-32">
        <Reveal>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              { value: <CountUp to={200} suffix="+" />, label: "dossiers constitués" },
              { value: <CountUp to={150} suffix="+" />, label: "notaires partenaires" },
              {
                value: (
                  <>
                    <CountUp to={4.9} decimals={1} />
                    /5
                  </>
                ),
                label: "note moyenne",
              },
              { value: "1 sem.", label: "délai moyen" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#070c1a] px-5 py-7 text-center">
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
