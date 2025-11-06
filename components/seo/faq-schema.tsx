import React from "react";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs?: FAQItem[];
  /** URL absolue de la page (ex: https://www.bailnotarie.fr/#faq ou la page dédiée) */
  pageUrl?: string;
  /** Langue BCP47 */
  lang?: string; // ex: "fr-FR"
}

export function FAQSchema({
  faqs = [],
  pageUrl = "https://www.bailnotarie.fr",
  lang = "fr-FR",
}: FAQSchemaProps) {
  // Petite normalisation du texte
  const norm = (s: string) => s.trim();

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    "inLanguage": lang,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": pageUrl,
    },
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": norm(faq.question),
      "acceptedAnswer": {
        "@type": "Answer",
        "text": norm(faq.answer),
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      // pas d'indentation pour réduire la taille
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default FAQSchema;
