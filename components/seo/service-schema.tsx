import React from 'react';

interface ServiceSchemaProps {
  name?: string;
  description?: string;
  url?: string;
  provider?: {
    name: string;
    url: string;
  };
  areaServed?: string[];
  serviceType?: string;
  category?: string;
  offers?: {
    price?: string;
    priceCurrency?: string;
    availability?: string;
  };
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

export function ServiceSchema({
  name = "Service d'accompagnement à la création de bail notarié",
  description = "Service professionnel d'accompagnement dans la création de bail notarié avec force exécutoire renforcée. Accompagnement par des notaires certifiés pour une protection juridique maximale et des procédures simplifiées.",
  url = "https://bailnotarie.fr",
  provider = {
    name: "BailNotarie",
    url: "https://bailnotarie.fr"
  },
  areaServed = ["France", "Europe"],
  serviceType = "Service juridique professionnel",
  category = "Services juridiques",
  offers = {
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock"
  },
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
}: ServiceSchemaProps) {
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
      "url": provider.url
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
      "seller": {
        "@type": "Organization",
        "name": provider.name,
        "url": provider.url
      }
    },
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

export default ServiceSchema;
