"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Cookie, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

/**
 * Bandeau de cookies et mesure d'audience Google Analytics (décisions de l'utilisateur du 17/11/2026).
 *
 * Format standard des bandeaux de cookies : « Tout refuser », « Personnaliser », « Tout accepter », puis un panneau
 * de préférences par catégorie. Conforme aux recommandations de la CNIL :
 * - rien n'est chargé avant l'accord ; refuser est aussi simple qu'accepter ;
 * - le choix est gardé 6 mois, puis redemandé ; « Gérer les cookies » (pied de page) permet de le changer ;
 * - aucune mesure dans les espaces privés ni dans les formulaires (adresses avec jeton ou identifiant de dossier).
 */

const GA_ID = "G-TZ7DF5J0XW";
const STORAGE_KEY = "bn-consentement-mesure";
const DUREE_MS = 182 * 24 * 60 * 60 * 1000; // 6 mois
export const OPEN_CONSENT_EVENT = "bn:gerer-cookies";

type Choix = "accepte" | "refuse" | null;

/** Pages où rien n'est jamais mesuré (données personnelles, jetons et identifiants dans l'adresse). */
export function isPrivatePath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (
    /^\/(interface|client|notaire|intakes|login|register)(\/|$)/.test(pathname)
  )
    return true;
  // Le tunnel d'ouverture de dossier : seule la page d'entrée /commencer est publique
  if (/^\/commencer\/.+/.test(pathname)) return true;
  return false;
}

function lireChoix(): Choix {
  try {
    const brut = window.localStorage.getItem(STORAGE_KEY);
    if (!brut) return null;
    // Ancien format (simple texte) : encore valable, il sera réenregistré avec sa date au prochain choix.
    if (brut === "accepte" || brut === "refuse") return brut;
    const { choix, le } = JSON.parse(brut) as { choix?: string; le?: number };
    if ((choix !== "accepte" && choix !== "refuse") || typeof le !== "number")
      return null;
    return Date.now() - le > DUREE_MS ? null : choix;
  } catch {
    return null;
  }
}

function ecrireChoix(choix: Exclude<Choix, null>) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ choix, le: Date.now() }),
    );
  } catch {
    /* navigation privée : le choix vaut pour cette page seulement */
  }
}

