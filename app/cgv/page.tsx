import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente (CGV)",
  description: "Conditions Générales de Vente de la plateforme BailNotarie — Tarification, remboursement, responsabilités et données personnelles.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function CGVPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />

      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
              Conditions Générales de Vente
            </h1>

            <div className="space-y-10 text-gray-700">

              {/* Article 1 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  1. Mentions légales et Objet
                </h2>
                <p>
                  Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre la société{" "}
                  <strong>DS SYNC</strong>, au capital de 1 000 €, immatriculée au RCS de PARIS sous le numéro 99992962300018, dont le siège social est situé{" "}
                  <strong>58 RUE DE MONCEAU, 75008 PARIS</strong> (ci-après « BailNotarie » ou « la Société »), et toute personne utilisant ses services (ci-après « le Client »).
                </p>
                <p className="mt-4">
                  BailNotarie propose un service en ligne de constitution, vérification et transmission de dossiers destinés à la mise en place de baux notariés d'habitation ou commerciaux, via un réseau de notaires partenaires.
                </p>
              </section>

              {/* Article 2 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  2. Nature du service et Limites d'intervention
                </h2>
                <p>
                  BailNotarie agit exclusivement en qualité de plateforme numérique d'assistance administrative et de transmission de dossiers. La Société informe expressément le Client qu'elle :
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>ne réalise aucun acte notarié,</li>
                  <li>ne rédige aucun acte authentique,</li>
                  <li>ne fournit aucun conseil juridique, fiscal ou patrimonial personnalisé.</li>
                </ul>
                <p className="mt-4">
                  Les actes authentiques sont exclusivement établis, conseillés et signés par les notaires partenaires, dans le strict respect de leur monopole et de leur déontologie.
                </p>
              </section>

              {/* Article 3 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  3. Tarification
                </h2>
                <p>
                  La prestation de constitution, de vérification documentaire et de transmission du dossier est facturée au tarif forfaitaire unique de{" "}
                  <strong>39,90 € TTC</strong>. Ce montant rémunère exclusivement le service administratif fourni par la plateforme BailNotarie.
                </p>
              </section>

              {/* Article 4 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  4. Frais notariés (Indépendants du service)
                </h2>
                <p>
                  Les frais liés à l'établissement du bail notarié (émoluments du notaire, taxes, débours, frais de signature électronique, etc.) sont strictement distincts des frais de la plateforme BailNotarie. Ils sont réglementés par l'État (tarif des notaires) et seront facturés et appelés directement par l'étude notariale en charge du dossier.
                </p>
              </section>

              {/* Article 5 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  5. Paiement
                </h2>
                <p>
                  Le paiement des frais de plateforme de <strong>39,90 € TTC</strong> est exigible au comptant lors de la validation de la commande par le Client. Le règlement s'effectue en ligne, par carte bancaire, via un système de paiement sécurisé <strong>Stripe</strong>.
                </p>
              </section>

              {/* Article 6 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  6. Issue du dossier et Politique de remboursement
                </h2>
                <p>
                  BailNotarie étant soumise à une obligation de moyens dans la préparation administrative du dossier, la Société ne garantit pas la signature effective du bail authentique. L'acceptation et la signature de l'acte relèvent du pouvoir exclusif et de la déontologie du notaire partenaire.
                </p>
                <p className="mt-4">
                  Toutefois, dans le cas où le dossier ne pourrait aboutir à la signature de l'acte authentique pour des raisons indépendantes de la volonté du Client (ex : refus du dossier par l'étude notariale, impossibilité technique ou juridique soulevée par le notaire), BailNotarie s'engage à <strong>rembourser intégralement les frais de plateforme de 39,90 € TTC</strong> au Client.
                </p>
                <p className="mt-6 font-semibold text-gray-900">
                  Exceptions au remboursement :
                </p>
                <p className="mt-2">
                  Ce remboursement ne sera pas accordé si l'annulation ou l'échec de la procédure est directement imputable au Client ou à son cocontractant. Ainsi, les frais de plateforme resteront acquis à BailNotarie dans les cas suivants :
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4">
                  <li>Abandon du projet, changement d'avis ou désaccord entre le bailleur et le locataire après la transmission du dossier.</li>
                  <li>Transmission d'informations erronées, dissimulation de faits, ou fourniture de documents falsifiés / non valides.</li>
                  <li>Absence prolongée de réponse ou refus de coopérer aux demandes de pièces complémentaires formulées par la plateforme ou le notaire.</li>
                  <li>Refus de s'acquitter des frais notariés réglementés réclamés par l'étude pour la rédaction de l'acte.</li>
                </ul>
              </section>

              {/* Article 7 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  7. Responsabilité du Client
                </h2>
                <p>
                  Le Client s'engage à fournir des informations exactes, sincères et à jour. Il garantit l'authenticité des documents téléchargés sur la plateforme. BailNotarie décline toute responsabilité en cas de retard, de refus du dossier par le notaire, ou de litige ultérieur découlant de la transmission par le Client d'informations erronées, incomplètes ou de documents falsifiés.
                </p>
              </section>

              {/* Article 8 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  8. Renonciation express au Droit de rétractation
                </h2>
                <p>
                  Conformément à l'article L.221-28 1° du Code de la consommation, le droit de rétractation ne peut être exercé pour les contrats de fourniture de services pleinement exécutés avant la fin du délai de rétractation de 14 jours. Le traitement et la transmission du dossier étant réalisés de manière automatisée et immédiate après le paiement, le Client accepte expressément, en validant sa commande, que l'exécution du service commence immédiatement. Il reconnaît en conséquence renoncer expressément à son droit de rétractation.
                </p>
              </section>

              {/* Article 9 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  9. Données personnelles (RGPD)
                </h2>
                <p>
                  Les données personnelles collectées sont strictement nécessaires au traitement du dossier et à sa transmission à l'étude notariale compétente. Conformément à la loi « Informatique et Libertés » et au RGPD, le Client dispose d'un droit d'accès, de rectification, d'effacement, de limitation et de portabilité de ses données. Il peut exercer ces droits en contactant la Société à l'adresse :{" "}
                  <a href="mailto:contact@bailnotarie.fr" className="text-blue-600 hover:underline">
                    contact@bailnotarie.fr
                  </a>.
                </p>
              </section>

              {/* Article 10 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  10. Propriété intellectuelle
                </h2>
                <p>
                  L'ensemble des éléments constituant la plateforme BailNotarie (textes, arborescences, éléments graphiques, logos, code) est protégé par les dispositions du Code de la propriété intellectuelle. Toute reproduction totale ou partielle est strictement interdite sans l'accord préalable de la Société.
                </p>
              </section>

              {/* Article 11 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  11. Litiges et Médiation de la consommation
                </h2>
                <p>
                  Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige, le Client consommateur peut recourir gratuitement à un médiateur de la consommation. Le Client peut également utiliser la plateforme européenne de règlement en ligne des litiges (RLL) :{" "}
                  <a
                    href="https://ec.europa.eu/consumers/odr/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    https://ec.europa.eu/consumers/odr/
                  </a>.
                </p>
              </section>

              {/* Article 12 */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  12. Droit applicable et Juridiction compétente
                </h2>
                <p>
                  Les présentes CGV sont soumises à la loi française. En cas d'échec de la médiation, tout litige relatif à leur validité, leur interprétation ou leur exécution sera soumis aux tribunaux français compétents.
                </p>
              </section>

              {/* Date */}
              <section className="pt-8 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Dernière mise à jour : mai 2026
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
