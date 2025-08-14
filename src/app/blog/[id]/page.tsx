import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { Calendar, Clock, ArrowLeft, Share2 } from "lucide-react";

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
  image: "https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=1200",
  author: "Équipe BailNotarie"
};

const relatedPosts = [
  {
    id: 2,
    title: "Les étapes clés pour établir un bail notarié",
    excerpt: "Guide complet des démarches à suivre pour faire authentifier votre contrat de bail par un notaire.",
    category: "Guide pratique"
  },
  {
    id: 5,
    title: "Force exécutoire : l'avantage majeur du bail notarié",
    excerpt: "Comprendre la force exécutoire du bail notarié et ses implications concrètes en cas de litige.",
    category: "Juridique"
  }
];

export default function BlogPostPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Breadcrumb */}
      <section className="bg-white py-4 border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link 
            href="/blog"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Link>
        </div>
      </section>

      {/* Article */}
      <article className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* En-tête */}
          <header className="mb-12">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-4">
                {blogPost.category}
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {blogPost.title}
              </h1>
              <div className="flex items-center justify-between text-gray-600">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{blogPost.date}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>{blogPost.readTime} de lecture</span>
                  </div>
                  <span>Par {blogPost.author}</span>
                </div>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Partager
                </Button>
              </div>
            </div>
            
            <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
              <img 
                src={blogPost.image} 
                alt={blogPost.title}
                className="w-full h-full object-cover"
              />
            </div>
          </header>

          {/* Contenu */}
          <div className="prose prose-lg max-w-none">
            <div dangerouslySetInnerHTML={{ __html: blogPost.content }} />
          </div>

          {/* CTA */}
          <div className="mt-12 p-8 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              Prêt à créer votre bail notarié ?
            </h3>
            <p className="text-gray-600 mb-6">
              Notre équipe d'experts vous accompagne dans toutes les étapes de création de votre bail notarié.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/#contact">Demander un devis</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="tel:0123456789">Nous appeler</Link>
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* Articles liés */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            Articles liés
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {relatedPosts.map((post) => (
              <Card key={post.id} className="p-6 hover:shadow-lg transition-shadow duration-300">
                <Badge variant="secondary" className="mb-3">
                  {post.category}
                </Badge>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4">
                  {post.excerpt}
                </p>
                <Link 
                  href={`/blog/${post.id}`}
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Lire l'article →
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}