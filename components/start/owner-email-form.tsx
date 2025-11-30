"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { startAsTenant } from "@/lib/actions/start";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AlreadyClientState } from "@/components/start/already-client-state";

const ownerEmailSchema = z.object({
  ownerEmail: z.string().email("Email invalide"),
});

type OwnerEmailFormData = z.infer<typeof ownerEmailSchema>;

interface OwnerEmailFormProps {
  onSuccess?: (tenantToken: string) => void;
  onBack?: () => void;
}

export function OwnerEmailForm({ onSuccess, onBack }: OwnerEmailFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<{
    message: string;
    redirectTo?: string;
    redirectLabel?: string;
  } | null>(null);

  const form = useForm<OwnerEmailFormData>({
    resolver: zodResolver(ownerEmailSchema),
    defaultValues: {
      ownerEmail: "",
    },
  });

  const handleSubmit = async (data: OwnerEmailFormData) => {
    setIsLoading(true);
    setErrorState(null);
    try {
      const result = await startAsTenant({
        role: "LOCATAIRE",
        ownerEmail: data.ownerEmail,
      });
      if (result.success) {
        if (result.tenantToken) {
          toast.success("Un email a été envoyé au propriétaire avec le formulaire");
          onSuccess?.(result.tenantToken);
        }
      } else if (result.alreadyExists || result.isTenant) {
        setErrorState({
          message: result.message || "Le propriétaire a déjà fait sa demande. Votre demande de bail notarié est en cours de traitement.",
          redirectTo: result.redirectTo,
        });
      }
    } catch (error: any) {
      toast.error(error.message || "Une erreur s'est produite");
    } finally {
      setIsLoading(false);
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
          Informations du propriétaire
        </CardTitle>
        <CardDescription className="text-base md:text-lg">
          Nous allons envoyer un email au propriétaire pour qu'il complète son formulaire
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="ownerEmail" className="text-base font-semibold">
              Email du propriétaire *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                id="ownerEmail"
                type="email"
                placeholder="proprietaire@example.com"
                className="pl-10"
                {...form.register("ownerEmail")}
                disabled={isLoading}
              />
            </div>
            {form.formState.errors.ownerEmail && (
              <p className="text-sm text-destructive">
                {form.formState.errors.ownerEmail.message}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Le propriétaire recevra un email avec un lien pour compléter son formulaire
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {onBack && (
              <Button
                type="button"
                variant="outline"
                onClick={onBack}
                className="w-full sm:w-auto"
                disabled={isLoading}
              >
                Retour
              </Button>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full sm:flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  Envoyer l'email au propriétaire
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


