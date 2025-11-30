"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User2, ArrowRight, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

const roleSelectionSchema = z.object({
  role: z.enum(["PROPRIETAIRE", "LOCATAIRE"]),
});

type RoleSelectionFormData = z.infer<typeof roleSelectionSchema>;

interface RoleSelectionFormProps {
  onOwnerSelected?: () => void;
  onTenantSelected?: () => void;
}

export function RoleSelectionForm({ onOwnerSelected, onTenantSelected }: RoleSelectionFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RoleSelectionFormData>({
    resolver: zodResolver(roleSelectionSchema),
    defaultValues: {
      role: undefined,
    },
  });

  const selectedRole = form.watch("role");

  const handleSubmit = async (data: RoleSelectionFormData) => {
    if (data.role === "PROPRIETAIRE") {
      onOwnerSelected?.();
      // Ne pas créer directement, on va afficher le formulaire pour l'email
    } else {
      onTenantSelected?.();
      // Ne pas rediriger ici, on va afficher le formulaire pour l'email du propriétaire
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl md:text-3xl font-bold">
          Commencez votre démarche
        </CardTitle>
        <CardDescription className="text-base md:text-lg">
          Choisissez votre profil pour continuer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <div className="space-y-4">
            <Label className="text-base font-semibold">Vous êtes :</Label>
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-2 gap-4"
                >
                  <Label
                    htmlFor="proprietaire"
                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      field.value === "PROPRIETAIRE"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem
                      value="PROPRIETAIRE"
                      id="proprietaire"
                      className="hidden"
                    />
                    <Building2 className="h-8 w-8 sm:h-12 sm:w-12 mb-3 text-primary" />
                    <span className="text-md sm:text-lg font-semibold">Propriétaire</span>
                    <span className="text-sm text-muted-foreground text-center mt-2">
                      Je souhaite louer mon bien
                    </span>
                  </Label>

                  <Label
                    htmlFor="locataire"
                    className={`flex flex-col items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all ${
                      field.value === "LOCATAIRE"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem
                      value="LOCATAIRE"
                      id="locataire"
                      className="hidden"
                    />
                    <User2 className="h-8 w-8 sm:h-12 sm:w-12 mb-3 text-primary" />
                    <span className="text-md sm:text-lg font-semibold">Locataire</span>
                    <span className="text-sm text-muted-foreground text-center mt-2">
                      Je souhaite louer un bien
                    </span>
                  </Label>
                </RadioGroup>
              )}
            />
            {form.formState.errors.role && (
              <p className="text-sm text-destructive">
                {form.formState.errors.role.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!selectedRole || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Chargement...
              </>
            ) : (
              <>
                Continuer
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Import Controller
import { Controller } from "react-hook-form";

