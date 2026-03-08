"use client";

import React from 'react';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function Blog6Content() {
  return (
    <article>
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-6 leading-relaxed">
          En <strong>France</strong>, le <strong>bail de location notarié</strong> est un <strong>acte authentique</strong> soumis aux dispositions de la 
          <strong> loi n° 89-462 du 6 juillet 1989</strong>. Au-delà de la <strong>sécurité juridique</strong> qu'il procure, 
          son <strong>coût obéit à une réglementation nationale stricte</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          Besoin d'une vue globale avant de chiffrer ? Consultez{" "}
          <Link href="/blog/bail-authentique-notaire" className="text-blue-700 hover:underline">
            bail authentique chez le notaire
          </Link>.
        </p>
      </section>

      <section aria-labelledby="reponse-rapide" className="my-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 id="reponse-rapide" className="text-xl font-bold text-gray-900 mb-3">
            Reponse rapide : combien coute un bail notarie ?
          </h2>
          <p className="text-gray-700 mb-2">
            Dans la plupart des dossiers, le cout total se situe souvent <strong>entre 200 et 600 EUR</strong>,
            selon le loyer, les options de signature et les formalites.
          </p>
          <p className="text-sm text-gray-600">
            Estimation indicative : le montant exact depend du dossier et des pieces necessaires.
          </p>
        </div>
      </section>

      <section aria-labelledby="tarif-reglemente" className="my-12">
        <h2 id="tarif-reglemente" className="text-2xl font-bold text-gray-900 mb-6">
          1. Un tarif réglementé correspondant à un demi-mois de loyer
        </h2>
        <p className="text-gray-700 mb-4">
          Contrairement aux <strong>honoraires libres</strong>, la rémunération du notaire (les <strong>émoluments</strong>) est fixée par le 
          <strong> Code de commerce</strong> (<strong>Art. A444-103</strong> et <strong>arrêté du 26 février 2016</strong>). 
          Ce coût n'est donc pas soumis au "bon vouloir" de l'étude notariale.
        </p>
        <p className="text-gray-700 mb-6">
          En pratique, l'application de ce <strong>barème national proportionnel</strong> aboutit, pour un bail d'habitation classique, 
          à un montant équivalent à la <strong>moitié d'un loyer mensuel hors charges</strong>, auquel s'ajoute la <strong>TVA</strong>.
        </p>
      </section>

      <section aria-labelledby="exemple-chiffre" className="my-12">
        <h2 id="exemple-chiffre" className="text-2xl font-bold text-gray-900 mb-6">
          2. Exemple chiffré simplifié (avec frais possibles)
        </h2>
        <p className="text-gray-700 mb-6">
          Pour illustrer le <strong>coût réel</strong>, prenons l'exemple d'un logement loué <strong>500 € par mois</strong> (hors charges).
        </p>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Poste de dépense</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Détail</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-900">Montant estimatif</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Émolument de rédaction</td>
                <td className="py-3 px-4 text-gray-600">50 % du loyer mensuel</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">250,00 € HT</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">Formalités et copies</td>
                <td className="py-3 px-4 text-gray-600">Coûts fixes (archivage, copies, gestion du dossier)</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">80,00 € HT*</td>
              </tr>
              <tr className="border-b border-gray-200 bg-yellow-50">
                <td className="py-3 px-4 text-gray-700">
                  <span className="text-sm text-gray-500 italic">(optionnel)</span> Procuration authentique
                </td>
                <td className="py-3 px-4 text-gray-600">
                  Si l'une des parties ne peut pas signer en présentiel : établissement d'une procuration notariée
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">30 à 40 € HT par procuration environ</td>
              </tr>
              <tr className="border-b border-gray-200 bg-yellow-50">
                <td className="py-3 px-4 text-gray-700">
                  <span className="text-sm text-gray-500 italic">(optionnel)</span> Frais techniques de visioconférence
                </td>
                <td className="py-3 px-4 text-gray-600">
                  En cas de signature à distance avec dispositif certifié
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">montant variable, souvent quelques dizaines d'euros HT</td>
              </tr>
              <tr className="border-b border-gray-200 bg-yellow-50">
                <td className="py-3 px-4 text-gray-700">
                  <span className="text-sm text-gray-500 italic">(optionnel)</span> Débours
                </td>
                <td className="py-3 px-4 text-gray-600">
                  Sommes avancées par le notaire pour obtenir certaines pièces administratives (état civil, cadastre, documents d'urbanisme, etc.)
                </td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">montant variable selon le dossier</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-3 px-4 text-gray-700">TVA (20 %)</td>
                <td className="py-3 px-4 text-gray-600">Calculée sur les émoluments et certaines prestations</td>
                <td className="py-3 px-4 text-right font-semibold text-gray-900">à ajouter au total HT</td>
              </tr>
              <tr className="bg-blue-50">
                <td className="py-4 px-4 font-bold text-gray-900" colSpan={2}>
                  TOTAL À PAYER (ordre de grandeur, sans options)
                  <br />
                  <span className="text-sm font-normal text-gray-600">Émolument + formalités + TVA</span>
                </td>
                <td className="py-4 px-4 text-right font-bold text-lg text-blue-700">
                  environ 396,00 € TTC pour cet exemple
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-gray-600 text-sm italic mt-4">
            *Le coût des formalités, copies et débours peut varier légèrement selon la complexité administrative du dossier et les pièces à récupérer.
          </p>
        </div>
      </section>

      <section aria-labelledby="exemples-loyers" className="my-12">
        <h2 id="exemples-loyers" className="text-2xl font-bold text-gray-900 mb-6">
          3. Exemples rapides selon le loyer mensuel
        </h2>
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full border-collapse" role="table" aria-label="Exemples de cout d'un bail notarie">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Loyer hors charges</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Base emolument</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Estimation totale TTC</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">500 EUR</td>
                <td className="py-3 px-4 text-gray-700">Environ 250 EUR HT</td>
                <td className="py-3 px-4 text-gray-700">Environ 350 a 450 EUR</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-4 text-gray-700">1 000 EUR</td>
                <td className="py-3 px-4 text-gray-700">Environ 500 EUR HT</td>
                <td className="py-3 px-4 text-gray-700">Environ 600 a 900 EUR</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-700">1 500 EUR</td>
                <td className="py-3 px-4 text-gray-700">Environ 750 EUR HT</td>
                <td className="py-3 px-4 text-gray-700">Environ 900 a 1 300 EUR</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          Ces fourchettes sont indicatives. Le total varie selon les formalites, debours et options (procuration, signature a distance).
        </p>
      </section>

      <section aria-labelledby="repartition-frais" className="my-12">
        <h2 id="repartition-frais" className="text-2xl font-bold text-gray-900 mb-6">
          4. Qui paie les frais ? (La repartition legale)
        </h2>
        <p className="text-gray-700 mb-6">
          La question du paiement est régie par l'<strong>article 5 de la loi du 6 juillet 1989</strong>.
        </p>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 my-6">
          <p className="text-gray-700 mb-4">
            La loi autorise le <strong>partage des honoraires de rédaction</strong> entre le bailleur et le locataire. 
            Cependant, la part imputable au locataire est soumise à un <strong>double plafond</strong> issu de la 
            <strong> loi ALUR</strong> :
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Elle ne peut excéder le montant payé par le bailleur (soit <strong>50% du total</strong>).
              </span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Elle doit être inférieure ou égale à un <strong>plafond par mètre carré de surface habitable</strong> 
                (fixé par décret).
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Cas pratique : zone tendue et plafond au m2</h3>
          <ul className="space-y-3 text-gray-700">
            <li>
              <strong>Cas 1 - Zone tendue :</strong> la part du locataire est plafonnee, meme si le bailleur souhaite partager davantage.
            </li>
            <li>
              <strong>Cas 2 - Plafond par m2 :</strong> si le plafond legal est depasse, l'excedent reste a la charge du bailleur.
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="cout-perspective" className="my-12">
        <h2 id="cout-perspective" className="text-2xl font-bold text-gray-900 mb-6">
          5. Le coût à mettre en perspective avec le risque
        </h2>
        <p className="text-gray-700 mb-6">
          Bien que le <strong>bail notarié</strong> représente un <strong>coût initial supérieur</strong> à un contrat sous seing privé, 
          cet investissement est rationnel pour :
        </p>

        <div className="grid md:grid-cols-3 gap-4 my-6">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Les loyers élevés</h3>
            <p className="text-gray-700 text-sm">
              Pour les biens à fort loyer, la sécurité juridique justifie l'investissement.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Les profils locatifs complexes</h3>
            <p className="text-gray-700 text-sm">
              Situations nécessitant une sécurisation renforcée du contrat.
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">La sécurité du bailleur</h3>
            <p className="text-gray-700 text-sm">
              Le bail notarié est un <strong>titre exécutoire</strong>, permettant de recourir à un huissier sans procès préalable 
              en cas d'impayé.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="a-retenir" className="my-12">
        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg p-8 border border-blue-200">
          <h2 id="a-retenir" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
            <CheckCircle className="h-6 w-6 text-blue-600 mr-3" aria-hidden="true" />
            À RETENIR
          </h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <strong className="text-gray-900 mr-2">Cadre légal :</strong>
              <span className="text-gray-700">
                Les tarifs sont imposés par le <strong>Code de commerce</strong> (ce ne sont pas des honoraires libres).
              </span>
            </div>
            <div className="flex items-start">
              <strong className="text-gray-900 mr-2">Coût moyen :</strong>
              <span className="text-gray-700">
                Environ <strong>un demi-mois de loyer HT</strong> + frais de formalités et TVA.
              </span>
            </div>
            <div className="flex items-start">
              <strong className="text-gray-900 mr-2">Répartition :</strong>
              <span className="text-gray-700">
                Frais partagés entre bailleur et locataire, sous réserve des <strong>plafonds légaux par m²</strong>.
              </span>
            </div>
            <div className="flex items-start">
              <strong className="text-gray-900 mr-2">Variables :</strong>
              <span className="text-gray-700">
                Des frais s'ajoutent pour les <strong>procurations</strong> ou <strong>signatures à distance</strong>.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="cta-bail-notarie" className="my-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 id="cta-bail-notarie" className="text-xl font-bold text-gray-900 mb-3">
            Besoin d'une estimation adaptee a votre dossier ?
          </h2>
          <p className="text-gray-700 mb-4">
            Lancez votre procedure en ligne et obtenez un cadrage clair des pieces et couts avant signature.
          </p>
          <Link
            href="/commencer"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Commencer ma procedure
          </Link>
        </div>
      </section>
    </article>
  );
}

