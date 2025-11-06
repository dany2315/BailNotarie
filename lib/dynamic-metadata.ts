import type { Metadata } from 'next';
import { generatePageMetadata, pageMetadata } from '@/lib/metadata';

// supprime les fragments de type "#section" -> canonical doit être sans ancre
const stripHash = (path?: string) => (path ? path.split('#')[0] || '/' : undefined);

interface DynamicMetadataProps {
  page: keyof typeof pageMetadata;
  customData?: {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;     // chemin relatif (ex: '/', '/blog/slug')
    ogImage?: string;       // relatif OK si metadataBase est défini
    ogType?: 'website' | 'article';
    noIndex?: boolean;
  };
}

export function generateDynamicMetadata({ page, customData }: DynamicMetadataProps): Metadata {
  const baseData = pageMetadata[page];

  // Utilise ?? pour ne pas écraser un false/''/[] explicitement fournis
  const merged = {
    title: customData?.title ?? baseData.title,
    description: customData?.description ?? baseData.description,
    keywords: customData?.keywords ?? baseData.keywords,
    canonical: stripHash(customData?.canonical ?? baseData.canonical),
    ogImage: customData?.ogImage ?? baseData.ogImage,
    ogType: customData?.ogType ?? baseData.ogType,
    noIndex: customData?.noIndex ?? baseData.noIndex,
  };

  return generatePageMetadata(merged);
}

// ---- Blog post ----
// Utilise des URL relatives si tu as metadataBase = https://www.bailnotarie.fr
export function generateBlogPostMetadata(post: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string; // utile si tu ajoutes JSON-LD
  image?: string;      // peut être relatif: '/og-cover-v2.png'
  tags?: string[];
}): Metadata {
  const canonical = `/blog/${post.slug}`;

  return generatePageMetadata({
    title: `${post.title} | Blog BailNotarie`,
    description: post.description,
    keywords: [
      'blog bail notarié',
      'article bail notarié',
      ...(post.tags ?? []),
      'actualités juridiques',
      'conseils notaire',
    ],
    canonical,                               // ✅ relatif, sans #
    ogImage: post.image ?? '/og-cover-v2.png',
    ogType: 'article',
  });
}

// ---- Catégorie ----
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
      'bail notarié',
      'catégorie',
      'articles',
      'conseils',
    ],
    canonical: `/blog/category/${category.slug}`,  // ✅ relatif
    ogType: 'website',
  });
}

export default generateDynamicMetadata;
