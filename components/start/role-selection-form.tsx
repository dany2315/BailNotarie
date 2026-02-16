"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, User2, ArrowRight, Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { LoadingScreen } from "@/components/ui/loading-screen";

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
    <div className="w-full max-w-4xl mx-auto animate-fade-in">
      <Card className="border-0 shadow-xl sm:shadow-2xl bg-white/95 backdrop-blur-sm overflow-hidden pt-0">
        {/* Header avec logo et titre */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10 text-center space-y-10 ">
            <CardTitle className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-5 sm:mb-2 px-2">
              Commencez votre démarche
            </CardTitle>
            <CardDescription className="text-sm sm:text-base md:text-lg text-blue-100 px-2">
              Choisissez votre profil pour créer votre bail notarié en quelques minutes
            </CardDescription>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 md:p-8 lg:p-12">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 sm:space-y-6 md:space-y-8">
            <div className="space-y-4 sm:space-y-6">
              <div className="text-center mb-3 sm:mb-4 md:mb-6">
                <Label className="text-lg sm:text-xl font-bold text-foreground">
                  Vous êtes :
                </Label>
              </div>
              <Controller
                name="role"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-6"
                  >
                    <Label
                      htmlFor="proprietaire"
                      className={`group relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                        field.value === "PROPRIETAIRE"
                          ? "border-primary bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-[1.02] sm:scale-105"
                          : "border-border hover:border-primary/50 hover:shadow-md bg-white active:scale-[0.98]"
                      }`}
                    >
                      {/* Effet de brillance au survol */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"></div>
                      
                      <RadioGroupItem
                        value="PROPRIETAIRE"
                        id="proprietaire"
                        className="hidden"
                      />
                      
                      <div className={`relative z-10 flex flex-col items-center space-y-2 sm:space-y-3 md:space-y-4 ${
                        field.value === "PROPRIETAIRE" ? "animate-fade-in" : ""
                      }`}>
                        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 ${
                          field.value === "PROPRIETAIRE"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg"
                            : "bg-blue-100 text-blue-600 group-hover:bg-blue-200"
                        }`}>
                          <Building2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14" />
                        </div>
                        
                        <div className="text-center space-y-1 sm:space-y-2">
                          <span className="text-lg sm:text-xl md:text-2xl font-bold block">
                            Propriétaire
                          </span>
                          <span className="text-xs sm:text-sm md:text-base text-muted-foreground block px-2">
                            Je souhaite louer mon bien
                          </span>
                        </div>
                        
                        {field.value === "PROPRIETAIRE" && (
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 animate-fade-in">
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </Label>

                    <Label
                      htmlFor="locataire"
                      className={`group relative flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
                        field.value === "LOCATAIRE"
                          ? "border-primary bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg scale-[1.02] sm:scale-105"
                          : "border-border hover:border-primary/50 hover:shadow-md bg-white active:scale-[0.98]"
                      }`}
                    >
                      {/* Effet de brillance au survol */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full"></div>
                      
                      <RadioGroupItem
                        value="LOCATAIRE"
                        id="locataire"
                        className="hidden"
                      />
                      
                      <div className={`relative z-10 flex flex-col items-center space-y-2 sm:space-y-3 md:space-y-4 ${
                        field.value === "LOCATAIRE" ? "animate-fade-in" : ""
                      }`}>
                        <div className={`p-3 sm:p-4 rounded-lg sm:rounded-xl transition-all duration-300 ${
                          field.value === "LOCATAIRE"
                            ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg"
                            : "bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200"
                        }`}>
                          <User2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 lg:h-14 lg:w-14" />
                        </div>
                        
                        <div className="text-center space-y-1 sm:space-y-2">
                          <span className="text-lg sm:text-xl md:text-2xl font-bold block">
                            Locataire
                          </span>
                          <span className="text-xs sm:text-sm md:text-base text-muted-foreground block px-2">
                            Je souhaite louer un bien
                          </span>
                        </div>
                        
                        {field.value === "LOCATAIRE" && (
                          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 animate-fade-in">
                            <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                        )}
                      </div>
                    </Label>
                  </RadioGroup>
                )}
              />
              {form.formState.errors.role && (
                <p className="text-xs sm:text-sm text-destructive text-center px-2">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 sm:h-14 text-sm sm:text-base md:text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedRole || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


