"use client";

import React from 'react';
import Link from 'next/link';
import { Home, Sofa, Scale, Calendar, TrendingUp, Shield, CheckCircle, AlertCircle, FileText } from 'lucide-react';

export function Blog16Content() {
  const mobilierObligatoire = [
    { emoji: "🛏️", label: "Une literie" },
    { emoji: "🍽️", label: "Des plaques de cuisson" },
    { emoji: "🧊", label: "Un réfrigérateur et un congélateur (ou un compartiment permettant de conserver les aliments)" },
    { emoji: "🍴", label: "Des ustensiles de cuisine et de la vaisselle" },
    { emoji: "💡", label: "Des luminaires" },
    { emoji: "🪑", label: "Une table, des sièges et des espaces de rangement" },
  ];

  const criteresResume = [
    "Votre objectif de rentabilité",
    "Votre fiscalité",
    "Le profil de locataire recherché",
    "Le niveau de sécurité juridique que vous souhaitez apporter à votre bail",
  ];

  return (
    <article>
      <section aria-labelledby="introduction">
        <p className="text-lg text-gray-700 mb-4">
          Si vous investissez dans l'immobilier, l'une des premières questions à se poser est la suivante :
          faut-il louer son logement <strong>vide</strong> ou <strong>meublé</strong> ?
        </p>
        <p className="text-gray-700 mb-6">
          Fiscalité, durée du bail, préavis, rentabilité, stabilité des locataires… les différences sont nombreuses.
          Voici l'essentiel à connaître avant de faire votre choix.
        </p>
      </section>

      <section aria-labelledby="tableau-comparatif" className="my-12">
        <h2 id="tableau-comparatif" className="text-2xl font-bold text-gray-900 mb-6">
          Location nue ou meublée : le comparatif en un coup d'œil
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 my-6">
          <table className="w-full text-sm text-left border-collapse">
            <caption className="sr-only">
              Tableau comparatif entre la location nue et la location meublée : mobilier, durée du bail, préavis, fiscalité et profil de locataire.
            </caption>
            <thead>
              <tr className="bg-gray-50">
                <th scope="col" className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200">Critère</th>
                <th scope="col" className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200">Location nue</th>
                <th scope="col" className="px-4 py-3 font-semibold text-gray-900 border-b border-gray-200">Location meublée</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100 whitespace-nowrap">Mobilier</th>
                <td className="px-4 py-3 border-b border-gray-100">Aucun mobilier imposé</td>
                <td className="px-4 py-3 border-b border-gray-100">Mobilier obligatoire (décret n° 2015-981)</td>
              </tr>
              <tr className="bg-gray-50/50">
                <th scope="row" className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100 whitespace-nowrap">Durée du bail</th>
                <td className="px-4 py-3 border-b border-gray-100">3 ans (personne physique / SCI familiale), 6 ans (personne morale)</td>
                <td className="px-4 py-3 border-b border-gray-100">1 an (9 mois pour le bail étudiant, 1 à 10 mois pour le bail mobilité)</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100 whitespace-nowrap">Fiscalité</th>
                <td className="px-4 py-3 border-b border-gray-100">Revenus fonciers (micro-foncier ou réel)</td>
                <td className="px-4 py-3 border-b border-gray-100">BIC (micro-BIC ou réel avec amortissement)</td>
              </tr>
              <tr className="bg-gray-50/50">
                <th scope="row" className="px-4 py-3 font-medium text-gray-900 border-b border-gray-100 whitespace-nowrap">Profil de locataire</th>
                <td className="px-4 py-3 border-b border-gray-100">Familles, couples, installation durable</td>
                <td className="px-4 py-3 border-b border-gray-100">Étudiants, jeunes actifs, mobilité professionnelle</td>
              </tr>
              <tr>
                <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">Stabilité</th>
                <td className="px-4 py-3">Rotation locative plus faible</td>
                <td className="px-4 py-3">Plus de souplesse, rotation plus élevée</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="location-nue" className="my-12">
        <h2 id="location-nue" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Home className="h-6 w-6 mr-2 text-blue-600" aria-hidden="true" />
          La location nue : plus de stabilité
        </h2>
        <p className="text-gray-700 mb-4">
          En location nue, le logement est loué <strong>sans le mobilier</strong> nécessaire à une occupation immédiate.
        </p>
        <p className="text-gray-700 mb-4">Ce type de location attire généralement :</p>
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start"><span className="mr-3">🏡</span><span>les familles ;</span></li>
            <li className="flex items-start"><span className="mr-3">👨‍👩‍👧</span><span>les couples ;</span></li>
            <li className="flex items-start"><span className="mr-3">💼</span><span>les personnes souhaitant s'installer durablement.</span></li>
          </ul>
        </div>
        <p className="text-gray-700 mb-4">
          Le bail est conclu pour <strong>3 ans minimum</strong> lorsque le bailleur est une personne physique ou une
          SCI familiale, et <strong>6 ans minimum</strong> lorsque le bailleur est une personne morale (hors SCI familiale).
          Il est ensuite renouvelé tacitement.
        </p>
        <p className="text-gray-700 mb-4">
          L'un de ses principaux avantages est une <strong>rotation des locataires généralement plus faible</strong>.
        </p>
      </section>

      <section aria-labelledby="location-meublee" className="my-12">
        <h2 id="location-meublee" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Sofa className="h-6 w-6 mr-2 text-blue-600" aria-hidden="true" />
          La location meublée : davantage de souplesse
        </h2>
        <p className="text-gray-700 mb-4">
          En location meublée, le logement doit comporter un <strong>mobilier suffisant</strong> pour permettre au
          locataire d'y vivre immédiatement.
        </p>
        <p className="text-gray-700 mb-4">
          La liste du mobilier obligatoire est fixée par le <strong>décret n° 2015-981 du 31 juillet 2015</strong>.
          On y retrouve notamment :
        </p>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 my-6">
          <ul className="space-y-3">
            {mobilierObligatoire.map((item, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <span className="mr-3">{item.emoji}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-gray-700 mb-4">La location meublée attire principalement :</p>
        <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 my-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start"><span className="mr-3">🎓</span><span>les étudiants ;</span></li>
            <li className="flex items-start"><span className="mr-3">💼</span><span>les jeunes actifs ;</span></li>
            <li className="flex items-start"><span className="mr-3">✈️</span><span>les personnes en mobilité professionnelle.</span></li>
          </ul>
        </div>
        <p className="text-gray-700 mb-4">
          Le bail est généralement conclu pour <strong>1 an</strong>, renouvelable tacitement.
        </p>
        <p className="text-gray-700 mb-4">Il existe également :</p>
        <div className="space-y-4 my-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
              📚 Le bail étudiant
            </h3>
            <p className="text-gray-700 text-sm">D'une durée de 9 mois, non renouvelable.</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-blue-600" aria-hidden="true" />
              🚚 Le bail mobilité
            </h3>
            <p className="text-gray-700 text-sm">D'une durée de 1 à 10 mois, non renouvelable.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="fiscalite" className="my-12">
        <h2 id="fiscalite" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Scale className="h-6 w-6 mr-2 text-blue-600" aria-hidden="true" />
          Quelle fiscalité ?
        </h2>
        <p className="text-gray-700 mb-6">
          La fiscalité constitue souvent l'un des critères déterminants.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-0">En location nue</h3>
            <p className="text-gray-700 text-sm mb-4">
              Les loyers sont imposés dans la catégorie des <strong>revenus fonciers</strong>. Deux régimes existent :
            </p>
            <ul className="space-y-3">
              <li className="flex items-start text-gray-700 text-sm">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>Le <strong>micro-foncier</strong>, accessible lorsque les revenus fonciers bruts n'excèdent pas 15 000 € par an, avec un abattement forfaitaire de 30 %.</span>
              </li>
              <li className="flex items-start text-gray-700 text-sm">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>Le <strong>régime réel</strong>, permettant notamment de déduire les intérêts d'emprunt, les travaux, les charges de copropriété, les assurances et les frais de gestion.</span>
              </li>
            </ul>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 mt-0">En location meublée</h3>
            <p className="text-gray-700 text-sm mb-4">
              Les loyers sont imposés dans la catégorie des <strong>Bénéfices Industriels et Commerciaux (BIC)</strong>.
              Deux régimes sont également possibles :
            </p>
            <ul className="space-y-3">
              <li className="flex items-start text-gray-700 text-sm">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>Le <strong>micro-BIC</strong>, sous réserve de respecter les plafonds de chiffre d'affaires applicables.</span>
              </li>
              <li className="flex items-start text-gray-700 text-sm">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>Le <strong>régime réel</strong>, qui permet notamment de déduire les charges et, sous certaines conditions, d'amortir le bien (hors terrain) ainsi que le mobilier.</span>
              </li>
            </ul>
          </div>
        </div>

        <p className="text-gray-700 mb-6">
          Cette <strong>possibilité d'amortissement</strong> constitue l'un des principaux avantages fiscaux de la location meublée.
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 my-6">
          <div className="flex items-start">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <p className="text-gray-700">
              <strong>Attention :</strong> les règles fiscales évoluent régulièrement. Il est recommandé de se rapprocher
              de son expert-comptable ou de son conseiller fiscal afin de déterminer le régime le plus adapté à sa situation.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="que-choisir" className="my-12">
        <h2 id="que-choisir" className="text-2xl font-bold text-gray-900 mb-6">
          Location nue ou location meublée : que choisir ?
        </h2>
        <p className="text-gray-700 mb-6">Il n'existe pas de réponse universelle.</p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Maximiser la rentabilité</h3>
                <p className="text-gray-700 text-sm">
                  Si votre objectif est de maximiser votre rentabilité et d'optimiser votre fiscalité,
                  la <strong>location meublée</strong> peut être particulièrement intéressante.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-600" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-0">Rechercher la stabilité</h3>
                <p className="text-gray-700 text-sm">
                  Si vous recherchez davantage de stabilité et une rotation locative plus faible,
                  la <strong>location nue</strong> constitue souvent un excellent choix.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-700 mb-4">
          Le bon choix dépend avant tout de votre <strong>projet patrimonial</strong>, de votre
          <strong> stratégie fiscale</strong> et du <strong>profil de locataire</strong> que vous souhaitez accueillir.
        </p>
      </section>

      <section aria-labelledby="bail-notarie" className="my-12">
        <h2 id="bail-notarie" className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <FileText className="h-6 w-6 mr-2 text-blue-600" aria-hidden="true" />
          Et le bail dans tout ça ?
        </h2>
        <p className="text-gray-700 mb-4">
          Que votre logement soit loué vide ou meublé, le choix du contrat de location est tout aussi important.
        </p>
        <p className="text-gray-700 mb-4">
          Un{" "}
          <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="text-blue-700 hover:underline font-medium">
            bail notarié
          </Link>{" "}
          peut être conclu aussi bien pour une location nue que pour une location meublée.
        </p>
        <p className="text-gray-700 mb-4">
          Établi sous la forme d'un <strong>acte authentique</strong> par un notaire, il bénéficie de la{" "}
          <Link href="/blog/force-executoire-lavantage-majeur-du-bail-notarie" className="text-blue-700 hover:underline font-medium">
            force exécutoire
          </Link>
          , ce qui facilite notamment le recouvrement des loyers impayés selon les procédures prévues par la loi.
        </p>
        <p className="text-gray-700 mb-4">
          Pour aller plus loin, découvrez{" "}
          <Link href="/blog/les-obligations-legales-dans-un-bail-notarie" className="text-blue-700 hover:underline font-medium">
            les obligations légales d'un bail notarié
          </Link>{" "}
          et le{" "}
          <Link href="/blog/cout-dun-bail-de-location-notarie-tarifs-partage-des-frais-et-exemples-concrets" className="text-blue-700 hover:underline font-medium">
            coût d'un bail notarié
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="resume" className="my-12">
        <h2 id="resume" className="text-2xl font-bold text-gray-900 mb-6">En résumé</h2>
        <p className="text-gray-700 mb-6">
          Le choix entre une location nue et une location meublée dépend principalement de quatre critères :
        </p>
        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200 my-6">
          <ul className="space-y-3">
            {criteresResume.map((critere, index) => (
              <li key={index} className="flex items-start text-gray-700">
                <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{critere}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-gray-700 mb-6">
          Quel que soit votre choix, vide ou meublé, sécurisez votre location avec un bail notarié :
          préparez votre dossier en ligne et transmettez-le à un notaire partenaire.
        </p>
        <Link
          href="/#contact"
          className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Constituer mon dossier de bail notarié
        </Link>
      </section>
    </article>
  );
}
