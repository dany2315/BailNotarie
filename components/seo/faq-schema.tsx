"use client";

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs?: FAQItem[];
  items?: FAQItem[];
  /** URL absolue de la page (ex: https://www.bailnotarie.fr/#faq ou la page dédiée) */
  pageUrl?: string;
  /** Langue BCP47 */
  lang?: string; // ex: "fr-FR"
}

export function FAQSchema({
  faqs = [],
  items = [],
  pageUrl = "https://www.bailnotarie.fr",
  lang = "fr-FR",
}: FAQSchemaProps) {
  const allFaqs = faqs.length ? faqs : items;
  if (!allFaqs.length) return null;

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
    "mainEntity": allFaqs.map((faq) => ({
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

export function FaqSchema(props: { items: FAQItem[]; pageUrl?: string; lang?: string }) {
  return <FAQSchema items={props.items} pageUrl={props.pageUrl} lang={props.lang} />;
}

export default FAQSchema;
