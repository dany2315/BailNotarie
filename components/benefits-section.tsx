"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Eye, Shield, HeartHandshake, ArrowRight, CheckCircle, Clock, Scale , Phone} from "lucide-react";
import Image from "next/image";

export function BenefitsSection() {
  const mainBenefits = [
    {
      icon: Zap,
      title: "Force exécutoire immédiate",
      description: "Action rapide en cas d'impayés, sans procès. Délais d'expulsion réduits à 2-3 mois.",
      color: "from-red-500 to-pink-500",
      bgColor: "bg-red-50",
      iconColor: "text-red-600"
    },
    {
      icon: Shield,
      title: "Protection renforcée",
      description: "Sécurité juridique maximale avec un document authentique et officiel.",
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-50",
      iconColor: "text-green-600"
    },
    {
      icon: Eye,
      title: "Clarté et transparence",
      description: "Validation par un notaire impartial avec des termes clairs et sans ambiguïté.",
      color: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600"
    },
    {
      icon: HeartHandshake,
      title: "Accompagnement complet",
      description: "Suivi personnalisé jusqu'à la signature avec remise du bail finalisé.",
      color: "from-purple-500 to-indigo-500",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ];

  const comparisonPoints = [
    { feature: "Force exécutoire", classic: false, notarial: true },
    { feature: "Délai d'expulsion", classic: "12-18 mois", notarial: "2-3 mois" },
    { feature: "Validation juridique", classic: false, notarial: true },
    { feature: "Sécurité maximale", classic: false, notarial: true },
    { feature: "Coût initial", classic: "Faible", notarial: "Modéré" }
  ];

  return (
    <section id="services" className="pt-20 pb-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">

          <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-800 text-white border-0 px-6 py-2 text-sm font-semibold">
              Nos avantages
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
              Le bail notarié,
            </span>
            <br />
            <span className="text-gray-900">votre meilleur allié</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les avantages uniques d'un bail authentifié par un notaire
          </p>
        </div>

        {/* Grille des avantages avec design moderne */}
        <div className="grid md:grid-cols-2 gap-8 mb-20 ">
          {mainBenefits.map((benefit, index) => (
            <div key={index} className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl" 
                   style={{backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))`}}></div>
              
              <div className={`${benefit.bgColor} rounded-2xl p-8 h-full border border-gray-100 group-hover:border-gray-200 transition-all duration-300 group-hover:shadow-xl`}>
                <div className="flex items-start space-x-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <benefit.icon className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-800 transition-colors">
                      {benefit.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {benefit.description}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 flex items-center text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">
                  <span>En savoir plus</span>
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
        

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-16">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 border border-blue-200">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Sécurisez votre location dès maintenant
          </h3>
          <p className="text-gray-600 mb-6">
            Profitez de tous les avantages du bail notarié avec notre accompagnement expert
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => window.location.href = 'tel:0749387756'}
              className="bg-blue-600 hover:bg-blue-700 cursor-pointer"
            >
              <Phone className="mr-2 h-4 w-4" />
              Parler à un expert
            </Button>
          </div>
        </div>
      </div>

        <h2 className="text-4xl md:text-6xl font-bold mb-20 text-center mt-20">
            <span className="bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
            Comparez les avantages du bail notarié
            </span>
            <br />
            <span className="text-gray-900">avec le bail classique</span>
        </h2>

        {/* Section de comparaison */}
        <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-3xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Tableau de comparaison */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                Bail notarié vs Bail classique
              </h3>
              
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 p-4 font-semibold text-gray-700 text-sm">
                  <div>Critère</div>
                  <div className="text-center">Bail classique</div>
                  <div className="text-center">Bail notarié</div>
                </div>
                
                {comparisonPoints.map((point, index) => (
                  <div key={index} className="grid grid-cols-3 p-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                    <div className="font-medium text-gray-900">{point.feature}</div>
                    <div className="text-center">
                      {typeof point.classic === 'boolean' ? (
                        point.classic ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                          </div>
                        )
                      ) : (
                        <span className="text-gray-600">{point.classic}</span>
                      )}
                    </div>
                    <div className="text-center">
                      {typeof point.notarial === 'boolean' ? (
                        point.notarial ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <div className="w-5 h-5 bg-red-100 rounded-full mx-auto flex items-center justify-center">
                            <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                          </div>
                        )
                      ) : (
                        <span className="text-green-600 font-semibold">{point.notarial}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image avec overlay informatif */}
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Balance de la justice"
                  width={500}
                  height={400}
                  className="object-cover w-full h-[400px]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Overlay avec points clés */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-white">
                      <Scale className="h-6 w-6" />
                      <span className="font-semibold">Équité et transparence</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <Clock className="h-6 w-6" />
                      <span className="font-semibold">Gain de temps considérable</span>
                    </div>
                    <div className="flex items-center space-x-3 text-white">
                      <Shield className="h-6 w-6" />
                      <span className="font-semibold">Protection juridique maximale</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Badge flottant */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                Recommandé
              </div>
            </div>
          </div>
        </div>
      </div>
       <div className="flex justify-center mt-10 mb-0">
          <Button 
              variant="ghost"
              className="text-gray-900 cursor-pointer"
              onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Contactez-nous

              <ArrowRight className="ml-1 h-4 w-4 -rotate-45" />
            </Button>
      </div>
    </section>
  );
}