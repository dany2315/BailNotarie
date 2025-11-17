import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { CallButton, ContactButton } from "@/components/ui/action-buttons";
import { prisma } from '@/lib/prisma';
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";

export const metadata: Metadata = generateDynamicMetadata({ page: 'blog' });

// Fonction pour récupérer les articles depuis Prisma
async function getArticles() {
  return await prisma.article.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });
}

// Fonction pour récupérer les catégories
async function getCategories() {
  return await prisma.category.findMany({
    include: {
      _count: {
        select: { articles: true }
      }
    }
  });
}

export default async function BlogPage() {
  const articles = await getArticles();
  const categories = await getCategories();

  // Formatage de la date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Calculer le temps de lecture
  const calculateReadTime = (content: string) => {
    const wordCount = content.split(' ').length;
    return Math.ceil(wordCount / 200); // 200 mots par minute
  };

  console.log(articles);

  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Blog BailNotarie
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Conseils, guides pratiques et actualités sur le bail notarié. 
              Tout ce que vous devez savoir pour sécuriser vos locations.
            </p>
          </div>
        </div>
      </section>

      {/* Filtres */}
      {/*<section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge 
              variant="default"
              className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
            >
              Tous
            </Badge>
            {categories.map((category) => (
              <Badge 
                key={category.id}
                variant="secondary"
                className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
              >
                {category.name} ({category._count.articles})
              </Badge>
            ))}
          </div>
        </div>
      </section>*/}

      {/* Articles */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Card key={article.id} className="py-0 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img 
                    src={article.imageUrl || "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"}
                    alt={article.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {article.category.name}
                    </Badge>
                    <div className="flex items-center text-gray-500 text-sm space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(article.createdAt)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{calculateReadTime(article.content)} min</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {article.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {article.description}
                  </p>
                  
                  <Link 
                    href={`/blog/${article.slug}`}
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    Lire la suite
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Restez informé des dernières actualités
          </h2>
          <p className="text-blue-100 mb-8">
            Recevez nos conseils et guides pratiques directement dans votre boîte mail
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Votre adresse email"
              className="flex-1 px-4 py-3 bg-white rounded-lg border-0 focus:ring-2 focus:ring-blue-300"
            />
            <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              S'abonner
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}