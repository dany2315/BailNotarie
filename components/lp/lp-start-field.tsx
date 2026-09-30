"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { startAsOwner } from "@/lib/actions/start";
import { looksLikeEmail, writeStartHandoff } from "@/lib/start-handoff";
import { cn } from "@/lib/utils";
import { useClientSession } from "./lp-user-menu";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

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
  const session = useClientSession();
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

  /* Déjà connecté : demander son adresse reviendrait à lui faire rouvrir une
     porte qu'il a déjà passée, et lui renvoyer un code pour rien. Le champ
     laisse donc la place au chemin vers son espace. */
  if (session.status === "client") {
    return (
      <div className={cn("w-full", className)}>
        <Link
          href="/client"
          className="group/cta relative flex h-[60px] w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-[16px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_16px_40px_-16px_rgba(53,99,233,1)] transition-transform duration-300 hover:-translate-y-0.5 sm:h-[66px] sm:text-[17px]"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(105deg,transparent_38%,rgba(255,255,255,0.45)_50%,transparent_62%)] transition-transform duration-700 group-hover/cta:translate-x-full"
          />
          <span className="relative flex items-center gap-2">
            <LayoutDashboard className="h-[19px] w-[19px]" />
            Reprendre mon dossier
            <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/cta:translate-x-1" />
          </span>
        </Link>
        <p className="mt-3 text-center text-[13px] text-slate-500">
          Vos baux, vos biens et vos documents, au même endroit.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn("w-full", className)}>
      {/* Dit ce que le champ déclenche. Sans cette ligne, une adresse e-mail
          dans un hero se lit comme une inscription à une lettre d'information. */}
      <label
        htmlFor="lp-start-email"
        className="mb-2 block text-center text-[12.5px] font-semibold uppercase tracking-[0.13em] text-slate-500"
      >
        Ouvrez votre dossier
      </label>

      <div className="relative">
        <input
          id="lp-start-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Votre e-mail de propriétaire"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={loading}
          className="h-[60px] w-full rounded-2xl border border-white/80 bg-white/90 pl-[62px] pr-[58px] text-[16px] text-slate-900 shadow-[0_18px_44px_-24px_rgba(30,58,138,0.55)] outline-none backdrop-blur-xl transition-shadow placeholder:text-slate-400 focus:border-[#4373f5]/50 focus:shadow-[0_18px_44px_-20px_rgba(53,99,233,0.7)] sm:h-[66px] sm:pl-[70px] sm:pr-[150px] sm:text-[17px]"
        />

        {/* Pastille à gauche, en écho au bouton de droite : les deux bouts du
            champ disent ce qu'on y met et ce qui s'ensuit.

            `z-10` n'est pas décoratif : le champ porte un `backdrop-blur`, ce
            qui en fait un contexte d'empilement peint au même niveau que les
            éléments positionnés sans z-index. À égalité, c'est l'ordre du
            document qui tranche — et le champ, écrit après, passait devant la
            pastille, que son fond blanc à 90 % effaçait dès que le navigateur
            avait composé la couche. D'où une icône visible le temps du premier
            rendu, puis plus rien.

            Deux verrous plutôt qu'un : le `z-10`, et la place dans le document
            — écrite après le champ, la pastille passe devant même si le
            z-index venait à être ignoré. Le bouton, déjà écrit après, reçoit la
            même garantie. */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 z-10 flex h-[46px] w-[46px] -translate-y-1/2 items-center justify-center rounded-xl bg-[#4373f5]/[0.09] text-[#3563e9] sm:left-2.5 sm:h-[50px] sm:w-[50px]"
        >
          <Mail className="h-[19px] w-[19px]" />
        </span>

        {/* Dans le champ : aucune hauteur prise, aucun décalage à l'apparition. */}
        <button
          type="submit"
          disabled={!ready || loading}
          aria-label="Commencer mon dossier"
          className={cn(
            "group/go absolute right-2 top-1/2 z-10 flex h-[46px] -translate-y-1/2 items-center justify-center gap-2 overflow-hidden rounded-xl text-[15px] font-semibold transition-all duration-300 sm:right-2.5 sm:h-[50px]",
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
