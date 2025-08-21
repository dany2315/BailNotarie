import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, FileCheck, Clock, Star, Award, Shield, Zap, Target, Globe } from "lucide-react";
import Image from "next/image";

export function StatsSection() {
  const mainStats = [
    {
      number: "5000+",
      label: "Baux notariés",
      sublabel: "Depuis 2018",
      icon: FileCheck,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      number: "2000+",
      label: "Clients satisfaits",
      sublabel: "Partout en France",
      icon: Users,
      gradient: "from-green-500 to-emerald-500"
    },
    {
      number: "48h",
      label: "Délai moyen",
      sublabel: "Record: 24h",
      icon: Clock,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      number: "98%",
      label: "Satisfaction",
      sublabel: "Avis vérifiés",
      icon: TrendingUp,
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const highlights = [
    {
      icon: Target,
      title: "Précision",
      description: "Chaque détail compte dans nos baux"
    },
    {
      icon: Shield,
      title: "Sécurité",
      description: "Protection juridique maximale"
    },
    {
      icon: Zap,
      title: "Rapidité",
      description: "Processus optimisé et efficace"
    },
    {
      icon: Globe,
      title: "Couverture",
      description: "Service disponible partout en France"
    }
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Fond avec motif géométrique */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50"></div>
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full" 
               style={{
                 backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                 backgroundSize: '60px 60px'
               }}>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête avec design asymétrique */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-6 py-2 text-sm font-semibold">
              Nos performances
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              Des chiffres qui 
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> parlent</span>
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Notre expertise se mesure par la satisfaction de nos clients et l'efficacité de nos processus. 
              Découvrez pourquoi nous sommes le leader du bail notarié en France.
            </p>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <Award className="h-12 w-12 text-yellow-400" />
                <div className="text-right">
                  <div className="text-3xl font-bold">Leader</div>
                  <div className="text-blue-200">du marché</div>
                </div>
              </div>
              <p className="text-blue-100 mb-4">
                Reconnu comme la référence en matière de bail notarié par les professionnels de l'immobilier.
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-blue-200">Excellence certifiée</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiques en layout masonry */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {mainStats.map((stat, index) => (
            <div key={index} className={`relative group ${index === 1 ? 'md:mt-8' : ''} ${index === 3 ? 'lg:mt-12' : ''}`}>
              <div className="bg-white rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 overflow-hidden">
                {/* Gradient de fond */}
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`text-4xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                      {stat.number}
                    </div>
                    <div className="text-xl font-semibold text-gray-900">
                      {stat.label}
                    </div>
                    <div className="text-sm text-gray-500 font-medium">
                      {stat.sublabel}
                    </div>
                  </div>
                </div>
                
                {/* Effet de brillance */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:animate-shine"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Section avec image et points forts */}
        <div className="bg-gradient-to-br from-gray-900 to-blue-900 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-2">
            {/* Contenu */}
            <div className="p-12 text-white">
              <h3 className="text-3xl font-bold mb-8">
                Pourquoi choisir notre expertise ?
              </h3>
              
              <div className="space-y-6">
                {highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start space-x-4 group">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:bg-white/20 transition-colors duration-300">
                      <highlight.icon className="h-6 w-6 text-blue-300" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{highlight.title}</h4>
                      <p className="text-blue-100">{highlight.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-10 p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full border-2 border-white flex items-center justify-center">
                        <Star className="h-5 w-5 text-white fill-current" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="font-bold text-lg">Certification qualité</p>
                    <p className="text-blue-200 text-sm">Validée par nos partenaires notaires</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Image */}
            <div className="relative h-64 lg:h-auto">
              <Image
                src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Bureau notarial moderne"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-l from-transparent to-gray-900/20"></div>
              
              {/* Badge flottant */}
              <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold text-gray-900">Service actif 24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}