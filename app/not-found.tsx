import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Home, ArrowLeft, Search, FileText, Phone, Mail } from "lucide-react";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      {/* Section 404 */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Illustration 404 */}
          <div className="mb-12">
            <div className="relative mx-auto w-64 h-64 mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full flex items-center justify-center">
                <div className="text-8xl font-bold text-blue-600">404</div>
              </div>
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center">
                <FileText className="h-8 w-8 text-yellow-800" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-red-400 rounded-full flex items-center justify-center">
                <Search className="h-6 w-6 text-red-800" />
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Page introuvable
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Désolé, la page que vous recherchez n'existe pas ou a été déplacée. 
              Ne vous inquiétez pas, nous allons vous aider à retrouver votre chemin !
            </p>
          </div>

          {/* Actions principales */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
              <Link href="/" className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Retour à l'accueil
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="javascript:history.back()" className="flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                Page précédente
              </Link>
            </Button>
          </div>

          {/* Suggestions de pages populaires */}
          <Card className="p-8 bg-white shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Pages populaires
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <Link 
                href="/#services" 
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Nos Services</h3>
                  <p className="text-sm text-gray-600">Découvrez nos services de baux notariés</p>
                </div>
              </Link>
              
              <Link 
                href="/#process" 
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Search className="h-5 w-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Notre Processus</h3>
                  <p className="text-sm text-gray-600">Comment nous créons votre bail</p>
                </div>
              </Link>
              
              <Link 
                href="/#faq" 
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <FileText className="h-5 w-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">FAQ</h3>
                  <p className="text-sm text-gray-600">Questions fréquemment posées</p>
                </div>
              </Link>
              
              <Link 
                href="/#contact" 
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all group"
              >
                <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <Mail className="h-5 w-5 text-orange-600" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900">Contact</h3>
                  <p className="text-sm text-gray-600">Obtenez un devis gratuit</p>
                </div>
              </Link>
            </div>
          </Card>

          {/* Section d'aide */}
          <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Besoin d'aide ?
            </h2>
            <p className="text-gray-600 mb-6">
              Notre équipe est là pour vous accompagner dans la création de votre bail notarié.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" className="bg-blue-600 text-white hover:bg-blue-700">
                <Link href="tel:0749387756" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  07 49 38 77 56
                </Link>
              </Button>
              <Button asChild variant="outline" className="bg-white hover:bg-blue-50">
                <Link href="mailto:contact@bailnotarie.fr" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  contact@bailnotarie.fr
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
