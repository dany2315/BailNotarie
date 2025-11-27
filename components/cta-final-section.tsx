"use client";

import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { Card, CardContent } from "@/components/ui/card";

export function CTAFinalSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const guarantees = [
    "100% en ligne et gratuit",
    "Transmission automatique au notaire",
    "Bail notarié en 48h",
    "Signature digitale sécurisée"
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative overflow-hidden">
      {/* Éléments décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <Card className="border-0 bg-white/95 backdrop-blur-sm shadow-2xl">
          <CardContent className="p-8 md:p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Prêt à constituer votre dossier{" "}
              <span className="text-blue-600">gratuitement</span> ?
            </h2>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Commencez dès maintenant. Votre dossier sera transmis automatiquement 
              au notaire partenaire pour une signature en ligne. Bail notarié en 48h.
            </p>

            {/* Garanties */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8 text-left">
              {guarantees.map((guarantee, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-medium">{guarantee}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={scrollToContact}
                className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-6 h-auto"
              >
                Constituer mon dossier gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <PhoneButton
                phoneNumber="07 49 38 77 56"
                size="lg"
                className="text-lg px-8 py-6 h-auto border-2"
              />
            </div>

            <p className="text-sm text-gray-500 mt-6">
              Sans engagement • Réponse sous 24h • 100% sécurisé
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}




