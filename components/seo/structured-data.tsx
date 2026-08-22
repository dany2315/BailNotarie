import React from "react";
import { OrganizationSchema } from "./organization-schema";
import { LocalBusinessSchema } from "./local-business-schema";
import { ArticleSchema } from "./article-schema";

interface StructuredDataProps {
  page?: "home" | "service" | "about" | "contact" | "blog" | "article";
  customData?: any;
  article?: {
    title: string;
    description: string;
    content: string;
    slug: string;
    publishedAt: string;
    updatedAt: string;
    image?: string;
    author?: string;
    category?: {
      name: string;
      slug: string;
    };
  };
}

/**
 * Donnees structurees globales, montees depuis le layout racine.
 *
 * Aucun balisage FAQPage n'est emis ici : une FAQPage ne doit etre declaree
 * que sur une page qui affiche reellement les questions correspondantes.
 * Les articles qui ont une FAQ visible declarent leur propre FaqSchema
 * depuis app/blog/[slug]/page.tsx.
 */
export function StructuredData({ page = "home", customData, article }: StructuredDataProps) {
  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
      {page === "article" && article && <ArticleSchema article={article} />}
      {customData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(customData, null, 2),
          }}
        />
      )}
    </>
  );
}

export default StructuredData;
