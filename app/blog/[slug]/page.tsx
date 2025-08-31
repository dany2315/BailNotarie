import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { prisma } from '@/lib/prisma'
import { generateArticleMetadata } from '@/lib/blog-utils'
import { Article } from '@/types/blog'
import { BlogPageClient } from '@/components/blog-page-client'

// Fonction pour générer les paramètres statiques
export async function generateStaticParams() {
  const articles = await prisma.article.findMany({
    select: { slug: true }
  })
  
  return articles.map((article: { slug: string }) => ({
    slug: article.slug,
  }))
}

// Fonction pour générer les métadonnées
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  
  const article = await prisma.article.findUnique({
    where: { slug },
    include: { category: true }
  })

  if (!article) {
    return {
      title: 'Article non trouvé - Blog BailNotarie',
      description: 'L\'article que vous recherchez n\'existe pas.'
    }
  }

  return generateArticleMetadata(article as Article);
}

// Configuration ISR
export const revalidate = 60

// Fonction pour récupérer l'article
async function getArticle(slug: string) {
  const article = await prisma.article.findUnique({
    where: { slug },
    include: { 
      category: true,
      comments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  
  if (!article) {
    notFound()
  }
  
  return article
}

// Fonction pour récupérer les articles liés
async function getRelatedArticles(categoryId: string, currentSlug: string) {
  return await prisma.article.findMany({
    where: {
      categoryId,
      slug: { not: currentSlug }
    },
    take: 3,
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  })
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug)
  const relatedArticles = await getRelatedArticles(article.categoryId, article.slug)

  return (
    <>
      <Header />
      <BlogPageClient article={article} relatedArticles={relatedArticles} />
      <Footer />
    </>
  )
}

