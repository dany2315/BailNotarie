"use client";

import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, Share2, User, Eye, BookOpen, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { CallButton, ContactButton } from "@/components/ui/action-buttons";

// Génération des métadonnées dynamiques
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  // Ici vous pourriez récupérer les données de l'article depuis une API/base de données
  const articleTitle = "Bail notarié vs bail classique : quelles différences ?";
  const articleDescription = "Découvrez les avantages du bail notarié par rapport au bail sous seing privé et pourquoi il peut être un choix judicieux pour votre location.";
  
  return {
    title: `${articleTitle} - Blog BailNotarie`,
    description: articleDescription,
    keywords: [
      "bail notarié vs classique",
      "différences bail authentique",
      "avantages bail notarié",
      "force exécutoire",
      "sécurité juridique",
      "comparaison baux"
    ],
    openGraph: {
      title: articleTitle,
      description: articleDescription,
      url: `https://bailnotarie.fr/blog/${params.id}`,
      type: "article",
      publishedTime: "2024-01-15T00:00:00.000Z",
      authors: ["Équipe BailNotarie"],
      images: [
        {
          url: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
          width: 1200,
          height: 630,
          alt: articleTitle
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: articleTitle,
      description: articleDescription,
      images: ["https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200"]
    }
  };
}

// Simulation d'un article de blog
const blogPost = {
  id: 1,
  title: "Bail notarié vs bail classique : quelles différences ?",
  content: `
    <p>Le choix entre un bail notarié et un bail classique est une décision importante qui peut avoir des conséquences significatives sur la gestion de votre location. Dans cet article, nous allons explorer en détail les différences entre ces deux types de contrats.</p>

    <h2>Qu'est-ce qu'un bail notarié ?</h2>
    <p>Un bail notarié est un contrat de location authentifié par un notaire. Contrairement au bail sous seing privé, il bénéficie d'une force exécutoire immédiate, ce qui signifie qu'il a la même valeur qu'un jugement de tribunal.</p>

    <h2>Les avantages du bail notarié</h2>
    <h3>1. Force exécutoire immédiate</h3>
    <p>L'avantage principal du bail notarié réside dans sa force exécutoire. En cas d'impayés de loyer, le propriétaire peut directement procéder à une saisie sans passer par une procédure judiciaire longue et coûteuse.</p>

    <h3>2. Sécurité juridique renforcée</h3>
    <p>Le notaire vérifie la conformité du bail avec la législation en vigueur et s'assure que tous les éléments obligatoires sont présents. Cette validation par un professionnel du droit offre une sécurité juridique maximale.</p>

    <h3>3. Délais d'expulsion réduits</h3>
    <p>En cas de nécessité d'expulsion, les délais sont considérablement réduits. Alors qu'une procédure classique peut prendre 12 à 18 mois, un bail notarié permet une action en 2 à 3 mois seulement.</p>

    <h2>Le bail classique : simplicité et coût</h2>
    <p>Le bail sous seing privé reste la solution la plus courante. Il présente l'avantage d'être simple à mettre en place et moins coûteux. Cependant, en cas de litige, il nécessite une procédure judiciaire complète.</p>

    <h2>Comparaison des coûts</h2>
    <p>Si le bail notarié représente un investissement initial plus important (frais de notaire), il peut s'avérer économique à long terme en cas de difficultés avec le locataire. Les économies réalisées sur les procédures judiciaires peuvent largement compenser le surcoût initial.</p>

    <h2>Conclusion</h2>
    <p>Le choix entre bail notarié et bail classique dépend de votre situation et de votre appétence au risque. Pour les propriétaires souhaitant une sécurité maximale, le bail notarié représente un investissement judicieux.</p>
  `,
  category: "Comparaison",
  date: "15 janvier 2024",
  readTime: "5 min",
  views: "1,247",
  image: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
  author: {
    name: "Équipe BailNotarie",
    avatar: "https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop&crop=face",
    bio: "Experts en droit immobilier et bail notarié"
  }
};

const relatedPosts = [
  {
    id: 2,
    title: "Les étapes clés pour établir un bail notarié",
    excerpt: "Guide complet des démarches à suivre pour faire authentifier votre contrat de bail par un notaire.",
    category: "Guide pratique",
    image: "https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=400",
    readTime: "7 min"
  },
  {
    id: 5,
    title: "Force exécutoire : l'avantage majeur du bail notarié",
    excerpt: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige.",
    category: "Juridique",
    image: "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=400",
    readTime: "6 min"
  }
];

export default function BlogPostPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Hero Section avec image */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <Image
          src={blogPost.image}
          alt={blogPost.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20"></div>
        
        {/* Contenu superposé */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
            <Link 
              href="/blog"
              className="inline-flex items-center text-white/80 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour au blog
            </Link>
            
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {blogPost.category}
              </Badge>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight">
                {blogPost.title}
              </h1>
              
              {/* Métadonnées */}
              <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
                <div className="flex items-center space-x-2">
                  <Image
                    src={blogPost.author.avatar}
                    alt={blogPost.author.name}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                  <span>{blogPost.author.name}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{blogPost.date}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{blogPost.readTime} de lecture</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{blogPost.views} vues</span>
                </div>
                
                
              </div>
              <div className="flex items-center space-x-4">
                  <Button variant="outline" className="bg-transparent text-white" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  <Button variant="outline" className="bg-transparent text-white" size="sm">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Commenter
                  </Button>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenu principal */}
      <section className="py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Contenu de l'article */}
            <article className="lg:col-span-3">
              {/* Barre de partage mobile */}

              {/* Contenu */}
              <div className="bg-white rounded-2xl shadow-sm border p-6 md:p-8">
                <div className="prose prose-lg max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: blogPost.content }} />
                </div>

                {/* Tags et partage */}
                <div className="mt-12 pt-8 border-t border-gray-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">bail notarié</Badge>
                      <Badge variant="secondary">comparaison</Badge>
                      <Badge variant="secondary">juridique</Badge>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Partager :</span>
                      <Button variant="outline" size="sm">
                        <Share2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Profil auteur */}
              <div className="mt-8 bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-start space-x-4">
                  <Image
                    src={blogPost.author.avatar}
                    alt={blogPost.author.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">{blogPost.author.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{blogPost.author.bio}</p>
                    <Button variant="outline" size="sm">
                      <User className="h-4 w-4 mr-2" />
                      Voir le profil
                    </Button>
                  </div>
                </div>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:col-span-1 space-y-6">
              {/* Barre de partage desktop */}
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Partager l'article</h3>
                <div className="space-y-2 ">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Share2 className="h-4 w-4 mr-2" />
                    Partager
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Commenter
                  </Button>
                </div>
              </div>

              {/* CTA */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 ">
                <h3 className="font-bold text-gray-900 mb-3">
                  Besoin d'aide ?
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Nos experts vous accompagnent dans votre projet de bail notarié.
                </p>
                <div className="space-y-2 ">
                  <CallButton />
                  <ContactButton />
                </div>
              </div>

            </aside>
          </div>
        </div>
      </section>

      {/* Articles liés */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Articles recommandés
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {relatedPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                <div className="aspect-video relative overflow-hidden">
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-white/90">
                      {post.category}
                    </Badge>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-gray-500">
                      <BookOpen className="h-4 w-4" />
                      <span>{post.readTime}</span>
                    </div>
                    <Link 
                      href={`/blog/${post.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors text-sm"
                    >
                      Lire l'article →
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}