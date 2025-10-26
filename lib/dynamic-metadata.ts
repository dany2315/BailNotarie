import { Metadata } from 'next';
import { generatePageMetadata, pageMetadata } from '@/lib/metadata';

interface DynamicMetadataProps {
  page: keyof typeof pageMetadata;
  customData?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
    ogType?: 'website' | 'article';
    noIndex?: boolean;
  };
}

export function generateDynamicMetadata({ page, customData }: DynamicMetadataProps): Metadata {
  const baseData = pageMetadata[page];
  
  if (customData) {
    return generatePageMetadata({
      title: customData.title || baseData.title,
      description: customData.description || baseData.description,
      keywords: customData.keywords || baseData.keywords,
      canonical: customData.canonical || baseData.canonical,
      ogImage: customData.ogImage || baseData.ogImage,
      ogType: customData.ogType || baseData.ogType,
      noIndex: customData.noIndex || baseData.noIndex
    });
  }
  
  return generatePageMetadata(baseData);
}

// Fonction utilitaire pour les pages d'articles de blog
export function generateBlogPostMetadata(post: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  image?: string;
  tags?: string[];
}): Metadata {
  const baseUrl = "https://bailnotarie.fr";
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  
  return generatePageMetadata({
    title: `${post.title} | Blog BailNotarie`,
    description: post.description,
    keywords: [
      "blog bail notarié",
      "article bail notarié",
      ...(post.tags || []),
      "actualités juridiques",
      "conseils notaire"
    ],
    canonical: `/blog/${post.slug}`,
    ogImage: post.image || "https://bailnotarie.fr/og-cover-v2.png",
    ogType: "article"
  });
}

// Fonction utilitaire pour les pages de catégories
export function generateCategoryMetadata(category: {
  name: string;
  description: string;
  slug: string;
}): Metadata {
  return generatePageMetadata({
    title: `${category.name} - Bail Notarié | BailNotarie`,
    description: category.description,
    keywords: [
      category.name.toLowerCase(),
      "bail notarié",
      "catégorie",
      "articles",
      "conseils"
    ],
    canonical: `/blog/category/${category.slug}`,
    ogType: "website"
  });
}

export default generateDynamicMetadata;
