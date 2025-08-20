"use client";

import { ArrowRight, Shield, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import useIsMobile from "@/hooks/useIsMobile";
import Image from "next/image";
  
export function HeroSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const isMobile = useIsMobile();

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 pb-20 pt-10 md:pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse lg:grid lg:grid-cols-2 gap-12 items-center">
          {/* Contenu principal */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Bail notarié
                <span className="text-blue-600"> simple</span> et
                <span className="text-blue-600"> sécurisé</span>
              </h1>
              <p className="text-xl text-gray-600 leading-relaxed text-center">
                Formalisez votre bail avec un notaire en toute confiance.
                Un acte authentique, incontestable et exécutoire immédiatement.
              </p>
            </div>

            {/* Points clés */}
            <div className="flex flex-row justify-center gap-4 sm:gap-20 w-full">
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

            {isMobile &&
            
            <div className="relative w-full">
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
            }

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
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 backdrop-blur-sm rounded-2xl p-6 border border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-end justify-between">
                <div className="flex flex-col md:flex-row items-start md:items-center space-x-6">
                  <div className="flex -space-x-4 hover:-space-x-2 transition-all duration-300">
                    <Image 
                      className="h-10 w-10 rounded-full border-4 border-white shadow-2xl hover:scale-110 transition-transform duration-200"
                      src="https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop&crop=face"
                      alt="Notaire"
                      width={48}
                      height={48}
                      quality={90}
                    />
                    <Image
                      className="h-10 w-10 rounded-full border-4 border-white shadow-2xlhover:scale-110 transition-transform duration-200"
                      src="https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop&crop=face"
                      alt="Notaire"
                      width={48} 
                      height={48}
                      quality={90}
                    />
                    <Image
                      className="h-10 w-10 rounded-full border-4 border-white shadow-2xl hover:scale-110 transition-transform duration-200"
                      src="https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop&crop=face"
                      alt="Notaire"
                      width={48}
                      height={48}
                      quality={90}
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">+150 notaires certifiés</p>
                    <p className="text-sm text-gray-600 font-medium">Experts en droit immobilier</p>
                  </div>
                </div>
                <div className="flex flex-col justify-end items-end space-y-1">
                  <div className="flex items-center space-x-2 bg-white/80 px-4 py-1.5 rounded-full shadow-2xl">
                    <div className="flex">
                      {"★★★★★".split("").map((star, i) => (
                        <span key={i} className="text-yellow-400 text-sm md:text-lg">
                          {star}
                        </span>
                      ))}
                    </div>
                    <span className="text-base font-bold text-gray-800">4.9</span>
                  </div>
                  <span className="text-sm text-blue-600 font-medium">+2000 avis vérifiés</span>
                </div>
              </div>
            </div>
          </div>

          {/* Image/Illustration */}
          {!isMobile && <div className="relative w-full">
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
          </div>}
        </div>
      </div>
    </section>
  );
}