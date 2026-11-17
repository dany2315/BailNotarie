"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

/**
 * Mesure d'audience Google Analytics, avec consentement (décision de l'utilisateur du 17/11/2026, recette).
 *
 * - Rien n'est chargé tant que le visiteur n'a pas accepté (bandeau en bas de page).
 * - Jamais de mesure dans les espaces privés ni dans les formulaires, dont les adresses contiennent un jeton ou
 *   un identifiant de dossier : /interface, /client, /notaire, /intakes, /commencer/… (sauf l'entrée /commencer).
 * - Le choix est gardé dans ce navigateur ; « Gérer les cookies » (pied de page) permet de le changer.
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

export function AnalyticsConsent() {
  const pathname = usePathname();
  const [choix, setChoix] = useState<Choix>(null);
  const [pret, setPret] = useState(false);
  const [ouvert, setOuvert] = useState(false);
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
    if (c === "refuse") (window as any)[`ga-disable-${GA_ID}`] = true;
  };

  const charger = choix === "accepte" && !prive;
  const afficherBandeau = pret && !prive && (choix === null || ouvert);

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

      {afficherBandeau && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Mesure d'audience"
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[13.5px] leading-snug text-slate-700">
              Avec votre accord, nous mesurons l&apos;audience du site avec Google Analytics. Rien n&apos;est mesuré dans
              votre espace ni dans vos formulaires.{" "}
              <Link href="/politique-confidentialite" className="font-medium text-[#4373f5] underline-offset-2 hover:underline">
                En savoir plus
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1 sm:flex-none" onClick={() => decider("refuse")}>
                Refuser
              </Button>
              <Button type="button" className="h-11 flex-1 sm:flex-none" onClick={() => decider("accepte")}>
                Accepter
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
