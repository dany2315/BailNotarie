import type { MetadataRoute } from "next";
import { blogData } from "@/lib/blog-data";

const SITE_URL = "https://www.bailnotarie.fr";

/**
 * Sitemap genere par Next.js (route native /sitemap.xml).
 *
 * Les articles sont derives directement de `blogData`, donc le sitemap ne peut
 * plus se desynchroniser du blog : tout article ajoute a `lib/blog-data.ts` y
 * apparait automatiquement.
 *
 * N'y figurent que les pages publiques indexables. Les pages de tunnel
 * (/commencer/suivi, /commencer/deja-soumis...) et les espaces authentifies en
 * sont exclus : ils sont en noindex via next.config.ts.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/commencer`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/simulateur-prix-bail-notarie`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/cgv`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/politique-confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const articles: MetadataRoute.Sitemap = blogData.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: article.createdAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...articles];
}
