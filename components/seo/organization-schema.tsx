import React from 'react';

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  image?: string;
  telephone?: string;
  email?: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  sameAs?: string[];
  foundingDate?: string;
  numberOfEmployees?: string;
  areaServed?: string[];
  knowsAbout?: string[];
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
    datePublished: string;
  }>;
  hasOfferCatalog?: Array<{
    name: string;
    description: string;
  }>;
}

export function OrganizationSchema({
  name = "BailNotarie",
  description = "Expert en création de baux notariés avec force exécutoire renforcée. Accompagnement par des notaires certifiés pour une protection juridique maximale et des procédures simplifiées.",
  url = "https://www.bailnotarie.fr",
  logo = "https://www.bailnotarie.fr/logoSans.png",
  image = "https://www.bailnotarie.fr/og-cover-v2.png",
  telephone = "+33749387756",
  email = "contact@bailnotarie.fr",
  address = {
    addressCountry: "FR"
  },
  sameAs = [
    "https://www.bailnotarie.fr",
    "mailto:contact@bailnotarie.fr",
    "tel:+33749387756"
  ],
  foundingDate = "2019",
  numberOfEmployees = "10-50",
  areaServed = ["France", "Europe"],
  knowsAbout = [
    "Bail notarié",
    "Force exécutoire",
    "Droit immobilier",
    "Notariat",
    "Bail notaire",
    "Bail location",
    "Bail location notarié",
    "Loi 2025-125",
    "Location immobilière",
    "Protection juridique",
    "Accompagnement juridique",
    "Acte authentique",
    "Procédures simplifiées"
  ],
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
      reviewBody: "Excellent service d'accompagnement ! Le processus était simple et rapide. Mon bail notarié m'a permis de récupérer rapidement les loyers impayés grâce à la force exécutoire renforcée.",
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
  hasOfferCatalog = [
    {
      name: "Création de bail notarié",
      description: "Création de bail notarié avec force exécutoire renforcée"
    },
    {
      name: "Accompagnement juridique",
      description: "Accompagnement par des notaires certifiés"
    },
    {
      name: "Validation authentique",
      description: "Validation par acte authentique incontestable"
    },
    {
      name: "Protection maximale",
      description: "Protection juridique maximale pour propriétaires"
    }
  ]
}: OrganizationSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": name,
    "description": description,
    "url": url,
    "logo": {
      "@type": "ImageObject",
      "url": logo,
      "width": 200,
      "height": 200
    },
    "image": {
      "@type": "ImageObject",
      "url": image,
      "width": 1200,
      "height": 630
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": telephone,
      "email": email,
      "contactType": "customer service",
      "availableLanguage": "French"
    },
    "address": {
      "@type": "PostalAddress",
      "addressCountry": address.addressCountry
    },
    "sameAs": sameAs,
    "foundingDate": foundingDate,
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "value": numberOfEmployees
    },
    "areaServed": areaServed.map(area => ({
      "@type": "Country",
      "name": area
    })),
    "knowsAbout": knowsAbout,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": aggregateRating.ratingValue,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": aggregateRating.bestRating,
      "worstRating": aggregateRating.worstRating
    },
    "review": reviews.map(review => ({
      "@type": "Review",
      "itemReviewed": {
        "@type": "Organization",
        "name": name
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
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services BailNotarie",
      "itemListElement": hasOfferCatalog.map((service, index) => ({
        "@type": "Offer",
        "position": index + 1,
        "itemOffered": {
          "@type": "Service",
          "name": service.name,
          "description": service.description
        }
      }))
    },
    "keywords": [
      "bail notarié",
      "force exécutoire",
      "notaire",
      "location",
      "bail",
      "acte authentique",
      "procédures simplifiées",
      "protection juridique",
      "accompagnement juridique",
      "service notarial",
      "bail location",
      "propriétaire bailleur",
      "recouvrement loyers",
      "expulsion locataire"
    ],
    "additionalType": "https://schema.org/LegalService",
    "inLanguage": "fr-FR",
    "serviceArea": {
      "@type": "Country",
      "name": "France"
    },
    "hasCredential": [
      {
        "@type": "EducationalOccupationalCredential",
        "name": "Notaires certifiés",
        "description": "Certification professionnelle notariale"
      }
    ],
    "memberOf": [
      {
        "@type": "Organization",
        "name": "Ordre des Notaires"
      }
    ],
    "award": [
      {
        "@type": "Award",
        "name": "Service de qualité",
        "description": "Reconnu pour l'excellence du service"
      }
    ]
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

export default OrganizationSchema;
