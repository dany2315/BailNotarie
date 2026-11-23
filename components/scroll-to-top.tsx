"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

/* =========================================================================
   Retour en haut de page.

   Un disque discret dans le coin bas droit, qui apparaît en fondu une fois la
   descente entamée et disparaît de la même façon quand on est revenu en haut.

   Il ne quitte jamais le flux : masqué, il garde sa place et ne fait que
   perdre son opacité et ses événements. Le montrer et le cacher en le
   retirant du DOM ferait sauter le coin de l'écran à chaque aller-retour.

   Aucun `backdrop-filter` : un filtre d'arrière-plan isole ce qui se trouve
   dessous et c'est un moyen connu d'obtenir une zone qui ne se repeint plus —
   défaut déjà rencontré sur la bulle d'assistance, sa voisine immédiate. La
   transparence seule suffit à l'effet recherché.
   ========================================================================= */

/** Au-delà de cette distance, la remontée vaut la peine d'être proposée. */
const SEUIL = 420;

export function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    let frame = 0;

    const lire = () => {
      frame = 0;
      // On ne rend que lorsque l'on franchit le seuil, pas à chaque image.
      setVisible((etait) => {
        const devrait = window.scrollY > SEUIL;
        return etait === devrait ? etait : devrait;
      });
    };

    const planifier = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(lire);
    };

    lire();
    window.addEventListener("scroll", planifier, { passive: true });
    window.addEventListener("resize", planifier, { passive: true });
    return () => {
      window.removeEventListener("scroll", planifier);
      window.removeEventListener("resize", planifier);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const remonter = () => {
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduit ? "auto" : "smooth" });
  };

  // Comme la bulle d'assistance : rien de tout cela dans le back-office.
  if (pathname?.startsWith("/interface")) return null;

  return (
    <button
      type="button"
      onClick={remonter}
      aria-label="Revenir en haut de la page"
      tabIndex={visible ? 0 : -1}
      aria-hidden={visible ? undefined : true}
      className={cn(
        "fixed right-4 z-[55] flex h-11 w-11 items-center justify-center rounded-full",
        // Un verre clair posé sur la page : assez présent pour se voir sur le
        // fond sombre de la visite guidée, assez discret pour ne pas disputer
        // la vedette au contenu.
        "bg-white/75 text-slate-700 ring-1 ring-slate-900/[0.09]",
        "shadow-[0_2px_8px_rgba(15,23,42,0.08),0_18px_40px_-22px_rgba(30,58,138,0.5)]",
        "transition-[opacity,transform,background-color,color] duration-300 ease-out",
        "hover:bg-white hover:text-[#3563e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0",
        // La messagerie du bail occupe le même coin : on s'efface le temps de
        // la conversation (marque posée par ChatDock).
        "[html[data-chat-open]_&]:hidden",
      )}
      style={{
        // `max` plutôt qu'une addition : la barre d'onglets porte déjà le
        // décalage de sécurité dans sa propre hauteur, le compter deux fois
        // décollerait le bouton du bas sur les téléphones à encoche.
        bottom: "calc(max(var(--bn-dock-h, 0px), env(safe-area-inset-bottom, 0px)) + 20px)",
      }}
    >
      <ArrowUp className="h-[18px] w-[18px]" />
    </button>
  );
}
