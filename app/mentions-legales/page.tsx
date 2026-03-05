import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site BailNotarie",
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
              Mentions légales
            </h1>

            <div className="space-y-10 text-gray-700">

              {/* Editeur */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Éditeur du site
                </h2>

                <ul className="space-y-2">
                  <li><strong>Nom commercial :</strong> BailNotarie</li>
                  <li><strong>Société :</strong> DS Sync</li>
                  <li><strong>Forme juridique :</strong> Société par actions simplifiée (SAS)</li>
                  <li><strong>Capital social :</strong> 1 000 €</li>

                  <li><strong>Siège social :</strong> 58 rue de Monceau, 75008 Paris, France</li>

                  <li><strong>SIREN :</strong> 999 929 623</li>
                  <li><strong>SIRET :</strong> 999 929 623 00018</li>
                  <li><strong>RCS :</strong> Paris 999 929 623</li>
                  <li><strong>Code APE :</strong> 69.10Z – Activités juridiques</li>

                  <li><strong>Président :</strong> Chlomi Cohen Solal</li>
                  <li><strong>Directeur général :</strong> Dany Galli David Serfaty</li>

                  <li>
                    <strong>Email :</strong>{" "}
                    <a
                      href="mailto:contact@bailnotarie.fr"
                      className="text-blue-600 hover:underline"
                    >
                      contact@bailnotarie.fr
                    </a>
                  </li>
                </ul>
              </section>

              {/* Hébergement */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Hébergement et infrastructure technique
                </h2>

                <ul className="space-y-2">
                  <li>
                    <strong>Hébergement du site :</strong> Vercel Inc.
                  </li>
                  <li>
                    <strong>Infrastructure :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis
                  </li>
                  <li>
                    <strong>Région d’hébergement utilisée :</strong> Paris (France)
                  </li>

                  <li className="mt-4">
                    <strong>Base de données :</strong> Neon (PostgreSQL serverless)
                  </li>
                  <li>
                    <strong>Région d’hébergement :</strong> Francfort, Union européenne
                  </li>

                  <li className="mt-4">
                    <strong>Stockage des documents :</strong> Amazon Web Services (AWS S3)
                  </li>
                  <li>
                    <strong>Région :</strong> Europe (Paris) – eu-west-3
                  </li>
                </ul>
              </section>

              {/* Propriété intellectuelle */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Propriété intellectuelle
                </h2>

                <p>
                  L'ensemble du contenu du site BailNotarie (textes, images,
                  graphismes, logo, structure, base de données, code et
                  éléments techniques) est la propriété exclusive de la
                  société DS Sync, sauf mention contraire.
                </p>

                <p>
                  Toute reproduction, représentation, modification,
                  publication ou adaptation de tout ou partie du site,
                  quel que soit le moyen ou le procédé utilisé,
                  est interdite sans l'autorisation écrite préalable
                  de DS Sync.
                </p>
              </section>

              {/* Responsabilité */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Limitation de responsabilité
                </h2>

                <p>
                  Les informations diffusées sur le site BailNotarie
                  sont fournies à titre informatif. Malgré le soin
                  apporté à leur exactitude, la société DS Sync
                  ne peut garantir l'absence d'erreurs ou d'omissions.
                </p>

                <p>
                  La société DS Sync ne pourra être tenue responsable
                  des dommages directs ou indirects résultant de
                  l'utilisation du site.
                </p>
              </section>

              {/* Disclaimer notarial */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  🔒 Avertissement important / Déclaration de non-exercice du notariat
                </h2>

                <p className="mb-4">
                  Le site <strong>BailNotarie</strong> est exploité par la société
                  <strong> DS Sync</strong>.
                </p>

                <p className="mb-4">
                  La société DS Sync n'est pas un office notarial et n'exerce aucune
                  activité relevant du monopole des notaires.
                </p>

                <p className="mb-4">
                  BailNotarie agit uniquement comme une plateforme technique
                  d'assistance administrative et de mise en relation.
                </p>

                <p className="mb-4">
                  Notre service consiste exclusivement à accompagner les utilisateurs
                  dans la constitution d'un dossier administratif et à faciliter la
                  mise en relation avec un notaire pour la signature d'un bail notarié.
                </p>

                <p className="mb-4">
                  La rédaction, l'authentification et la signature de tout acte
                  notarié relèvent exclusivement d'un notaire habilité.
                </p>

                <p>
                  En conséquence, DS Sync ne rédige aucun acte notarié et ne fournit
                  pas de conseil juridique personnalisé.
                </p>
              </section>

              {/* Documents juridiques */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  Documents juridiques
                </h2>

                <p>
                  Pour plus d'informations concernant l'utilisation
                  du service, veuillez consulter les pages suivantes :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>Conditions générales d'utilisation (CGU)</li>
                  <li>Politique de confidentialité</li>
                </ul>
              </section>

              {/* Date */}
              <section className="pt-8 border-t border-gray-200">
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