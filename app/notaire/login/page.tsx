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
import { Loader2, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function NotaireLoginPage() {
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

  // Envoyer l'OTP selon la documentation better-auth
  const onEmailSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const emailNormalized = data.email.toLowerCase().trim();
      
      // Vérifier d'abord si l'utilisateur existe et est un notaire
      // avant d'appeler better-auth pour éviter la création d'OTP inutile
      try {
        const checkResponse = await fetch("/api/auth/notaire/check-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: emailNormalized }),
        });

        const checkData = await checkResponse.json();

        if (!checkResponse.ok || !checkData.exists || !checkData.isNotaire) {
          let errorMessage = "Aucun compte trouvé pour cet email";
          if (checkData.exists && !checkData.isNotaire) {
            errorMessage = "Cet email n'est pas associé à un compte notaire";
          }
          toast.error("Erreur", {
            description: errorMessage,
          });
          return;
        }
      } catch (checkError: any) {
        console.error("Erreur lors de la vérification de l'utilisateur:", checkError);
        toast.error("Erreur", {
          description: "Erreur lors de la vérification. Veuillez réessayer",
        });
        return;
      }

      // Si l'utilisateur est valide, envoyer l'OTP via better-auth
      const { data: result, error } = await authClient.emailOtp.sendVerificationOtp({
        email: emailNormalized,
        type: "sign-in",
      });

      if (error) {
        // Gestion spécifique des erreurs better-auth
        let errorMessage = "Impossible d'envoyer le code OTP";
        
        if (error.code === "INVALID_EMAIL") {
          errorMessage = "L'adresse email est invalide";
        } else if (error.code === "RATE_LIMIT_EXCEEDED") {
          errorMessage = "Trop de tentatives. Veuillez patienter quelques instants";
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error("Erreur", {
          description: errorMessage,
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

  // Se connecter avec OTP selon la documentation better-auth
  const onOTPSubmit = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
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
      
      router.push("/notaire");
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Connexion Notaire
          </CardTitle>
          <CardDescription className="text-center">
            {step === "email"
              ? "Entrez votre email pour recevoir un code de connexion"
              : `Entrez le code reçu par email à ${email}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="notaire@example.com"
                    className="pl-10"
                    {...registerEmail("email")}
                  />
                </div>
                {emailErrors.email && (
                  <p className="text-sm text-destructive">{emailErrors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Recevoir le code OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmitOTP(onOTPSubmit)} className="space-y-4">
              <div className="space-y-2 flex flex-col items-center justify-center">
                <Label htmlFor="code">Code OTP</Label>
                <Controller
                  name="code"
                  control={controlOTP}
                  render={({ field }) => (
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      aria-invalid={otpErrors.code ? "true" : "false"}
                    >
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
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Se connecter
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={async () => {
                      // Renvoyer le code OTP
                      setIsLoading(true);
                      try {
                        const { error } = await authClient.emailOtp.sendVerificationOtp({
                          email: email,
                          type: "sign-in",
                        });

                        if (error) {
                          toast.error("Erreur", {
                            description: error.message || "Impossible de renvoyer le code",
                          });
                        } else {
                          toast.success("Code renvoyé", {
                            description: "Vérifiez votre boîte de réception",
                          });
                        }
                      } catch (error: any) {
                        toast.error("Erreur", {
                          description: "Impossible de renvoyer le code",
                        });
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                  >
                    Renvoyer le code
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                    }}
                    disabled={isLoading}
                  >
                    Changer d'email
                  </Button>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


