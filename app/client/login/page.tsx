"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpCodeInput } from "@/components/ui/otp-code-input";
import { ArrowLeft, ArrowRight, LayoutDashboard, Lock, Mail, RefreshCw, ShieldCheck, Timer } from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { SectionLabel, AuroraBackdrop, NoiseOverlay } from "@/components/lp/ui/lp-primitives";
import { StartCard, StartSubmit } from "@/components/start/start-card";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
});

const otpSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

export default function ClientLoginPage() {
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
            
            // Si c'est un client, rediriger vers son dashboard approprié
            if (role === "UTILISATEUR") {
              if (profilType === "PROPRIETAIRE") {
                router.push("/client/proprietaire");
              } else if (profilType === "LOCATAIRE") {
                router.push("/client/locataire");
              } else {
                router.push("/client");
              }
            } else if (role === "NOTAIRE") {
              router.push("/notaire");
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
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Récupérer le profilType pour rediriger directement vers la bonne page
      try {
        const userResponse = await fetch("/api/user/current");
        const userData = await userResponse.json();
        
        if (userData.isAuthenticated && userData.user?.profilType) {
          const profilType = userData.user.profilType;
          if (profilType === "PROPRIETAIRE") {
            window.location.href = "/client/proprietaire";
            return;
          } else if (profilType === "LOCATAIRE") {
            window.location.href = "/client/locataire";
            return;
          }
        }
      } catch (error) {
        console.error("Erreur lors de la récupération du profilType:", error);
      }
      
      // Fallback : rediriger vers /client qui fera la redirection serveur
      window.location.href = "/client";
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
    return <LoadingScreen message="Chargement..." variant="inline" />;
  }

  if (session) {
    return null; // Retourner null pendant la redirection
  }

  const otp = step === "otp";

  return (
    /* Même scène que l'accueil et que « Commencer » : une colonne centrée, le
       fond dégradé, la grille et les halos, et rien d'autre que ce qu'il faut
       pour entrer. La barre flotte dessus, la scène dégage sa hauteur. */
    <main className="lp-scene relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-gradient-to-b from-white via-[#f7f9ff] to-[#eef3ff] px-5 pb-16 pt-[calc(var(--lp-nav-h,76px)+2rem)] sm:pb-20 sm:pt-[calc(var(--lp-nav-h,76px)+3rem)]">
      <div aria-hidden className="lp-mesh absolute inset-0" />
      <div aria-hidden className="lp-grid absolute inset-0" />
      <AuroraBackdrop />
      <NoiseOverlay />

      <div className="relative z-10 w-full max-w-[30rem]">
        <div className="lp-enter-up text-center">
          <SectionLabel icon={otp ? ShieldCheck : LayoutDashboard}>
            {otp ? "Vérification" : "Espace client"}
          </SectionLabel>
          <h1 className="lp-title lp-balance mt-5 text-[2rem] font-bold leading-[1.1] text-slate-900 sm:text-[2.6rem]">
            {otp ? (
              <>
                Un code vient de <span className="lp-gradient-text">partir</span>
              </>
            ) : (
              <>
                Content de vous <span className="lp-gradient-text">revoir</span>
              </>
            )}
          </h1>
        </div>

        <div className="mt-7 sm:mt-8">
          {!otp ? (
            <StartCard current={1} total={2}>
              <form noValidate onSubmit={handleSubmitEmail(onEmailSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[14px] font-semibold text-slate-800">
                    Votre adresse e-mail
                  </Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 z-10 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="vous@exemple.fr"
                      className="h-14 rounded-2xl border-slate-200 bg-white pl-12 text-[16px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow placeholder:text-slate-400 focus-visible:border-[#4373f5] focus-visible:ring-4 focus-visible:ring-[#4373f5]/15"
                      {...registerEmail("email")}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  {emailErrors.email && (
                    <p className="text-[13px] font-medium text-red-600">{emailErrors.email.message}</p>
                  )}
                  <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    Un code vous sera envoyé. Aucun mot de passe à créer.
                  </p>
                </div>

                <StartSubmit loading={isLoading} loadingLabel="Envoi du code…">
                  Recevoir mon code
                  <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover/cta:translate-x-1" />
                </StartSubmit>
              </form>
            </StartCard>
          ) : (
            <StartCard
              current={2}
              total={2}
              title="Entrez votre code de connexion"
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
              <form onSubmit={handleSubmitOTP(onOTPSubmit)} className="space-y-5">
                <Controller
                  name="code"
                  control={controlOTP}
                  render={({ field }) => (
                    <OtpCodeInput
                      id="client-login-otp-code"
                      label=""
                      value={field.value || ""}
                      onChange={field.onChange}
                      disabled={isLoading}
                      autoFocus
                      error={otpErrors.code?.message}
                    />
                  )}
                />

                <div className="flex items-center justify-center gap-1.5 text-[13px] text-slate-500">
                  <Timer className="h-4 w-4 text-slate-400" />
                  Valide pendant 10 minutes
                </div>

                <StartSubmit loading={isLoading} loadingLabel="Connexion…">
                  <Lock className="h-[18px] w-[18px]" />
                  Se connecter
                </StartSubmit>

                <div className="flex flex-col items-stretch gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setEmail("");
                    }}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13.5px] font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Changer d&apos;e-mail
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      handleSubmitEmail(onEmailSubmit)();
                    }}
                    disabled={isLoading}
                    className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-[13.5px] font-semibold text-[#3563e9] transition-colors hover:bg-[#4373f5]/[0.07] disabled:text-slate-400 disabled:hover:bg-transparent"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Renvoyer le code
                  </button>
                </div>
              </form>
            </StartCard>
          )}
        </div>
      </div>
    </main>
  );
}
