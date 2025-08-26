"use client";

import { Badge } from "@/components/ui/badge";
import { Phone, ArrowRight, CheckCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CountingNumber } from "./animate-ui/text/counting-number";


export function PresentationSection() {
  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob pointer-events-none"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000 pointer-events-none"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center ">
      <Badge className=" mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-6 py-2 text-sm font-semibold">
            Notre mission
          </Badge>
        <div className="grid lg:grid-cols-2 gap-16 items-center pb-10 ">
          {/* Contenu texte */}

          <div className="space-y-8 ">
          <div className="text-center mb-16">
            
              <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
                Simplifier votre bail notarié
              </h2>
              <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
                Transformez la complexité administrative en une expérience fluide et sécurisée. 
                Notre expertise vous garantit un bail authentique avec la force exécutoire immédiate.
              </p>
            </div>

            {/* Liste des avantages */}
            <div className="space-y-4">
              {[
                "Préparation complète de votre dossier",
                "Coordination directe avec le notaire",
                "Sécurité juridique maximale garantie",
                "Accompagnement personnalisé"
              ].map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-4 pt-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="w-10 h-10 bg-blue-100 rounded-full border-2 border-white flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{i}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Processus en 4 étapes</p>
                <p className="text-sm text-gray-600">Simple et transparent</p>
              </div>
            </div>
          </div>

          {/* Image avec overlay d'informations */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Signature de contrat notarié"
                width={600}
                height={400}
                className="object-cover w-full h-[400px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Overlay avec statistiques */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        <CountingNumber
                          number={2000}
                          transition={{ stiffness: 90, damping: 50 }}
                          inViewOnce={true}
                        />
                        +
                      </div>
                      <div className="text-sm text-gray-600">Clients</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        <CountingNumber
                          number={48} 
                          transition={{ stiffness: 90, damping: 50 }}
                          inViewOnce={true}
                        />
                        h
                      </div>
                      <div className="text-sm text-gray-600">Délai moyen</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        <CountingNumber
                          number={98}
                          transition={{ stiffness: 90, damping: 50 }}
                          inViewOnce={true}
                        />
                        %
                      </div>
                      <div className="text-sm text-gray-600">Satisfaction</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Éléments décoratifs */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-20"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-green-100 rounded-full opacity-20"></div>
          </div>
        </div>


      {/* Call to Action */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-16">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Prêt à simplifier votre bail notarié ?
          </h3>
          <p className="text-gray-600 mb-6">
            Contactez nos experts pour un accompagnement personnalisé
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.location.href = 'tel:0123456789'}
          >
            <Phone className="size-4" />
            <span>Appeler maintenant</span>
          </Button>
            <Button 
              variant="outline"
              className="border-blue-200 hover:bg-blue-50"
              onClick={() => {
                const contactElement = document.getElementById('contact');
                if (contactElement) {
                  contactElement.scrollIntoView({ behavior: 'smooth' });
                }
              }}

            >
              <span>Demander un devis</span>
            </Button>
          </div>
        </div>
      </div>
          
      </div>
    </section>
  );
}