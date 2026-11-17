"use client";

import { useEffect, useRef } from "react";

/**
 * Formulaires en plusieurs étapes : le geste « retour » du téléphone (bouton retour d'Android, glissement depuis
 * le bord sur iPhone, bouton précédent du navigateur) recule d'une étape, comme la flèche du formulaire, au lieu
 * de quitter la page. Choix validé par l'utilisateur le 17/11/2026 (recette, défaut M9).
 *
 * Principe : tant qu'on peut reculer, une seule entrée « garde » est posée dans l'historique, à la même adresse.
 * Le geste retour la consomme : on recule alors d'une étape, et la garde est reposée si l'on peut encore reculer.
 * À la première étape, il n'y a plus de garde : le geste quitte le formulaire normalement, en un seul geste.
 *
 * @param stepKey   identifie l'étape affichée (étape, sous-étape…) : la garde est revue à chaque changement
 * @param canGoBack la flèche du formulaire reculerait-elle ? (sinon le geste doit quitter la page)
 * @param onStepBack la même action que la flèche du formulaire
 */
export function useStepBackGesture(stepKey: string, canGoBack: boolean, onStepBack: () => void) {
  const guardRef = useRef(false);
  const ignoreNextPopRef = useRef(false);
  const canGoBackRef = useRef(canGoBack);
  const onStepBackRef = useRef(onStepBack);
  canGoBackRef.current = canGoBack;
  onStepBackRef.current = onStepBack;

  // Garde présente si et seulement si l'on peut reculer
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (canGoBack && !guardRef.current) {
      window.history.pushState({ bnStepGuard: true }, "", window.location.href);
      guardRef.current = true;
    } else if (!canGoBack && guardRef.current) {
      // Retour à la première étape par la flèche : on retire la garde, pour qu'un seul geste suffise à quitter
      guardRef.current = false;
      ignoreNextPopRef.current = true;
      window.history.back();
    }
  }, [stepKey, canGoBack]);

  useEffect(() => {
    const onPop = () => {
      if (ignoreNextPopRef.current) {
        ignoreNextPopRef.current = false;
        return;
      }
      if (!guardRef.current) return; // pas notre garde : le navigateur quitte la page normalement
      guardRef.current = false;
      if (canGoBackRef.current) onStepBackRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
