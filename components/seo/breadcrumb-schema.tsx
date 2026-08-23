import React from "react";

const SITE_URL = "https://www.bailnotarie.fr";

export interface BreadcrumbItem {
  /** Libelle affiche dans le fil d'Ariane. */
  name: string;
  /** Chemin relatif (ex: "/blog"). Omis pour le dernier element. */
  path?: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

/**
 * Balisage BreadcrumbList (schema.org).
 *
 * Le dernier element represente la page courante et n'a pas d'URL, conformement
 * aux recommandations Google.
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  if (!items.length) return null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: `${SITE_URL}${item.path}` } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default BreadcrumbSchema;
