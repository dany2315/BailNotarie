import React from 'react';

interface OptimizedServiceSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  provider?: {
    name: string;
    url: string;
    logo?: string;
    telephone?: string;
    email?: string;
    address?: {
      streetAddress?: string;
      addressLocality?: string;
      postalCode?: string;
      addressCountry?: string;
    };
  };
  areaServed?: string[];
  serviceType?: string;
  category?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
    validFrom?: string;
    validThrough?: string;
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
    datePublished: string;
  }>;
  hasOfferCatalog?: Array<{
    name: string;
    description: string;
  }>;
  audience?: {
    audienceType: string;
    geographicArea: string;
  };
  providerMobility?: string;
  hoursAvailable?: Array<{
    dayOfWeek: string;
    opens: string;
    closes: string;
  }>;
}

export function OptimizedServiceSchema({
  name = "Service d'accompagnement à la création de bail notarié",
  description = "Service professionnel d'accompagnement dans la création de bail notarié avec force exécutoire renforcée. Accompagnement par des notaires certifiés pour une protection juridique maximale et des procédures simplifiées.",
  url = "https://bailnotarie.fr",
  provider = {
    name: "BailNotarie",
    url: "https://bailnotarie.fr",
    logo: "https://bailnotarie.fr/logoSans.png",
    telephone: "+33749387756",
    email: "contact@bailnotarie.fr",
    address: {
      addressCountry: "FR"
    }
  },
  areaServed = ["France", "Europe"],
  serviceType = "Service juridique professionnel",
  category = "Services juridiques",
  offers = {
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    validFrom: "2024-01-01",
    validThrough: "2025-12-31"
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
  ],
  audience = {
    audienceType: "Propriétaires bailleurs",
    geographicArea: "France"
  },
  providerMobility = "https://schema.org/Static",
  hoursAvailable = [
    {
      dayOfWeek: "Monday",
      opens: "09:00",
      closes: "18:00"
    },
    {
      dayOfWeek: "Tuesday", 
      opens: "09:00",
      closes: "18:00"
    },
    {
      dayOfWeek: "Wednesday",
      opens: "09:00", 
      closes: "18:00"
    },
    {
      dayOfWeek: "Thursday",
      opens: "09:00",
      closes: "18:00"
    },
    {
      dayOfWeek: "Friday",
      opens: "09:00",
      closes: "18:00"
    }
  ]
}: OptimizedServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "url": url,
    "serviceType": serviceType,
    "category": category,
    "provider": {
      "@type": "Organization",
      "name": provider.name,
      "url": provider.url,
      "logo": {
        "@type": "ImageObject",
        "url": provider.logo,
        "width": 200,
        "height": 200
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": provider.telephone,
        "email": provider.email,
        "contactType": "customer service",
        "availableLanguage": "French"
      },
      "address": {
        "@type": "PostalAddress",
        "addressCountry": provider.address?.addressCountry
      },
      "sameAs": [
        "https://bailnotarie.fr",
        "mailto:contact@bailnotarie.fr",
        "tel:+33749387756"
      ]
    },
    "areaServed": areaServed.map(area => ({
      "@type": "Country",
      "name": area
    })),
    "audience": {
      "@type": "Audience",
      "audienceType": audience.audienceType,
      "geographicArea": {
        "@type": "Country",
        "name": audience.geographicArea
      }
    },
    "providerMobility": providerMobility,
    "hoursAvailable": hoursAvailable.map(schedule => ({
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": schedule.dayOfWeek,
      "opens": schedule.opens,
      "closes": schedule.closes
    })),
    "offers": {
      "@type": "Offer",
      "price": offers.price,
      "priceCurrency": offers.priceCurrency,
      "availability": offers.availability,
      "validFrom": offers.validFrom,
      "validThrough": offers.validThrough,
      "seller": {
        "@type": "Organization",
        "name": provider.name,
        "url": provider.url
      }
    },
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
        "@type": "Service",
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
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Force exécutoire",
        "value": "Renforcée"
      },
      {
        "@type": "PropertyValue", 
        "name": "Type d'acte",
        "value": "Authentique"
      },
      {
        "@type": "PropertyValue",
        "name": "Accompagnement",
        "value": "Notaires certifiés"
      },
      {
        "@type": "PropertyValue",
        "name": "Délai moyen",
        "value": "15 jours"
      }
    ],
    "inLanguage": "fr-FR",
    "isRelatedTo": [
      {
        "@type": "Service",
        "name": "Conseil juridique immobilier"
      },
      {
        "@type": "Service", 
        "name": "Rédaction de contrats de location"
      }
    ],
    "serviceOutput": "Bail notarié avec force exécutoire",
    "termsOfService": "https://bailnotarie.fr/conditions",
    "providerService": {
      "@type": "Service",
      "name": "Accompagnement juridique professionnel"
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

export default OptimizedServiceSchema;
