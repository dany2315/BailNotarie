"use client";

import { FAQ } from "@/components/ui/faq-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, HelpCircle } from "lucide-react";

export function FAQSection() {
  const categories = {
    "a-propos": "À propos de BailNotarie",
    "bail-notarie": "Le bail notarié",
    "couts": "Coûts et tarification",
    "securite": "Sécurité et garanties",
    "pratique": "Questions pratiques"
  };

  const faqData = {
    "a-propos": [
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
        answer: "BailNotarie accompagne les propriétaires depuis 2024. Nous avons déjà traité plus de 200 dossiers de baux notariés avec un taux de satisfaction de 98%. Notre expertise nous permet de connaître parfaitement les exigences de chaque notaire et d'optimiser les délais."
      }
    ],
    "bail-notarie": [
      {
        question: "Qu'est-ce qu'un bail notarié et en quoi diffère-t-il d'un bail classique ?",
        answer: "Un bail notarié est un contrat de location authentifié par un notaire. Contrairement au bail sous seing privé classique, il devient un acte authentique doté d'une force exécutoire immédiate. Cela signifie qu'en cas d'impayés, vous pouvez directement procéder à une saisie sans passer par un tribunal, réduisant le délai à 2-3 mois contre 12-18 mois pour un bail classique. En plus de cette rapidité, il offre une sécurité juridique maximale car il est validé par un professionnel du droit."
      },
      {
        question: "Le bail notarié est-il légal ?",
        answer: "Absolument ! Le bail notarié est parfaitement légal et reconnu par la loi française. L'article 1369 du Code civil précise que l'acte authentique fait foi de la convention qu'il renferme. C'est même la forme la plus sécurisée juridiquement pour un contrat de location."
      },
      {
        question: "Tous les types de location peuvent-ils être notariés ?",
        answer: "Oui, tous les types de baux peuvent être notariés : bail d'habitation, bail commercial, bail rural, colocation, location meublée ou vide. Le bail notarié s'adapte à toutes les situations locatives et respecte toutes les réglementations spécifiques (loi Alur, etc.)."
      }
    ],
    "couts": [
      {
        question: "Combien coûte un bail notarié ?",
        answer: "Le prix d'un bail notarié est strictement fixé par la loi. Il correspond à 50 % d'un mois de loyer hors charges et hors taxes. Exemple : pour un loyer de 1 000 € HT, les émoluments dus au notaire s'élèvent à 500 € HT. Ce montant est versé directement à l'étude notariale. Référence juridique : articles A.444-103 et suivants du Code de commerce (tarif réglementé des notaires)."
      },
      {
        question: "Y a-t-il des frais cachés ?",
        answer: "Non, la tarification est exclusivement le tarif du bail notarié, soit 50% du mois de loyer hors charges et hors taxes."
      },
      {
        question: "Le coût est-il déductible fiscalement ?",
        answer: "Pour les propriétaires bailleurs, les frais de bail notarié peuvent être déductibles des revenus fonciers en tant que frais de gestion. Nous vous conseillons de consulter votre comptable ou conseiller fiscal pour votre situation spécifique."
      }
    ],
    "securite": [

      {
        question: "Que se passe-t-il en cas de litige avec le locataire ?",
        answer: "Le bail notarié vous donne un avantage considérable : la force exécutoire immédiate. En cas d'impayés, vous pouvez directement faire appel à un huissier pour une saisie, sans passer par le tribunal. Cela réduit considérablement les délais et les coûts de recouvrement."
      },
      {
        question: "Le bail notarié protège-t-il mieux qu'une assurance loyers impayés ?",
        answer: "Le bail notarié et l'assurance loyers impayés sont complémentaires. Le bail notarié vous permet d'agir plus rapidement en cas de problème, tandis que l'assurance vous indemnise."
      }
    ],
    "pratique": [
      {
        question: "Quels documents dois-je fournir ?",
        answer: "Pour le propriétaire : titre de propriété, diagnostics obligatoires, pièce d'identité, assurance. Pour le locataire : pièce d'identité, assurance habitations. Pour le garant (si applicable): pièce d'identité. Nous vous fournissons une liste détaillée selon votre situation."
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
  };

  return (
    <section id="faq" className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FAQ 
          title="Tout savoir sur le bail notarié"
          subtitle="Questions fréquentes"
          categories={categories}
          faqData={faqData}
          className="bg-transparent"
        />
      
      </div>
    </section>
  );
}