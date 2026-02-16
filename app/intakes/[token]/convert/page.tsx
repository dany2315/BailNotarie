"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { convertLead, getLeadConversionLink } from "@/lib/actions/leads";
import Image from "next/image";
import { LoadingScreen } from "@/components/ui/loading-screen";

export default function ConvertLeadPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [role, setRole] = useState<"PROPRIETAIRE" | "LOCATAIRE" | null>(null);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        toast.error("Token manquant");
        setIsValidating(false);
        setIsTokenValid(false);
        return;
      }

      try {
        const conversionLink = await getLeadConversionLink(token);
        if (!conversionLink) {
          toast.error("Lien de conversion invalide ou déjà utilisé");
          setIsTokenValid(false);
        } else {
          setIsTokenValid(true);
        }
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de la validation du token");
        setIsTokenValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token manquant");
      return;
    }

    if (!role) {
      toast.error("Veuillez choisir votre profil");
      return;
    }

    if (role === "LOCATAIRE" && !ownerEmail.trim()) {
      toast.error("Veuillez renseigner l'email du propriétaire");
      return;
    }

    setIsLoading(true);
    try {
      const result = await convertLead({
        token,
        role,
        ownerEmail: role === "LOCATAIRE" ? ownerEmail : undefined,
      });

      if (result.success) {
        if (role === "PROPRIETAIRE") {
          toast.success("Profil mis à jour ! Vous allez recevoir un email avec le formulaire propriétaire.");
          // Rediriger vers le formulaire propriétaire
          if (result.intakeLinkToken) {
            router.push(`/intakes/${result.intakeLinkToken}`);
          }
        } else {
          toast.success("Profil mis à jour ! Vous allez recevoir un email avec le formulaire locataire. Le propriétaire recevra également un email.");
          // Rediriger vers le formulaire locataire
          if (result.tenantIntakeLinkToken) {
            router.push(`/intakes/${result.tenantIntakeLinkToken}`);
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la conversion");
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <LoadingScreen 
        message="Chargement..." 
        description="Vérification du lien de conversion"
      />
    );
  }

  if (!token || !isTokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>
              Le lien de conversion est invalide, manquant ou a déjà été utilisé.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Loader overlay pendant la conversion */}
      {isLoading && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-6">
            {/* Logo avec animation pulse */}
            <div className="relative animate-pulse">
              <Image
                src="/logoLarge.png"
                alt="BailNotarie"
                width={200}
                height={60}
                className="h-16 sm:h-20 w-auto opacity-90"
                priority
              />
            </div>
            
            {/* Spinner avec animation */}
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="flex flex-col items-center gap-1">
                <p className="text-sm font-medium text-foreground">
                  Traitement en cours...
                </p>
                <p className="text-xs text-muted-foreground text-center max-w-xs px-4">
                  Veuillez patienter pendant la mise à jour de votre profil
                </p>
              </div>
            </div>
            
            {/* Animation de points de chargement */}
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logoSans.png"
              alt="BailNotarie"
              width={120}
              height={120}
              className="rounded-full"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Choisissez votre profil</CardTitle>
              <CardDescription>
                Pour commencer, nous avons besoin de savoir si vous êtes propriétaire ou locataire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Je suis :</Label>
                  <RadioGroup
                    value={role || ""}
                    onValueChange={(value) => setRole(value as "PROPRIETAIRE" | "LOCATAIRE")}
                    className="space-y-3"
                    disabled={isLoading}
                  >
                      <Label
                        htmlFor="proprietaire"
                        className="flex-1 font-normal flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer "
                      >
                        <RadioGroupItem value="PROPRIETAIRE" id="proprietaire" />
                        <div>
                          <div className="font-semibold">Propriétaire</div>
                          <div className="text-sm text-muted-foreground">
                            Je souhaite mettre un bien en location
                          </div>
                        </div>
                      </Label>                      
                      <Label
                        htmlFor="locataire"
                        className="flex-1 font-normal flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent cursor-pointer"
                      >
                        <RadioGroupItem value="LOCATAIRE" id="locataire" />
                        <div>
                          <div className="font-semibold">Locataire</div>
                          <div className="text-sm text-muted-foreground">
                            Je souhaite louer un bien
                          </div>
                        </div>
                      </Label>
                  </RadioGroup>
                </div>

                {role === "LOCATAIRE" && (
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">
                      Email du propriétaire *
                    </Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="proprietaire@example.com"
                      disabled={isLoading}
                      required
                      className={isLoading ? "opacity-50" : ""}
                    />
                    <p className="text-sm text-muted-foreground">
                      Le propriétaire recevra également un email avec un formulaire à compléter.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-4 pt-4">
                  <Button
                    type="submit"
                    disabled={isLoading || !role}
                    className="min-w-[120px]"
                  >
                    Continuer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

