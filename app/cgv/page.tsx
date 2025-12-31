import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Conditions Générales de Vente",
  description: "Conditions Générales de Vente de BailNotarie - Service de constitution de dossier de bail notarié en ligne",
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
              📌 Conditions Générales de Vente – CGV
            </h1>
            
            <div className="space-y-8 text-gray-700">
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Objet</h2>
                <p>
                  Les présentes CGV encadrent la prestation d'accompagnement administratif à la constitution d'un bail notarié proposée par <strong>Bailnotarie</strong>.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Nature de la prestation</h2>
                <p className="mb-4">
                  La société fournit :
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>assistance administrative,</li>
                  <li>collecte des pièces obligatoires,</li>
                  <li>vérification de cohérence,</li>
                  <li>transmission d'un dossier complet au notaire,</li>
                  <li>aide à la prise de rendez-vous pour la signature.</li>
                </ul>
                <p className="mt-4">
                  Nous ne rédigeons pas le bail et n'intervenons pas dans l'authentification, actes réservés aux notaires.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Prix</h2>
                <p className="mb-4">
                  Le coût de l'acte notarié est fixé par la loi :
                </p>
                <p className="mb-4 pl-4 border-l-4 border-blue-500">
                  50 % d'un loyer mensuel hors charges (émoluments notariaux réglementés) – Article A.444-172 du Code de commerce.
                </p>
                <p>
                  Notre prestation administrative est facturée, selon le tarif indiqué lors de la commande.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Paiement</h2>
                <p className="mb-4">Le paiement s'effectue :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>en ligne via notre interface sécurisée,</li>
                  <li>ou selon les moyens indiqués au moment de la commande.</li>
                </ul>
                <p className="mt-4">
                  La mission démarre uniquement après paiement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Obligations du client</h2>
                <p className="mb-4">Le client s'engage à :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>fournir des documents exacts et complets,</li>
                  <li>transmettre les pièces au moins 12h avant la signature,</li>
                  <li>répondre aux demandes du notaire si nécessaire.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Résiliation / Annulation</h2>
                <p>
                  En cas de non-transmission des pièces dans les délais, la signature peut être reportée sans remboursement automatique.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Responsabilité</h2>
                <p className="mb-4">Nous ne sommes pas responsables :</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>des délais propres au notaire,</li>
                  <li>du refus d'authentification en cas d'irrégularités,</li>
                  <li>des litiges entre bailleur et locataire.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Droit applicable</h2>
                <p>
                  Les présentes CGV sont soumises au droit français.
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

