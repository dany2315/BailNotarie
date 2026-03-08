"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle } from "lucide-react";

export function Blog11Content() {
  return (
    <article>
      <section aria-labelledby="definition-bail-authentique">
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Le <strong>bail authentique</strong> est un <strong>bail notarie</strong> : il s'agit d'un
          <strong> bail de location en France</strong> redige et signe devant notaire, sous forme
          d'<strong>acte authentique</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          Cette forme apporte une <strong>force executoire</strong> qui facilite le recouvrement en
          cas d'impayes, tout en renforcant la securite juridique du bailleur et du locataire.
        </p>
      </section>

      <section aria-labelledby="reponse-rapide-bail-authentique" className="my-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 id="reponse-rapide-bail-authentique" className="text-xl font-bold text-gray-900 mb-3">
            Reponse rapide : c'est quoi un bail authentique chez le notaire ?
          </h2>
          <p className="text-gray-700">
            C'est un bail notarie signe devant notaire. Il a la valeur d'un acte authentique, avec
            date certaine, preuve renforcee et possibilites d'execution plus rapides qu'un bail
            classique en cas de manquement.
          </p>
        </div>
      </section>

      <section aria-labelledby="avantages-bail-authentique" className="my-12">
        <h2 id="avantages-bail-authentique" className="text-2xl font-bold text-gray-900 mb-6">
          1. Les avantages concrets du bail authentique
        </h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Force executoire et recouvrement
            </h3>
            <p className="text-gray-700">
              En cas d'impayes, le bail authentique permet d'engager plus vite les demarches de
              recouvrement, sans repartir de zero avec une longue procedure.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Contrat juridiquement robuste</h3>
            <p className="text-gray-700">
              Le notaire verifie les parties, le contenu du bail et la conformite legale, ce qui
              reduit les risques de clauses fragiles ou contestables.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Clarte pour les deux parties</h3>
            <p className="text-gray-700">
              Les obligations sont formalisees clairement des le depart : loyer, charges, depot,
              diagnostics, et conditions d'execution du contrat.
            </p>
          </div>
        </div>
        <p className="text-gray-700 mt-6">
          Pour comprendre en detail le mecanisme, consultez aussi notre guide sur la{" "}
          <Link href="/blog/force-executoire-lavantage-majeur-du-bail-notarie" className="text-blue-700 hover:underline">
            force executoire du bail notarie
          </Link>.
        </p>
      </section>

      <section aria-labelledby="prix-bail-authentique" className="my-12">
        <h2 id="prix-bail-authentique" className="text-2xl font-bold text-gray-900 mb-6">
          2. Combien coute un bail authentique ?
        </h2>
        <p className="text-gray-700 mb-4">
          Le cout depend notamment du loyer, des formalites et des options de signature. Dans de
          nombreux dossiers, l'ordre de grandeur part d'une base proche d'un demi-loyer hors
          charges, avec TVA et frais complementaires selon la situation.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 overflow-x-auto my-6">
          <table className="w-full border-collapse" role="table" aria-label="Exemple de cout d'un bail authentique">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Poste</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Description</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Exemple indicatif</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Base de redaction</td>
                <td className="py-3 px-4 text-gray-600">Tarif notarial encadre</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">Variable selon le loyer</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Formalites / copies</td>
                <td className="py-3 px-4 text-gray-600">Gestion administrative du dossier</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">Montant dossier dependant</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">TVA</td>
                <td className="py-3 px-4 text-gray-600">Applicable sur prestations concernees</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">20 %</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="py-4 px-4 font-bold text-gray-900" colSpan={2}>
                  Total
                </td>
                <td className="py-4 px-4 text-right font-bold text-blue-700">Estimation sur devis</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-700">
          Pour une vue detaillee avec exemples, consultez le guide{" "}
          <Link
            href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets"
            className="text-blue-700 hover:underline"
          >
            prix d'un bail authentique
          </Link>.
        </p>
      </section>

      <section aria-labelledby="qui-paie" className="my-12">
        <h2 id="qui-paie" className="text-2xl font-bold text-gray-900 mb-6">
          3. Qui paie les frais du bail authentique ?
        </h2>
        <p className="text-gray-700 mb-6">
          La repartition depend du cadre legal applicable a la location d'habitation. En pratique, les
          frais peuvent etre partages entre bailleur et locataire avec des plafonds pour proteger le
          locataire.
        </p>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>La part du locataire est encadree et ne peut pas depasser certains seuils.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Le bailleur conserve la part non imputable au locataire.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Les frais optionnels (procuration, signature a distance) varient selon le dossier.</span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="procedure-bail-authentique" className="my-12">
        <h2 id="procedure-bail-authentique" className="text-2xl font-bold text-gray-900 mb-6">
          4. Procedure : comment se passe un bail authentique chez le notaire ?
        </h2>
        <ol className="space-y-4 text-gray-700">
          <li>
            <strong>1. Constitution du dossier</strong> : identite des parties, justificatifs du bien,
            diagnostics et conditions du bail.
          </li>
          <li>
            <strong>2. Verification juridique</strong> : le notaire controle la conformite legale et la
            redaction des clauses.
          </li>
          <li>
            <strong>3. Signature de l'acte authentique</strong> : en presentiel ou a distance selon le
            dossier.
          </li>
          <li>
            <strong>4. Delivrance de la copie executoire</strong> : document utile en cas de recouvrement.
          </li>
        </ol>
        <p className="text-gray-700 mt-6">
          Voir aussi le guide complet des demarches :{" "}
          <Link
            href="/blog/les-etapes-pour-etablir-un-bail-notarie-guide-complet"
            className="text-blue-700 hover:underline"
          >
            bail authentique chez le notaire
          </Link>.
        </p>
      </section>

      <section aria-labelledby="difference-bail-authentique-classique" className="my-12">
        <h2 id="difference-bail-authentique-classique" className="text-2xl font-bold text-gray-900 mb-6">
          5. Difference avec un bail classique
        </h2>
        <p className="text-gray-700 mb-4">
          Un bail classique (sous seing prive) peut etre suffisant dans des cas simples, mais il n'offre
          pas le meme niveau de securite et d'execution qu'un bail authentique.
        </p>
        <p className="text-gray-700">
          Comparez les deux options ici :{" "}
          <Link
            href="/blog/bail-notarie-vs-bail-classique-analyse-comparative"
            className="text-blue-700 hover:underline"
          >
            difference bail authentique / bail classique
          </Link>.
        </p>
      </section>

      <section aria-labelledby="cta-bail-authentique" className="my-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 id="cta-bail-authentique" className="text-xl font-bold text-gray-900 mb-3">
            Besoin d'un bail authentique pour votre location ?
          </h2>
          <p className="text-gray-700 mb-4">
            Lancez votre dossier en ligne et obtenez un accompagnement clair sur les pieces, les frais
            et la signature notariale.
          </p>
          <p className="text-gray-700 mb-4">
            Vous pouvez aussi decouvrir comment fonctionne notre{" "}
            <Link
              href="/blog/bailnotarie-plateforme-digitale-bail-notarie"
              className="text-blue-700 hover:underline"
            >
              plateforme digitale de preparation des baux notaries
            </Link>.
          </p>
          <Link
            href="/commencer"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Commencer mon dossier
          </Link>
        </div>
      </section>
    </article>
  );
}
