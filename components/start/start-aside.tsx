"use client";

import { FileText, ShieldCheck } from "lucide-react";
import { SectionLabel } from "@/components/lp/ui/lp-primitives";

/* =========================================================================
   Titre de la page « Commencer ».

   Une page d'entrée n'a pas à convaincre : on y arrive décidé. Elle annonce
   donc l'étape en une ligne et laisse la place au champ. Le vocabulaire
   visuel est celui de l'accueil — même puce de section, même titre dégradé —
   mais pas son contenu.
   ========================================================================= */

export function StartHeading({ step }: { step: "email" | "otp" }) {
  const otp = step === "otp";

  return (
    <div className="lp-enter-up text-center">
      <SectionLabel icon={otp ? ShieldCheck : FileText}>
        {otp ? "Vérification" : "Constitution du dossier"}
      </SectionLabel>
      <h1 className="lp-title lp-balance mt-5 text-[2rem] font-bold leading-[1.1] text-slate-900 sm:text-[2.6rem]">
        {otp ? (
          <>
            Un code vient de <span className="lp-gradient-text">partir</span>
          </>
        ) : (
          <>
            Votre bail notarié <span className="lp-gradient-text">commence ici</span>
          </>
        )}
      </h1>
      <p className="lp-balance mx-auto mt-3.5 max-w-md text-[15.5px] leading-relaxed text-slate-600">
        {otp
          ? "Saisissez les six chiffres reçus par e-mail."
          : "Votre e-mail suffit pour ouvrir le dossier."}
      </p>
    </div>
  );
}
