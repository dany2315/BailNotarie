"use client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, FileCheck, Clock, Star, Award, Shield, Zap, ArrowRight , Phone} from "lucide-react";
import Image from "next/image";
import { Button } from "./ui/button";

export function StatsSection() {
  const mainStats = [
    {
      number: "2000+",
      label: "Clients satisfaits",
      icon: Users,
      color: "text-blue-600"
    },
    {
      number: "5000+",
      label: "Baux notariés",
      icon: FileCheck,
      color: "text-green-600"
    },
    {
      number: "48h",
      label: "Délai moyen",
      icon: Clock,
      color: "text-purple-600"
    },
    {
      number: "98%",
      label: "Satisfaction",
      icon: TrendingUp,
      color: "text-orange-600"
    }
  ];

  const achievements = [
    { icon: Award, text: "Certifié qualité" },
    { icon: Shield, text: "Sécurisé" },
    { icon: Zap, text: "Rapide" },
    { icon: Star, text: "Recommandé" }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Éléments décoratifs de fond */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
        <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-6 py-2 text-sm font-semibold">
              Nos chiffres
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-6">
              Une expertise reconnue
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Des années d'expérience au service de la sécurisation de vos baux
            </p>
        </div>

        {/* Statistiques principales en grille */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {mainStats.map((stat, index) => (
            <div key={index} className="relative group">
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                <div className="text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className={`text-4xl font-bold mb-2 ${stat.color}`}>
                    {stat.number}
                  </div>
                  <div className="text-lg font-semibold text-gray-800">
                    {stat.label}
                  </div>
                </div>
                
                {/* Effet de brillance au hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 group-hover:animate-shine"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Section avec image et badges */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="grid lg:grid-cols-2">
            {/* Image */}
            <div className="relative h-64 lg:h-auto">
              <Image
                src="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Bureau notarial moderne"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
            </div>
            
            {/* Contenu */}
            <div className="px-8 py-6 lg:p-12 flex flex-col justify-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Pourquoi nous choisir ?
              </h3>
              
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {achievements.map((achievement, index) => (
                  <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-full hover:bg-blue-50 transition-colors duration-200 pr-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-full">
                      <achievement.icon className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-medium text-gray-800">{achievement.text}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-xl text-center font-medium text-gray-900 mb-4">
            Rejoignez nos 2000+ clients satisfaits
          </h3>
            <Button 
            className="bg-green-600 hover:bg-green-700"
            onClick={() => {
              window.location.href = "tel:+33606060606";
            }}
            >
            Faire parti de nos clients satisfaits
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}