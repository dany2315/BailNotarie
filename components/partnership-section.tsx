"use client";

import { Handshake, Shield, Users, ArrowRight, FileCheck, Clock, CheckCircle2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface FeatureProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}

const Feature = ({ title, description, icon, index }: FeatureProps) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-neutral-200",
        (index === 0 || index === 4) && "lg:border-l border-neutral-200",
        index < 4 && "lg:border-b border-neutral-200"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-100 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-100 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-600">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-300 group-hover/feature:bg-[#4373f5] transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-600 max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export function PartnershipSection() {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  const features = [
    {
      title: "100% en ligne",
      description: "Toute la démarche se fait en ligne, de la constitution du dossier à la signature électronique de l'acte authentique.",
      icon: <CheckCircle2 className="w-8 h-8" />,
    },
    {
      title: "Nous travaillons avec des notaires",
      description: "BailNotarié n’est pas un office notarial. Nous assurons uniquement un accompagnement administratif et transmettons les dossiers aux notaires compétents, seuls habilités à rédiger et authentifier les actes.",
      icon: <Handshake className="w-8 h-8" />,
    },
    {
      title: "Acte authentique garanti",
      description: "Votre bail est authentifié par un notaire partenaire, garantissant un acte authentique avec force exécutoire immédiate.",
      icon: <Shield className="w-8 h-8" />,
    },
    {
      title: "Support dédié",
      description: "Une équipe à votre écoute pour vous accompagner à chaque étape de votre démarche de bail authentifié.",
      icon: <Users className="w-8 h-8" />,
    },
    {
      title: "Réseau de notaires certifiés",
      description: "Plus de 150 notaires partenaires à travers la France, tous certifiés et spécialisés en droit immobilier.",
      icon: <Users className="w-8 h-8" />,
    },
    {
      title: "Processus simplifié",
      description: "Constituez votre dossier en ligne en quelques minutes, nous nous occupons de tout le reste avec notre notaire partenaire.",
      icon: <FileCheck className="w-8 h-8" />,
    },
    {
      title: "Délais rapides",
      description: "Votre bail authentifié en 48h maximum grâce à notre processus optimisé et notre réseau de notaires.",
      icon: <Clock className="w-8 h-8" />,
    },
    {
      title: "Prix transparent",
      description: "Tarifs clairs et transparents, sans surprise. Vous savez exactement ce que vous payez dès le départ.",
      icon: <Building2 className="w-8 h-8" />,
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Effets de fond animés */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <Badge className="mb-4 bg-[#4373f5] text-white border-0 px-4 py-1.5 text-sm font-medium">
            Notre approche
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Nous travaillons{" "}
            <span className="text-[#4373f5]">avec des notaires</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            BailNotarie facilite votre démarche en ligne, puis transmet votre dossier 
            à un notaire partenaire qui authentifie votre bail. 
            Vous bénéficiez de la simplicité du digital et de la garantie de l'acte authentique.
          </p>
        </motion.div>

        {/* Features avec effets de survol */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto bg-white/50 backdrop-blur-sm rounded-2xl mb-16">
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-16"
        >
          <div className="relative p-8 bg-gradient-to-br from-[#4373f5] to-[#658bf0] text-white rounded-2xl border-0 shadow-2xl overflow-hidden">
            {/* Effet de brillance animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-shine" />
            
            <div className="relative z-10">
              <h3 className="text-2xl font-bold mb-4">
                Prêt à commencer ?
              </h3>
              <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
                Constituer votre dossier en ligne, nous nous occupons du reste avec notre notaire partenaire.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  onClick={() => window.location.href = '/commencer'}
                  variant="secondary"
                  className="bg-white text-[#4373f5] hover:bg-gray-100 text-lg px-8 py-6  shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Constituer mon dossier
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <PhoneButton
                  phoneNumber="07 49 38 77 56"
                  size="lg"
                  className="text-lg px-8 py-6  bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 shadow-lg hover:shadow-xl transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


