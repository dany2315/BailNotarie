import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, FileCheck, Clock } from "lucide-react";
import Image from "next/image";

export function StatsSection() {
  const stats = [
    {
      icon: Users,
      number: "2000+",
      label: "Clients satisfaits",
      description: "Propriétaires et locataires nous font confiance"
    },
    {
      icon: FileCheck,
      number: "5000+",
      label: "Baux notariés",
      description: "Contrats authentifiés avec succès"
    },
    {
      icon: Clock,
      number: "48h",
      label: "Délai moyen",
      description: "De la demande à la signature"
    },
    {
      icon: TrendingUp,
      number: "98%",
      label: "Taux de satisfaction",
      description: "Clients qui nous recommandent"
    }
  ];

  return (
    <section className="py-20 bg-white relative overflow-hidden">
      {/* Image de fond */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1920"
          alt="Bureau notarial moderne"
          fill
          className="object-cover opacity-5"
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            Nos chiffres
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Une expertise reconnue
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Des années d'expérience au service de la sécurisation de vos baux
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <Card key={index} className="p-8 text-center hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-white/90 backdrop-blur-sm">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <stat.icon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {stat.number}
              </div>
              <div className="text-lg font-semibold text-gray-800 mb-2">
                {stat.label}
              </div>
              <p className="text-sm text-gray-600">
                {stat.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}