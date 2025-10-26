import React from 'react';

interface FAQSchemaProps {
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQSchema({
  faqs = [
    {
      question: "Qu'est-ce qu'un bail notarié ?",
      answer: "Un bail notarié est un contrat de location authentifié par un notaire, doté d'une force exécutoire renforcée qui permet des procédures simplifiées et accélérées en cas d'impayés."
    },
    {
      question: "Quels sont les avantages du bail notarié ?",
      answer: "Le bail notarié offre une force exécutoire renforcée, des procédures simplifiées, une protection juridique maximale et un accompagnement expert par des notaires certifiés."
    },
    {
      question: "Combien coûte un bail notarié ?",
      answer: "Le coût d'un bail notarié varie selon la complexité du dossier. Contactez-nous pour un devis gratuit et personnalisé adapté à vos besoins."
    },
    {
      question: "Quel est le délai pour créer un bail notarié ?",
      answer: "Grâce à nos procédures modernisées, nous pouvons créer votre bail notarié rapidement avec un accompagnement personnalisé par nos notaires certifiés."
    },
    {
      question: "Le bail notarié est-il plus sécurisé ?",
      answer: "Oui, le bail notarié offre une sécurité juridique maximale avec un acte authentique incontestable et des garanties légales étendues."
    },
    {
      question: "Que change la nouvelle loi 2025-125 pour le bail notarié ?",
      answer: "La loi 2025-125 renforce les avantages du bail notarié en simplifiant davantage les procédures d'expulsion et en réduisant les délais d'exécution en cas d'impayés. Elle accorde également de nouvelles prérogatives aux notaires pour une protection accrue des propriétaires."
    },
  ]
}: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2)
      }}
    />
  );
}

export default FAQSchema;
