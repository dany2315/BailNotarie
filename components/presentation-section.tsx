import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Users, Shield, ArrowRight, CheckCircle, Clock, Star, Award } from "lucide-react";
import Image from "next/image";

export function PresentationSection() {
  const features = [
    {
      icon: FileCheck,
      title: "Préparation complète",
      description: "Nous nous occupons de tout le dossier administratif"
    },
    {
      icon: Users,
      title: "Coordination notaire",
      description: "Liaison directe avec les notaires partenaires"
    },
    {
      icon: Shield,
      title: "Sécurité garantie",
      description: "Protection juridique maximale assurée"
    },
    {
      icon: Clock,
      title: "Suivi personnalisé",
      description: "Accompagnement jusqu'à la signature finale"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Éléments décoratifs de fond */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête de section */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-6 py-2 text-sm font-semibold">
            Notre mission
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-6">
            Simplifier votre bail notarié
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Transformez la complexité administrative en une expérience fluide et sécurisée. 
            Notre expertise vous garantit un bail authentique avec la force exécutoire immédiate.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Contenu principal avec design en bento */}
          <div className="space-y-8">
            {/* Grande carte principale */}
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-500">
              <div className="flex items-start space-x-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Award className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    Expertise reconnue depuis 2018
                  </h3>
                  <p className="text-gray-600 text-lg leading-relaxed mb-6">
                    Plus de 5000 baux notariés créés avec un taux de satisfaction de 98%. 
                    Notre réseau de 150+ notaires certifiés couvre toute la France.
                  </p>
                  <div className="flex items-center space-x-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                      ))}
                    </div>
                    <span className="text-sm font-semibold text-gray-700">4.9/5 • 2000+ avis</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Grille de fonctionnalités */}
            <div className="grid grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-white/30 hover:bg-white/80 transition-all duration-300 group">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{feature.title}</h4>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section visuelle avec image et métriques */}
          <div className="relative">
            {/* Image principale */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Signature de contrat notarié"
                width={600}
                height={500}
                className="object-cover w-full h-[500px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              
              {/* Métriques flottantes */}
              <div className="absolute bottom-6 left-6 right-6">
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-blue-600">5000+</div>
                      <div className="text-xs text-gray-600 font-medium">Baux créés</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-green-600">48h</div>
                      <div className="text-xs text-gray-600 font-medium">Délai moyen</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-2xl font-bold text-purple-600">150+</div>
                      <div className="text-xs text-gray-600 font-medium">Notaires</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Éléments décoratifs */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full opacity-80 blur-xl"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-gradient-to-br from-green-400 to-blue-500 rounded-full opacity-60 blur-xl"></div>
          </div>
        </div>

        {/* Section de confiance */}
        <div className="mt-20 text-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-white/30 max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xl font-bold text-gray-900">Garantie sécurité</h4>
                  <p className="text-gray-600">Protection juridique maximale</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-white" />
                </div>
                <div className="text-left">
                  <h4 className="text-xl font-bold text-gray-900">Processus rapide</h4>
                  <p className="text-gray-600">Finalisation en 48h</p>
                </div>
              </div>

              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                Découvrir le processus
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}