"use client";

import { Zap, Clock, Shield, CheckCircle2, ArrowRight, Sparkles, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PhoneButton } from "@/components/ui/phone-button";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Feature108 } from "@/components/shadcnblocks-com-feature108";
import { useRouter } from "next/navigation";


export function BenefitsNewSection() {
  const router = useRouter();
  return (
    <section id="avantages" className="py-24 bg-gradient-to-b from-white via-gray-50 to-white relative overflow-hidden">
      {/* Effets de fond décoratifs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center "
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 px-4 py-1.5 text-sm font-medium shadow-lg">
              Vos avantages
            </Badge>
          </motion.div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Pourquoi choisir{" "}
            <span className="bg-gradient-to-r from-[#4373f5] to-[#658bf0] bg-clip-text text-transparent">
              BailNotarie
            </span>{" "}?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            La solution la plus simple et rapide pour obtenir votre bail notarié. 
            100% en ligne, sans engagement, et prêt en 48h
            <span className="font-bold">par nos notaires partenaires certifiés et spécialisés en droit immobilier.</span>
          </p>
        </motion.div>

        {/* Section Features avec tabs */}
        <div>
          <Feature108
            tabs={[
              {
                value: "en ligne",
                icon: <Globe className="h-auto w-4 shrink-0" />,
                label: "100% en ligne",
                content: {
                  badge: "Sans engagement",
                  title: "100% en ligne",
                  description: "Constituez votre dossier directement en ligne sans engagement. Aucun déplacement nécessaire. Tout se fait depuis chez vous, en quelques minutes seulement.",
                  buttonText: "Commencer maintenant",
                  imageSrc: "https://images.unsplash.com/photo-1488509082528-cefbba5ad692?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                  imageAlt: "100% en ligne sans engagement - Formulaire digital",
                },
                handleStart: () => router.push('/commencer')
                
              },
              {
                value: "rapide",
                icon: <Clock className="h-auto w-4 shrink-0" />,
                label: "Bail en 48h",
                content: {
                  badge: "Délai garanti",
                  title: "Bail notarié en 48h",
                  description: "Transmission automatique au notaire, signature en ligne par visioconférence avec le notaire partenaire. Votre bail authentique est prêt en 48h chrono grâce à notre processus optimisé et notre réseau de notaires partenaires.",
                  buttonText: "Voir le processus",
                  imageSrc: "https://images.unsplash.com/37/tEREUy1vSfuSu8LzTop3_IMG_2538.jpg?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
                  imageAlt: "Bail notarié en 48h - Rapidité et efficacité",
                },
                handleStart: () => router.push('/#process')
              },
              {
                value: "securise",
                icon: <Shield className="h-auto w-4 shrink-0" />,
                label: "Force exécutoire",
                content: {
                  badge: "Acte authentique",
                  title: "Force exécutoire immédiate",
                  description: "Acte authentique avec force exécutoire. En cas d'impayés, procédures accélérées sans passer par le tribunal.",
                  buttonText: "En savoir plus",
                  imageSrc: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&h=600&fit=crop&q=80",
                  imageAlt: "Force exécutoire immédiate - Sécurité et protection",
                },
                handleStart: () => router.push('/blog/force-executoire-lavantage-majeur-du-bail-notarie')
              },
            ]}
          />
        </div>    

        {/* CTA avec design moderne */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="relative overflow-hidden rounded-3xl  border-0  p-8 md:p-12">
            {/* Effet de brillance animé */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-shine" />
            
            {/* Motifs décoratifs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 max-w-2xl mx-auto">
              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold mb-4 text-[#4373f5]"
              >
                Commencez maintenant, c'est rapide
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className=" mb-8 text-lg leading-relaxed"
              >
                Constituer votre dossier en ligne sans engagement. 
                Transmission automatique au notaire, signature en ligne par visioconférence avec le notaire partenaire, bail en 48h.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8 "
              >
                <Button
                  size="lg"
                  onClick={() => window.location.href = '/commencer'}
                  className="w-fit bg-[#4373f5] hover:bg-blue-700 text-white sm:text-lg text-md px-8 py-3 h-auto rounded-xl shadow-md transition-all duration-200"
                >
                  Commencer maintenant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <PhoneButton
                  phoneNumber="07 49 38 77 56"
                  size="lg"
                  className="sm:text-lg text-md px-8 py-3 h-auto border-2 border-blue-200/60 bg-white shadow-md text-[#4373f5] rounded-xl hover:bg-blue-100 transition-all duration-200"
                />
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#4373f5]"
              >
                {["Sans engagement", "100% sécurisé", "Réponse rapide"].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}


