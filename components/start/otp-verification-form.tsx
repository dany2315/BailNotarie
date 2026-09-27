"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { OtpCodeInput } from "@/components/ui/otp-code-input";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw, Timer } from "lucide-react";
import { StartCard, StartSubmit } from "@/components/start/start-card";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type OTPFormData = z.infer<typeof otpSchema>;

interface OtpVerificationFormProps {
  email: string;
  token: string | undefined;
  isExistingClient: boolean;
  onSuccess: (isExistingClient: boolean, token: string | undefined) => void;
  onBack: () => void;
}

export function OtpVerificationForm({
  email,
  token,
  isExistingClient,
  onSuccess,
  onBack,
}: OtpVerificationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Vérifier l'OTP et connecter l'utilisateur
  const onOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await authClient.signIn.emailOtp({
        email: email,
        otp: data.code,
      });

      if (error) {
        let errorMessage = "Code invalide ou expiré";
        if (error.code === "INVALID_OTP") {
          errorMessage = "Le code est incorrect. Veuillez vérifier et réessayer.";
        } else if (error.code === "EXPIRED_OTP") {
          errorMessage = "Le code a expiré. Veuillez en demander un nouveau.";
        } else if (error.code === "TOO_MANY_ATTEMPTS") {
          errorMessage = "Trop de tentatives. Veuillez demander un nouveau code.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error("Code invalide", { description: errorMessage });
        setIsLoading(false);
        return;
      }

      toast.success("Connexion réussie", {
        description: "Redirection en cours...",
      });

      // Petit délai pour que le cookie de session soit défini
      await new Promise((resolve) => setTimeout(resolve, 300));

      onSuccess(isExistingClient, token);
    } catch (error: any) {
      console.error("Erreur lors de la vérification OTP:", error);
      toast.error("Erreur", {
        description: error?.message || "Erreur lors de la vérification du code",
      });
      setIsLoading(false);
    }
  };

  // Renvoyer le code OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: email,
        type: "sign-in",
      });

      if (error) {
        toast.error("Impossible de renvoyer le code. Veuillez réessayer.");
        return;
      }

      toast.success("Nouveau code envoyé", {
        description: "Vérifiez votre boîte de réception",
      });

      // Cooldown de 60 secondes
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      toast.error("Erreur lors du renvoi du code");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <StartCard
      step="otp"
      title="Entrez votre code de vérification"
      description={
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
          Envoyé à
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-[#4373f5]/[0.08] px-2.5 py-1 text-[13px] font-medium text-[#2a4fd4]">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{email}</span>
          </span>
        </span>
      }
    >
      <form onSubmit={handleSubmit(onOTPSubmit)} className="space-y-5">
        <Controller
          name="code"
          control={control}
          render={({ field }) => (
            <OtpCodeInput
              id="start-otp-code"
              label=""
              value={field.value || ""}
              onChange={field.onChange}
              disabled={isLoading}
              autoFocus
              error={errors.code?.message}
            />
          )}
        />

        <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
          <Timer className="h-4 w-4 text-slate-400" />
          Valide pendant 10 minutes
        </div>

        <StartSubmit loading={isLoading} loadingLabel="Vérification…">
          <CheckCircle2 className="h-[18px] w-[18px]" />
          Vérifier et continuer
        </StartSubmit>

        <div className="flex flex-col items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Changer d&apos;e-mail
          </button>

          <button
            type="button"
            onClick={handleResendOtp}
            disabled={isLoading || isResending || resendCooldown > 0}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-[#3563e9] transition-colors hover:bg-[#4373f5]/[0.07] disabled:text-slate-400 disabled:hover:bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
            {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : "Renvoyer le code"}
          </button>
        </div>
      </form>
    </StartCard>
  );
}
