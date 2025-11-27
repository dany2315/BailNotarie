import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales de BailNotarie - Informations légales et contact",
  robots: {
    index: true,
    follow: true,
  },
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              📄 Mentions légales
            </h1>
            
            <div className="space-y-8 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Éditeur du site</h2>
                <ul className="list-none pl-0 space-y-2">
                  <li><strong>Mon Bail Notarié</strong> (nom commercial)</li>
                  <li><strong>Société :</strong> [forme juridique – ex. SAS / SARL]</li>
                  <li><strong>Capital social :</strong> [montant]</li>
                  <li><strong>Siège social :</strong> [adresse complète]</li>
                  <li><strong>RCS :</strong> [numéro]</li>
                  <li><strong>N° SIRET :</strong> [numéro]</li>
                  <li><strong>Code APE :</strong> [à compléter – ex. 8211Z : Services administratifs / support]</li>
                  <li><strong>Directeur de la publication :</strong> chlomi cohen solal</li>
                  <li><strong>Contact :</strong> <a href="mailto:contact@bailnotarie.fr" className="text-blue-600 hover:underline">contact@bailnotarie.fr</a></li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Hébergement</h2>
                <ul className="list-none pl-0 space-y-2">
                  <li><strong>[Nom de l'hébergeur]</strong></li>
                  <li><strong>Adresse :</strong> [adresse]</li>
                  <li><strong>Tél :</strong> [téléphone]</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">🔒 Avertissement important / Déclaration de non-exercice du notariat</h2>
                <p className="mb-4">
                  <strong>Mon Bail Notarié</strong> est une société privée d'accompagnement administratif.
                </p>
                <p className="mb-4">
                  Nous ne sommes pas un office notarial, nous n'exerçons pas d'acte notarié, nous ne conseillons pas juridiquement, 
                  et nous ne réalisons aucune prestation réservée aux notaires au sens des articles 1 et 2 de l'ordonnance 
                  n°45-2590 du 2 novembre 1945.
                </p>
                <p className="mb-4">Notre rôle se limite strictement à :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>recueillir et organiser les informations fournies par nos clients,</li>
                  <li>constituer un dossier administratif complet,</li>
                  <li>le transmettre à un notaire, choisi librement par le client, ou parmi des notaires partenaires,</li>
                  <li>faciliter la prise de rendez-vous pour la signature.</li>
                </ul>
                <p className="mt-4 mb-4">
                  Aucun acte authentique n'est établi par notre société.
                </p>
                <p className="mb-4">
                  La rédaction, l'authentification et la signature du bail notarié relèvent exclusivement du notaire.
                </p>
                <p>
                  Nous ne faisons pas de publicité pour un notaire particulier, et nous ne percevons aucun apport d'affaires.
                </p>
              </section>


              <section className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

