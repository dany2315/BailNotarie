import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function DejaSoumisPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 p-8 sm:p-12 text-center space-y-6">

            {/* Icône de succès */}
            <div className="flex justify-center">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
            </div>

            {/* Titre */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
              Votre demande a déjà été soumise
            </h1>

            {/* Description */}
            <div className="space-y-4 text-gray-600">
              <p className="text-base sm:text-lg">
                Votre formulaire de bail notarié a déjà été soumis et est en cours de traitement.
              </p>
            </div>

            {/* Informations supplémentaires */}
            <div className="bg-blue-50 rounded-lg p-4 space-y-2 text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-900">Prochaines étapes</p>
                  <p className="text-sm text-gray-600">
                    Notre équipe est en train d'examiner votre dossier et vous contactera prochainement.
                  </p>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                asChild
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Retour à l'accueil
                </Link>
              </Button>
              <Button
                asChild
                className="w-full sm:w-auto bg-[#4373f5] hover:bg-blue-700"
              >
                <Link href="/#contact">
                  <Mail className="mr-2 h-4 w-4" />
                  Nous contacter
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}




