import { Article } from '@/types/blog';

/**
 * Génère un slug à partir d'un titre
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^a-z0-9\s-]/g, '') // Garde seulement lettres, chiffres, espaces et tirets
    .replace(/\s+/g, '-') // Remplace les espaces par des tirets
    .replace(/-+/g, '-') // Remplace les tirets multiples par un seul
    .trim()
    .replace(/^-+|-+$/g, ''); // Supprime les tirets en début et fin
}

/**
 * Calcule le temps de lecture d'un article
 */
export function calculateReadTime(content: string): number {
  const wordCount = content.split(' ').length;
  return Math.ceil(wordCount / 200); // 200 mots par minute
}

/**
 * Formate une date en français
 */
export function formatDate(date: Date | string): string {
  try {
    // Si c'est une string, on la convertit en Date
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Vérifier si la date est valide
    if (isNaN(dateObj.getTime())) {
      return 'Date invalide';
    }
    
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'Date invalide';
  }
}

/**
 * Extrait un extrait du contenu HTML
 */
export function extractExcerpt(content: string, maxLength: number = 150): string {
  // Supprime les balises HTML
  const textContent = content.replace(/<[^>]*>/g, '');
  
  if (textContent.length <= maxLength) {
    return textContent;
  }
  
  return textContent.substring(0, maxLength).trim() + '...';
}

/**
 * Génère les métadonnées SEO pour un article
 */
export function generateArticleMetadata(article: Article) {
  const title = article.metaTitle || `${article.title} - Blog BailNotarie`;
  const description = article.metaDescription || article.description;
  const keywords = article.metaKeywords 
    ? article.metaKeywords.split(',').map(k => k.trim())
    : [
        "bail notarié",
        "location immobilière",
        article.category.name.toLowerCase(),
        ...article.title.toLowerCase().split(' ').filter(word => word.length > 3)
      ];
  
  const ogImage =  article.imageUrl

  return {
    title,
    description,
    keywords,
    openGraph: {
      title: article.metaTitle || article.title,
      description,
      url: `https://bailnotarie.fr/blog/${article.slug}`,
      type: "article",
      publishedTime: article.createdAt.toISOString(),
      authors: ["Équipe BailNotarie"],
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: article.title
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: article.metaTitle || article.title,
      description,
      images: [ogImage]
    }
  };
}
