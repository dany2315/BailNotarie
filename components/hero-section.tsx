"use client";

import { ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";

export function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenu principal */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Bail notarié
                <span className="text-blue-600"> simple</span> et
                <span className="text-blue-600"> sécurisé</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed">
                Formalisez votre colocation avec un notaire en toute confiance.
                Un acte authentique, incontestable et exécutoire immédiatement.
              </p>
            </div>

            {/* Points clés */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Sécurisé</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Rapide</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">Garanti</span>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4">
              <PhoneButton 
                phoneNumber="01 23 45 67 89" 
                size="lg"
                className="text-lg px-8 py-4"
              />
              <Button 
                variant="outline" 
                size="lg"
                onClick={scrollToContact}
                className="text-lg px-8 py-4 border-2 hover:bg-blue-50"
              >
                Demander un devis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Garantie */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600">
                <span className="font-semibold text-blue-600">Garantie satisfaction :</span> 
                Nous vous accompagnons jusqu'à la signature de votre bail notarié
              </p>
            </div>
          </div>

          {/* Image/Illustration */}
          <div className="relative">
            <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Bail Notarié</h3>
                  <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                    Authentique
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-200 rounded-full">
                    <div className="h-3 bg-blue-600 rounded-full w-full"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full">
                    <div className="h-3 bg-blue-600 rounded-full w-3/4"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full">
                    <div className="h-3 bg-blue-600 rounded-full w-1/2"></div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Validé par notaire</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}