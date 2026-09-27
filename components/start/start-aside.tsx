"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { SectionLabel } from "@/components/lp/ui/lp-primitives";

/* =========================================================================
   Titre de la page « Commencer ».

   Une page d'entrée n'a pas à convaincre : on y arrive décidé. Une puce, un
   titre, et la place est au champ. La puce porte à elle seule ce qu'il faut
   savoir — la page est celle des propriétaires — sans y consacrer une phrase.
   Le vocabulaire visuel est celui de l'accueil, pas son contenu.
   ========================================================================= */

export function StartHeading({ step }: { step: "email" | "otp" }) {
  const otp = step === "otp";

  return (
    <div className="lp-enter-up text-center">
      {/* Un mot suffit à dire à qui s'adresse la page — c'est la clé, au sens
          propre, qui le dit plus vite qu'une phrase. */}
      <SectionLabel icon={otp ? ShieldCheck : KeyRound}>
        {otp ? "Vérification" : "Propriétaires"}
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
    </div>
  );
}
