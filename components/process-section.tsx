"use client";
import { Badge } from "@/components/ui/badge";
import { Phone, FileText, Send, PenTool, Download, ArrowRight, Clock, CheckCircle } from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";

export function ProcessSection() {
  const steps = [
    {
      number: "1",
      icon: Phone,
      title: "Prise de contact",
      description: "Explication du fonctionnement et identification des besoins",
      duration: "15 min",
      color: "bg-blue-500"
    },
    {
      number: "2",
      icon: FileText,
      title: "Constitution du dossier",
      description: "Collecte de tous les documents nécessaires",
      duration: "24h",
      color: "bg-green-500"
    },
    {
      number: "3",
      icon: Send,
      title: "Transmission au notaire",
      description: "Vérification et validation des pièces",
      duration: "48h",
      color: "bg-purple-500"
    },
    {
      number: "4",
      icon: PenTool,
      title: "Signature",
      description: "Signature en présentiel ou visio sécurisée",
      duration: "1h",
      color: "bg-orange-500"
    },
    {
      number: "5",
      icon: Download,
      title: "Remise du bail",
      description: "Envoi du bail aux parties",
      duration: "Immédiat",
      color: "bg-red-500"
    }
  ];

  const documents = [
    {
      category: "Propriétaire",
      items: ["Titre de propriété", "Diagnostics (DPE, etc.)", "Pièce d'identité"]
    },
    {
      category: "Locataire", 
      items: ["Pièce d'identité", "Justificatif de revenus", "Justificatif de domicile"]
    },
    {
      category: "Garant",
      items: ["Documents si nécessaire", "Justificatifs financiers", "Engagement de caution"]
    }
  ];

  return (
    <section id="process" className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">

          <Badge className=" mb-8 bg-gradient-to-r from-green-400 to-green-800 text-white border-0 px-6 py-2 text-sm font-semibold">
            Processus
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-green-900 via-green-600 to-green-800 bg-clip-text text-transparent">
            5 étapes simples
            </span>
            <br />
            <span className="text-gray-900">vers votre bail notarié</span>
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Un processus transparent et efficace pour sécuriser votre location
          </p>
        </div>

        {/* Timeline moderne */}
        <div className="relative mb-20">
          {/* Ligne de progression */}
          <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 hidden lg:block"></div>
          
          <div className="space-y-12">
            {steps.map((step, index) => (
              <div key={index} className={`flex items-center ${index % 2 === 0 ? 'lg:flex-row ' : 'lg:flex-row-reverse ml-16 '} flex-col lg:space-x-8`}>
                {/* Contenu */}
                <div className={`flex-1 ${index % 2 === 0 ? 'lg:text-right' : 'lg:text-left'} text-center lg:text-left mb-8 lg:mb-0`}>
                  <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{step.title}</h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{step.duration}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{step.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Étape {step.number}/5</span>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                {/* Icône centrale */}
                <div className="relative z-10 flex-shrink-0">
                  <div className={`w-16 h-16 ${step.color} rounded-full flex items-center justify-center shadow-lg`}>
                    <step.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </div>

                {/* Espace pour équilibrer */}
                <div className="flex-1 hidden lg:block"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Section documents requis */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Image */}
            <div className="relative h-64 lg:h-auto">
              <Image
                src="https://images.pexels.com/photos/4427541/pexels-photo-4427541.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Documents administratifs"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-transparent"></div>
              
              {/* Badge flottant */}
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-gray-900">Documents requis</span>
                </div>
              </div>
            </div>
            
            {/* Liste des documents */}
            <div className="p-8 lg:p-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-8">
                Préparez vos documents
              </h3>
              
              <div className="space-y-6">
                {documents.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-xl p-6 hover:border-blue-200 hover:bg-blue-50/30 transition-all duration-200">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mr-3"></div>
                      {doc.category}
                    </h4>
                    <ul className="space-y-2">
                      {doc.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center text-gray-600">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-3 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Accompagnement inclus</p>
                    <p className="text-sm text-gray-600">Notre équipe vous aide à constituer votre dossier et vérifie tous les documents.</p>
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