import { Card } from "@/components/ui/card";
import { FileCheck, Users, Shield } from "lucide-react";

export function PresentationSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Nous simplifions la création de votre bail notarié
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Signé devant un notaire, votre bail devient un acte authentique, incontestable et exécutoire immédiatement. 
            Notre rôle : préparer le dossier, coordonner avec le notaire et vous remettre un bail prêt à l'usage.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Préparation complète
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Nous collectons et vérifions tous les documents nécessaires pour constituer votre dossier.
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Coordination notaire
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Nous faisons le lien avec le notaire et organisons la signature dans les meilleures conditions.
            </p>
          </Card>

          <Card className="p-8 text-center hover:shadow-lg transition-shadow duration-300">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Sécurité juridique
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Votre bail notarié vous offre une protection maximale et une force exécutoire immédiate.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}