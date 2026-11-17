"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, X } from "lucide-react";

/**
 * Mesure d'audience Google Analytics, avec consentement (décision de l'utilisateur du 17/11/2026, recette).
 *
 * - Rien n'est chargé tant que le visiteur n'a pas accepté.
 * - Jamais de mesure dans les espaces privés ni dans les formulaires, dont les adresses contiennent un jeton ou
 *   un identifiant de dossier : /interface, /client, /notaire, /intakes, /commencer/… (sauf l'entrée /commencer).
 * - « Refuser » et « Accepter » ont exactement le même poids (recommandation CNIL : refuser aussi simplement
 *   qu'accepter). Le choix est gardé dans ce navigateur ; « Gérer les cookies » (pied de page) le rouvre.
 */

const GA_ID = "G-TZ7DF5J0XW";
const STORAGE_KEY = "bn-consentement-mesure";
export const OPEN_CONSENT_EVENT = "bn:gerer-cookies";

type Choix = "accepte" | "refuse" | null;

/** Pages où rien n'est jamais mesuré (données personnelles, jetons et identifiants dans l'adresse). */
export function isPrivatePath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (/^\/(interface|client|notaire|intakes|login|register)(\/|$)/.test(pathname)) return true;
  // Le tunnel d'ouverture de dossier : seule la page d'entrée /commencer est publique
  if (/^\/commencer\/.+/.test(pathname)) return true;
  return false;
}

function lireChoix(): Choix {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepte" || v === "refuse" ? v : null;
  } catch {
    return null;
  }
}

function ecrireChoix(choix: Exclude<Choix, null>) {
  try {
    window.localStorage.setItem(STORAGE_KEY, choix);
  } catch {
    /* navigation privée : le choix vaut pour cette page seulement */
  }
}

/** Ouvre le bandeau pour changer son choix (lien « Gérer les cookies »). */
export function openConsentBanner() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

