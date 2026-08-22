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
    "bail notarié",
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
