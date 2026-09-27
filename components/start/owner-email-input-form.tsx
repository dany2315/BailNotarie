"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Loader2, Lock, Mail, Shield } from "lucide-react";
import { StartCard, StartSubmit } from "@/components/start/start-card";
import { startAsOwner } from "@/lib/actions/start";
import { toast } from "sonner";
import { AlreadyClientState } from "@/components/start/already-client-state";
import { authClient } from "@/lib/auth-client";

const ownerEmailSchema = z.object({
  email: z.string().email("Email invalide"),
});

type OwnerEmailInputFormData = z.infer<typeof ownerEmailSchema>;

interface OwnerEmailInputFormProps {
  onOtpSent: (email: string, token: string | undefined, isExistingClient: boolean) => void;
}

export function OwnerEmailInputForm({ onOtpSent }: OwnerEmailInputFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    redirectTo?: string;
    redirectLabel?: string;
  } | null>(null);

  const form = useForm<OwnerEmailInputFormData>({
    resolver: zodResolver(ownerEmailSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: OwnerEmailInputFormData) => {
    setIsLoading(true);
    setErrorState(null);
    try {
      const emailNormalized = data.email.toLowerCase().trim();

      // Étape 1 : Créer/retrouver le Client + User via startAsOwner
      const result = await startAsOwner({
        role: "PROPRIETAIRE",
        email: emailNormalized,
      });

      if (!result || !result.success) {
        setIsLoading(false);
        if (result && (result.alreadyExists || result.isTenant)) {
          setErrorState({
            message: result.message || "Veuillez nous contacter pour plus d'informations.",
            redirectTo: result.redirectTo,
            redirectLabel: result.redirectLabel || "Contactez-nous",
          });
        } else {
          toast.error("Une erreur s'est produite. Veuillez réessayer.");
        }
        return;
      }

      // Étape 2 : Envoyer l'OTP via Better Auth
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: emailNormalized,
        type: "sign-in",
      });

      if (error) {
        setIsLoading(false);
        toast.error("Impossible d'envoyer le code de vérification. Veuillez réessayer.");
        console.error("Erreur envoi OTP:", error);
        return;
      }

      // Étape 3 : Notifier le parent pour passer à l'étape OTP
      console.log("[OwnerEmailInputForm] startAsOwner result:", JSON.stringify(result));
      console.log(`[OwnerEmailInputForm] token=${result.token}, isExistingClient=${result.isExistingClient}`);
      toast.success("Code de vérification envoyé", {
        description: "Vérifiez votre boîte de réception",
      });
      onOtpSent(emailNormalized, result.token, result.isExistingClient ?? false);
    } catch (error: any) {
      setIsLoading(false);
      toast.error(error.message || "Une erreur s'est produite");
    }
  };

  if (errorState) {
    return (
      <AlreadyClientState
        message={errorState.message}
        redirectTo={errorState.redirectTo}
        redirectLabel={errorState.redirectLabel || "Contactez-nous"}
      />
    );
  }

  return (
    <StartCard step="email">
      {/* `noValidate` : la bulle native du navigateur court-circuitait la
          validation du formulaire, et son style ne ressemble à rien du reste.
          Le message passe désormais par le schéma, sous le champ. */}
      <form noValidate onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-[14px] font-semibold text-slate-800">
            Votre adresse e-mail
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="vous@exemple.fr"
              className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow placeholder:text-slate-400 focus-visible:border-[#4373f5] focus-visible:ring-4 focus-visible:ring-[#4373f5]/15"
              {...form.register("email")}
              disabled={isLoading}
              autoFocus
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-[13px] font-medium text-red-600">
              {form.formState.errors.email.message}
            </p>
          )}
          <p className="flex items-start gap-1.5 text-[13px] leading-relaxed text-slate-500">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
            Un code à six chiffres vous sera envoyé pour sécuriser la connexion. Aucun mot de passe à créer.
          </p>
        </div>

        <StartSubmit loading={isLoading} loadingLabel="Envoi du code…">
          Continuer
          <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/cta:translate-x-1" />
        </StartSubmit>

        <div className="flex items-center justify-center gap-2 pt-1 text-[12.5px] text-slate-500">
          <Shield className="h-4 w-4 text-emerald-500" />
          Connexion chiffrée · vos données ne servent qu&apos;à votre dossier
        </div>
      </form>
    </StartCard>
  );
}
