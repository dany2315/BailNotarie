"use client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Quote, MapPin, Calendar, ThumbsUp, Award , Phone} from "lucide-react";
import Image from "next/image";
import useIsMobile  from "@/hooks/useIsMobile";
import { Button } from "@/components/ui/button";

export function TestimonialsSection() {
  const isMobile = useIsMobile();
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
    <section  className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
           <Badge className="mb-6 bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 px-6 py-2 text-sm font-semibold">
              Témoignages clients
            </Badge>

          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
              Ils nous font confiance
            </span>
            <br />
            <span className="text-gray-900">et vous ?</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les retours d'expérience de nos clients qui ont choisi le bail notarié
          </p>
        </div>

        {!isMobile && <div className="flex flex-wrap justify-center gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-3 bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-300 to-orange-500 rounded-xl flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-gray-900">{stat.number}</div>
                  <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>}

        <div className="grid md:grid-cols-3 gap-8 mt-20">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-0 overflow-hidden hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/90  border-0 shadow-xl relative">
              <div className="p-8 pb-0">
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

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                    <div className="flex items-center space-x-2">
                      <ThumbsUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-800">{testimonial.highlight}</span>
                    </div>
              </div>
              </div>

              <div className="relative px-8 pb-6">
                <Quote className="h-8 w-8 text-blue-200 absolute -top-2 left-5" />
                <p className="text-gray-700 italic pl-6">
                  "{testimonial.text}"
                </p>
              </div>
              <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 absolute bottom-0 left-0 right-0"></div>
            </Card>
          ))}
        </div>
      </div>
      <div className="flex justify-center mt-10 w-full px-4">
        <Button 
              onClick={() => window.location.href = 'tel:0123456789'}
              className="bg-orange-600 hover:bg-orange-700 w-full"
            >
              <Phone className="mr-2 h-4 w-4" />
              Nous faire confiance
            </Button>
      </div>
    </section>
  );
}