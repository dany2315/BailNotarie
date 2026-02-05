"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Mail, Scale, Shield, Lock, ArrowLeft } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import Image from "next/image";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function NotaireLoginPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Rediriger vers le dashboard approprié si l'utilisateur est déjà connecté
  useEffect(() => {
    async function checkAndRedirect() {
      if (isPending) {
        return;
      }

      if (session?.user) {
        try {
          // Récupérer les informations de l'utilisateur pour déterminer où le rediriger
          const userResponse = await fetch("/api/user/current");
          const userData = await userResponse.json();
          
          if (userData.isAuthenticated && userData.user) {
            const { role, profilType } = userData.user;
            
            // Rediriger selon le role
            if (role === "NOTAIRE") {
              router.push("/notaire");
            } else if (role === "UTILISATEUR") {
              if (profilType === "PROPRIETAIRE") {
                router.push("/client/proprietaire");
              } else if (profilType === "LOCATAIRE") {
                router.push("/client/locataire");
              } else {
                router.push("/client");
              }
            } else if (role === "ADMINISTRATEUR") {
              router.push("/interface");
            }
          }
        } catch (error) {
          console.error("Erreur lors de la vérification de l'utilisateur:", error);
        }
      } else {
        setIsCheckingAuth(false);
      }
    }

    checkAndRedirect();
  }, [session, isPending, router]);

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

  if (isPending || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Chargement...</p>
        </div>
      </div>
    );
  }

  if (session) {
    return null; // Retourner null pendant la redirection
  }

  return (
    <div className="min-h-screen flex">
      {/* Section gauche avec image et branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 overflow-hidden">
        {/* Motifs décoratifs */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        {/* Contenu */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white " >
          <div className=" animate-fade-in self-start ">
            <div className="bg-white backdrop-blur-md rounded-2xl p-6 mb-6 shadow-2xl border border-white/20">
              <Image
                src="/logoLarge.png"
                alt="BailNotarie"
                width={200}
                height={200}
                className="w-auto h-24 object-contain"
              />
            </div>
          </div>
          
          <div className="max-w-md space-y-6 animate-slide-in-left">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
                <Scale className="h-8 w-8" />
              </div>
              <h1 className="text-4xl font-bold">Espace Notaire</h1>
            </div>
            
            <p className="text-xl text-blue-100 leading-relaxed mb-50">
              Accédez à votre espace sécurisé pour gérer vos dossiers de baux notariés en toute simplicité.
            </p>
            
            <div className="space-y-4 mt-8">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mt-1">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Sécurité renforcée</h3>
                  <p className="text-sm text-blue-100">Authentification à deux facteurs pour protéger vos données</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg mt-1">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Connexion sécurisée</h3>
                  <p className="text-sm text-blue-100">Code OTP envoyé par email pour une connexion sécurisée</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite avec formulaire */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 md:p-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 min-h-screen lg:min-h-0 relative overflow-hidden">
        {/* Fond décoratif pour mobile */}
        <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
          {/* Gradient animé */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 via-indigo-600/5 to-purple-600/10"></div>
          
          {/* Formes géométriques décoratives */}
          <div className="absolute top-10 right-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="absolute bottom-20 left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          
          {/* Motifs de grille subtils */}
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:20px_20px]"></div>
        </div>

        <div className="w-full max-w-md relative z-10">
          {/* Logo mobile avec fond amélioré */}
          <div className="lg:hidden mb-6 sm:mb-8 flex flex-col items-center space-y-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl border border-white/50 relative overflow-hidden">
              {/* Effet de brillance */}
              
              <Image
                src="/logoLarge.png"
                alt="BailNotarie"
                width={150}
                height={150}
                className="w-auto h-14 sm:h-16 md:h-18 object-contain relative z-10"
              />
            </div>
          </div>

          <Card className="border-0 shadow-xl sm:shadow-2xl bg-white/90 sm:bg-white/80 backdrop-blur-sm">
            <CardHeader className="space-y-2 sm:space-y-3 pb-4 sm:pb-6 px-4 sm:px-6 pt-4 sm:pt-6">
              {step === "otp" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-fit -ml-2 mb-1 sm:mb-2 text-sm"
                  onClick={() => {
                    setStep("email");
                    setEmail("");
                  }}
                  disabled={isLoading}
                >
                  <ArrowLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  Retour
                </Button>
              )}
              <CardTitle className="text-2xl sm:text-3xl font-bold text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {step === "email" ? "Connexion à votre Espace Notaire" : "Code de vérification"}
              </CardTitle>
              <CardDescription className="text-sm text-center text-muted-foreground">
                Connexion sécurisée à votre espace professionnel
              </CardDescription>
              <CardDescription className="text-center text-sm sm:text-base px-2">
                {step === "email"
                  ? "Entrez votre adresse email professionnelle pour recevoir un code de connexion sécurisé"
                  : `Nous avons envoyé un code à 6 chiffres à l'adresse ${email}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6 pb-4 sm:pb-6">
              {step === "email" ? (
                <form onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm font-semibold">
                      Adresse email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="notaire@example.com"
                        className="pl-9 sm:pl-10 h-11 sm:h-12 text-base sm:text-base border-2 focus:border-primary transition-colors"
                        {...registerEmail("email")}
                      />
                    </div>
                    {emailErrors.email && (
                      <p className="text-xs sm:text-sm text-destructive mt-1">{emailErrors.email.message}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                        <span className="hidden sm:inline">Envoi en cours...</span>
                        <span className="sm:hidden">Envoi...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Recevoir le code OTP</span>
                        <span className="sm:hidden">Recevoir le code</span>
                        <Mail className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleSubmitOTP(onOTPSubmit)} className="space-y-4 sm:space-y-6">
                  <div className="space-y-3 sm:space-y-4 flex flex-col items-center justify-center">
                    <Label htmlFor="code" className="text-xs sm:text-sm font-semibold text-center">
                      Code de vérification
                    </Label>
                    <Controller
                      name="code"
                      control={controlOTP}
                      render={({ field }) => (
                        <div className="space-y-2 w-full">
                          <InputOTP
                            maxLength={6}
                            value={field.value}
                            onChange={field.onChange}
                            aria-invalid={otpErrors.code ? "true" : "false"}
                            className="justify-center w-full"
                          >
                            <InputOTPGroup className="gap-2 sm:gap-3">
                              <InputOTPSlot index={0} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                              <InputOTPSlot index={1} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                              <InputOTPSlot index={2} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                              <InputOTPSlot index={3} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                              <InputOTPSlot index={4} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                              <InputOTPSlot index={5} className="h-12 w-12 sm:h-14 sm:w-14 text-base sm:text-lg font-semibold border-2" />
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                      )}
                    />
                    {otpErrors.code && (
                      <p className="text-xs sm:text-sm text-destructive text-center px-2">{otpErrors.code.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <Button 
                      type="submit" 
                      className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                          Connexion...
                        </>
                      ) : (
                        "Se connecter"
                      )}
                    </Button>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 sm:h-11 border-2 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
                        onClick={async () => {
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
                        <span className="hidden sm:inline">Renvoyer le code</span>
                        <span className="sm:hidden">Renvoyer</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-10 sm:h-11 border-2 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
                        onClick={() => {
                          setStep("email");
                          setEmail("");
                        }}
                        disabled={isLoading}
                      >
                        <span className="hidden sm:inline">Changer d'email</span>
                        <span className="sm:hidden">Changer</span>
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
          
          {/* Footer */}
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6 px-2">
            © 2025 BailNotarie. Tous droits réservés.
          </p>
        </div>
      </div>
    </div>
  );
}


