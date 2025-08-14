import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, FileText, Send, PenTool, Download } from "lucide-react";

export function ProcessSection() {
  const steps = [
    {
      number: "1",
      icon: Phone,
      title: "Prise de contact et pré-validation",
      description: "Explication du fonctionnement et identification des besoins",
      details: [
        "Explication du fonctionnement",
        "Identification des besoins (bail d'habitation, colocation, etc.)"
      ]
    },
    {
      number: "2",
      icon: FileText,
      title: "Constitution du dossier",
      description: "Collecte de tous les documents nécessaires",
      details: [
        "Propriétaire : titre de propriété, diagnostics (DPE, etc.), pièce d'identité",
        "Locataire : pièce d'identité, justificatif de revenus, justificatif de domicile",
        "Documents de garant si nécessaire"
      ]
    },
    {
      number: "3",
      icon: Send,
      title: "Transmission au notaire",
      description: "Vérification et validation des pièces",
      details: [
        "Vérification et validation des pièces",
        "Rédaction du bail par le notaire"
      ]
    },
    {
      number: "4",
      icon: PenTool,
      title: "Signature devant notaire",
      description: "Signature en présentiel ou visio sécurisée",
      details: [
        "Signature en présentiel ou visio sécurisée selon les cas",
        "Acte authentique remis immédiatement"
      ]
    },
    {
      number: "5",
      icon: Download,
      title: "Remise du bail notarié",
      description: "Envoi du bail aux parties",
      details: [
        "Envoi du bail aux parties",
        "Conservation sécurisée par le notaire"
      ]
    }
  ];

  return (
    <section id="process" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-100">
            Notre processus
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Étapes du processus
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processus simple et transparent en 5 étapes pour votre bail notarié
          </p>
        </div>

        <div className="space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Ligne de connexion */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-16 w-0.5 h-16 bg-gray-200 hidden md:block"></div>
              )}
              
              <Card className="p-8 hover:shadow-lg transition-shadow duration-300">
                <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
                  {/* Numéro et icône */}
                  <div className="flex items-center space-x-4 md:flex-col md:space-x-0 md:space-y-2">
                    <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                      {step.number}
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <step.icon className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 mb-4 font-medium">
                      {step.description}
                    </p>
                    <ul className="space-y-2">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="flex items-start space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-600 text-sm">{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}