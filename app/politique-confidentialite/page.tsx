import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { generateDynamicMetadata } from "@/lib/dynamic-metadata";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description: "Politique de confidentialité de BailNotarie - Protection des données personnelles et conformité RGPD",
  robots: {
    index: true,
    follow: true,
  },
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              📌 Politique de confidentialité
            </h1>
            
            <div className="space-y-8 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Responsable du traitement</h2>
                <p>
                  La société <strong>Bailnotarie</strong>, est responsable du traitement des données collectées via le site, les formulaires et nos échanges.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Données collectées</h2>
                <p className="mb-4">
                  Nous collectons uniquement les données nécessaires à la constitution et la transmission d'un dossier de bail :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Informations d'état civil</li>
                  <li>Coordonnées</li>
                  <li>Documents justificatifs (pièces d'identité, justificatifs de domicile, revenus, titres de propriété, etc.)</li>
                  <li>Informations concernant le bien (adresse, surface, diagnostics, etc.)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Finalité du traitement</h2>
                <p className="mb-4">Les données sont utilisées pour :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>constituer un dossier complet de bail,</li>
                  <li>transmettre ces informations au notaire en charge de l'acte,</li>
                  <li>assurer le suivi administratif de la mission.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Base légale</h2>
                <p className="mb-4">Le traitement est fondé sur :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>l'exécution d'un contrat (article 6.1.b RGPD),</li>
                  <li>le consentement de l'utilisateur pour certaines données transmises volontairement.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Destinataires</h2>
                <p className="mb-4">
                  Les données peuvent être transmises uniquement :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>au notaire partenaires,</li>
                  <li>aux prestataires techniques indispensables au fonctionnement du service (hébergement, outil de signature).</li>
                </ul>
                <p className="mt-4">
                  Aucune donnée n'est vendue, louée ou utilisée à des fins commerciales externes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Durée de conservation</h2>
                <p className="mb-4">Les données sont conservées :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>24 mois pour les dossiers non aboutis,</li>
                  <li>5 ans pour les dossiers finalisés, sauf obligation légale contraire.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Droits des utilisateurs</h2>
                <p className="mb-4">Toute personne peut demander :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>accès à ses données,</li>
                  <li>rectification,</li>
                  <li>effacement (hors obligations légales),</li>
                  <li>portabilité,</li>
                  <li>limitation du traitement.</li>
                </ul>
                <p className="mt-4">
                  Pour exercer ces droits, vous pouvez nous contacter à l'adresse suivante :{" "}
                  <a href="mailto:contact@bailnotarie.fr" className="text-blue-600 hover:underline">
                    contact@bailnotarie.fr
                  </a>
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

