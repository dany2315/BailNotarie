"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { startAsOwner } from "@/lib/actions/start";
import { looksLikeEmail, writeStartHandoff } from "@/lib/start-handoff";
import { cn } from "@/lib/utils";

/* =========================================================================
   Champ d'entrée du hero.

   Il fait la première étape de « Commencer » sur place : création ou
   rattrapage du client, puis envoi du code. La page d'arrivée ouvre alors
   directement l'écran du code — une étape de moins, et l'adresse n'est
   saisie qu'une fois.

   Le bouton vit à l'intérieur du champ. Il ne prend donc aucune hauteur et
   son apparition ne décale rien : tant que l'adresse n'est pas plausible il
   reste en retrait, puis il s'allume aux couleurs de l'action principale.
   ========================================================================= */

export function LpStartField({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const ready = looksLikeEmail(email);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || loading) return;

    setLoading(true);
    const normalized = email.toLowerCase().trim();

    try {
      const result = await startAsOwner({ role: "PROPRIETAIRE", email: normalized });

      // Compte existant qui n'est pas un propriétaire : la page d'arrivée
      // affiche le même écran que si l'adresse avait été saisie là-bas.
      if (!result || !result.success) {
        if (result && (result.alreadyExists || result.isTenant)) {
          writeStartHandoff({
            step: "error",
            email: normalized,
            message: result.message || "Veuillez nous contacter pour plus d'informations.",
            redirectTo: result.redirectTo,
            redirectLabel: result.redirectLabel || "Contactez-nous",
          });
          router.push("/commencer");
          return;
        }
        setLoading(false);
        toast.error("Une erreur s'est produite. Veuillez réessayer.");
        return;
      }

      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: normalized,
        type: "sign-in",
      });

      if (error) {
        setLoading(false);
        toast.error("Impossible d'envoyer le code de vérification. Veuillez réessayer.");
        return;
      }

      writeStartHandoff({
        step: "otp",
        email: normalized,
        token: result.token,
        isExistingClient: result.isExistingClient ?? false,
      });
      toast.success("Code de vérification envoyé", { description: "Vérifiez votre boîte de réception" });
      router.push("/commencer");
    } catch (error) {
      setLoading(false);
      toast.error(error instanceof Error ? error.message : "Une erreur s'est produite");
    }
  };

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      <label htmlFor="lp-start-email" className="sr-only">
        Votre adresse e-mail de propriétaire
      </label>

      <div className="relative">
        <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400 sm:left-5" />
        <input
          id="lp-start-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Votre e-mail"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          className="h-[60px] w-full rounded-2xl border border-white/80 bg-white/90 pl-11 pr-[58px] text-[16px] text-slate-900 shadow-[0_18px_44px_-24px_rgba(30,58,138,0.55)] outline-none backdrop-blur-xl transition-shadow placeholder:text-slate-400 focus:border-[#4373f5]/50 focus:shadow-[0_18px_44px_-20px_rgba(53,99,233,0.7)] sm:h-[66px] sm:pl-12 sm:pr-[150px] sm:text-[17px]"
        />

        {/* Dans le champ : aucune hauteur prise, aucun décalage à l'apparition. */}
        <button
          type="submit"
          disabled={!ready || loading}
          aria-label="Commencer mon dossier"
          className={cn(
            "group/go absolute right-2 top-1/2 flex h-[46px] -translate-y-1/2 items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-semibold transition-all duration-300 sm:right-2.5 sm:h-[50px]",
            ready && !loading
              ? "w-[46px] bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_12px_28px_-12px_rgba(53,99,233,1)] sm:w-[128px]"
              : "w-[46px] bg-slate-100 text-slate-400 sm:w-[46px]",
          )}
        >
          {loading ? (
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          ) : (
            <>
              <span className={cn("hidden whitespace-nowrap", ready && "sm:inline")}>Commencer</span>
              <ArrowRight className="h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover/go:translate-x-0.5" />
            </>
          )}
        </button>
      </div>

      <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] text-slate-500">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
          <KeyRound className="h-3.5 w-3.5 text-[#4373f5]" />
          Réservé aux propriétaires
        </span>
        <span aria-hidden className="text-slate-300">·</span>
        <span>
          <strong className="font-semibold text-slate-700">39,90 € TTC</strong> de frais de dossier
        </span>
      </p>
    </form>
  );
}