/** Ouvre les préférences de cookies (lien « Gérer les cookies » du pied de page). */
export function openConsentBanner() {
  window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const btnBase =
  "inline-flex h-11 min-w-[9.5rem] items-center justify-center rounded-lg px-5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2";
const btnPrincipal = `${btnBase} bg-[#4373f5] text-white hover:bg-[#3563e9] active:bg-[#2a4fd4]`;
const btnSecondaire = `${btnBase} border border-[#4373f5] bg-white text-[#2a4fd4] hover:bg-[#f5f7ff]`;
const btnDiscret = `${btnBase} border border-[#cbd5e1] bg-white text-[#0b1224] hover:bg-[#f8fafc]`;

/** Interrupteur accessible (rôle « switch »). */
function Interrupteur({
  actif,
  onChange,
  id,
  desactive,
}: {
  actif: boolean;
  onChange?: (v: boolean) => void;
  id: string;
  desactive?: boolean;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={actif}
      disabled={desactive}
      onClick={() => onChange?.(!actif)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50 focus-visible:ring-offset-2",
        actif ? "bg-[#4373f5]" : "bg-[#cbd5e1]",
        desactive ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span
        aria-hidden
        className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${actif ? "translate-x-[22px]" : "translate-x-0.5"}`}
      />
    </button>
  );
}

export function AnalyticsConsent() {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const titreId = useId();
  const texteId = useId();
  const mesureId = useId();
  const [choix, setChoix] = useState<Choix>(null);
  const [pret, setPret] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [mesure, setMesure] = useState(false);
  const prive = isPrivatePath(pathname);

  useEffect(() => {
    const lu = lireChoix();
    setChoix(lu);
    setPret(true);
    const ouvrir = () => {
      setMesure(lireChoix() === "accepte");
      setPreferences(true);
    };
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
    setPreferences(false);
    if (c === "refuse") (window as any)[`ga-disable-${GA_ID}`] = true;
  };

  const charger = choix === "accepte" && !prive;
  const afficherBandeau = pret && !prive && choix === null && !preferences;

  return (
    <>
      {charger && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
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
            key="bandeau-cookies"
            role="dialog"
            aria-modal="false"
            aria-labelledby={titreId}
            aria-describedby={texteId}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: {
                duration: reduce ? 0.2 : 0.6,
                ease: EASE_OUT_EXPO,
                delay: 0.5,
              },
            }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.15 } }
                : {
                    opacity: 0,
                    y: 16,
                    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
                  }
            }
            // Au-dessus de la bulle « Support » (z-60).
            className="fixed inset-x-0 bottom-0 z-[70] font-sans text-[#0b1224]"
          >
            <div className="rounded-t-2xl border-t border-[#e2e8f0] bg-white shadow-[0_-12px_40px_-12px_rgba(15,23,42,0.18)] sm:rounded-none">
              <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-8 sm:py-5 lg:flex-row lg:items-center lg:gap-10">
                <div className="flex min-w-0 flex-1 gap-4">
                  <span
                    aria-hidden
                    className="hidden size-11 shrink-0 place-items-center rounded-full bg-[#eef2ff] text-[#4373f5] sm:grid"
                  >
                    <Cookie className="size-[22px]" />
                  </span>
                  <div className="min-w-0">
                    <h2
                      id={titreId}
                      className="text-[16px] font-semibold leading-snug"
                    >
                      Ce site utilise des cookies
                    </h2>
                    <p
                      id={texteId}
                      className="mt-1 max-w-[70ch] text-[14px] leading-relaxed text-[#475569]"
                    >
                      Nous utilisons des cookies pour mesurer l&apos;audience de
                      notre site et améliorer votre expérience. Vous pouvez
                      accepter, refuser ou personnaliser vos choix, et les
                      modifier à tout moment via « Gérer les cookies » en bas de
                      page.{" "}
                      <Link
                        href="/politique-confidentialite#mesure-audience"
                        className="font-medium text-[#2a4fd4] underline underline-offset-2 hover:text-[#4373f5]"
                      >
                        En savoir plus
                      </Link>
                    </p>
                  </div>
                </div>

                <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setMesure(false);
                      setPreferences(true);
                    }}
                    className={`${btnDiscret} col-span-2 sm:col-span-1`}
                  >
                    Personnaliser
                  </button>
                  <button
                    type="button"
                    onClick={() => decider("refuse")}
                    className={btnSecondaire}
                  >
                    Tout refuser
                  </button>
                  <button
                    type="button"
                    onClick={() => decider("accepte")}
                    className={btnPrincipal}
                  >
                    Tout accepter
                  </button>
                </div>
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <DialogPrimitive.Root open={preferences} onOpenChange={setPreferences}>
        <DialogPrimitive.Portal>
          {/* Voile et fenêtre au-dessus de la bulle « Support » (z-60). */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-[75] bg-[#0b1224]/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={[
              "fixed z-[80] grid gap-5 bg-white font-sans text-[#0b1224] shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]",
              "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
              // Téléphone : feuille qui monte du bas de l'écran ; ordinateur : fenêtre centrée.
              "inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6",
              "data-[state=open]:slide-in-from-bottom-8",
              "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-7",
              "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=open]:zoom-in-95",
            ].join(" ")}
          >
            <div className="pr-8">
              <DialogPrimitive.Title className="text-[18px] font-semibold leading-snug">
                Paramètres des cookies
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1.5 text-[14px] leading-relaxed text-[#475569]">
                Choisissez les cookies que vous acceptez. Votre choix est
                conservé 6 mois et vous pouvez le modifier à tout moment.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label="Fermer"
              className="absolute right-3 top-3 grid size-10 place-items-center rounded-full text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0b1224] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50"
            >
              <X className="size-[18px]" aria-hidden />
            </DialogPrimitive.Close>

            <div className="divide-y divide-[#e2e8f0] rounded-xl border border-[#e2e8f0]">
              <div className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className="text-[15px] font-semibold">
                    Cookies strictement nécessaires
                  </p>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-[#64748b]">
                    Indispensables au fonctionnement du site (sécurité,
                    connexion à votre espace, mémorisation de vos choix). Ils ne
                    peuvent pas être désactivés.
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-[#eef2ff] px-2.5 py-1 text-[12px] font-medium text-[#2a4fd4]">
                  Toujours actifs
                </span>
              </div>
              <div className="flex items-start justify-between gap-4 p-4">
                <label htmlFor={mesureId} className="cursor-pointer">
                  <span className="block text-[15px] font-semibold">
                    Mesure d&apos;audience
                  </span>
                  <span className="mt-1 block text-[13.5px] leading-relaxed text-[#64748b]">
                    Nous permettent de connaître la fréquentation du site et
                    d&apos;en améliorer les contenus (Google Analytics).
                  </span>
                </label>
                <Interrupteur
                  id={mesureId}
                  actif={mesure}
                  onChange={setMesure}
                />
              </div>
            </div>

            <p className="text-[13px] text-[#64748b]">
              Pour en savoir plus, consultez notre{" "}
              <Link
                href="/politique-confidentialite#mesure-audience"
                className="font-medium text-[#2a4fd4] underline underline-offset-2"
              >
                politique de confidentialité
              </Link>
              .
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={() => decider("refuse")}
                className={btnSecondaire}
              >
                Tout refuser
              </button>
              <button
                type="button"
                onClick={() => decider(mesure ? "accepte" : "refuse")}
                className={btnPrincipal}
              >
                Enregistrer
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
