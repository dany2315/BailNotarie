"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle, Scale } from "lucide-react";

export function Blog14Content() {
  return (
    <article>
      <section aria-labelledby="intro-bail-derogatoire">
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Le <strong>bail derogatoire</strong>, parfois appele a tort <strong>bail precaire</strong>,
          permet de louer un local commercial pour une courte duree sans appliquer le statut des
          baux commerciaux.
        </p>
        <p className="text-gray-700 mb-6">
          C'est une solution tres recherchee pour tester une activite, lancer un concept ou
          exploiter temporairement un local. Mais cette souplesse repose sur un cadre juridique tres
          strict fixe par l'<strong>article L.145-5 du Code de commerce</strong>.
        </p>
      </section>

      <section aria-labelledby="reponse-rapide-bail-derogatoire" className="my-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 id="reponse-rapide-bail-derogatoire" className="text-xl font-bold text-gray-900 mb-3">
            Reponse rapide : qu'est-ce qu'un bail derogatoire ?
          </h2>
          <p className="text-gray-700">
            Le bail derogatoire est un contrat de location de courte duree conclu hors statut des
            baux commerciaux. Il ne donne ni droit au renouvellement, ni indemnite d'eviction, et sa
            duree totale ne peut pas depasser <strong>36 mois</strong>.
          </p>
        </div>
      </section>

      <section aria-labelledby="definition-juridique" className="my-12">
        <h2 id="definition-juridique" className="text-2xl font-bold text-gray-900 mb-6">
          1. Qu'est-ce qu'un bail derogatoire ? Definition juridique
        </h2>
        <p className="text-gray-700 mb-4">
          Le bail derogatoire est un contrat de location portant sur des locaux utilises pour
          l'exploitation d'un fonds de commerce, mais conclu en dehors du statut protecteur des baux
          commerciaux.
        </p>
        <p className="text-gray-700 mb-6">
          Contrairement au <strong>bail commercial 3/6/9</strong>, il ne confere pas au locataire de
          droit au renouvellement ni d'indemnite d'eviction. Son regime est strictement encadre par
          l'article <strong>L.145-5 du Code de commerce</strong>.
        </p>
      </section>

      <section aria-labelledby="bail-derogatoire-vs-convention" className="my-12">
        <h2 id="bail-derogatoire-vs-convention" className="text-2xl font-bold text-gray-900 mb-6">
          2. Difference entre bail derogatoire et convention d'occupation precaire
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Bail derogatoire</h3>
            <p className="text-gray-700">
              Il repose sur une <strong>duree courte</strong>, avec un plafond legal de 36 mois.
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Convention d'occupation precaire
            </h3>
            <p className="text-gray-700">
              Elle repose sur un <strong>motif objectif de precarite</strong> : demolition,
              expropriation, operation future sur l'immeuble, ou autre situation fragile.
            </p>
          </div>
        </div>
        <p className="text-gray-700 mt-6">
          Ces deux regimes ne doivent pas etre confondus : la convention d'occupation precaire ne
          tire pas sa logique d'une duree maximale, mais d'une situation exceptionnelle.
        </p>
      </section>

      <section aria-labelledby="conditions-validite" className="my-12">
        <h2 id="conditions-validite" className="text-2xl font-bold text-gray-900 mb-6">
          3. Les 3 conditions de validite du bail de courte duree
        </h2>
        <div className="space-y-6">
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Une duree maximale de 36 mois</h3>
            <p className="text-gray-700">
              La duree totale du contrat, renouvellements et avenants compris, ne peut pas depasser
              trois ans. Un premier bail de 12 mois ne pourra donc etre prolonge que dans la limite
              des 24 mois restants.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              2. Une volonte claire de deroger au statut
            </h3>
            <p className="text-gray-700">
              Le contrat doit etre ecrit et faire apparaitre clairement que les parties souhaitent
              ecarter le statut des baux commerciaux. La reference expresse a l'article{" "}
              <strong>L.145-5</strong> est fortement recommandee pour reduire le risque de
              requalification.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              3. Un etat des lieux obligatoire
            </h3>
            <p className="text-gray-700">
              Depuis la loi Pinel, l'etat des lieux d'entree et de sortie est obligatoire. En son
              absence, le bailleur perd un levier probatoire important sur l'etat initial du local.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="risque-requalification" className="my-12">
        <h2 id="risque-requalification" className="text-2xl font-bold text-gray-900 mb-6">
          4. Le risque de requalification en bail commercial 3/6/9
        </h2>
        <p className="text-gray-700 mb-6">
          C'est le point de vigilance numero 1 pour le bailleur. L'article L.145-5 prevoit un
          mecanisme de transformation automatique si les conditions du bail derogatoire ne sont plus
          respectees.
        </p>
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Si le locataire reste dans les lieux apres l'echeance, le bailleur doit reagir dans
                un delai d'un mois.
              </span>
            </li>
            <li className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Sans opposition du bailleur au maintien dans les lieux, le contrat peut se
                transformer automatiquement en <strong>bail commercial de 9 ans</strong>.
              </span>
            </li>
            <li className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Le locataire beneficie alors du droit au renouvellement et du regime protecteur du
                statut des baux commerciaux.
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="jurisprudence-entree-lieux" className="my-12">
        <h2 id="jurisprudence-entree-lieux" className="text-2xl font-bold text-gray-900 mb-6">
          5. Jurisprudence : l'importance de l'entree dans les lieux
        </h2>
        <p className="text-gray-700 mb-4">
          La jurisprudence rappelle que le bail derogatoire doit etre conclu <strong>au moment de
          l'entree dans les lieux</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          Si le preneur occupe deja le local sous un autre titre, la signature a posteriori d'un bail
          derogatoire est tres risquee. Les juges peuvent y voir une tentative artificielle d'ecarter
          le statut des baux commerciaux.
        </p>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start">
            <Scale className="h-5 w-5 text-blue-600 mr-3 mt-1 shrink-0" aria-hidden="true" />
            <p className="text-gray-700">
              Point de vigilance pratique : si l'occupation a deja commence, il faut verifier tres
              soigneusement le titre d'occupation existant avant toute redaction.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="conseils-pratiques-bail-derogatoire" className="my-12">
        <h2 id="conseils-pratiques-bail-derogatoire" className="text-2xl font-bold text-gray-900 mb-6">
          6. Comment rediger un bail derogatoire solide ?
        </h2>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Prevoir un contrat ecrit et date des l'entree dans les lieux.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Mentionner clairement la volonte des parties de deroger au statut.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Integrer une reference expresse a l'article L.145-5 du Code de commerce.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Faire un etat des lieux d'entree et de sortie conforme.</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
              <span>Anticiper la sortie ou la poursuite du locataire avant l'echeance.</span>
            </li>
          </ul>
        </div>
      </section>

      <section aria-labelledby="duree-maximale-36-mois" className="my-12">
        <h2 id="duree-maximale-36-mois" className="text-2xl font-bold text-gray-900 mb-6">
          Durée maximale : comment se calculent les 36 mois
        </h2>
        <p className="text-gray-700 mb-4">
          Depuis la <strong>loi Pinel du 18 juin 2014</strong>, la durée maximale du bail dérogatoire
          est passée de 24 à <strong>36 mois</strong>. Le point que beaucoup de bailleurs manquent :
          ce plafond ne s'apprécie pas contrat par contrat, mais sur la{" "}
          <strong>durée cumulée de tous les baux dérogatoires successifs</strong> conclus entre les
          mêmes parties et pour le même local.
        </p>
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Situation
                </th>
                <th className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Conséquence
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr>
                <td className="border border-gray-200 px-4 py-3">
                  Un bail dérogatoire de 12 mois, puis un second de 12 mois
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  Valable : 24 mois cumulés, on reste sous le plafond.
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">
                  Trois baux de 12 mois, puis un quatrième
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  Le quatrième dépasse 36 mois : le statut des baux commerciaux s'applique
                  automatiquement.
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3">
                  Un bail de 36 mois, puis un avenant de prolongation
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  La prolongation fait basculer la relation dans le statut : il n'y a pas de
                  rallonge possible.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <p className="text-gray-800">
            <strong>À retenir :</strong> le plafond de 36 mois est d'ordre public. Une clause qui
            prévoirait une durée supérieure ne rend pas le bail nul — elle le fait basculer dans le
            statut des baux commerciaux, avec un engagement de 9 ans à la clé pour le bailleur.
          </p>
        </div>
      </section>

      <section aria-labelledby="fin-bail-derogatoire" className="my-12">
        <h2 id="fin-bail-derogatoire" className="text-2xl font-bold text-gray-900 mb-6">
          Que se passe-t-il à la fin d'un bail dérogatoire ?
        </h2>
        <p className="text-gray-700 mb-4">
          C'est le moment le plus risqué du contrat, et celui qui produit le plus de contentieux.
          Trois scénarios sont possibles à l'échéance.
        </p>
        <ol className="space-y-4 text-gray-700 mb-6 list-decimal pl-5">
          <li>
            <strong>Le locataire quitte les lieux.</strong> Le bail prend fin sans formalité
            particulière. L'état des lieux de sortie est obligatoire et conditionne la restitution
            du dépôt de garantie.
          </li>
          <li>
            <strong>Les parties concluent un nouveau bail dérogatoire.</strong> Possible uniquement
            si la durée cumulée reste inférieure ou égale à 36 mois.
          </li>
          <li>
            <strong>Le locataire reste dans les lieux et le bailleur le laisse faire.</strong> C'est
            le cas le plus dangereux : à l'expiration du délai d'un mois suivant l'échéance, il
            s'opère un <strong>nouveau bail soumis au statut des baux commerciaux</strong>. Le
            bailleur se retrouve engagé pour neuf ans, avec droit au renouvellement et indemnité
            d'éviction à la clé.
          </li>
        </ol>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <p className="text-gray-800">
            <strong>Le réflexe qui protège le bailleur :</strong> ne rien laisser courir. Si le
            locataire doit partir, la manifestation de volonté doit être écrite, datée et adressée
            avant l'échéance. Le silence du bailleur, l'encaissement d'un loyer ou la simple remise
            de clés tardive suffisent à caractériser le maintien en possession.
          </p>
        </div>
      </section>

      <section aria-labelledby="derogatoire-vs-369" className="my-12">
        <h2 id="derogatoire-vs-369" className="text-2xl font-bold text-gray-900 mb-6">
          Bail dérogatoire ou bail commercial 3/6/9 : le comparatif
        </h2>
        <div className="overflow-x-auto my-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Critère
                </th>
                <th className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Bail dérogatoire
                </th>
                <th className="border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-900">
                  Bail commercial 3/6/9
                </th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr>
                <td className="border border-gray-200 px-4 py-3">Durée</td>
                <td className="border border-gray-200 px-4 py-3">36 mois maximum, cumul compris</td>
                <td className="border border-gray-200 px-4 py-3">9 ans minimum</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">Sortie du locataire</td>
                <td className="border border-gray-200 px-4 py-3">
                  À l'échéance, selon ce que prévoit le contrat
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  Congé triennal, préavis de 6 mois
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3">Droit au renouvellement</td>
                <td className="border border-gray-200 px-4 py-3">Non</td>
                <td className="border border-gray-200 px-4 py-3">Oui</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">Indemnité d'éviction</td>
                <td className="border border-gray-200 px-4 py-3">Non</td>
                <td className="border border-gray-200 px-4 py-3">
                  Oui, si le bailleur refuse le renouvellement
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-3">Usage typique</td>
                <td className="border border-gray-200 px-4 py-3">
                  Tester une activité, un emplacement, un concept éphémère
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  Installer durablement un fonds de commerce
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-3">Risque principal</td>
                <td className="border border-gray-200 px-4 py-3">
                  Requalification en bail 3/6/9 par maintien dans les lieux
                </td>
                <td className="border border-gray-200 px-4 py-3">
                  Engagement long et indemnité d'éviction élevée
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-700">
          Pour le détail du régime des baux commerciaux classiques, voyez notre guide{" "}
          <Link href="/blog/bail-commercial" className="text-blue-700 hover:underline">
            bail commercial 3/6/9 : durée, loyer et résiliation
          </Link>.
        </p>
      </section>

      <section aria-labelledby="loyer-charges-derogatoire" className="my-12">
        <h2 id="loyer-charges-derogatoire" className="text-2xl font-bold text-gray-900 mb-6">
          Loyer, charges et dépôt de garantie
        </h2>
        <p className="text-gray-700 mb-4">
          Le bail dérogatoire échappant au statut, plusieurs règles protectrices du bail commercial
          ne s'appliquent pas. Cela laisse une grande liberté contractuelle, mais impose d'être
          précis dans la rédaction.
        </p>
        <ul className="space-y-3 text-gray-700 mb-6">
          <li className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Le loyer est fixé librement.</strong> Il n'y a pas de plafonnement à la
              révision, ni de mécanisme légal d'indexation : si vous voulez une indexation, il faut
              une clause qui la prévoie et qui désigne l'indice.
            </span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>La répartition des charges est contractuelle.</strong> L'inventaire précis et
              limitatif imposé par la loi Pinel aux baux commerciaux ne s'applique pas de plein
              droit, mais un contrat muet sur ce point se retourne systématiquement contre le
              bailleur en cas de litige.
            </span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>Le dépôt de garantie est libre.</strong> En pratique, il correspond souvent à
              un à trois mois de loyer hors taxes et hors charges.
            </span>
          </li>
          <li className="flex items-start">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" aria-hidden="true" />
            <span>
              <strong>L'état des lieux reste obligatoire</strong> à l'entrée comme à la sortie, y
              compris en bail dérogatoire. Son absence prive le bailleur de la présomption de bon
              état.
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="resume-bail-derogatoire" className="my-12">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 id="resume-bail-derogatoire" className="text-2xl font-bold text-gray-900 mb-4">
            En resume
          </h2>
          <p className="text-gray-700 mb-4">
            Le bail derogatoire est un excellent outil de flexibilite commerciale, a condition de
            respecter strictement les exigences de l'article L.145-5 du Code de commerce.
          </p>
          <p className="text-gray-700 mb-4">
            Ses points critiques sont la duree maximale de 36 mois, la volonte claire de deroger au
            statut, l'etat des lieux obligatoire et le risque de requalification en bail 3/6/9.
          </p>
          <p className="text-gray-700 mb-6">
            Si vous travaillez aussi sur des locaux commerciaux classiques, consultez notre guide{" "}
            <Link
              href="/blog/bail-commercial-notarie-contrat-3-6-9"
              className="text-blue-700 hover:underline"
            >
              bail commercial notarie
            </Link>.
          </p>
          <Link
            href="/#contact"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Etre accompagne
          </Link>
        </div>
      </section>
    </article>
  );
}
