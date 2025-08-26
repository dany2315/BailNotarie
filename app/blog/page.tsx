import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { CallButton, ContactButton } from "@/components/ui/action-buttons";

export const metadata: Metadata = {
  title: "Blog - Conseils et Guides sur le Bail Notarié",
  description: "📚 Découvrez nos conseils d'experts sur le bail notarié : guides pratiques, comparaisons, actualités juridiques. Tout pour sécuriser vos locations.",
  keywords: [
    "blog bail notarié",
    "conseils propriétaire",
    "guide bail authentique",
    "actualités notariales",
    "droit immobilier",
    "location sécurisée",
    "force exécutoire",
    "expulsion locataire"
  ],
  openGraph: {
    title: "Blog BailNotarie - Conseils et Guides sur le Bail Notarié",
    description: "📚 Découvrez nos conseils d'experts sur le bail notarié : guides pratiques, comparaisons, actualités juridiques.",
    url: "https://bailnotarie.fr/blog",
    images: [
      {
        url: "https://bailnotarie.fr/og-blog.png",
        width: 1200,
        height: 630,
        alt: "Blog BailNotarie - Conseils experts"
      }
    ]
  }
};

const blogPosts = [
  {
    id: 1,
    title: "Bail notarié vs bail classique : quelles différences ?",
    excerpt: "Découvrez les avantages du bail notarié par rapport au bail sous seing privé et pourquoi il peut être un choix judicieux pour votre location.",
    category: "Comparaison",
    date: "15 janvier 2024",
    readTime: "5 min",
    image: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 2,
    title: "Les étapes clés pour établir un bail notarié",
    excerpt: "Guide complet des démarches à suivre pour faire authentifier votre contrat de bail par un notaire, de la préparation à la signature.",
    category: "Guide pratique",
    date: "12 janvier 2024",
    readTime: "7 min",
    image: "https://images.pexels.com/photos/4427430/pexels-photo-4427430.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 3,
    title: "Colocation et bail notarié : ce qu'il faut savoir",
    excerpt: "Tout ce que vous devez connaître sur l'utilisation du bail notarié dans le cadre d'une colocation : avantages, spécificités et conseils.",
    category: "Colocation",
    date: "10 janvier 2024",
    readTime: "6 min",
    image: "https://images.pexels.com/photos/7578842/pexels-photo-7578842.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 4,
    title: "Coût d'un bail notarié : tarifs et frais à prévoir",
    excerpt: "Analyse détaillée des coûts associés à l'établissement d'un bail notarié et comparaison avec les alternatives disponibles.",
    category: "Tarification",
    date: "8 janvier 2024",
    readTime: "4 min",
    image: "https://images.pexels.com/photos/6863183/pexels-photo-6863183.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 5,
    title: "Force exécutoire : l'avantage majeur du bail notarié",
    excerpt: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige ou d'impayés de loyer.",
    category: "Juridique",
    date: "5 janvier 2024",
    readTime: "8 min",
    image: "https://images.pexels.com/photos/5668473/pexels-photo-5668473.jpeg?auto=compress&cs=tinysrgb&w=800"
  },
  {
    id: 6,
    title: "Documents nécessaires pour un bail notarié",
    excerpt: "Liste exhaustive des pièces justificatives requises pour constituer votre dossier de bail notarié, côté propriétaire et locataire.",
    category: "Documentation",
    date: "3 janvier 2024",
    readTime: "5 min",
    image: "https://images.pexels.com/photos/4427541/pexels-photo-4427541.jpeg?auto=compress&cs=tinysrgb&w=800"
  }
];

const categories = ["Tous", "Guide pratique", "Juridique", "Colocation", "Comparaison", "Tarification", "Documentation"];

export default function BlogPage() {
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
      <section className="py-8 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Badge 
                key={category}
                variant={category === "Tous" ? "default" : "secondary"}
                className="cursor-pointer hover:bg-blue-100 hover:text-blue-800 transition-colors"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <Card key={post.id} className="py-0 overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <div className="aspect-video bg-gray-200 overflow-hidden">
                  <img 
                    src={post.image} 
                    alt={post.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <div className="flex items-center text-gray-500 text-sm space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{post.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  
                  <Link 
                    href={`/blog/${post.id}`}
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