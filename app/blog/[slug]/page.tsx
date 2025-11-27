import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { blogData, blogCategories } from '@/lib/blog-data'
import { generateArticleMetadata } from '@/lib/blog-utils'
import { BlogPageClient } from '@/components/blog-page-client'
import { ArticleSchema } from '@/components/seo/article-schema'
import { prisma } from '@/lib/prisma'

// Fonction pour générer les paramètres statiques
export function generateStaticParams() {
  return blogData.map((article) => ({
    slug: article.slug,
  }))
}

// Fonction pour générer les métadonnées
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  const article = blogData.find(a => a.slug === slug);
  const category = article ? blogCategories.find(cat => cat.id === article.categoryId) : null;

  if (!article || !category) {
    return {
      title: 'Article non trouvé - Blog BailNotarie',
      description: 'L\'article que vous recherchez n\'existe pas.'
    }
  }

  // Adapter l'article au format attendu par generateArticleMetadata
  const articleForMetadata = {
    ...article,
    category,
    updatedAt: article.createdAt
  } as any;

  return generateArticleMetadata(articleForMetadata);
}

// Fonction pour récupérer l'article
async function getArticle(slug: string) {
  const article = blogData.find(a => a.slug === slug);
  
  if (!article) {
    notFound()
  }
  
  const category = blogCategories.find(cat => cat.id === article.categoryId) || blogCategories[0];
  
  // Charger les commentaires côté serveur pour un affichage immédiat
  const comments = await prisma.comment.findMany({
    where: {
      articleId: article.id,
      isApproved: true, // Seulement les commentaires approuvés
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
  
  return {
    ...article,
    category,
    comments: comments.map(comment => ({
      id: comment.id,
      name: comment.name,
      email: comment.email,
      content: comment.content,
      createdAt: comment.createdAt,
      isApproved: comment.isApproved,
    })),
    updatedAt: article.createdAt
  }
}

// Fonction pour récupérer les articles liés
function getRelatedArticles(categoryId: string, currentSlug: string) {
  return blogData
    .filter(article => article.categoryId === categoryId && article.slug !== currentSlug)
    .slice(0, 3)
    .map(article => ({
      ...article,
      category: blogCategories.find(cat => cat.id === article.categoryId) || blogCategories[0]
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug)
  const relatedArticles = getRelatedArticles(article.categoryId, article.slug)

  // Préparer les données pour le schéma Article
  const articleForSchema = {
    title: article.title,
    description: article.description,
    content: article.content,
    slug: article.slug,
    publishedAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
    image: article.imageUrl || article.ogImage,
    author: "Équipe BailNotarie",
    category: {
      name: article.category.name,
      slug: article.category.slug
    }
  };

  return (
    <>
      <ArticleSchema article={articleForSchema} />
      <Header />
      <BlogPageClient article={article} relatedArticles={relatedArticles} />
      <Footer />
    </>
  )
}

