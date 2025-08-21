import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, Quote, MapPin, Calendar, ThumbsUp, Award } from "lucide-react";
import Image from "next/image";

export function TestimonialsSection() {
  const testimonials = [
    {
      name: "Marie Dubois",
      role: "Propriétaire depuis 8 ans",
      image: "https://images.pexels.com/photos/3785079/pexels-photo-3785079.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "Excellent service ! Le processus était simple et rapide. Mon bail notarié m'a permis de récupérer rapidement les loyers impayés sans passer par un long procès. Je recommande vivement !",
      location: "Paris 15ème",
      date: "Il y a 2 mois",
      highlight: "Récupération rapide des impayés",
      verified: true
    },
    {
      name: "Thomas Martin",
      role: "Investisseur immobilier",
      image: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "Je recommande vivement BailNotarie. La sécurité juridique apportée par le bail notarié est incomparable. L'équipe est professionnelle et réactive. Un investissement qui en vaut la peine.",
      location: "Lyon 6ème",
      date: "Il y a 1 mois",
      highlight: "Sécurité juridique maximale",
      verified: true
    },
    {
      name: "Sophie Leroy",
      role: "Propriétaire particulier",
      image: "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop&crop=face",
      rating: 5,
      text: "Grâce au bail notarié, j'ai une tranquillité d'esprit totale. En cas de problème, je sais que j'ai un document avec force exécutoire immédiate. Le service client est exceptionnel.",
      location: "Marseille 8ème",
      date: "Il y a 3 semaines",
      highlight: "Tranquillité d'esprit garantie",
      verified: true
    }
  ];

  const stats = [
    { number: "4.9/5", label: "Note moyenne", icon: Star },
    { number: "2000+", label: "Avis clients", icon: ThumbsUp },
    { number: "98%", label: "Recommandent", icon: Award }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      {/* Éléments décoratifs */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête avec statistiques */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0 px-8 py-3 text-base font-semibold rounded-full">
            Témoignages clients
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
              Ils nous font
            </span>
            <br />
            <span className="text-gray-900">confiance</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-12">
            Découvrez les retours d'expérience authentiques de nos clients qui ont choisi 
            la sécurité du bail notarié pour leurs locations.
          </p>

          {/* Statistiques en ligne */}
          <div className="flex flex-wrap justify-center gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Témoignages en layout masonry */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <div key={index} className={`${index === 1 ? 'md:mt-12' : ''} ${index === 2 ? 'lg:mt-24' : ''}`}>
              <Card className="p-0 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90 backdrop-blur-sm border-0 shadow-xl">
                {/* En-tête avec image et infos */}
                <div className="p-8 pb-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="relative">
                      <Image
                        src={testimonial.image}
                        alt={testimonial.name}
                        width={60}
                        height={60}
                        className="rounded-full object-cover shadow-lg"
                      />
                      {testimonial.verified && (
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                          <Award className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{testimonial.role}</p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        <span>{testimonial.location}</span>
                        <span>•</span>
                        <Calendar className="h-3 w-3" />
                        <span>{testimonial.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Étoiles */}
                  <div className="flex items-center space-x-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  {/* Point fort */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                    <div className="flex items-center space-x-2">
                      <ThumbsUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">{testimonial.highlight}</span>
                    </div>
                  </div>
                </div>

                {/* Citation */}
                <div className="px-8 pb-8">
                  <div className="relative">
                    <Quote className="h-8 w-8 text-blue-200 absolute -top-2 -left-2" />
                    <p className="text-gray-700 italic pl-6 leading-relaxed">
                      "{testimonial.text}"
                    </p>
                  </div>
                </div>

                {/* Barre de couleur en bas */}
                <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
              </Card>
            </div>
          ))}
        </div>

        {/* Section de confiance */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/50">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Contenu */}
            <div className="space-y-8">
              <div>
                <h3 className="text-3xl font-bold text-gray-900 mb-4">
                  Une satisfaction client exceptionnelle
                </h3>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Nos clients apprécient particulièrement la rapidité de notre service, 
                  la sécurité juridique apportée et l'accompagnement personnalisé tout au long du processus.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Rapidité du service", percentage: 98 },
                  { label: "Qualité de l'accompagnement", percentage: 96 },
                  { label: "Sécurité juridique", percentage: 100 },
                  { label: "Recommandation", percentage: 98 }
                ].map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-800">{item.label}</span>
                      <span className="font-bold text-blue-600">{item.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visualisation */}
            <div className="relative">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto">
                    <Award className="h-10 w-10 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-4xl font-bold mb-2">4.9/5</div>
                    <div className="text-blue-200 mb-4">Note moyenne</div>
                    <div className="flex justify-center space-x-1 mb-6">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <p className="text-sm text-blue-100">
                      "Le meilleur service de bail notarié que j'ai utilisé. 
                      Professionnel, rapide et sécurisé."
                    </p>
                    <p className="text-xs text-blue-200 mt-2">- Client vérifié</p>
                  </div>
                </div>
              </div>
              
              {/* Éléments décoratifs */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full opacity-60 blur-xl"></div>
              <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-purple-400 rounded-full opacity-40 blur-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}