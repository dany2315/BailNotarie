import React from 'react';
import { OrganizationSchema } from './organization-schema';
import { LocalBusinessSchema } from './local-business-schema';
import { FAQSchema } from './faq-schema';
import { ArticleSchema } from './article-schema';


interface StructuredDataProps {
  page?: 'home' | 'service' | 'about' | 'contact' | 'blog' | 'article';
  customData?: any;
  article?: {
    title: string;
    description: string;
    content: string;
    slug: string;
    publishedAt: string;
    updatedAt: string;
    image?: string;
    author?: string;
    category?: {
      name: string;
      slug: string;
    };
  };
}

const faqs = [
  {
    question: "Qu'est-ce qu'un bail notarié ?",
    answer: "Un bail notarié est un contrat de location établi par un notaire qui bénéficie de la force exécutoire renforcée. Il permet un recouvrement accéléré des loyers impayés et une protection juridique maximale pour les propriétaires."
  },
  {
    question: "Quels sont les avantages d'un bail notarié ?",
    answer: "Les principaux avantages sont : force exécutoire renforcée, procédures d'expulsion accélérées, protection juridique maximale, acte authentique incontestable, et accompagnement par des notaires certifiés."
  },
  {
    question: "Combien coûte la création d'un bail notarié ?",
    answer: "Le coût varie selon la complexité du bail et les services inclus. Contactez-nous pour un devis personnalisé adapté à vos besoins spécifiques."
  },
  {
    question: "Quel est le délai pour créer un bail notarié ?",
    answer: "Le délai moyen est de 15 jours ouvrés, incluant la rédaction, la validation par le notaire et la signature. Les procédures simplifiées permettent une mise en place rapide."
  },
  {
    question: "Le bail notarié est-il valable dans toute la France ?",
    answer: "Oui, le bail notarié est valable sur tout le territoire français. Notre service couvre la France entière avec un accompagnement personnalisé dans chaque région."
  },
  {
    question: "Que se passe-t-il en cas de loyers impayés ?",
    answer: "Grâce à la force exécutoire renforcée, les procédures de recouvrement sont considérablement accélérées. Vous pouvez obtenir un titre exécutoire directement sans passer par les tribunaux."
  },
  {
    question: "Puis-je modifier un bail notarié existant ?",
    answer: "Oui, toute modification nécessite un avenant notarié. Notre équipe vous accompagne dans toutes les démarches de modification ou de renouvellement."
  },
  {
    question: "Quelle est la différence avec un bail classique ?",
    answer: "Le bail notarié offre une sécurité juridique supérieure avec force exécutoire renforcée, procédures accélérées et protection maximale, contrairement au bail classique qui nécessite des procédures judiciaires longues."
  },
  {
    question: "Dois-je être présent physiquement pour la signature ?",
    answer: "La présence physique est généralement requise pour la signature devant notaire, mais nous organisons les rendez-vous selon vos disponibilités et votre localisation."
  },
  {
    question: "Le bail notarié est-il conforme à la loi 2025-125 ?",
    answer: "Absolument. Nos baux notariés sont entièrement conformes à la nouvelle réglementation et aux dernières évolutions législatives en matière de location immobilière."
  },
  {
    question: "Comment puis-je obtenir un devis pour la création d'un bail notarié ?",
    answer: "Contactez-nous via notre formulaire de contact ou par téléphone. Nous vous fournirons un devis personnalisé adapté à vos besoins spécifiques."
  },
  {
    question: "Quel est le processus de création d'un bail notarié ?",
    answer: "Le processus est simple et rapide. Nous vous accompagnons dans toutes les étapes : rédaction du bail, validation par le notaire, signature et délivrance du document final."
  },
  {
    question: "Quel est le décret 2025-125 pour le bail notarié ?",
    answer: "La loi 2025-125 renforce les avantages du bail notarié en simplifiant davantage les procédures d'expulsion et en réduisant les délais d'exécution en cas d'impayés. Elle accorde également de nouvelles prérogatives aux notaires pour une protection accrue des propriétaires."
  },
]

export function StructuredData({ page = 'home', customData, article }: StructuredDataProps) {
  return (
    <>
      {/* Schéma Organization Principal - Éligible pour les étoiles et avis selon Google */}
      <OrganizationSchema />
      
      {/* Schéma LocalBusiness - Pour les informations locales et contact */}
      <LocalBusinessSchema />
      
      {/* Schéma FAQ - Pour les questions fréquentes et featured snippets */}
      <FAQSchema faqs={faqs} />
      
      {/* Schéma Article - Pour les articles de blog */}
      {page === 'article' && article && <ArticleSchema article={article} />}
      
      {/* Données personnalisées si fournies */}
      {customData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(customData, null, 2)
          }}
        />
      )}
    </>
  );
}

export default StructuredData;
