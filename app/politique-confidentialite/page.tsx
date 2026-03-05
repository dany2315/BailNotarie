import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité de BailNotarie - Protection des données personnelles et conformité RGPD",
};

export default function PolitiqueConfidentialitePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Politique de confidentialité
            </h1>

            <div className="space-y-8 text-gray-700">

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Responsable du traitement
                </h2>

                <p>
                  Le service <strong>BailNotarie</strong> est exploité par la société
                  <strong> DS Sync</strong>, société par actions simplifiée
                  immatriculée au RCS de Paris sous le numéro <strong>999 929 623</strong>.
                </p>

                <p>
                  DS Sync agit en qualité de responsable du traitement des données
                  personnelles collectées via le site BailNotarie.
                </p>

                <p>
                  Contact :{" "}
                  <a href="mailto:contact@bailnotarie.fr">
                    contact@bailnotarie.fr
                  </a>
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. Données collectées
                </h2>

                <p className="mb-4">
                  Nous collectons uniquement les données nécessaires à la gestion
                  administrative et à la transmission d'un dossier à un notaire.
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>Informations d'identité</li>
                  <li>Coordonnées (email, téléphone, adresse)</li>
                  <li>Informations relatives au bien immobilier</li>
                  <li>Documents justificatifs</li>
                  <li>Données techniques (adresse IP, logs de connexion)</li>
                  <li>Informations nécessaires au suivi du dossier</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. Finalités du traitement
                </h2>

                <ul className="list-disc pl-6 space-y-2">
                  <li>constitution d'un dossier administratif,</li>
                  <li>mise en relation avec un notaire,</li>
                  <li>transmission des informations nécessaires à la préparation de l'acte,</li>
                  <li>suivi administratif du dossier,</li>
                  <li>sécurisation et amélioration du service.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Base légale du traitement
                </h2>

                <ul className="list-disc pl-6 space-y-2">
                  <li>exécution d'un contrat ou de mesures précontractuelles,</li>
                  <li>respect d'obligations légales,</li>
                  <li>consentement lorsque nécessaire.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Destinataires des données
                </h2>

                <p className="mb-4">
                  Les données peuvent être transmises uniquement :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>aux notaires concernés par votre dossier,</li>
                  <li>aux prestataires techniques nécessaires au fonctionnement du service.</li>
                </ul>

                <p className="mt-4">
                  Les données ne sont jamais vendues, louées ou utilisées à des fins commerciales externes.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. Transmission aux notaires
                </h2>

                <p>
                  Dans le cadre du service BailNotarie, certaines informations peuvent être
                  transmises à un notaire afin de permettre la préparation et la signature
                  d'un bail notarié.
                </p>

                <p>
                  Le notaire agit alors en qualité de responsable de traitement indépendant
                  pour les traitements réalisés dans le cadre de son activité notariale.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  7. Infrastructure et sous-traitants
                </h2>

                <p className="mb-4">
                  Le site utilise plusieurs prestataires techniques :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>Vercel (hébergement du site – région Paris)</li>
                  <li>Neon (base de données – région Francfort)</li>
                  <li>AWS S3 (stockage sécurisé des documents – région Paris)</li>
                </ul>

                <p className="mt-4">
                  Les données sont hébergées principalement dans l'Union européenne.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  8. Durée de conservation
                </h2>

                <ul className="list-disc pl-6 space-y-2">
                  <li>24 mois pour les dossiers non finalisés</li>
                  <li>5 ans pour les dossiers finalisés</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  9. Sécurité des données
                </h2>

                <p>
                  La société DS Sync met en œuvre des mesures techniques et
                  organisationnelles appropriées afin de protéger les données
                  personnelles contre la perte, l'accès non autorisé, la divulgation
                  ou l'altération.
                </p>

                <p>
                  Malgré ces mesures, aucun système informatique ne peut garantir
                  une sécurité absolue.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  10. Exactitude des informations fournies
                </h2>

                <p>
                  Les utilisateurs s'engagent à fournir des informations exactes et à jour.
                </p>

                <p>
                  La société DS Sync ne saurait être tenue responsable en cas
                  d'informations inexactes, incomplètes ou frauduleuses transmises
                  par l'utilisateur.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  11. Droits des utilisateurs
                </h2>

                <p className="mb-4">
                  Conformément au RGPD, chaque utilisateur dispose des droits suivants :
                </p>

                <ul className="list-disc pl-6 space-y-2">
                  <li>accès aux données</li>
                  <li>rectification</li>
                  <li>effacement</li>
                  <li>limitation du traitement</li>
                  <li>portabilité</li>
                  <li>opposition</li>
                </ul>

                <p className="mt-4">
                  Vous pouvez exercer vos droits en nous contactant à :
                  contact@bailnotarie.fr
                </p>

                <p className="mt-4">
                  Vous pouvez également déposer une réclamation auprès de la
                  CNIL (www.cnil.fr).
                </p>
              </section>

              <section className="mt-12 pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Dernière mise à jour :{" "}
                  {new Date().toLocaleDateString("fr-FR")}
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