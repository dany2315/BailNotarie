/* =========================================================================
   Passage de relais entre le champ e-mail de l'accueil et la page
   « Commencer ».

   Le champ du hero fait déjà le travail de la première étape : il crée ou
   retrouve le client et déclenche l'envoi du code. Il reste à dire à la page
   d'arrivée où en est le parcours, pour qu'elle ouvre l'écran du code au lieu
   de redemander l'adresse.

   Le relais passe par `sessionStorage` et non par l'URL : le jeton du dossier
   n'a rien à faire dans une adresse qu'on partage ou qu'un historique
   conserve. Il est daté et à usage unique — lu, il est effacé — et périmé au
   bout de dix minutes, la durée de validité du code lui-même.
   ========================================================================= */

const KEY = "bn:start-handoff";
const MAX_AGE_MS = 10 * 60 * 1000;

export type StartHandoff =
  | { step: "otp"; email: string; token?: string; isExistingClient: boolean }
  | { step: "error"; email: string; message: string; redirectTo?: string; redirectLabel?: string };

export function writeStartHandoff(handoff: StartHandoff) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...handoff, at: Date.now() }));
  } catch {
    // Navigation privée ou stockage refusé : la page d'arrivée redemandera
    // simplement l'adresse, ce qui reste un parcours valide.
  }
}

/** Lit le relais et le consomme. Retourne `null` s'il est absent ou périmé. */
export function takeStartHandoff(): StartHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);

    const parsed = JSON.parse(raw) as StartHandoff & { at?: number };
    if (!parsed?.at || Date.now() - parsed.at > MAX_AGE_MS) return null;
    if (parsed.step !== "otp" && parsed.step !== "error") return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Validation d'affichage : décide quand le bouton s'allume, rien de plus. */
export const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
