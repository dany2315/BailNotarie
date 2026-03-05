import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Conditions Générales d’Utilisation",
  description:
    "Conditions Générales d’Utilisation de BailNotarie - Plateforme d’assistance administrative et de mise en relation avec des notaires",
  robots: {
    index: true,
    follow: true,
  },
};

export default function CGUPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              📌 Conditions Générales d’Utilisation – CGU
            </h1>

            <div className="space-y-8 text-gray-700">

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Éditeur du site
                </h2>

                <p>
                  Le site <strong>BailNotarie</strong> est exploité par la société
                  <strong> DS Sync</strong>, société par actions simplifiée (SAS)
                  au capital social de 1 000 €, immatriculée au RCS de Paris sous
                  le numéro <strong>999 929 623</strong>.
                </p>

                <p>
                  Siège social : 58 rue de Monceau, 75008 Paris, France
                </p>

                <p>
                  SIRET : 999 929 623 00018
                </p>

                <p>
                  Code APE : 69.10Z – Activités juridiques
                </p>

                <p>
                  DS Sync exploite la plateforme sous le nom commercial
                  <strong> BailNotarie</strong>.
                </p>

                <p>
                  Contact :
                  <a
                    href="mailto:contact@bailnotarie.fr"
                    className="text-blue-600 hover:underline ml-1"
                  >
                    contact@bailnotarie.fr
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. Objet
                </h2>

                <p>
                  Les présentes Conditions Générales d’Utilisation (CGU)
                  ont pour objet de définir les modalités d’accès et
                  d’utilisation du site BailNotarie.
                </p>

                <p>
                  Toute utilisation du site implique l’acceptation pleine
                  et entière des présentes CGU.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. Description du service
                </h2>

                <p className="mb-4">
                  BailNotarie est une plateforme technique permettant :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>la collecte d'informations relatives à un dossier de bail,</li>
                  <li>la centralisation des documents nécessaires,</li>
                  <li>la constitution d'un dossier administratif complet,</li>
                  <li>la transmission de ce dossier à un notaire,</li>
                  <li>la facilitation de la prise de rendez-vous pour signature.</li>
                </ul>

                <p className="mt-4">
                  BailNotarie agit uniquement comme une plateforme
                  technique d'assistance administrative et de mise
                  en relation avec des notaires.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Non-exercice du notariat
                </h2>

                <p>
                  La société DS Sync n'est pas un office notarial et
                  n'exerce aucune activité relevant du monopole des
                  notaires.
                </p>

                <p>
                  DS Sync ne rédige aucun acte notarié et ne fournit
                  pas de conseil juridique personnalisé.
                </p>

                <p>
                  La rédaction, l'authentification et la signature
                  de tout acte notarié relèvent exclusivement d'un
                  notaire habilité.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Obligations de l'utilisateur
                </h2>

                <p className="mb-4">
                  L'utilisateur s'engage à :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>fournir des informations exactes et complètes,</li>
                  <li>transmettre des documents authentiques,</li>
                  <li>ne pas usurper l'identité d'un tiers,</li>
                  <li>ne pas transmettre de documents falsifiés,</li>
                  <li>respecter les lois et règlements en vigueur.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. Transmission au notaire
                </h2>

                <p>
                  Lorsque l'utilisateur souhaite finaliser son dossier,
                  certaines informations peuvent être transmises à un
                  notaire afin de permettre la préparation et la
                  signature d'un bail notarié.
                </p>

                <p>
                  Le notaire agit alors en qualité de responsable
                  indépendant pour les traitements réalisés dans
                  le cadre de son activité notariale.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  7. Disponibilité du service
                </h2>

                <p>
                  DS Sync s'efforce d'assurer la disponibilité du site
                  BailNotarie.
                </p>

                <p>
                  Toutefois, le site peut être temporairement
                  indisponible pour maintenance ou en raison
                  d'incidents techniques.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  8. Propriété intellectuelle
                </h2>

                <p>
                  L'ensemble du contenu du site BailNotarie
                  (textes, images, structure, code, logos)
                  est protégé par les lois relatives à la
                  propriété intellectuelle.
                </p>

                <p>
                  Toute reproduction ou utilisation sans
                  autorisation préalable est interdite.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  9. Responsabilité
                </h2>

                <p className="mb-4">
                  DS Sync ne saurait être tenue responsable :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>des délais propres au notaire,</li>
                  <li>du refus d'authentification d'un acte,</li>
                  <li>des litiges entre bailleur et locataire,</li>
                  <li>des informations fournies par l'utilisateur.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  10. Données personnelles
                </h2>

                <p>
                  Le traitement des données personnelles est décrit
                  dans la Politique de confidentialité accessible
                  sur le site.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  11. Modification des CGU
                </h2>

                <p>
                  DS Sync se réserve le droit de modifier les
                  présentes CGU à tout moment afin de tenir
                  compte des évolutions du service ou de la
                  législation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  12. Droit applicable
                </h2>

                <p>
                  Les présentes CGU sont soumises au droit français.
                </p>
              </section>

              <section className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Dernière mise à jour :{" "}
                  {new Date().toLocaleDateString("fr-FR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
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