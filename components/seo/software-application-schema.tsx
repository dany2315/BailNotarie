import React from 'react';

interface SoftwareApplicationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  applicationCategory?: string;
  operatingSystem?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
  reviews?: Array<{
    author: string;
    rating: number;
    reviewBody: string;
    datePublished?: string;
  }>;
  author?: {
    name: string;
    url?: string;
  };
  publisher?: {
    name: string;
    url?: string;
  };
  screenshot?: string[];
  softwareVersion?: string;
  datePublished?: string;
  dateModified?: string;
}

export function SoftwareApplicationSchema({
  name = "BailNotarie",
  description = "Plateforme de création de baux notariés avec force exécutoire renforcée. Procédures simplifiées, protection maximale et accompagnement expert par des notaires certifiés.",
  url = "https://bailnotarie.fr",
  applicationCategory = "BusinessApplication",
  operatingSystem = "Web Browser",
  offers = {
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock"
  },
  aggregateRating = {
    ratingValue: 4.9,
    reviewCount: 2000,
    bestRating: 5,
    worstRating: 1
  },
  reviews = [
    {
      author: "Marie Dubois",
      rating: 5,
      reviewBody: "Excellent service ! Le processus était simple et rapide. Mon bail notarié m'a permis de récupérer rapidement les loyers impayés grâce à la force exécutoire renforcée.",
      datePublished: "2024-12-15"
    },
    {
      author: "Jean Martin",
      rating: 5,
      reviewBody: "Accompagnement professionnel par des notaires certifiés. Les procédures simplifiées ont considérablement réduit les délais. Je recommande vivement BailNotarie.",
      datePublished: "2024-12-10"
    },
    {
      author: "Sophie Leroy",
      rating: 5,
      reviewBody: "Protection juridique maximale avec un acte authentique incontestable. L'équipe est très réactive et les conseils sont précieux pour sécuriser ma location.",
      datePublished: "2024-12-05"
    },
    {
      author: "Pierre Moreau",
      rating: 4,
      reviewBody: "Service de qualité avec une équipe compétente. Le bail notarié offre une sécurité supplémentaire importante pour les propriétaires.",
      datePublished: "2024-11-28"
    },
    {
      author: "Claire Bernard",
      rating: 5,
      reviewBody: "Force exécutoire renforcée très efficace. Les procédures d'expulsion ont été considérablement accélérées. Un investissement qui vaut le coup.",
      datePublished: "2024-11-20"
    }
  ],
  author = {
    name: "BailNotarie",
    url: "https://bailnotarie.fr"
  },
  publisher = {
    name: "BailNotarie",
    url: "https://bailnotarie.fr"
  },
  screenshot = [
    "https://bailnotarie.fr/og-cover-v2.png"
  ],
  softwareVersion = "2025.1",
  datePublished = "2024-01-01",
  dateModified = new Date().toISOString().split('T')[0]
}: SoftwareApplicationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": name,
    "description": description,
    "url": url,
    "applicationCategory": applicationCategory,
    "operatingSystem": operatingSystem,
    "offers": {
      "@type": "Offer",
      "price": offers.price,
      "priceCurrency": offers.priceCurrency,
      "availability": offers.availability,
      "seller": {
        "@type": "Organization",
        "name": publisher.name,
        "url": publisher.url
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "itemReviewed": {
        "@type": "Service",
        "name": name,
        "url": url
      },
      "ratingValue": aggregateRating.ratingValue,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": aggregateRating.bestRating,
      "worstRating": aggregateRating.worstRating
    },
    "review": reviews.map(review => ({
      "@type": "Review",
        "itemReviewed": {
          "@type": "Service",
          "name": name,
          "url": url
        },
      "author": {
        "@type": "Person",
        "name": review.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": review.rating,
        "bestRating": 5,
        "worstRating": 1
      },
      "reviewBody": review.reviewBody,
      "datePublished": review.datePublished
    })),
    "author": {
      "@type": "Organization",
      "name": author.name,
      "url": author.url
    },
    "publisher": {
      "@type": "Organization",
      "name": publisher.name,
      "url": publisher.url,
      "logo": {
        "@type": "ImageObject",
        "url": "https://bailnotarie.fr/logoSans.png",
        "width": 200,
        "height": 200
      }
    },
    "screenshot": screenshot.map(img => ({
      "@type": "ImageObject",
      "url": img
    })),
    "softwareVersion": softwareVersion,
    "datePublished": datePublished,
    "dateModified": dateModified,
    "inLanguage": "fr-FR",
    "keywords": [
      "bail notarié",
      "force exécutoire",
      "notaire",
      "location",
      "bail",
      "acte authentique",
      "procédures simplifiées",
      "protection juridique"
    ],
    "featureList": [
      "Force exécutoire renforcée",
      "Procédures simplifiées",
      "Protection juridique maximale",
      "Accompagnement par notaires certifiés",
      "Validation authentique",
      "Recours accélérés en cas d'impayés"
    ],
    "screenshots": screenshot.map(img => ({
      "@type": "ImageObject",
      "url": img,
      "width": 1200,
      "height": 630
    })),
    "softwareRequirements": "Navigateur web moderne",
    "permissions": "Accès internet requis",
    "releaseNotes": "Nouveaux avantages du bail notarié avec force exécutoire renforcée et procédures simplifiées",
    "supportingData": {
      "@type": "DataCatalog",
      "name": "Documentation BailNotarie",
      "url": "https://bailnotarie.fr/#faq"
    }
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

export default SoftwareApplicationSchema;
