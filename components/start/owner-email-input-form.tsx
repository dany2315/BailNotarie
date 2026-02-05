"use client";

import { useState, startTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { startAsOwner } from "@/lib/actions/start";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlreadyClientState } from "@/components/start/already-client-state";

const ownerEmailSchema = z.object({
  email: z.string().email("Email invalide"),
});

type OwnerEmailInputFormData = z.infer<typeof ownerEmailSchema>;

interface OwnerEmailInputFormProps {
  onBack?: () => void;
}

export function OwnerEmailInputForm({ onBack }: OwnerEmailInputFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
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
      const result = await startAsOwner({
        role: "PROPRIETAIRE",
        email: data.email,
      });
      if (result && result.success) {
        // Garder le loader actif pendant la redirection
        setIsRedirecting(true);
        startTransition(() => {
          router.push(`/commencer/proprietaire/${result.token}`);
        });
        // Ne pas mettre isLoading à false ici, laisser le loader actif
      } else if (result && (result.alreadyExists || result.alreadySubmitted || result.isTenant)) {
        setIsLoading(false);
        setErrorState({
          message: result.message || "Vous êtes déjà client. Contactez-nous pour plus d'informations.",
          redirectTo: result.redirectTo,
          redirectLabel: result.redirectLabel || "Voir le statut de ma demande",
        });
      } else {
        setIsLoading(false);
      }
    } catch (error: any) {
      setIsLoading(false);
      setIsRedirecting(false);
      toast.error(error.message || "Une erreur s'est produite");
    }
  };

  if (errorState) {
    return (
      <AlreadyClientState
        message={errorState.message}
        redirectTo={errorState.redirectTo}
        redirectLabel={errorState.redirectLabel || "Voir le statut de ma demande"}
        onBack={onBack}
      />
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl font-bold">
          Votre email
        </CardTitle>
        <CardDescription className="text-base md:text-lg">
          Entrez votre adresse email pour continuer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base font-semibold">
              Email *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                className="pl-10"
                {...form.register("email")}
                disabled={isLoading || isRedirecting}
              />
            </div>
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Si vous avez déjà commencé un formulaire avec cet email, vous serez redirigé vers celui-ci.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="w-full sm:w-auto"
                disabled={isLoading || isRedirecting}
              >
                Retour
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full sm:flex-1"
              disabled={isLoading || isRedirecting}
            >
              {(isLoading || isRedirecting) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRedirecting ? "Redirection en cours..." : "Chargement..."}
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

