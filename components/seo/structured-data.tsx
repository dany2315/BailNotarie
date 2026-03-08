"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { OrganizationSchema } from "./organization-schema";
import { LocalBusinessSchema } from "./local-business-schema";
import { FAQSchema } from "./faq-schema";
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

const DEFAULT_FAQS = [
  {
    question: "Qu'est-ce qu'un bail notarie ?",
    answer:
      "Un bail notarie est un contrat de location etabli par un notaire avec la force executoire de l'acte authentique.",
  },
  {
    question: "Quels sont les avantages d'un bail notarie ?",
    answer:
      "Le bail notarie renforce la securite juridique, facilite le recouvrement des loyers impayes et donne un cadre plus solide au dossier.",
  },
  {
    question: "Combien coute un bail notarie ?",
    answer:
      "Le cout depend notamment du loyer, des formalites et des procurations. BailNotarie permet d'estimer rapidement le prix de votre bail.",
  },
  {
    question: "Le bail notarie est-il valable partout en France ?",
    answer:
      "Oui, le bail notarie est valable sur tout le territoire francais sous reserve de la conformite du dossier et de l'intervention notariale.",
  },
  {
    question: "Que se passe-t-il en cas de loyers impayes ?",
    answer:
      "Le bail notarie offre un cadre plus efficace pour le recouvrement grace a la force executoire attachee a l'acte authentique.",
  },
];

const DEDICATED_FAQ_PATHS = new Set([
  "/blog/bail-derogatoire-article-l145-5-code-commerce",
  "/blog/bailnotarie-plateforme-digitale-bail-notarie",
  "/blog/bail-commercial-notarie-contrat-3-6-9",
  "/blog/bail-authentique-notaire",
  "/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets",
]);

export function StructuredData({ page = "home", customData, article }: StructuredDataProps) {
  const pathname = usePathname() || "/";
  const currentUrl = `https://www.bailnotarie.fr${pathname}`;
  const shouldRenderDefaultFaq = !DEDICATED_FAQ_PATHS.has(pathname);

  return (
    <>
      <OrganizationSchema />
      <LocalBusinessSchema />
      {shouldRenderDefaultFaq && <FAQSchema faqs={DEFAULT_FAQS} pageUrl={currentUrl} />}
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
