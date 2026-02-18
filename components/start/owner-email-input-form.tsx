"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, Mail, Shield, Sparkles } from "lucide-react";
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
                <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white">
              Propriétaire ?
            </CardTitle>
            <CardDescription className="text-sm sm:text-base md:text-lg text-blue-100 max-w-2xl mx-auto">
              Renseignez votre email pour constituer votre bail notarié (habitation ou commercial) en quelques minutes
            </CardDescription>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
            <div className="space-y-3">
              <Label htmlFor="email" className="text-base sm:text-lg font-semibold">
                Votre adresse email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  className="pl-10 sm:pl-12 h-12 sm:h-14 text-base sm:text-lg border-2 focus:border-blue-500 transition-colors"
                  {...form.register("email")}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                Un code de vérification vous sera envoyé par email pour sécuriser votre connexion.
              </p>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Envoi du code en cours...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {/* Badges de confiance */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 pt-2 sm:pt-4">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>100% sécurisé</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span>Sans engagement</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
