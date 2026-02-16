"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, ShieldCheck, Timer } from "lucide-react";
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
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <Card className="border-0 shadow-xl sm:shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden pt-0">
        {/* Header avec gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10 text-center space-y-3 sm:space-y-4">
            <div className="flex justify-center mb-2 sm:mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              Vérification de votre email
            </CardTitle>
            <CardDescription className="text-sm sm:text-base md:text-lg text-blue-100 max-w-2xl mx-auto">
              Nous avons envoyé un code à 6 chiffres à votre adresse email
            </CardDescription>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
          {/* Badge email */}
          <div className="flex items-center justify-center gap-2 mb-6 sm:mb-8">
            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-full border border-blue-200">
              <Mail className="h-4 w-4" />
              <span className="text-sm sm:text-base font-medium">{email}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onOTPSubmit)} className="space-y-6 sm:space-y-8">
            {/* Champ OTP */}
            <div className="space-y-3">
              <Label className="text-base sm:text-lg font-semibold text-center block">
                Code de vérification
              </Label>
              <div className="flex justify-center">
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <InputOTP
                      maxLength={6}
                      {...field}
                      disabled={isLoading}
                      autoFocus
                    >
                      <InputOTPGroup className="gap-2 sm:gap-3">
                        <InputOTPSlot index={0} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                        <InputOTPSlot index={1} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                        <InputOTPSlot index={2} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                        <InputOTPSlot index={3} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                        <InputOTPSlot index={4} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                        <InputOTPSlot index={5} className="h-12 w-12 sm:h-14 sm:w-14 text-lg sm:text-xl border-2 rounded-lg" />
                      </InputOTPGroup>
                    </InputOTP>
                  )}
                />
              </div>
              {errors.code && (
                <p className="text-sm text-destructive text-center">
                  {errors.code.message}
                </p>
              )}
            </div>

            {/* Info validité */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              <span>Ce code est valide pendant 10 minutes</span>
            </div>

            {/* Boutons */}
            <div className="space-y-3">
              <Button
                type="submit"
                size="lg"
                className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Vérification en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Vérifier et continuer
                  </>
                )}
              </Button>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onBack}
                  disabled={isLoading}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Changer d'email
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResendOtp}
                  disabled={isLoading || isResending || resendCooldown > 0}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? "animate-spin" : ""}`} />
                  {resendCooldown > 0
                    ? `Renvoyer dans ${resendCooldown}s`
                    : "Renvoyer le code"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

