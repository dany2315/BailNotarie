import React from 'react';

interface ServiceSchemaProps {
  name?: string;
  description?: string;
  provider?: {
    name: string;
    url: string;
  };
  areaServed?: string[];
  serviceType?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
  };
}

export function ServiceSchema({
  name = "Création de bail notarié",
  description = "Service d'accompagnement dans la création de bail notarié avec force exécutoire renforcée, procédures simplifiées et protection juridique maximale par des notaires certifiés.",
  provider = {
    name: "BailNotarie",
    url: "https://bailnotarie.fr"
  },
  areaServed = ["France"],
  serviceType = "Service juridique",
  offers = {
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock"
  },
  aggregateRating = {
    ratingValue: 4.9,
    reviewCount: 2000
  }
}: ServiceSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": name,
    "description": description,
    "provider": {
      "@type": "Organization",
      "name": provider.name,
      "url": provider.url,
      "logo": {
        "@type": "ImageObject",
        "url": "https://bailnotarie.fr/logoSans.png"
      }
    },
    "areaServed": areaServed.map(area => ({
      "@type": "Country",
      "name": area
    })),
    "serviceType": serviceType,
    "offers": {
      "@type": "Offer",
      "price": offers.price,
      "priceCurrency": offers.priceCurrency,
      "availability": offers.availability,
      "validFrom": "2024-01-01",
      "validThrough": "2025-12-31"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "itemReviewed": {
        "@type": "Service",
        "name": name
      },
      "ratingValue": aggregateRating.ratingValue,
      "reviewCount": aggregateRating.reviewCount,
      "bestRating": 5,
      "worstRating": 1
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services BailNotarie",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Force exécutoire renforcée",
            "description": "Procédures simplifiées et accélérées en cas d'impayés"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Protection juridique maximale",
            "description": "Sécurité renforcée avec acte authentique incontestable"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Accompagnement expert",
            "description": "Suivi par des notaires certifiés avec conseils juridiques"
          }
        }
      ]
    },
    "category": "Services juridiques",
    "audience": {
      "@type": "Audience",
      "audienceType": "Propriétaires bailleurs"
    },
    "availableChannel": {
      "@type": "ServiceChannel",
      "serviceUrl": "https://bailnotarie.fr/#contact",
      "servicePhone": "+33749387756",
      "serviceEmail": "contact@bailnotarie.fr"
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

export default ServiceSchema;
