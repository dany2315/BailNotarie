import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, Eye, Shield, HeartHandshake } from "lucide-react";

export function BenefitsSection() {
  const benefits = [
    {
      icon: Zap,
      title: "Force exécutoire immédiate",
      description: "Valeur équivalente à un jugement",
      features: [
        "Action rapide en cas d'impayés, sans procès",
        "Délais d'expulsion réduits (≈ 2 mois)",
        "Pas besoin de passer par un tribunal"
      ],
      color: "bg-red-100 text-red-600"
    },
    {
      icon: Eye,
      title: "Clarté et transparence",
      description: "Droits et obligations précisés noir sur blanc",
      features: [
        "Validation par un notaire impartial",
        "Termes clairs et sans ambiguïté",
        "Respect du cadre légal"
      ],
      color: "bg-blue-100 text-blue-600"
    },
    {
      icon: Shield,
      title: "Protection renforcée",
      description: "Preuve incontestable",
      features: [
        "Sécurité juridique maximale",
        "Document authentique et officiel",
        "Conservation sécurisée par le notaire"
      ],
      color: "bg-green-100 text-green-600"
    },
    {
      icon: HeartHandshake,
      title: "Accompagnement complet",
      description: "Collecte et vérification des documents",
      features: [
        "Suivi jusqu'à la signature",
        "Remise du bail finalisé",
        "Support personnalisé"
      ],
      color: "bg-purple-100 text-purple-600"
    }
  ];

  return (
    <section id="services" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-100">
            Nos avantages
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Pourquoi choisir le bail notarié ?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les avantages uniques d'un bail authentifié par un notaire
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {benefits.map((benefit, index) => (
            <Card key={index} className="p-8 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${benefit.color}`}>
                  <benefit.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 mb-4 font-medium">
                    {benefit.description}
                  </p>
                  <ul className="space-y-2">
                    {benefit.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}