"use client";

import { FileText, Send, PenTool, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { CardFlip } from "@/components/ui/card-flip";

export function HowItWorksSection() {
  const handleStart = () => {
    window.location.href = '/commencer';
  };

  const steps = [
    {
      number: 1,
      icon: FileText,
      title: "Constitution du dossier 100% en ligne",
      description: "Remplissez votre dossier directement sur notre plateforme , sans engagement.",
      details: [
        "Formulaire simple et intuitif",
        "Upload de vos documents en ligne",
        "Vérification automatique des pièces",
        "Accompagnement si besoin"
      ],
      badgeClass: "bg-[#4373f5]",
      bgGradient: "from-blue-50 to-blue-100",
      iconBg: "bg-blue-100",
      iconColor: "text-[#4373f5]"

    },
    {
      number: 2,
      icon: Send,
      title: "Transmission automatique au notaire",
      description: "Votre dossier est transmis automatiquement à notre notaire partenaire. Aucune démarche supplémentaire de votre part.",
      details: [
        "Transmission sécurisée et instantanée",
        "Vérification par le notaire",
        "Validation des documents",
        "Préparation de l'acte authentique"
      ],
      badgeClass: "bg-indigo-600",
      bgGradient: "from-indigo-50 to-indigo-100",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600"
    },
    {
      number: 3,
      icon: PenTool,
      title: "Signature en ligne avec le notaire",
      description: "Signature en visioconférence sécurisée avec le notaire. Votre bail notarié est prêt en 48h.",
      details: [
        "Signature en visioconférence sécurisée",
        "Acte authentique validé",
        "Reçu immédiatement par email",
        "Force exécutoire immédiate"
      ],
      badgeClass: "bg-green-600",
      bgGradient: "from-green-50 to-green-100",
      iconBg: "bg-green-100",
      iconColor: "text-green-600"
    }
  ];

  return (
    <section id="process" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-indigo-600 text-white border-0 px-4 py-1.5 text-sm font-medium">
            Comment ça marche
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Votre bail notarié en{" "}
            <span className="text-[#4373f5]">3 étapes simples</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processus 100% digital, rapide et sécurisé. 
            De la constitution de votre dossier à la signature, tout se fait en ligne.
          </p>
        </div>

        {/* Étapes avec Flip Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <CardFlip
              key={index}
              title={step.title}
              subtitle={step.description}
              description={step.description}
              features={step.details}
              icon={step.icon}
              iconBg={step.iconBg}
              iconColor={step.iconColor}
              badgeClass={step.badgeClass}
              number={step.number}
              bgGradient={step.bgGradient}
              handleStart={handleStart}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center mt-12 mb-4">
          <h3 className="text-2xl md:text-3xl font-bold text-[#4373f5] mb-2 px-4 py-2 rounded-xl shadow-none inline-block text-center">
            Prêt à constituer votre dossier ?
          </h3>
          <p className="text-gray-700 mb-5 max-w-2xl text-center">
            Commencez dès maintenant&nbsp;: <span className="font-semibold text-gray-900"> sans engagement</span>, et votre dossier sera transmis automatiquement au notaire.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={handleStart}
              className="bg-[#4373f5] hover:bg-blue-700 text-white sm:text-lg text-md px-8 py-3 h-auto rounded-xl shadow-md transition-all duration-200"
            >
              Commencer maintenant
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <PhoneButton
              phoneNumber="07 49 38 77 56"
              size="lg"
              className="sm:text-lg text-md px-8 py-3 h-auto border-2 border-blue-200/60 bg-white shadow-md text-[#4373f5] rounded-xl hover:bg-blue-100 transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

