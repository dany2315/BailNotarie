"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PhoneButton } from "@/components/ui/phone-button";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";

const formSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
});

type FormData = z.infer<typeof formSchema>;

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    
    // Simulation d'envoi
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log("Form data:", data);
    setIsSubmitted(true);
    setIsLoading(false);
    reset();
    
    // Reset après 5 secondes
    setTimeout(() => setIsSubmitted(false), 5000);
  };

  if (isSubmitted) {
    return (
      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">
          Demande envoyée avec succès !
        </h3>
        <p className="text-gray-600 mb-6">
          Nous avons bien reçu votre demande. Notre équipe vous contactera dans les plus brefs délais 
          pour discuter de votre projet de bail notarié.
        </p>
        <p className="text-sm text-gray-500">
          Vous recevrez également un email de confirmation à l'adresse indiquée.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-12 w-full  ">
      {/* Formulaire */}
      <Card className="p-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-6">
          Demander un devis gratuit
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                className="mt-1"
                placeholder="Votre prénom"
              />
              {errors.firstName && (
                <p className="text-red-600 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                className="mt-1"
                placeholder="Votre nom"
              />
              {errors.lastName && (
                <p className="text-red-600 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className="mt-1"
              placeholder="votre@email.com"
            />
            {errors.email && (
              <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Téléphone *</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              className="mt-1"
              placeholder="01 23 45 67 89"
            />
            {errors.phone && (
              <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              {...register("message")}
              className="mt-1"
              rows={4}
              placeholder="Décrivez votre projet (type de bail, nombre de locataires, etc.)"
            />
            {errors.message && (
              <p className="text-red-600 text-sm mt-1">{errors.message.message}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            {isLoading ? (
              "Envoi en cours..."
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer ma demande
              </>
            )}
          </Button>

          <p className="text-xs text-gray-500 text-center">
            En soumettant ce formulaire, vous acceptez d'être contacté par notre équipe 
            concernant votre demande de bail notarié.
          </p>
        </form>
      </Card>

      {/* Informations de contact */}
      <div className="space-y-8">
        <Card className="p-8 h-auto ">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">
            Contactez-nous directement
          </h3>
          <div className=" h-full flex flex-col space-y-6 justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Phone className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Téléphone</p>
                <p className="text-gray-600">01 23 45 67 89</p>
                <p className="text-sm text-gray-500">Lun-Ven 9h-18h</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-gray-600">contact@bailnotarie.fr</p>
                <p className="text-sm text-gray-500">Réponse sous 24h</p>
              </div>
            </div>

          </div>

          <div className="mt-8 pt-6 border-t">
            <PhoneButton 
              phoneNumber="01 23 45 67 89" 
              className="w-full text-lg py-3"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}