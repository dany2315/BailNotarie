import React from 'react';

interface LocalBusinessSchemaProps {
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
  geo?: {
    latitude?: number;
    longitude?: number;
  };
  openingHours?: string[];
  priceRange?: string;
  paymentAccepted?: string[];
  currenciesAccepted?: string[];
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
  sameAs?: string[];
  hasOfferCatalog?: Array<{
    name: string;
    description: string;
  }>;
  areaServed?: string[];
  serviceArea?: {
    geoMidpoint?: {
      latitude: number;
      longitude: number;
    };
    geoRadius?: number;
  };
}

export function LocalBusinessSchema({
  name = "BailNotarie",
  description = "Service professionnel d'accompagnement dans la création de bail notarié avec force exécutoire renforcée. Accompagnement par des notaires certifiés pour une protection juridique maximale.",
  url = "https://bailnotarie.fr",
  logo = "https://bailnotarie.fr/logoSans.png",
  image = "https://bailnotarie.fr/og-cover-v2.png",
  telephone = "+33749387756",
  email = "contact@bailnotarie.fr",
  address = {
    addressCountry: "FR"
  },
  geo = {
    latitude: 48.8566,
    longitude: 2.3522
  },
  openingHours = [
    "Mo-Fr 09:00-18:00"
  ],
  priceRange = "€€",
  paymentAccepted = ["Cash", "Credit Card", "Bank Transfer"],
  currenciesAccepted = ["EUR"],
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
  sameAs = [
    "https://bailnotarie.fr",
    "mailto:contact@bailnotarie.fr",
    "tel:+33749387756"
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
  areaServed = ["France", "Europe"],
  serviceArea = {
    geoMidpoint: {
      latitude: 48.8566,
      longitude: 2.3522
    },
    geoRadius: 1000000
  }
}: LocalBusinessSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
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
    "telephone": telephone,
    "email": email,
    "address": {
      "@type": "PostalAddress",
      "addressCountry": address.addressCountry
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": geo.latitude,
      "longitude": geo.longitude
    },
    "openingHours": openingHours,
    "priceRange": priceRange,
    "paymentAccepted": paymentAccepted,
    "currenciesAccepted": currenciesAccepted,
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
        "@type": "LocalBusiness",
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
    "sameAs": sameAs,
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
    "areaServed": areaServed.map(area => ({
      "@type": "Country",
      "name": area
    })),
    "serviceArea": serviceArea.geoMidpoint ? {
      "@type": "GeoCircle",
      "geoMidpoint": {
        "@type": "GeoCoordinates",
        "latitude": serviceArea.geoMidpoint.latitude,
        "longitude": serviceArea.geoMidpoint.longitude
      },
      "geoRadius": serviceArea.geoRadius
    } : undefined,
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
    "foundingDate": "2019",
    "numberOfEmployees": {
      "@type": "QuantitativeValue",
      "value": "10-50"
    },
    "knowsAbout": [
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
    "hasCredential": [
      {
        "@type": "EducationalOccupationalCredential",
        "name": "Notaires certifiés",
        "description": "Certification professionnelle notariale"
      }
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": telephone,
      "email": email,
      "contactType": "customer service",
      "availableLanguage": "French"
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

export default LocalBusinessSchema;
