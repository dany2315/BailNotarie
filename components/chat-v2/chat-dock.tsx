"use client";

import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/* =========================================================================
   Le support de la conversation.

   Il remplace le tiroir : pas de voile sur la page, pas de verrouillage du
   défilement, pas de piège à focus. La conversation est une fenêtre posée à
   côté du travail, pas un passage obligé — on peut continuer à lire et à
   cliquer derrière elle.

   Plein écran sur mobile, bulle en bas à droite à partir de `sm`. Le panneau
   est monté sur le corps de la page, pour qu'aucun parent à `overflow:hidden`
   ne puisse le rogner.

   Il ne porte aucune logique : l'ouverture reste chez l'appelant.
   ========================================================================= */

export function ChatDock({
  open,
  onOpenChange,
  /** L'élément qui ouvre la conversation. Son propre `onClick` est conservé. */
  trigger,
  label,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // Tant que la conversation est ouverte, la bulle de support s'efface : elles
  // occupent le même coin, et on ne tient pas deux discussions à la fois.
  React.useEffect(() => {
    if (!open) return;
    document.documentElement.dataset.chatOpen = "true";
    return () => {
      delete document.documentElement.dataset.chatOpen;
    };
  }, [open]);

  // Échap referme, comme le tiroir le faisait.
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  return (
    <>
      {trigger && (
        // `contents` laisse l'élément fourni intact : seul le clic est capté.
        <span className="contents" onClick={() => onOpenChange(true)}>
          {trigger}
        </span>
      )}

      {mounted &&
        open &&
        createPortal(
          <div
            role="dialog"
            aria-label={label}
            className={cn(
              // `pointer-events-auto` est vital : un tiroir ouvert en dessous
              // (le détail d'un bail, par exemple) pose `pointer-events: none`
              // sur le corps de la page, dont ce panneau hérite. Sans cette
              // ligne, la croix ne répond plus.
              "pointer-events-auto fixed inset-0 z-50 flex flex-col overflow-hidden bg-white",
              "duration-300 animate-in fade-in-0 slide-in-from-bottom-4",
              "sm:inset-auto sm:bottom-5 sm:right-5",
              "sm:h-[min(46rem,calc(100dvh-2.5rem))] sm:w-[28rem]",
              "sm:rounded-[28px] sm:border sm:border-slate-200/70",
              "sm:shadow-[0_32px_80px_-28px_rgba(15,23,42,0.45)]",
            )}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
