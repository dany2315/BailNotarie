"use client";

import * as React from "react";

/* =========================================================================
   Accord des barres du navigateur avec la section affichée.

   Sur iOS et Android, les barres système du navigateur se teintent avec la
   valeur de <meta name="theme-color">. Une valeur unique donne forcément un
   raccord faux : blanche sur les sections sombres, sombre sur les claires.
   On la synchronise donc avec la section qui touche le bas de l'écran —
   celle contre laquelle la barre d'adresse est posée.
   ========================================================================= */

const FALLBACK = "#ffffff";

export function LpChrome() {
  React.useEffect(() => {
    // Le layout en déclare deux (metadata.other et viewport.themeColor) : on
    // les met toutes à jour, sinon celle qu'on laisse derrière peut gagner
    // selon le navigateur et la synchronisation passe inaperçue.
    const metas = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'));
    if (metas.length === 0) return;

    const original = metas[0].getAttribute("content") ?? FALLBACK;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-lp-chrome]"));
    if (sections.length === 0) return;

    let frame = 0;
    let current = original;

    const update = () => {
      frame = 0;
      // Le bas du viewport : c'est là que la barre d'adresse s'appuie.
      const edge = window.innerHeight - 1;
      let color = original;
      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        if (rect.top <= edge && rect.bottom >= edge) {
          color = section.dataset.lpChrome || original;
          break;
        }
      }
      if (color !== current) {
        current = color;
        for (const meta of metas) meta.setAttribute("content", color);
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
      for (const meta of metas) meta.setAttribute("content", original);
    };
  }, []);

  return null;
}
