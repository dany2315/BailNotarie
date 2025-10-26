import React from 'react';
import { LocalBusinessSchema } from './local-business-schema';
import { ServiceSchema } from './service-schema';
import { FAQSchema } from './faq-schema';
import { ArticleSchema } from './article-schema';

interface StructuredDataProps {
  page?: 'home' | 'service' | 'about' | 'contact' | 'blog' | 'article';
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

export function StructuredData({ page = 'home', customData, article }: StructuredDataProps) {
  return (
    <>
      {/* Schéma LocalBusiness Principal - Éligible pour les étoiles et avis */}
      <LocalBusinessSchema />
      
      {/* Schéma Service - Pour les informations détaillées du service */}
      <ServiceSchema />
      
      {/* Schéma FAQ - Pour les questions fréquentes */}
      <FAQSchema />
      
      {/* Schéma Article - Pour les articles de blog */}
      {page === 'article' && article && <ArticleSchema article={article} />}
      
      {/* Données personnalisées si fournies */}
      {customData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(customData, null, 2)
          }}
        />
      )}
    </>
  );
}

export default StructuredData;
