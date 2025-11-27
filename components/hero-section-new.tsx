"use client";

import { ArrowRight, CheckCircle2, Clock, Shield, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SocialProof } from "./ui/socialProof";

export function HeroSectionNew() {
  const handleStart = () => {
    window.location.href = "/commencer";
  };

  return (
    <section
      className="relative min-h-[90vh] flex items-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden"
      aria-labelledby="hero-bail-notarie-title"
    >
      {/* Décor de fond */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full py-10 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Colonne gauche : contenu principal */}
          <div className="space-y-8 sm:space-y-10">
            {/* Badge contexte */}
            <Badge className="bg-[#4373f5] text-white border-0 px-4 py-1.5 text-sm font-medium">
              <Globe className="w-4 h-4 mr-2" />
             100% en ligne
            </Badge>

            {/* Titre + sous-titre SEO */}
            <header className="space-y-4">
              {/* H1 principal */}
              <h1
                id="hero-bail-notarie-title"
                className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
              >
                Procédure de bail notarié
                <span className="text-[#4373f5]"> 100% en ligne</span>
              </h1>

              {/* Phrase SEO */}
              <p className="text-lg md:text-2xl text-gray-700 leading-relaxed">
                Service dédié aux{" "}
                <strong className="font-semibold text-gray-900">
                 propriétaires
                </strong>{" "}
                pour constituer leur dossier de{" "}
                <strong className="font-semibold text-gray-900">
                  bail notarié d’habitation en France
                </strong>.
              </p>

              {/* Phrase action / UX */}
              <p className="text-lg text-gray-600 leading-relaxed">
                Constitution du dossier{" "}
                <strong className="font-semibold text-gray-900">100% en ligne</strong>,{" "}
                transmission au{" "}
                <strong className="font-semibold text-gray-900">notaire</strong> et{" "}
                <strong className="font-semibold text-gray-900">signature à distance</strong>.
                Simple, rapide et{" "}
                <strong className="font-semibold text-gray-900">
                  force exécutoire
                </strong>.
              </p>
            </header>


            {/* CTA + social proof + garanties */}
            <div className="flex flex-col gap-4 pt-6">
              {/* Social proof au-dessus du CTA */}
              <SocialProof />

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Button
                  size="lg"
                  onClick={handleStart}
                  className="bg-[#4373f5] hover:bg-blue-700 text-white sm:text-lg text-md px-8 py-3 h-auto rounded-xl shadow-md transition-all duration-200"
                >
                  Constituer mon dossier 
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Garanties / arguments rassurants */}
              <div className="flex flex-wrap justify-center sm:justify-start items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#4373f5]" />
                  <span>Bail sécurisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#4373f5]" />
                  <span>Bail notarié en 48h</span>
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

          {/* Colonne droite : process (HowTo) */}
          <div className="relative mt-20 sm:mt-0">
            <Card
              aria-labelledby="processus-bail-notarie"
              className="p-8 bg-white/80 backdrop-blur-sm border-2 border-blue-100 shadow-2xl"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2
                    id="processus-bail-notarie"
                    className="text-2xl font-bold text-gray-900"
                  >
                    Processus simplifié pour votre bail notarié
                  </h2>
                </div>

                {/* Liste ordonnée = plus lisible pour Google */}
                <ol className="space-y-4">
                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#4373f5] font-bold">1</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Constitution du dossier en ligne
                      </h3>
                      <p className="text-sm text-gray-600">
                        Vous remplissez votre dossier de bail d&apos;habitation
                        directement en ligne, en quelques minutes.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 font-bold">2</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Transmission automatique au notaire
                      </h3>
                      <p className="text-sm text-gray-600">
                        BailNotarie.fr transmet votre dossier complet au notaire
                        partenaire pour vérification et préparation de l&apos;acte
                        notarié.
                      </p>
                    </div>
                  </li>

                  <li className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Signature en ligne avec le notaire
                      </h3>
                      <p className="text-sm text-gray-600">
                        Vous signez votre bail notarié en visioconférence avec
                        le notaire.
                      </p>
                    </div>
                  </li>
                </ol>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Délai moyen 
                    </span>
                    <span className="text-2xl font-bold text-[#4373f5]">
                      48h
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Badge flottant de social proof */}
            <div className="absolute -top-4 -right-2 bg-[#4373f5] text-white px-4 py-2 rounded-full shadow-lg text-sm font-semibold">
              +200 dossiers constitués
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
