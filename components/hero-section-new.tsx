"use client";

import { ArrowRight, CheckCircle2, Sparkles, Clock, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FcGoogle } from "react-icons/fc";
import { SocialProof } from "./ui/socialProof";

export function HeroSectionNew() {
  const handleStart = () => {
    window.location.href = '/commencer';
  };


  return (
    <section className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Éléments décoratifs subtils */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-10 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenu principal */}
          <div className="space-y-10 sm:space-y-8">
            {/* Badge */}
            <Badge className="bg-[#4373f5] text-white border-0 px-4 py-1.5 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
              100% En Ligne
            </Badge>

            {/* Titre principal */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Votre bail notarié en{" "}
                <span className="text-[#4373f5]">48h</span>,{" "}
                <span className="text-[#4373f5]">100% en ligne</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 leading-relaxed">
                Constituer votre dossier{" "}
                <span className="font-semibold text-gray-900">en ligne</span>, 
                <span className="font-semibold text-gray-900"> sans engagement</span>, 
                transmission automatique au notaire, signature en ligne par visioconférence avec le notaire. 
                <span className="font-semibold text-gray-900"> Simple</span>,
                <span className="font-semibold text-gray-900"> rapide</span> et
                <span className="font-semibold text-gray-900"> sécurisé</span>.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-col  gap-4 pt-4">

              <SocialProof />

              <Button
                size="lg"
                onClick={handleStart}
                className="bg-[#4373f5] hover:bg-blue-700 text-white sm:text-lg text-md px-8 py-3 h-auto rounded-xl shadow-md transition-all duration-200"
              >
                Constituer mon dossier
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

                          {/* Garanties */}
            <div className="flex flex-wrap justify-center items-center gap-6  text-sm text-gray-600">
              <div className="flex  items-center gap-2">
                <Shield className="w-4 h-4 text-[#4373f5]" />
                <span>Sécurisé</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4373f5]" />
                <span>48h chrono</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-green-600" />
                <span>100% en ligne</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Sans engagement</span>
              </div>
            </div>
             
            </div>


          </div>

          {/* Carte visuelle */}
          <div className="relative mt-20 sm:mt-0">
            <Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-blue-100 shadow-2xl">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-900">Processus simplifié</h3>
                 
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#4373f5] font-bold">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Constitution du dossier en ligne
                      </h4>
                      <p className="text-sm text-gray-600">
                        Remplissez votre dossier 100% en ligne,
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Transmission automatique
                      </h4>
                      <p className="text-sm text-gray-600">
                        Votre dossier est transmis automatiquement au notaire partenaire
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        Signature en ligne avec le notaire
                      </h4>
                      <p className="text-sm text-gray-600">
                        Signature en ligne sécurisée, bail notarié en 48h
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Délai moyen</span>
                    <span className="text-2xl font-bold text-[#4373f5]">48h</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Badge flottant */}
            <div className="absolute -top-4 -right-4 bg-[#4373f5] text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
              +2000 clients
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

