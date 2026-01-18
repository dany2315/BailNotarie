"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, Mail, User, Lock, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function ClientLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    control: controlOTP,
    handleSubmit: handleSubmitOTP,
    formState: { errors: otpErrors },
  } = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
  });

  // Envoyer l'OTP pour les clients
  const onEmailSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const emailNormalized = data.email.toLowerCase().trim();
      
      // ÉTAPE 1: Vérifier si le Client existe et créer le User si nécessaire
      // Cette étape est CRUCIALE car Better Auth avec disableSignUp: true
      // vérifie l'existence du User AVANT d'appeler sendVerificationOTP
      try {
        const prepareResponse = await fetch("/api/auth/client/prepare-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: emailNormalized }),
        });

        const prepareData = await prepareResponse.json();

        if (!prepareResponse.ok || !prepareData.success) {
          let errorMessage = "Aucun compte trouvé pour cet email";
          if (prepareData.error) {
            errorMessage = prepareData.error;
          }
          toast.error("Erreur", {
            description: errorMessage,
          });
          return;
        }
      } catch (prepareError: any) {
        console.error("Erreur lors de la préparation de la connexion:", prepareError);
        toast.error("Erreur", {
          description: "Erreur lors de la préparation. Veuillez réessayer",
        });
        return;
      }

      // ÉTAPE 2: Demander l'OTP via l'API Better Auth
      // Maintenant que le User existe, Better Auth acceptera la demande
      const { data: result, error } = await authClient.emailOtp.sendVerificationOtp({
        email: emailNormalized,
        type: "sign-in",
      });

      if (error) {
        toast.error("Erreur", {
          description: error.message || "Impossible d'envoyer le code OTP",
        });
        return;
      }

      setEmail(emailNormalized);
      setStep("otp");
      toast.success("Code OTP envoyé par email", {
        description: "Vérifiez votre boîte de réception",
      });
    } catch (error: any) {
      console.error("Erreur lors de l'envoi de l'OTP:", error);
      
      let errorMessage = "Impossible d'envoyer le code OTP";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "NETWORK_ERROR") {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet";
      }

      toast.error("Erreur", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Se connecter avec OTP - Utiliser l'API Better Auth comme pour les notaires
  const onOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
      // Utiliser l'API Better Auth pour vérifier l'OTP et créer la session
      const { data: result, error } = await authClient.signIn.emailOtp({
        email: email,
        otp: data.code,
      });

      if (error) {
        // Gestion spécifique des erreurs better-auth
        let errorMessage = "Code invalide ou expiré";
        
        if (error.code === "INVALID_OTP") {
          errorMessage = "Le code OTP est incorrect";
        } else if (error.code === "EXPIRED_OTP") {
          errorMessage = "Le code OTP a expiré. Veuillez en demander un nouveau";
        } else if (error.code === "TOO_MANY_ATTEMPTS") {
          errorMessage = "Trop de tentatives échouées. Veuillez demander un nouveau code";
        } else if (error.code === "USER_NOT_FOUND") {
          errorMessage = "Aucun compte trouvé pour cet email";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error("Erreur de connexion", {
          description: errorMessage,
        });
        return;
      }

      toast.success("Connexion réussie", {
        description: "Redirection en cours...",
      });
      
      // Attendre un peu pour que le cookie soit défini
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Utiliser router.push + refresh comme pour les notaires
      router.push("/client");
      router.refresh();
    } catch (error: any) {
      console.error("Erreur lors de la connexion:", error);
      
      let errorMessage = "Erreur lors de la connexion";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.code === "NETWORK_ERROR") {
        errorMessage = "Erreur de connexion. Vérifiez votre connexion internet";
      }

      toast.error("Erreur", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Section gauche avec image et branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        {/* Motifs décoratifs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white">
          <div className="mb-8">
            <Image
              src="/logoSans.png"
              alt="BailNotarie"
              width={120}
              height={120}
              className="rounded-full bg-white/10 p-4"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-center">Bienvenue sur votre espace client</h1>
          <p className="text-xl text-blue-100 text-center max-w-md">
            Accédez à vos baux, gérez vos biens et communiquez avec votre notaire en toute simplicité.
          </p>
        </div>
      </div>

      {/* Section droite avec formulaire */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-6 w-6 text-blue-600" />
                  <CardTitle className="text-2xl">Espace Client</CardTitle>
                </div>
                {step === "otp" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour
                  </Button>
                )}
              </div>
              <CardDescription>
                {step === "email"
                  ? "Connectez-vous avec votre email pour accéder à votre espace"
                  : `Entrez le code à 6 chiffres envoyé à ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === "email" ? (
                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="votre@email.com"
                        className="pl-10"
                        {...registerEmail("email")}
                        disabled={isLoading}
                      />
                    </div>
                    {emailErrors.email && (
                      <p className="text-sm text-destructive">{emailErrors.email.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Recevoir le code de connexion
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmitOTP(onOTPSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Code de vérification</Label>
                    <Controller
                      name="code"
                      control={controlOTP}
                      render={({ field }) => (
                        <InputOTP maxLength={6} {...field} disabled={isLoading}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      )}
                    />
                    {otpErrors.code && (
                      <p className="text-sm text-destructive">{otpErrors.code.message}</p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 h-4 w-4" />
                        Se connecter
                      </>
                    )}
                  </Button>

                  <div className="text-center text-sm text-muted-foreground">
                    <p>Vous n'avez pas reçu le code ?</p>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => {
                        setStep("email");
                        handleSubmitEmail(onEmailSubmit)();
                      }}
                      disabled={isLoading}
                    >
                      Renvoyer le code
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

