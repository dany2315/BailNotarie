"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Phone, HelpCircle, Users, Shield, Clock, FileText, Euro, Scale, CheckCircle, Code } from "lucide-react";

export function FAQSection() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const faqCategories = [
    {
      title: "À propos de BailNotarie",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      questions: [
        {
          question: "Qui êtes-vous exactement ?",
          answer: "BailNotarie est une société spécialisée dans l'accompagnement et la facilitation des démarches de bail notarié. Nous ne sommes pas des notaires, mais nous travaillons en partenariat avec un réseau de plus de 150 notaires certifiés à travers la France. Notre rôle est de simplifier et d'accélérer le processus en préparant votre dossier et en coordonnant avec le notaire."
        },
        {
          question: "Quelle est votre valeur ajoutée ?",
          answer: "Nous vous évitons les démarches complexes et chronophages. Au lieu de chercher un notaire, préparer seul votre dossier et gérer les allers-retours, nous nous occupons de tout : constitution du dossier, vérification des pièces, coordination avec le notaire, et suivi jusqu'à la signature. Nous transformons un processus qui peut prendre des semaines en quelques jours."
        },
        {
          question: "Depuis quand existez-vous ?",
          answer: "BailNotarie accompagne les propriétaires depuis 2019. Nous avons déjà traité plus de 5000 dossiers de baux notariés avec un taux de satisfaction de 98%. Notre expertise nous permet de connaître parfaitement les exigences de chaque notaire et d'optimiser les délais."
        }
      ]
    },
    {
      title: "Le bail notarié",
      icon: FileText,
      color: "from-green-500 to-emerald-500",
      questions: [
        {
          question: "Qu'est-ce qu'un bail notarié et en quoi diffère-t-il d'un bail classique ?",
          answer: "Un bail notarié est un contrat de location authentifié par un notaire. Contrairement au bail sous seing privé classique, il devient un acte authentique doté d’une force exécutoire immédiate. Cela signifie qu’en cas d’impayés, vous pouvez directement procéder à une saisie sans passer par un tribunal, réduisant le délai à 2-3 mois contre 12-18 mois pour un bail classique. En plus de cette rapidité, il offre une sécurité juridique maximale car il est validé par un professionnel du droit."
        },
        {
          question: "Le bail notarié est-il légal ?",
          answer: "Absolument ! Le bail notarié est parfaitement légal et reconnu par la loi française. L'article 1369 du Code civil précise que l'acte authentique fait foi de la convention qu'il renferme. C'est même la forme la plus sécurisée juridiquement pour un contrat de location."
        },
        {
          question: "Tous les types de location peuvent-ils être notariés ?",
          answer: "Oui, tous les types de baux peuvent être notariés : bail d'habitation, bail commercial, bail rural, colocation, location meublée ou vide. Le bail notarié s'adapte à toutes les situations locatives et respecte toutes les réglementations spécifiques (loi Alur, etc.)."
        }
      ]
    },
    {
      title: "Coûts et tarification",
      icon: Euro,
      color: "from-orange-500 to-red-500",
      questions: [
        {
          question: "Combien coûte un bail notarié ?",
          answer: "Le prix d’un bail notarié est strictement fixé par la loi. Il correspond à 50 % d’un mois de loyer hors charges et hors taxes. Exemple : pour un loyer de 1 000 € HT, les émoluments dus au notaire s’élèvent à 500 €. Ce montant est versé directement à l’étude notariale. Référence juridique : articles A.444-172 et suivants du Code de commerce (tarif réglementé des notaires)."
        },
        {
          question: "Y a-t-il des frais cachés ?",
          answer: "Non, nous pratiquons une tarification transparente. Le devis que nous vous proposons inclut tous nos services : constitution du dossier, coordination avec le notaire, suivi complet. Seuls les émoluments du notaire (tarif réglementé) s'ajoutent à nos honoraires."
        },
        {
          question: "Puis-je obtenir un devis gratuit ?",
          answer: "Oui, nous proposons un devis gratuit et sans engagement. Contactez-nous par téléphone ou via notre formulaire, nous étudions votre situation et vous proposons une solution adaptée avec un tarif précis."
        },
        {
          question: "Le coût est-il déductible fiscalement ?",
          answer: "Pour les propriétaires bailleurs, les frais de bail notarié peuvent être déductibles des revenus fonciers en tant que frais de gestion. Nous vous conseillons de consulter votre comptable ou conseiller fiscal pour votre situation spécifique."
        }
      ]
    },
    {
      title: "Sécurité et garanties",
      icon: Shield,
      color: "from-red-500 to-pink-500",
      questions: [
        {
          question: "Quelles garanties offrez-vous ?",
          answer: "Nous garantissons la conformité juridique de votre bail et le respect des délais annoncés. Si le bail présente un vice de forme imputable à notre service, nous prenons en charge les corrections. De plus, nous sommes assurés en responsabilité civile professionnelle."
        },
        {
          question: "Que se passe-t-il en cas de litige avec le locataire ?",
          answer: "Le bail notarié vous donne un avantage considérable : la force exécutoire immédiate. En cas d'impayés, vous pouvez directement faire appel à un huissier pour une saisie, sans passer par le tribunal. Cela réduit considérablement les délais et les coûts de recouvrement."
        },
        {
          question: "Le bail notarié protège-t-il mieux qu'une assurance loyers impayés ?",
          answer: "Le bail notarié et l'assurance loyers impayés sont complémentaires. Le bail notarié vous permet d'agir plus rapidement en cas de problème, tandis que l'assurance vous indemnise. Certaines assurances proposent même des tarifs préférentiels pour les baux notariés car le risque est réduit."
        }
      ]
    },
    {
      title: "Questions pratiques",
      icon: HelpCircle,
      color: "from-indigo-500 to-purple-500",
      questions: [
        {
          question: "Quels documents dois-je fournir ?",
          answer: "Pour le propriétaire : titre de propriété, diagnostics obligatoires, pièce d'identité. Pour le locataire : pièce d'identité, justificatifs de revenus, justificatif de domicile. Pour le garant (si applicable) : documents d'identité et justificatifs financiers. Nous vous fournissons une liste détaillée selon votre situation."
        },
        {
          question: "Puis-je modifier le bail après signature ?",
          answer: "Comme tout acte notarié, les modifications nécessitent un avenant notarié. Cependant, nous préparons soigneusement le bail initial pour éviter les modifications ultérieures. Nous incluons toutes les clauses nécessaires dès la première version."
        },
        {
          question: "Le bail notarié est-il valable dans toute la France ?",
          answer: "Oui, le bail notarié a une valeur juridique dans toute la France. Notre réseau de notaires partenaires couvre l'ensemble du territoire, nous pouvons donc traiter votre dossier quelle que soit la localisation du bien."
        },
        {
          question: "Que faire si le locataire refuse de signer chez le notaire ?",
          answer: "Si le locataire refuse la signature notariée, vous pouvez maintenir cette exigence (c'est votre droit) ou accepter un bail classique. Beaucoup de locataires acceptent finalement car cela témoigne du sérieux de la location. Nous pouvons vous aider à expliquer les avantages au locataire."
        }
      ]
    }
  ];

  return (
    <section id="faq" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0 px-6 py-2 text-sm font-semibold">
            Questions fréquentes
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-8">
            <span className="bg-gradient-to-r from-gray-900 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Tout savoir sur
            </span>
            <br />
            <span className="text-gray-900">le bail notarié</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez les réponses aux questions les plus fréquentes sur notre service et le bail notarié
          </p>
        </div>

        <div className="space-y-8">
          {faqCategories.map((category, categoryIndex) => (
            <Card key={categoryIndex} className="overflow-hidden pt-0">
              <div className={`bg-gradient-to-r ${category.color} p-6`}>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {category.questions.map((faq, faqIndex) => {
                  const globalIndex = categoryIndex * 100 + faqIndex;
                  const isOpen = openItems.includes(globalIndex);
                  
                  return (
                    <div key={faqIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleItem(globalIndex)}
                        className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <span className="font-semibold text-gray-900 pr-4">{faq.question}</span>
                        {isOpen ? (
                          <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                      </button>
                      
                      {isOpen && (
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                          <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <Card className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="max-w-2xl mx-auto">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <HelpCircle className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Une question spécifique ?
              </h3>
              <p className="text-gray-600 mb-6">
                Notre équipe d'experts est là pour répondre à toutes vos questions sur le bail notarié
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = 'tel:0123456789'}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Parler à un expert
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  Poser une question
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}