/** Courbe « expo » : départ franc, arrivée très douce. */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export function AnalyticsConsent() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const titreId = useId();
  const texteId = useId();
  const detailId = useId();
  const [choix, setChoix] = useState<Choix>(null);
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState(false);
  const [detail, setDetail] = useState(false);
  const prive = isPrivatePath(pathname);

  useEffect(() => {
    setChoix(lireChoix());
    setPret(true);
    const ouvrir = () => setOuvert(true);
    window.addEventListener(OPEN_CONSENT_EVENT, ouvrir);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, ouvrir);
  }, []);

  // Désactive la mesure dès qu'on entre dans une page privée (navigation sans rechargement), ou sans accord
  useEffect(() => {
    (window as any)[`ga-disable-${GA_ID}`] = prive || choix !== "accepte";
  }, [prive, choix]);

  const decider = (c: Exclude<Choix, null>) => {
    ecrireChoix(c);
    setChoix(c);
    setOuvert(false);
    setDetail(false);
    if (c === "refuse") (window as any)[`ga-disable-${GA_ID}`] = true;
  };

  const charger = choix === "accepte" && !prive;
  const afficherBandeau = pret && !prive && (choix === null || ouvert);
  // Bandeau rouvert depuis « Gérer les cookies » : on rappelle le choix en cours et on permet de fermer sans changer.
  const reouvert = choix !== null;

  return (
    <>
      {charger && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

      <AnimatePresence>
        {afficherBandeau && (
          <motion.section
            key="bandeau-consentement"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titreId}
            aria-describedby={texteId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.7, ease: EASE_OUT_EXPO, delay: reouvert ? 0 : 0.6 } }}
            exit={reduce ? { opacity: 0, transition: { duration: 0.15 } } : { opacity: 0, y: 16, transition: { duration: 0.25, ease: [0.4, 0, 1, 1] } }}
            className={[
              // Au-dessus de la bulle « Support » (z-60) : sur téléphone, elle masquait le texte du bandeau.
              "fixed z-[70] font-sans text-[#0b1224]",
              // Téléphone : feuille posée en bas de l'écran, au-dessus de la zone du geste système.
              "inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
              // Ordinateur : carte discrète en bas à gauche, qui laisse la page lisible.
              "sm:inset-x-auto sm:left-6 sm:bottom-6 sm:w-[25.5rem]",
            ].join(" ")}
          >
            <div
              className={[
                "relative overflow-hidden rounded-2xl bg-[#fcfdff]",
                "border border-[color-mix(in_oklab,#4373f5_14%,#e2e8f0)]",
                "shadow-[0_2px_6px_rgba(15,23,42,0.06),0_28px_64px_-28px_rgba(67,115,245,0.45)]",
              ].join(" ")}
            >
              {/* Filet de couleur en tête de carte : la seule touche de bleu en dehors du bouton. */}
              <div aria-hidden className="h-1 w-full bg-[#4373f5]" />

              <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4373f5]">Confidentialité</p>
                    <h2 id={titreId} className="mt-1.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] sm:text-[18px]">
                      Vous choisissez ce que nous mesurons
                    </h2>
                  </div>
                  {reouvert && (
                    <button
                      type="button"
                      onClick={() => {
                        setOuvert(false);
                        setDetail(false);
                      }}
                      aria-label="Fermer sans changer mon choix"
                      className="-mr-2 -mt-1 grid size-10 shrink-0 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#eef2ff] hover:text-[#0b1224] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50"
                    >
                      <X className="size-[18px]" aria-hidden />
                    </button>
                  )}
                </div>

                <p id={texteId} className="mt-2.5 text-[15px] leading-[1.55] text-[#475569] sm:text-[14.5px]">
                  Avec votre accord, nous comptons les visites du site avec Google Analytics pour l&apos;améliorer. Votre
                  espace et vos formulaires de dossier ne sont jamais mesurés.
                </p>

                <button
                  type="button"
                  onClick={() => setDetail((d) => !d)}
                  aria-expanded={detail}
                  aria-controls={detailId}
                  className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-md text-[14px] font-medium text-[#2a4fd4] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50"
                >
                  Ce qui est mesuré, et ce qui ne l&apos;est jamais
                  <ChevronDown
                    className={`size-4 transition-transform duration-300 ${detail ? "rotate-180" : ""}`}
                    aria-hidden
                  />
                </button>

                {/* Dépliage par grid-template-rows : pas d'animation de hauteur. */}
                <div
                  id={detailId}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out ${detail ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                >
                  <div className="overflow-hidden" inert={!detail}>
                    <ul className="mt-2 grid gap-2.5 rounded-xl bg-[#f5f7ff] p-3.5 text-[13.5px] leading-snug">
                      <li className="flex gap-2.5">
                        <Check className="mt-px size-4 shrink-0 text-[#2a4fd4]" aria-hidden />
                        <span className="text-[#334155]">
                          <span className="font-medium text-[#0b1224]">Avec votre accord :</span> pages vues et provenance
                          des visites, sur le site public uniquement.
                        </span>
                      </li>
                      <li className="flex gap-2.5">
                        <X className="mt-px size-4 shrink-0 text-[#64748b]" aria-hidden />
                        <span className="text-[#334155]">
                          <span className="font-medium text-[#0b1224]">Jamais :</span> votre espace client, vos formulaires,
                          vos documents, l&apos;espace notaire.
                        </span>
                      </li>
                    </ul>
                    <p className="mt-2.5 text-[13px] text-[#64748b]">
                      Vous pourrez changer d&apos;avis avec « Gérer les cookies », en bas de chaque page.{" "}
                      <Link
                        href="/politique-confidentialite#mesure-audience"
                        className="font-medium text-[#2a4fd4] underline underline-offset-2"
                      >
                        Politique de confidentialité
                      </Link>
                    </p>
                  </div>
                </div>

                {reouvert && (
                  <p className="mt-3 text-[13px] text-[#64748b]">
                    Choix actuel :{" "}
                    <span className="font-medium text-[#0b1224]">{choix === "accepte" ? "mesure acceptée" : "mesure refusée"}</span>
                  </p>
                )}

                {/* Deux boutons de même taille et de même poids : refuser est aussi simple qu'accepter. */}
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => decider("refuse")}
                    className="h-12 rounded-xl border border-[#cbd5e1] bg-white px-4 text-[15px] font-semibold text-[#0b1224] transition-colors hover:border-[#94a3b8] hover:bg-[#f8fafc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2 sm:h-11"
                  >
                    Refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => decider("accepte")}
                    className="h-12 rounded-xl bg-[#4373f5] px-4 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.18)] transition-colors hover:bg-[#3563e9] active:bg-[#2a4fd4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2 sm:h-11"
                  >
                    Accepter
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
