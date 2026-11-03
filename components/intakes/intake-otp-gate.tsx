"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, Mail, RefreshCw, ShieldCheck, Timer } from "lucide-react";
import { toast } from "sonner";
import { LpNav } from "@/components/lp/lp-nav";
import { Footer } from "@/components/footer";
import { AuroraBackdrop, NoiseOverlay, SectionLabel } from "@/components/lp/ui/lp-primitives";
import { StartCard, StartSubmit } from "@/components/start/start-card";
import { OtpCodeInput } from "@/components/ui/otp-code-input";

/* =========================================================================
   Code d'accès d'un formulaire d'intake.

   Le lien du formulaire ne suffit pas à l'ouvrir : un code part à l'adresse
   du dossier, jamais à une adresse saisie ici. Le code vérifié ouvre une
   session ; la page se recharge alors sur le formulaire. Un visiteur déjà
   connecté avec le bon compte ne voit jamais cet écran.
   ========================================================================= */

interface IntakeOtpGateProps {
  token: string;
  /** Adresse du dossier, partiellement masquée (null quand le code ne peut pas partir). */
  maskedEmail: string | null;
  /** Raison pour laquelle le code ne peut pas partir. */
  unavailableReason?: string | null;
  /** Une session d'un autre compte est ouverte sur ce navigateur. */
  signedInAsOther?: boolean;
}

async function callOtp(token: string, body: Record<string, string>) {
  const response = await fetch(`/api/intakes/${encodeURIComponent(token)}/otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Une erreur est survenue. Réessayez.");
}

export function IntakeOtpGate({ token, maskedEmail, unavailableReason, signedInAsOther }: IntakeOtpGateProps) {
  const [step, setStep] = useState<"intro" | "code">("intro");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const sendCode = async () => {
    setSending(true);
    try {
      await callOtp(token, { action: "send" });
      setStep("code");
      setCode("");
      setError(undefined);
      setCooldown(60);
      toast.success("Code envoyé", { description: "Vérifiez votre boîte de réception." });
    } catch (sendError: any) {
      toast.error("Code non envoyé", { description: sendError.message });
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (value: string) => {
    if (value.length !== 6) {
      setError("Le code contient 6 chiffres.");
      return;
    }
    setVerifying(true);
    setError(undefined);
    try {
      await callOtp(token, { action: "verify", code: value });
      // Rechargement complet : la page est rendue à nouveau, avec la session, sur le formulaire.
      window.location.reload();
    } catch (verifyError: any) {
      setError(verifyError.message);
      setVerifying(false);
    }
  };

  const emailChip = maskedEmail ? (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#4373f5]/[0.08] px-2.5 py-1 text-[13px] font-medium text-[#2a4fd4]">
      <Mail className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{maskedEmail}</span>
    </span>
  ) : null;

  return (
    <div className="lp-root flex min-h-screen flex-col bg-white">
      <LpNav overlay />

      <main className="lp-scene relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-[#eef3ff] px-5 pb-16 pt-[calc(var(--lp-nav-h,76px)+2rem)] sm:pb-20 sm:pt-[calc(var(--lp-nav-h,76px)+3rem)]">
        <div aria-hidden className="lp-mesh absolute inset-0" />
        <div aria-hidden className="lp-grid absolute inset-0" />
        <AuroraBackdrop />
        <NoiseOverlay />

        <div className="relative z-10 w-full max-w-[30rem]">
          <div className="lp-enter-up text-center">
            <SectionLabel icon={ShieldCheck}>Accès sécurisé</SectionLabel>
            <h1 className="lp-title lp-balance mt-5 text-[2rem] font-bold leading-[1.1] text-slate-900 sm:text-[2.6rem]">
              {step === "code" ? (
                <>
                  Un code vient de <span className="lp-gradient-text">partir</span>
                </>
              ) : (
                <>
                  Confirmez que <span className="lp-gradient-text">c&apos;est vous</span>
                </>
              )}
            </h1>
          </div>

          <div className="mt-7 sm:mt-8">
            {!maskedEmail ? (
              <StartCard title="Ce formulaire ne peut pas être ouvert" description={unavailableReason}>
                <a
                  href="mailto:contact@bailnotarie.fr"
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 text-[15px] font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Mail className="h-[18px] w-[18px]" />
                  contact@bailnotarie.fr
                </a>
              </StartCard>
            ) : step === "intro" ? (
              <StartCard
                title="Recevez votre code d'accès"
                description={
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    Vos informations sont protégées. Nous envoyons un code à usage unique à l&apos;adresse du dossier
                    {emailChip}
                  </span>
                }
              >
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendCode();
                  }}
                  className="space-y-4"
                >
                  {signedInAsOther && (
                    <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-[13px] leading-relaxed text-amber-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      Vous êtes connecté avec un autre compte sur ce navigateur. Le code vous connectera à ce dossier à la
                      place.
                    </p>
                  )}
                  <StartSubmit loading={sending} loadingLabel="Envoi…">
                    <Mail className="h-[18px] w-[18px]" />
                    Recevoir mon code
                  </StartSubmit>
                  <p className="text-center text-[13px] text-slate-500">
                    Ce n&apos;est plus votre adresse ?{" "}
                    <a href="mailto:contact@bailnotarie.fr" className="font-medium text-[#3563e9] hover:underline">
                      Contactez-nous
                    </a>
                  </p>
                </form>
              </StartCard>
            ) : (
              <StartCard
                title="Entrez votre code"
                description={
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    Envoyé à
                    {emailChip}
                  </span>
                }
              >
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    verifyCode(code);
                  }}
                  className="space-y-5"
                >
                  <OtpCodeInput
                    id="intake-otp-code"
                    label=""
                    value={code}
                    onChange={(value) => {
                      setCode(value);
                      setError(undefined);
                      // Code complet (saisi, collé ou proposé par le clavier) : vérification directe.
                      if (value.length === 6 && !verifying) verifyCode(value);
                    }}
                    disabled={verifying}
                    autoFocus
                    error={error}
                  />

                  <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
                    <Timer className="h-4 w-4 text-slate-400" />
                    Valide pendant 10 minutes
                  </div>

                  <StartSubmit loading={verifying} loadingLabel="Vérification…">
                    <CheckCircle2 className="h-[18px] w-[18px]" />
                    Accéder au formulaire
                  </StartSubmit>

                  <div className="flex justify-center border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={verifying || sending || cooldown > 0}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-[#3563e9] transition-colors hover:bg-[#4373f5]/[0.07] disabled:text-slate-400 disabled:hover:bg-transparent"
                    >
                      <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                      {cooldown > 0 ? `Renvoyer dans ${cooldown}s` : "Renvoyer le code"}
                    </button>
                  </div>
                </form>
              </StartCard>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
