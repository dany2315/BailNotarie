"use client";

import { MessageSquare } from "lucide-react";

import { ContactForm } from "@/components/contact-form";
import { Reveal, SectionLabel } from "./ui/lp-primitives";

/* =========================================================================
   Section « Contact ».

   Elle vit ici, à côté des autres sections de la page, et non plus à même
   `app/page.tsx` : son en-tête utilise `SectionLabel` et `Reveal`, qui sont
   des composants client. Une page serveur ne peut pas leur passer une icône,
   puisque c'est une fonction et qu'une fonction ne traverse pas la frontière
   serveur / client. Toutes les sections voisines sont construites ainsi.

   Le formulaire garde sa logique dans `components/contact-form.tsx` ; cette
   enveloppe ne porte que le fond, le titre et la phrase d'accroche.
   ========================================================================= */

export function LpContact() {
  return (
    <section
      id="contact"
      aria-labelledby="lp-contact-title"
      data-lp-chrome="#ffffff"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-b from-[#f7f9ff] to-white py-20 sm:py-28"
    >
      <div aria-hidden className="lp-grid absolute inset-0 opacity-50" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        {/* L'en-tête reprend l'écriture des autres sections : pastille, titre
            équilibré, une phrase. */}
        <Reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
          <SectionLabel icon={MessageSquare}>Contact</SectionLabel>
          <h2
            id="lp-contact-title"
            className="lp-title lp-balance mt-6 text-3xl font-bold text-slate-900 sm:text-[2.6rem]"
          >
            Une question ? Contactez-nous
          </h2>
          <p className="lp-balance mx-auto mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Notre équipe est là pour vous accompagner dans la constitution de votre dossier de bail notarié.
          </p>
        </Reveal>

        <ContactForm />
      </div>
    </section>
  );
}
