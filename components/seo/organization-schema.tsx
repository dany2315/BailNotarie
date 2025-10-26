import React from 'react';

interface OrganizationSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  logo?: string;
  contactPoint?: {
    telephone?: string;
    email?: string;
    contactType?: string;
  };
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
}

export function OrganizationSchema({
  name = "BailNotarie",
  description = "Expert en création de baux notariés avec force exécutoire renforcée. Accompagnement par des notaires certifiés pour une protection juridique maximale.",
  url = "https://bailnotarie.fr",
  logo = "https://bailnotarie.fr/logoSans.png",
  contactPoint = {
    telephone: "+33749387756",
    email: "contact@bailnotarie.fr",
    contactType: "customer service"
  },
  address = {
    addressCountry: "FR"
  },
  sameAs = [
    "https://bailnotarie.fr",
    "mailto:contact@bailnotarie.fr",
    "tel:+33749387756"
  ],
  foundingDate = "2019",
  numberOfEmployees = "10-50",
  areaServed = ["France", "Europe"]
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
    "contactPoint": {
      "@type": "ContactPoint",
      "telephone": contactPoint.telephone,
      "email": contactPoint.email,
      "contactType": contactPoint.contactType,
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
    "knowsAbout": [
      "Bail notarié",
      "Force exécutoire",
      "Droit immobilier",
      "Notariat",
      "Bail notaire",
      "Bail location",
      "Bail location notarié",
      "Loi 2025-125 ",
      "Location immobilière",
      "Protection juridique"
    ],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Services BailNotarie",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Création de bail notarié",
            "description": "Création de bail notarié avec force exécutoire renforcée"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Service",
            "name": "Accompagnement juridique",
            "description": "Accompagnement par des notaires certifiés"
          }
        }
      ]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "itemReviewed": {
        "@type": "Organization",
        "name": name,
        "url": url
      },
      "ratingValue": 4.9,
      "reviewCount": 2000,
      "bestRating": 5,
      "worstRating": 1
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

export default OrganizationSchema;
