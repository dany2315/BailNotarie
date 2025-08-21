import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Eye, Shield, HeartHandshake, ArrowRight, CheckCircle, Clock, Scale, Star, Award } from "lucide-react";
import Image from "next/image";

export function BenefitsSection() {
  const mainBenefits = [
    {
      icon: Zap,
      title: "Force exécutoire immédiate",
      description: "Action rapide en cas d'impayés, sans procès. Délais d'expulsion réduits à 2-3 mois au lieu de 12-18 mois.",
      features: ["Pas de procédure judiciaire", "Économie de temps et d'argent", "Récupération rapide des loyers"],
      color: "from-red-500 to-pink-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200"
    },
    {
      icon: Shield,
      title: "Protection juridique renforcée",
      description: "Sécurité maximale avec un document authentique validé par un officier public.",
      features: ["Document incontestable", "Validation par notaire", "Conformité légale garantie"],
      color: "from-green-500 to-emerald-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200"
    },
    {
      icon: Eye,
      title: "Transparence totale",
      description: "Clarté absolue des termes avec validation par un professionnel impartial du droit.",
      features: ["Termes clairs et précis", "Pas d'ambiguïté juridique", "Conseil personnalisé"],
      color: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
    }
  ];

  const comparisonData = [
    { 
      aspect: "Délai d'expulsion", 
      classic: "12-18 mois", 
      notarial: "2-3 mois",
      advantage: "Gain de 10-15 mois"
    },
    { 
      aspect: "Coût procédure", 
      classic: "3000-5000€", 
      notarial: "0€",
      advantage: "Économie jusqu'à 5000€"
    },
    { 
      aspect: "Force juridique", 
      classic: "Limitée", 
      notarial: "Maximale",
      advantage: "Sécurité absolue"
    },
    { 
      aspect: "Validation", 
      classic: "Aucune", 
      notarial: "Notaire",
      advantage: "Expertise garantie"
    }
  ];

  return (
    <section id="services" className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête moderne */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-8 py-3 text-base font-semibold rounded-full">
            Avantages exclusifs
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent">
              Le bail notarié,
            </span>
            <br />
            <span className="text-gray-900">votre meilleur allié</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Découvrez comment le bail notarié révolutionne la gestion locative avec des avantages 
            concrets et mesurables pour votre tranquillité d'esprit.
          </p>
        </div>

        {/* Avantages principaux - Layout en zigzag */}
        <div className="space-y-20 mb-24">
          {mainBenefits.map((benefit, index) => (
            <div key={index} className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:grid-flow-col-dense' : ''}`}>
              {/* Contenu */}
              <div className={`space-y-8 ${index % 2 === 1 ? 'lg:col-start-2' : ''}`}>
                <div className="space-y-6">
                  <div className={`w-20 h-20 bg-gradient-to-br ${benefit.color} rounded-3xl flex items-center justify-center shadow-2xl`}>
                    <benefit.icon className="h-10 w-10 text-white" />
                  </div>
                  
                  <div>
                    <h3 className="text-3xl font-bold text-gray-900 mb-4">
                      {benefit.title}
                    </h3>
                    <p className="text-xl text-gray-600 leading-relaxed mb-8">
                      {benefit.description}
                    </p>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <div className="space-y-4">
                  {benefit.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-4">
                      <div className={`w-8 h-8 bg-gradient-to-br ${benefit.color} rounded-full flex items-center justify-center shadow-lg`}>
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-lg font-medium text-gray-800">{feature}</span>
                    </div>
                  ))}
                </div>

                <Button className={`bg-gradient-to-r ${benefit.color} hover:shadow-xl text-white px-8 py-4 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105`}>
                  En savoir plus
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>

              {/* Illustration */}
              <div className={`relative ${index % 2 === 1 ? 'lg:col-start-1' : ''}`}>
                <div className={`${benefit.bgColor} ${benefit.borderColor} border-2 rounded-3xl p-8 shadow-2xl`}>
                  <div className="aspect-square bg-white rounded-2xl p-8 shadow-inner">
                    <div className="h-full flex flex-col justify-center items-center space-y-6">
                      <div className={`w-24 h-24 bg-gradient-to-br ${benefit.color} rounded-full flex items-center justify-center shadow-xl`}>
                        <benefit.icon className="h-12 w-12 text-white" />
                      </div>
                      <div className="text-center">
                        <h4 className="text-2xl font-bold text-gray-900 mb-2">{benefit.title}</h4>
                        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mx-auto"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Éléments décoratifs */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${benefit.color} rounded-full opacity-20 blur-xl`}></div>
                <div className={`absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br ${benefit.color} rounded-full opacity-15 blur-xl`}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Section de comparaison moderne */}
        <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-2">
            {/* Image avec overlay */}
            <div className="relative h-64 lg:h-auto">
              <Image
                src="https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Balance de la justice"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-transparent"></div>
              
              {/* Badges flottants */}
              <div className="absolute top-6 left-6 space-y-3">
                <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <span className="text-sm font-semibold text-gray-900">Certifié qualité</span>
                  </div>
                </div>
                <div className="bg-green-500/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-white" />
                    <span className="text-sm font-semibold text-white">100% sécurisé</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tableau de comparaison */}
            <div className="p-12 text-white">
              <h3 className="text-3xl font-bold mb-8 flex items-center">
                <Scale className="h-8 w-8 mr-3 text-blue-300" />
                Comparaison détaillée
              </h3>
              
              <div className="space-y-6">
                {comparisonData.map((item, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-colors duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-semibold text-blue-200">{item.aspect}</h4>
                      <div className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                        {item.advantage}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-300 mb-1">Bail classique</div>
                        <div className="text-red-300 font-semibold">{item.classic}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-300 mb-1">Bail notarié</div>
                        <div className="text-green-300 font-semibold">{item.notarial}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-2xl border border-blue-400/30">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <div>
                    <p className="font-bold text-lg">Recommandé par 98% de nos clients</p>
                    <p className="text-blue-200 text-sm">Basé sur 2000+ avis vérifiés</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}