"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, FileText, Send, PenTool, Download, ArrowRight, Clock, CheckCircle, Users, Shield, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function ProcessSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: "01",
      icon: Phone,
      title: "Consultation initiale",
      description: "Analyse de vos besoins et explication du processus complet",
      duration: "15 min",
      details: [
        "Évaluation de votre situation",
        "Explication des avantages",
        "Estimation des délais",
        "Réponse à vos questions"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: "02",
      icon: FileText,
      title: "Constitution du dossier",
      description: "Collecte et vérification de tous les documents nécessaires",
      duration: "24h",
      details: [
        "Liste personnalisée des documents",
        "Vérification de conformité",
        "Assistance pour les pièces manquantes",
        "Préparation du dossier complet"
      ],
      color: "from-green-500 to-emerald-500"
    },
    {
      number: "03",
      icon: Send,
      title: "Transmission au notaire",
      description: "Envoi sécurisé et suivi du dossier auprès du notaire partenaire",
      duration: "48h",
      details: [
        "Sélection du notaire optimal",
        "Transmission sécurisée",
        "Suivi en temps réel",
        "Validation juridique"
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      number: "04",
      icon: PenTool,
      title: "Signature officielle",
      description: "Rendez-vous de signature en présentiel ou par visioconférence",
      duration: "1h",
      details: [
        "Planification flexible",
        "Signature sécurisée",
        "Présence du notaire",
        "Authentification immédiate"
      ],
      color: "from-orange-500 to-red-500"
    },
    {
      number: "05",
      icon: Download,
      title: "Remise du bail",
      description: "Réception de votre bail notarié avec force exécutoire",
      duration: "Immédiat",
      details: [
        "Document authentique",
        "Force exécutoire immédiate",
        "Copies certifiées",
        "Archivage sécurisé"
      ],
      color: "from-indigo-500 to-purple-500"
    }
  ];

  const documents = [
    {
      category: "Propriétaire",
      icon: Users,
      items: [
        { name: "Titre de propriété", required: true },
        { name: "Diagnostics techniques (DPE, etc.)", required: true },
        { name: "Pièce d'identité", required: true },
        { name: "Justificatif de domicile", required: false }
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      category: "Locataire", 
      icon: Shield,
      items: [
        { name: "Pièce d'identité", required: true },
        { name: "Justificatifs de revenus (3 derniers)", required: true },
        { name: "Justificatif de domicile", required: true },
        { name: "Contrat de travail", required: false }
      ],
      color: "from-green-500 to-emerald-500"
    },
    {
      category: "Garant",
      icon: Star,
      items: [
        { name: "Pièce d'identité du garant", required: true },
        { name: "Justificatifs financiers", required: true },
        { name: "Acte d'engagement de caution", required: true },
        { name: "Avis d'imposition", required: false }
      ],
      color: "from-purple-500 to-pink-500"
    }
  ];

  return (
    <section id="process" className="py-20 bg-white relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50"></div>
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* En-tête */}
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 px-8 py-3 text-base font-semibold rounded-full">
            Notre processus
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-green-800 to-emerald-800 bg-clip-text text-transparent">
              5 étapes vers
            </span>
            <br />
            <span className="text-gray-900">votre bail notarié</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Un processus optimisé et transparent, conçu pour vous offrir une expérience fluide 
            et une sécurité juridique maximale.
          </p>
        </div>

        {/* Timeline interactive */}
        <div className="mb-24">
          {/* Navigation des étapes */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {steps.map((step, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={`flex items-center space-x-3 px-6 py-4 rounded-2xl transition-all duration-300 ${
                  activeStep === index
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xl scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-lg hover:shadow-xl'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activeStep === index ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  <span className={`text-sm font-bold ${
                    activeStep === index ? 'text-white' : 'text-gray-600'
                  }`}>
                    {step.number}
                  </span>
                </div>
                <span className="font-semibold">{step.title}</span>
              </button>
            ))}
          </div>

          {/* Contenu de l'étape active */}
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-12 shadow-2xl border border-blue-100">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Détails de l'étape */}
              <div className="space-y-8">
                <div className="flex items-center space-x-4">
                  {(() => {
                    const Icon = steps[activeStep].icon;
                    return (
                      <div className={`w-20 h-20 bg-gradient-to-br ${steps[activeStep].color} rounded-3xl flex items-center justify-center shadow-2xl`}>
                        <Icon className="h-10 w-10 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="text-sm font-semibold text-gray-500 mb-1">
                      Étape {steps[activeStep].number}
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">
                      {steps[activeStep].title}
                    </h3>
                  </div>
                </div>

                <p className="text-xl text-gray-600 leading-relaxed">
                  {steps[activeStep].description}
                </p>

                <div className="space-y-4">
                  {steps[activeStep].details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="flex items-center space-x-4">
                      <div className={`w-8 h-8 bg-gradient-to-br ${steps[activeStep].color} rounded-full flex items-center justify-center shadow-lg`}>
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-lg font-medium text-gray-800">{detail}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-6 pt-4">
                  <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-gray-900">{steps[activeStep].duration}</span>
                  </div>
                  <Button className={`bg-gradient-to-r ${steps[activeStep].color} hover:shadow-xl text-white px-8 py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105`}>
                    Commencer cette étape
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Visualisation */}
              <div className="relative">
                <div className="bg-white rounded-3xl p-8 shadow-2xl">
                  <div className="aspect-square flex flex-col justify-center items-center space-y-6">
                    {(() => {
                      const Icon = steps[activeStep].icon;
                      return (
                        <div className={`w-32 h-32 bg-gradient-to-br ${steps[activeStep].color} rounded-full flex items-center justify-center shadow-2xl animate-pulse`}>
                          <Icon className="h-16 w-16 text-white" />
                        </div>
                      );
                    })()}
                    <div className="text-center">
                      <h4 className="text-2xl font-bold text-gray-900 mb-2">
                        {steps[activeStep].title}
                      </h4>
                      <div className={`w-20 h-1 bg-gradient-to-r ${steps[activeStep].color} rounded-full mx-auto`}></div>
                    </div>
                  </div>
                </div>
                
                {/* Éléments décoratifs */}
                <div className={`absolute -top-4 -right-4 w-16 h-16 bg-gradient-to-br ${steps[activeStep].color} rounded-full opacity-20 blur-xl animate-pulse`}></div>
                <div className={`absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-br ${steps[activeStep].color} rounded-full opacity-15 blur-xl animate-pulse`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Section documents */}
        <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid lg:grid-cols-2">
            {/* Image */}
            <div className="relative h-64 lg:h-auto">
              <Image
                src="https://images.pexels.com/photos/4427541/pexels-photo-4427541.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Documents administratifs"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 to-transparent"></div>
              
              {/* Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center p-8 text-white">
                <h3 className="text-3xl font-bold mb-6">
                  Documents requis
                </h3>
                <p className="text-blue-100 text-lg mb-8">
                  Notre équipe vous accompagne dans la constitution de votre dossier 
                  et vérifie chaque document pour garantir la conformité.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="font-medium">Vérification automatique</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="font-medium">Assistance personnalisée</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <span className="font-medium">Sécurité garantie</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Liste des documents */}
            <div className="p-12 text-white">
              <div className="space-y-8">
                {documents.map((doc, index) => {
                  const DocIcon = doc.icon;
                  return (
                    <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                      <div className="flex items-center space-x-4 mb-6">
                        <div className={`w-12 h-12 bg-gradient-to-br ${doc.color} rounded-xl flex items-center justify-center shadow-lg`}>
                          <DocIcon className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="text-xl font-bold">{doc.category}</h4>
                      </div>
                      
                      <div className="space-y-3">
                        {doc.items.map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-2 h-2 rounded-full ${item.required ? 'bg-red-400' : 'bg-green-400'}`}></div>
                              <span className="text-sm">{item.name}</span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              item.required 
                                ? 'bg-red-500/20 text-red-300' 
                                : 'bg-green-500/20 text-green-300'
                            }`}>
                              {item.required ? 'Obligatoire' : 'Optionnel'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-8 p-6 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl border border-green-400/30">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-2">Accompagnement inclus</p>
                    <p className="text-blue-200 text-sm">
                      Notre équipe vous aide à constituer votre dossier et vérifie tous les documents 
                      pour garantir une validation rapide par le notaire.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
