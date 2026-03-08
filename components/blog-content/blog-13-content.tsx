"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle, AlertTriangle, Scale, Building2 } from "lucide-react";

export function Blog13Content() {
  return (
    <article>
      <section aria-labelledby="intro-bail-commercial-notarie">
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Le <strong>bail commercial notarie</strong> est un <strong>bail 3/6/9</strong> redige par
          un notaire sous forme d'<strong>acte authentique</strong>. Il apporte une securite
          juridique superieure au bail commercial sous seing prive.
        </p>
        <p className="text-gray-700 mb-6">
          Si la loi laisse une grande souplesse au bail commercial, la realite du monde des affaires
          exige un contrat stable, prouvable et protecteur. C'est tout l'interet du recours au
          notaire.
        </p>
      </section>

      <section aria-labelledby="reponse-rapide-bail-commercial" className="my-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 id="reponse-rapide-bail-commercial" className="text-xl font-bold text-gray-900 mb-3">
            Reponse rapide : pourquoi passer par un notaire pour un bail commercial 3/6/9 ?
          </h2>
          <p className="text-gray-700">
            Parce qu'un bail commercial notarie devient un acte authentique avec date certaine,
            force probante renforcee et, pour le paiement des loyers, un titre executoire tres utile
            au bailleur en cas d'impayes.
          </p>
        </div>
      </section>

      <section aria-labelledby="acte-authentique-securite" className="my-12">
        <h2 id="acte-authentique-securite" className="text-2xl font-bold text-gray-900 mb-6">
          1. L'acte authentique : une securite absolue
        </h2>
        <p className="text-gray-700 mb-4">
          La difference majeure entre un bail commercial redige entre parties et un bail redige chez
          le notaire tient a la force juridique de l'acte.
        </p>
        <p className="text-gray-700 mb-6">
          Le notaire etant un officier public, le contrat qu'il etablit devient un <strong>acte
          authentique</strong>. Cette qualification renforce la preuve du contrat et stabilise ses
          clauses dans le temps.
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Le titre executoire : l'argument massue pour le bailleur
          </h3>
          <p className="text-gray-700 mb-3">
            En cas d'impayes, le bailleur peut mandater un commissaire de justice pour engager des
            mesures de recouvrement sans attendre un long proces declaratif sur la dette.
          </p>
          <p className="text-gray-700">
            <strong>Attention :</strong> pour l'expulsion, l'intervention d'un juge reste
            necessaire.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Une contestation beaucoup plus difficile
          </h3>
          <p className="text-gray-700">
            Les clauses d'un bail commercial notarie sont bien plus difficiles a remettre en cause.
            C'est une garantie de stabilite pour le bailleur comme pour le locataire exploitant.
          </p>
        </div>
      </section>

      <section aria-labelledby="enregistrement-bail-commercial" className="my-12">
        <h2 id="enregistrement-bail-commercial" className="text-2xl font-bold text-gray-900 mb-6">
          2. L'enregistrement : automatique et protecteur
        </h2>
        <p className="text-gray-700 mb-6">
          L'enregistrement du bail commercial n'est pas toujours obligatoire, mais il est tres utile
          pour donner une date certaine au contrat et le rendre opposable aux tiers.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Avec un notaire</h3>
            <p className="text-gray-700">
              L'enregistrement est pris en charge dans le cadre de l'acte. Vous evitez une demarche
              supplementaire aupres de l'administration.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sans notaire</h3>
            <p className="text-gray-700">
              C'est aux parties d'effectuer les demarches necessaires si elles souhaitent donner une
              date certaine au bail.
            </p>
          </div>
        </div>
        <p className="text-gray-700 mt-6">
          Cet enregistrement peut devenir crucial si le proprietaire vend les murs ou si un conflit
          apparait avec un tiers.
        </p>
      </section>

      <section aria-labelledby="notaire-obligatoire-bail-commercial" className="my-12">
        <h2 id="notaire-obligatoire-bail-commercial" className="text-2xl font-bold text-gray-900 mb-6">
          3. Le notaire est-il obligatoire pour un bail commercial ?
        </h2>
        <p className="text-gray-700 mb-6">
          Dans la majorite des cas, <strong>le recours au notaire est facultatif</strong>. Mais il
          devient obligatoire dans certaines situations particulieres.
        </p>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Duree superieure a 12 ans :</strong> formalites de publicite fonciere.</span>
            </li>
            <li className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong>Debit de boissons :</strong> cas legalement encadres par la fiscalite applicable.</span>
            </li>
          </ul>
        </div>
        <p className="text-gray-700 mt-6">
          Meme lorsqu'il n'est pas obligatoire, l'ecrit reste fortement recommande pour prouver le
          loyer, les charges, la duree, les travaux et les droits au renouvellement.
        </p>
      </section>

      <section aria-labelledby="role-conseil-verification" className="my-12">
        <h2 id="role-conseil-verification" className="text-2xl font-bold text-gray-900 mb-6">
          4. Le role de conseil et de verification du notaire
        </h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Building2 className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Identite et propriete</h3>
                <p className="text-gray-700">
                  Le notaire verifie que le bailleur est bien habilite a consentir le bail sur le
                  local commercial.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <Scale className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Equilibre du contrat</h3>
                <p className="text-gray-700">
                  Il controle la coherence des clauses, la repartition des charges, les travaux et
                  les points sensibles du bail 3/6/9.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Conformite reglementaire</h3>
                <p className="text-gray-700">
                  Le notaire veille a la prise en compte des regles applicables au bail commercial,
                  notamment l'environnement de la loi Pinel et les annexes techniques obligatoires.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cout-bail-commercial-notarie" className="my-12">
        <h2 id="cout-bail-commercial-notarie" className="text-2xl font-bold text-gray-900 mb-6">
          5. Combien coute un bail commercial notarie ?
        </h2>
        <p className="text-gray-700 mb-4">
          Contrairement au bail d'habitation notarie, les honoraires de redaction d'un bail
          commercial ne sont pas strictement encadres par un bareme legal unique.
        </p>
        <p className="text-gray-700 mb-6">
          En pratique, de nombreuses etudes raisonnent selon un pourcentage de la triennale ou
          appliquent un forfait. A titre indicatif, un calcul autour de <strong>5 % de la
          triennale</strong> est frequemment evoque, mais il ne s'agit pas d'une regle absolue.
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">A retenir sur les frais</h3>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Le tarif est libre et depend de l'etude notariale et de la complexite du dossier.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Les parties peuvent convenir d'une repartition des frais dans le contrat.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Le cout initial s'apprecie au regard du niveau de securite apporte.</span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="resume-bail-commercial" className="my-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 id="resume-bail-commercial" className="text-2xl font-bold text-gray-900 mb-4">
            En resume
          </h2>
          <p className="text-gray-700 mb-4">
            Signer un bail commercial chez un notaire represente un cout supplementaire au depart,
            mais c'est un investissement de securite pour les deux parties.
          </p>
          <p className="text-gray-700 mb-4">
            Pour le bailleur, c'est une protection renforcee sur le recouvrement des loyers. Pour le
            locataire, c'est la garantie d'un contrat plus stable, date et juridiquement securise.
          </p>
          <p className="text-gray-700 mb-6">
            Si vous souhaitez aussi comprendre le fonctionnement general de l'acte authentique, lisez
            notre page{" "}
            <Link href="/blog/bail-authentique-notaire" className="text-blue-700 hover:underline">
              bail authentique chez le notaire
            </Link>.
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Etre accompagne sur mon dossier
          </Link>
        </div>
      </section>
    </article>
  );
}
