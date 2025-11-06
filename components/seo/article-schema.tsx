"use client";
import React from "react";

interface ArticleSchemaProps {
  article: {
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

export function ArticleSchema({ article }: ArticleSchemaProps) {
  const baseUrl = "https://www.bailnotarie.fr";
  const articleUrl = `${baseUrl}/blog/${article.slug}`;

  const schema = {
    "@context": "https://schema.org",
    "@type": ["Article", "BlogPosting"],
    "headline": article.title.trim().slice(0, 110),
    "description": article.description.trim().slice(0, 200),
    "url": articleUrl,
    "datePublished": article.publishedAt,
    "dateModified": article.updatedAt || article.publishedAt,
    "author": {
      "@type": "Person",
      "name": article.author || "BailNotarie",
      "url": baseUrl,
      "sameAs": []
    },
    "publisher": {
      "@type": "Organization",
      "name": "BailNotarie",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/logoSans.png`,
        "width": 200,
        "height": 200
      }
    },
    "image": {
      "@type": "ImageObject",
      "url": article.image || `${baseUrl}/og-cover-v2.png`,
      "width": 1200,
      "height": 630
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": articleUrl
    },
    "articleSection": article.category?.name || "Bail Notarié",
    "keywords": [
      "bail notarié",
      "article",
      "conseils",
      "actualités",
      article.category?.name || "juridique"
    ],
    "inLanguage": "fr-FR",
    "isPartOf": {
      "@type": "Blog",
      "name": "Blog BailNotarie",
      "url": `${baseUrl}/blog`
    },
    "about": [
      {
        "@type": "Thing",
        "name": "Bail Notarié",
        "description": "Contrat de location authentifié par un notaire"
      },
      {
        "@type": "Thing",
        "name": "Force Exécutoire",
        "description": "Pouvoir d'exécution immédiate du contrat"
      }
    ],
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": ["h1", "p"]
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema)
      }}
    />
  );
}

export default ArticleSchema;
