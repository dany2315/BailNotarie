"use client";

import React from "react";
import Link from "next/link";
import {
  CheckCircle,
  AlertTriangle,
  Scale,
  Building2,
  FileText,
  Euro,
  Clock,
  Shield,
  BookOpen,
} from "lucide-react";

export function Blog15Content() {
  return (
    <article>
      {/* INTRODUCTION */}
      <section aria-labelledby="intro-bail-commercial">
        <p className="text-lg text-gray-700 mb-4 leading-relaxed">
          Le <strong>bail commercial</strong> est le contrat qui régit la location d'un local dans
          lequel un commerçant, un industriel ou un artisan exploite son{" "}
          <strong>fonds de commerce</strong>. Il est encadré par les articles L.145-1 et suivants
          du Code de commerce et offre au <strong>locataire commerçant</strong> un ensemble de
          protections — notamment le droit au renouvellement et, à défaut, une{" "}
          <strong>indemnité d'éviction</strong>.
        </p>
        <p className="text-gray-700 mb-6">
          Pour l'entrepreneur qui cherche à installer ou développer son activité dans un{" "}
          <strong>local commercial</strong>, comprendre le bail commercial est une nécessité
          absolue. Mal rédigé ou mal négocié, il peut peser sur la rentabilité de l'exploitation
          pendant neuf ans. Bien cadré — idéalement avec l'aide d'un <strong>notaire</strong> — il
          devient un socle de stabilité pour le développement commercial.
        </p>
        <p className="text-gray-700 mb-6">
          Ce guide complet répond à toutes vos questions : définition, durée, conditions
          d'éligibilité, contenu obligatoire, <strong>loyer bail commercial</strong>,
          renouvellement, résiliation, rôle du notaire et prix.
        </p>
      </section>

      {/* TABLE DES MATIÈRES */}
      <section className="my-8 bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          Sommaire — Bail Commercial
        </h2>
        <ol className="space-y-2 text-gray-700 text-sm list-decimal list-inside">
          <li>
            <a href="#definition-bail-commercial" className="text-blue-600 hover:underline">
              Définition et caractéristiques essentielles
            </a>
          </li>
          <li>
            <a href="#duree-bail-commercial-3-6-9" className="text-blue-600 hover:underline">
              La durée du bail commercial : la règle des 3-6-9
            </a>
          </li>
          <li>
            <a
              href="#conditions-eligibilite-bail-commercial"
              className="text-blue-600 hover:underline"
            >
              Conditions d'éligibilité au statut des baux commerciaux
            </a>
          </li>
          <li>
            <a href="#contenu-bail-commercial" className="text-blue-600 hover:underline">
              Contenu obligatoire : mentions et clauses indispensables
            </a>
          </li>
          <li>
            <a href="#loyer-bail-commercial" className="text-blue-600 hover:underline">
              Le loyer : fixation, révision et indexation
            </a>
          </li>
          <li>
            <a href="#renouvellement-bail-commercial" className="text-blue-600 hover:underline">
              Le renouvellement : droit fondamental du locataire
            </a>
          </li>
          <li>
            <a href="#resiliation-bail-commercial" className="text-blue-600 hover:underline">
              Résiliation : règles et cas particuliers
            </a>
          </li>
          <li>
            <a href="#role-notaire-bail-commercial" className="text-blue-600 hover:underline">
              Le rôle du notaire dans le bail commercial
            </a>
          </li>
          <li>
            <a href="#prix-bail-commercial" className="text-blue-600 hover:underline">
              Prix et honoraires de rédaction
            </a>
          </li>
          <li>
            <a href="#bail-commercial-vs-professionnel" className="text-blue-600 hover:underline">
              Bail commercial vs bail professionnel
            </a>
          </li>
          <li>
            <a href="#pieges-bail-commercial" className="text-blue-600 hover:underline">
              Les 7 pièges à éviter dans un bail commercial
            </a>
          </li>
          <li>
            <a href="#faq-bail-commercial" className="text-blue-600 hover:underline">
              FAQ — Questions fréquentes sur le bail commercial
            </a>
          </li>
        </ol>
      </section>

      {/* RÉPONSE RAPIDE */}
      <section aria-labelledby="reponse-rapide-bail-commercial" className="my-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2
            id="reponse-rapide-bail-commercial"
            className="text-xl font-bold text-gray-900 mb-3"
          >
            Réponse rapide : qu'est-ce qu'un bail commercial ?
          </h2>
          <p className="text-gray-700">
            Le bail commercial est un contrat de location d'un immeuble ou d'un local dans lequel
            est exploité un fonds de commerce ou artisanal. Sa durée minimale est de 9 ans (règle
            des 3-6-9), avec des facultés de résiliation tous les 3 ans. Il confère au locataire un
            droit au renouvellement et, à défaut, une indemnité d'éviction versée par le bailleur.
          </p>
        </div>
      </section>

      {/* SECTION 1 — DÉFINITION */}
      <section aria-labelledby="definition-bail-commercial" className="my-12">
        <h2
          id="definition-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          1. Bail commercial : définition et caractéristiques essentielles
        </h2>
        <p className="text-gray-700 mb-4">
          Le bail commercial est défini par l'article L.145-1 du Code de commerce. Il s'applique
          aux immeubles ou locaux dans lesquels un fonds de commerce ou un fonds artisanal est
          exploité, dès lors que le locataire est immatriculé au Registre du Commerce et des
          Sociétés (RCS) ou au Registre National des Entreprises (RNE).
        </p>
        <p className="text-gray-700 mb-4">
          Contrairement à un bail d'habitation ou à un bail professionnel, le bail commercial est
          entièrement soumis au statut des baux commerciaux, qui constitue un régime protecteur et
          d'ordre public partiel. Ni le bailleur ni le locataire ne peuvent y déroger favorablement
          au bailleur sans l'accord des deux parties.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Caractéristiques protectrices pour le locataire
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>Durée minimale de 9 ans garantie</li>
              <li>Droit au renouvellement du bail à son expiration</li>
              <li>Indemnité d'éviction en cas de refus de renouvellement</li>
              <li>Encadrement strict de la révision du loyer</li>
              <li>Droit de cession du bail avec le fonds de commerce</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Champ d'application
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li>Locaux commerciaux et boutiques</li>
              <li>Locaux artisanaux (artisan immatriculé au RNE)</li>
              <li>Locaux industriels exploités pour un fonds</li>
              <li>Terrains nus sur lesquels ont été édifiées des constructions stables</li>
              <li>Succursales de grands magasins (sous conditions)</li>
            </ul>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Ce qui ne relève pas du bail commercial
          </h3>
          <p className="text-gray-700 text-sm">
            Les professions libérales (avocats, médecins, architectes...) ne peuvent pas bénéficier
            du statut des baux commerciaux : elles relèvent du bail professionnel (art. 57 A de la
            loi du 23 décembre 1986). De même, le locataire doit être personnellement immatriculé
            au RCS ou au RNE pour bénéficier du statut.
          </p>
        </div>
      </section>

      {/* CTA 1 */}
      <section className="my-10">
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 rounded-xl p-7 text-white">
          <div className="flex items-start gap-4">
            <Shield className="h-8 w-8 text-blue-200 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold mb-2">
                Sécurisez votre bail commercial avec un bail commercial notarié
              </h3>
              <p className="text-blue-100 mb-4 text-sm leading-relaxed">
                Un <strong className="text-white">bail commercial notarié</strong> vous offre un
                titre exécutoire : en cas d'impayés, vous pouvez agir immédiatement sans passer
                par un tribunal. BailNotarie prépare votre dossier et vous connecte à un notaire
                partenaire partout en France.
              </p>
              <Link
                href="/"
                className="inline-flex items-center bg-white text-blue-700 hover:bg-blue-50 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              >
                Sécuriser mon bail commercial avec un notaire →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — DURÉE 3-6-9 */}
      <section aria-labelledby="duree-bail-commercial-3-6-9" className="my-12">
        <h2
          id="duree-bail-commercial-3-6-9"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          2. La durée du bail commercial : la règle des 3-6-9
        </h2>
        <p className="text-gray-700 mb-4">
          Le bail commercial a une durée minimale de 9 ans (art. L.145-4 du Code de commerce).
          Aucune durée inférieure ne peut être stipulée, sauf à recourir à un bail dérogatoire
          (art. L.145-5) dans la limite de 36 mois au total.
        </p>
        <p className="text-gray-700 mb-4">
          La règle des <strong>3-6-9</strong> signifie que le locataire peut donner congé à
          l'expiration de chaque période triennale (3 ans, 6 ans ou 9 ans), moyennant un préavis
          de 6 mois donné par acte extrajudiciaire ou lettre recommandée avec avis de réception.
          Le bailleur, lui, ne peut mettre fin au bail avant le terme des 9 ans, sauf exceptions
          strictement limitées.
        </p>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Schéma de la règle des 3-6-9
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3  gap-4 text-center">
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600 mb-1">3 ans</p>
              <p className="text-sm text-gray-600">
                1re période triennale : le locataire peut donner congé (préavis 6 mois)
              </p>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600 mb-1">6 ans</p>
              <p className="text-sm text-gray-600">
                2e période triennale : congé possible pour le locataire (préavis 6 mois)
              </p>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600 mb-1">9 ans</p>
              <p className="text-sm text-gray-600">
                Terme du bail : les deux parties peuvent donner congé ou négocier le renouvellement
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Le bailleur peut toutefois donner congé à l'expiration d'une période triennale pour
            construire, reconstruire, surélévation de l'immeuble ou pour y effectuer des travaux
            importants, sous conditions strictes et contre une indemnité.
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Peut-on prévoir une durée supérieure à 9 ans ?
          </h3>
          <p className="text-gray-700 text-sm">
            Oui. Les parties peuvent librement convenir d'une durée supérieure à 9 ans (12, 15 ans
            ou plus). En revanche, si la durée convenue est supérieure à 12 ans, le bail commercial
            doit obligatoirement être rédigé en la forme authentique (devant notaire) et publié au
            bureau des hypothèques. C'est l'une des situations où le notaire est juridiquement
            indispensable.
          </p>
        </div>
      </section>

      {/* SECTION 3 — CONDITIONS D'ÉLIGIBILITÉ */}
      <section aria-labelledby="conditions-eligibilite-bail-commercial" className="my-12">
        <h2
          id="conditions-eligibilite-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          3. Conditions et critères d'éligibilité au statut des baux commerciaux
        </h2>
        <p className="text-gray-700 mb-4">
          Pour bénéficier du statut protecteur des baux commerciaux, trois conditions cumulatives
          doivent être remplies (art. L.145-1 C. com.) :
        </p>

        <div className="space-y-4 my-6">
          <div className="flex gap-4 items-start bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-semibold text-gray-900">Un immeuble ou local</p>
              <p className="text-gray-700 text-sm mt-1">
                Le bail doit porter sur un immeuble, un local ou une partie d'immeuble (boutique,
                entrepôt, atelier, réserve...). Les terrains nus sont en principe exclus, sauf si
                des constructions stables y ont été édifiées par le locataire avec l'accord du
                bailleur.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                L'exploitation d'un fonds de commerce ou artisanal
              </p>
              <p className="text-gray-700 text-sm mt-1">
                Un fonds de commerce est une universalité de fait regroupant la clientèle, le droit
                au bail, le nom commercial, les licences... Il doit être effectivement exploité dans
                les locaux loués. Un local laissé vacant ou utilisé à titre purement accessoire ne
                peut pas générer un bail commercial.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                L'immatriculation du locataire au RCS ou au RNE
              </p>
              <p className="text-gray-700 text-sm mt-1">
                Le locataire doit être immatriculé au Registre du Commerce et des Sociétés (pour
                les commerçants) ou au Registre National des Entreprises (pour les artisans). Cette
                immatriculation doit exister au moment de la conclusion du bail et être maintenue
                pendant toute la durée. En cas de perte de cette qualité, le bail peut perdre sa
                protection statutaire.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — CONTENU OBLIGATOIRE */}
      <section aria-labelledby="contenu-bail-commercial" className="my-12">
        <h2
          id="contenu-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          4. Contenu obligatoire du bail commercial : mentions et clauses indispensables
        </h2>
        <p className="text-gray-700 mb-4">
          La loi Pinel du 18 juin 2014 a considérablement enrichi le contenu obligatoire du bail
          commercial. Un bail incomplet ou mal rédigé expose les parties à des contentieux coûteux.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Mentions obligatoires (loi Pinel 2014)
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                État des lieux d'entrée (et de sortie) — obligatoire
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                Inventaire précis et limitatif des charges, impôts, taxes et redevances
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                Répartition des travaux entre bailleur et locataire
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                Droit de préemption du locataire en cas de vente du local
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                Clause d'indexation (indice ILC ou ILAT selon l'activité)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                Surface du local (mesurage Carrez non obligatoire mais recommandé)
              </li>
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Scale className="h-5 w-5 text-blue-600" />
              Clauses clés à négocier
            </h3>
            <ul className="space-y-2 text-gray-700 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Destination des locaux (activité autorisée — clause "tous commerces" ou restriction)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Clause de solidarité en cas de cession
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Garantie (dépôt de garantie, caution solidaire, garantie bancaire)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Franchise de loyer (loyer réduit ou nul en début de bail)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Clause d'aménagement : qui finance les travaux d'installation ?
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                Sous-location : autorisée ou interdite ?
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Diagnostics techniques obligatoires annexés au bail commercial
          </h3>
          <p className="text-gray-700 text-sm mb-2">
            Depuis la loi Grenelle II et les textes ultérieurs, plusieurs diagnostics doivent être
            annexés au bail commercial :
          </p>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>
              <strong>DPE (Diagnostic de Performance Énergétique)</strong> — informatif
            </li>
            <li>
              <strong>État des risques et pollutions (ERP)</strong> — obligatoire
            </li>
            <li>
              <strong>Diagnostic amiante</strong> — pour les immeubles dont le permis de
              construire est antérieur au 1er juillet 1997
            </li>
            <li>
              <strong>Diagnostic bruit</strong> — si le local est situé dans une zone
              d'exposition au bruit d'un aéroport
            </li>
          </ul>
        </div>
      </section>

      {/* SECTION 5 — LOYER */}
      <section aria-labelledby="loyer-bail-commercial" className="my-12">
        <h2
          id="loyer-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          5. Le loyer du bail commercial : fixation, révision et indexation
        </h2>
        <p className="text-gray-700 mb-4">
          Le <strong>loyer bail commercial</strong> est librement fixé entre les parties lors de la
          conclusion du contrat. Cependant, ses évolutions en cours de bail sont strictement
          encadrées par la loi.
        </p>

        <div className="space-y-6 my-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Euro className="h-5 w-5 text-blue-600" />
              La révision légale triennale (art. L.145-38)
            </h3>
            <p className="text-gray-700 text-sm mb-3">
              Tous les 3 ans, l'une ou l'autre des parties peut demander la révision du loyer.
              Cette révision est plafonnée : le loyer révisé ne peut excéder la variation de
              l'indice applicable (ILC ou ILAT) depuis la dernière fixation. Cette règle du
              plafonnement protège le locataire d'une explosion du loyer en cours de bail.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900 text-sm mb-1">Indice ILC</p>
                <p className="text-gray-600 text-xs">
                  Indice des Loyers Commerciaux — applicable aux activités commerciales et
                  artisanales
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="font-semibold text-gray-900 text-sm mb-1">Indice ILAT</p>
                <p className="text-gray-600 text-xs">
                  Indice des Loyers des Activités Tertiaires — applicable aux activités tertiaires
                  non commerciales
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Le déplafonnement du loyer au renouvellement
            </h3>
            <p className="text-gray-700 text-sm mb-3">
              À l'expiration du bail de 9 ans, le loyer du bail renouvelé peut être fixé à la{" "}
              <strong>valeur locative</strong> (prix du marché) si certaines conditions sont
              remplies. C'est le mécanisme du déplafonnement. Il peut entraîner une augmentation
              importante du loyer, notamment lorsque la valeur locative du marché a
              considérablement progressé.
            </p>
            <p className="text-gray-700 text-sm">
              La loi Pinel 2014 a limité les hausses de loyer au renouvellement : même en cas de
              déplafonnement, l'augmentation ne peut dépasser <strong>10 % par an</strong> du
              loyer précédent.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Indexation annuelle par clause d'échelle mobile
            </h3>
            <p className="text-gray-700 text-sm">
              Une clause d'indexation (ou clause d'échelle mobile) peut prévoir une actualisation
              automatique du loyer chaque année selon l'évolution de l'ILC ou de l'ILAT. Cette
              clause, très courante, permet d'éviter de demander formellement la révision triennale
              tout en maintenant le loyer en phase avec l'inflation commerciale.
            </p>
          </div>
        </div>
      </section>

      {/* CTA 2 — après loyer */}
      <section className="my-10">
        <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                Votre loyer, vos clauses, votre protection
              </h3>
              <p className="text-gray-600 text-sm">
                Un <strong>bail commercial notarié</strong> garantit l'exactitude de votre clause
                d'indexation et vous donne un titre exécutoire pour agir en cas d'impayés — sans
                attendre le juge.
              </p>
            </div>
            <Link
              href="/"
              className="flex-shrink-0 inline-flex items-center bg-blue-600 text-white hover:bg-blue-700 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
            >
              Sécuriser mon bail commercial →
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 6 — RENOUVELLEMENT */}
      <section aria-labelledby="renouvellement-bail-commercial" className="my-12">
        <h2
          id="renouvellement-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          6. Le renouvellement du bail commercial : droit fondamental du locataire
        </h2>
        <p className="text-gray-700 mb-4">
          À l'expiration du bail de 9 ans, le locataire bénéficie d'un{" "}
          <strong>droit au renouvellement</strong>. C'est l'un des piliers du statut des baux
          commerciaux. Ce droit peut être exercé par le locataire en faisant une demande de
          renouvellement dans les 6 mois avant l'expiration du bail, ou en restant dans les lieux
          avec le consentement tacite du bailleur.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Si le bailleur accepte le renouvellement
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li> Nouveau bail de 9 ans minimum</li>
              <li>
                Loyer fixé à la valeur locative ou plafonné selon les règles du déplafonnement
              </li>
              <li> Possibilité de renégocier les clauses</li>
              <li> Continuation de la stabilité juridique pour le locataire</li>
            </ul>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Si le bailleur refuse le renouvellement
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li>
                Obligation de verser une <strong>indemnité d'éviction</strong>
              </li>
              <li>
                 L'indemnité représente la valeur du fonds de commerce (souvent 1 à 2 ans de
                chiffre d'affaires)
              </li>
              <li> Procédure judiciaire si désaccord sur le montant</li>
              <li> Exception : motifs légitimes et sérieux (infractions graves du locataire)</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            L'indemnité d'éviction : calcul et enjeux
          </h3>
          <p className="text-gray-700 text-sm mb-3">
            L'<strong>indemnité d'éviction</strong> est la contrepartie financière du droit au
            renouvellement refusé. Elle couvre :
          </p>
          <ul className="text-gray-700 text-sm space-y-1">
            <li>
              La <strong>valeur marchande du fonds de commerce</strong> (élément principal)
            </li>
            <li> Les frais de déménagement et de réinstallation</li>
            <li> Les frais et droits de mutation pour l'acquisition d'un fonds similaire</li>
            <li> La perte du droit au bail (valeur du bail lui-même sur le marché)</li>
          </ul>
          <p className="text-gray-700 text-sm mt-3">
            En pratique, l'indemnité d'éviction peut atteindre plusieurs centaines de milliers
            d'euros pour un fonds commercial important, ce qui incite souvent le bailleur à
            renouveler plutôt qu'à payer.
          </p>
        </div>
      </section>

      {/* SECTION 7 — RÉSILIATION */}
      <section aria-labelledby="resiliation-bail-commercial" className="my-12">
        <h2
          id="resiliation-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          7. Résiliation du bail commercial : règles et cas particuliers
        </h2>
        <p className="text-gray-700 mb-4">
          La <strong>résiliation bail commercial</strong> est encadrée très strictement. Le
          mécanisme du 3-6-9 ne permet au locataire de partir facilement qu'à l'expiration de
          chaque période triennale, sous réserve d'un préavis de 6 mois.
        </p>

        <div className="space-y-4 my-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Congé triennal du locataire
            </h3>
            <p className="text-gray-700 text-sm">
              Le locataire peut donner congé à l'expiration de chaque période de 3 ans, en
              respectant un préavis de <strong>6 mois</strong> donné par acte extrajudiciaire ou
              lettre recommandée. Cette faculté est d'ordre public : une clause interdisant au
              locataire de donner congé à l'issue d'une triennale est réputée non écrite.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Cas autorisant le congé triennal du bailleur
            </h3>
            <p className="text-gray-700 text-sm">
              Le bailleur ne peut pas en principe rompre le bail avant les 9 ans. Exceptions : pour
              reconstruire ou surélévation, pour réaliser des travaux prescrits ou autorisés (sous
              conditions strictes), ou en cas de vente à l'occupant. Il doit alors verser au
              locataire une indemnité d'éviction ou lui offrir une relocation dans des locaux
              équivalents.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              Résiliation judiciaire pour faute
            </h3>
            <p className="text-gray-700 text-sm">
              En cas de manquement grave du locataire (loyers impayés, destination non respectée,
              sous-location non autorisée...), le bailleur peut saisir le tribunal pour obtenir la
              résiliation judiciaire du bail et l'expulsion. La clause résolutoire insérée dans le
              bail permet d'accélérer cette procédure : si le locataire ne régularise pas dans le
              mois suivant le commandement de payer, la clause s'applique de plein droit et le
              bailleur peut saisir le juge.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Résiliation amiable</h3>
            <p className="text-gray-700 text-sm">
              Bailleur et locataire peuvent convenir à tout moment d'une résiliation anticipée
              amiable du bail commercial. Cette résiliation doit être constatée par écrit et peut
              donner lieu à une indemnité de résiliation négociée. Elle est souvent utilisée lors
              d'une vente du fonds ou d'une cessation d'activité.
            </p>
          </div>
        </div>
      </section>

      {/* CTA 3 — après résiliation */}
      <section className="my-10">
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Évitez les conflits coûteux sur votre bail commercial
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Un <strong>bail commercial notarié</strong> réduit considérablement les risques de
            litige grâce à la rédaction par un officier public, la conservation de l'original
            75 ans et le titre exécutoire qui accélère le recouvrement en cas d'impayés.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm"
          >
            Obtenir un bail commercial notarié →
          </Link>
        </div>
      </section>

      {/* SECTION 8 — RÔLE DU NOTAIRE */}
      <section aria-labelledby="role-notaire-bail-commercial" className="my-12">
        <h2
          id="role-notaire-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          8. Le rôle du notaire dans le bail commercial
        </h2>
        <p className="text-gray-700 mb-4">
          Si le recours au <strong>bail commercial notaire</strong> n'est pas obligatoire pour la
          plupart des baux de 9 ans, il offre des avantages décisifs qui en font une option
          privilégiée pour les professionnels avertis.
        </p>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Quand le notaire est obligatoire
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>
                  Bail commercial d'une <strong>durée supérieure à 12 ans</strong> : acte
                  authentique obligatoire (art. 28, 1° du décret du 4 janvier 1955)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <span>
                  Bail emphytéotique commercial (durée 18 à 99 ans) : acte notarié requis
                </span>
              </li>
            </ul>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              Avantages du bail commercial notarié
            </h3>
            <ul className="text-gray-700 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Acte authentique</strong> : force probante absolue, impossibilité de
                  contester le contenu
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Titre exécutoire</strong> : recouvrement des loyers impayés sans
                  procédure judiciaire déclarative préalable
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Date certaine</strong> : opposable aux tiers, protège contre la fraude
                  documentaire
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Conseil juridique</strong> : le notaire vérifie la conformité du bail,
                  les obligations fiscales, les diagnostics et les clauses sensibles
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Conservation</strong> : l'original est conservé en minute pendant 75 ans,
                  les copies ont la même valeur
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 my-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Le titre exécutoire : l'atout majeur pour le bailleur commercial
          </h3>
          <p className="text-gray-700 text-sm mb-3">
            En cas de loyers impayés, le bailleur titulaire d'un bail commercial notarié peut
            mandater directement un commissaire de justice pour pratiquer une saisie sur les
            comptes bancaires, les stocks ou les rémunérations du locataire — sans attendre des
            mois de procédure judiciaire.
          </p>
          <p className="text-gray-700 text-sm">
            Ce gain de temps est considérable dans le monde des affaires, où chaque mois d'impayé
            peut représenter plusieurs milliers d'euros de pertes pour le bailleur.
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            <strong>BailNotarie</strong> : la plateforme qui facilite la préparation de votre
            dossier
          </h3>
          <p className="text-gray-700 text-sm mb-3">
            Passer par un notaire pour votre bail commercial implique de constituer un dossier
            complet avant la signature. BailNotarie accompagne bailleurs et locataires commerciaux
            dans la structuration de ce dossier : collecte des pièces, vérification des
            informations, transmission au notaire partenaire.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Découvrir la plateforme BailNotarie →
          </Link>
        </div>
      </section>

      {/* SECTION 9 — PRIX ET HONORAIRES */}
      <section aria-labelledby="prix-bail-commercial" className="my-12">
        <h2
          id="prix-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          9. Prix et honoraires : combien coûte la rédaction d'un bail commercial ?
        </h2>
        <p className="text-gray-700 mb-4">
          Le <strong>bail commercial prix</strong> varie selon qu'il est rédigé sous seing privé
          (entre les parties ou par un avocat) ou en la forme authentique (par un notaire).
        </p>

        <div className="grid md:grid-cols-3 gap-4 my-6">
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-2">Bail sous seing privé</p>
            <p className="text-2xl font-bold text-gray-900 mb-1">500 – 2 000 €</p>
            <p className="text-xs text-gray-500">
              Honoraires d'avocat ou de conseil juridique pour la rédaction
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-400 rounded-lg p-5 text-center">
            <p className="text-sm font-semibold text-blue-700 mb-2">Bail commercial notarié</p>
            <p className="text-2xl font-bold text-blue-800 mb-1">1 500 – 4 000 €</p>
            <p className="text-xs text-gray-600">
              Émoluments du notaire + formalités + enregistrement (selon loyer et complexité)
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-5 text-center">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Bail {">"} 12 ans (notaire obligatoire)
            </p>
            <p className="text-2xl font-bold text-gray-900 mb-1">2 000 – 6 000 €</p>
            <p className="text-xs text-gray-500">
              Acte authentique + publication au bureau des hypothèques
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Qui paie les frais du bail commercial notarié ?
          </h3>
          <p className="text-gray-700 text-sm mb-3">
            Pour le bail commercial, les frais notariés ne sont pas réglementés de la même façon
            que pour le bail d'habitation. Les parties fixent librement la répartition des frais.
            En pratique, deux options sont fréquentes :
          </p>
          <ul className="text-gray-700 text-sm space-y-2">
            <li>
               <strong>Frais à la charge du bailleur</strong> : le plus fréquent, car c'est
              souvent le bailleur qui souhaite les garanties offertes par l'acte authentique
            </li>
            <li>
              <strong>Partage 50/50</strong> : possible par accord, notamment quand les deux
              parties bénéficient des garanties notariales
            </li>
            <li>
              <strong>Frais à la charge du locataire</strong> : possible mais rare ; dans ce cas
              les frais ne doivent pas être disproportionnés
            </li>
          </ul>
          <p className="text-gray-700 text-sm mt-3">
            L'enregistrement du bail commercial est une formalité obligatoire (dans le mois
            suivant la signature) qui peut être réalisée en ligne et coûte environ 25 € (droit
            fixe). Le notaire s'en charge directement lorsqu'il rédige l'acte.
          </p>
        </div>
      </section>

      {/* SECTION 10 — BAIL COMMERCIAL VS BAIL PROFESSIONNEL */}
      <section aria-labelledby="bail-commercial-vs-professionnel" className="my-12">
        <h2
          id="bail-commercial-vs-professionnel"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          10. Bail commercial vs bail professionnel : quelles différences ?
        </h2>
        <p className="text-gray-700 mb-4">
          La différence entre bail commercial et bail professionnel est fondamentale et détermine
          le niveau de protection dont bénéficie le locataire.
        </p>

        <div className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border border-gray-300 font-semibold">Critère</th>
                <th className="text-left p-3 border border-gray-300 font-semibold text-blue-700">
                  Bail commercial
                </th>
                <th className="text-left p-3 border border-gray-300 font-semibold text-gray-700">
                  Bail professionnel
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-gray-300 font-medium">Bénéficiaires</td>
                <td className="p-3 border border-gray-300 text-blue-700">
                  Commerçants, industriels, artisans (RCS/RNE)
                </td>
                <td className="p-3 border border-gray-300">Professions libérales</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-300 font-medium">Durée minimale</td>
                <td className="p-3 border border-gray-300 text-blue-700">9 ans</td>
                <td className="p-3 border border-gray-300">6 ans</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-300 font-medium">
                  Droit au renouvellement
                </td>
                <td className="p-3 border border-gray-300 text-blue-700">Oui (droit fort)</td>
                <td className="p-3 border border-gray-300">
                  Non (pas de droit au renouvellement)
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-300 font-medium">
                  Indemnité d'éviction
                </td>
                <td className="p-3 border border-gray-300 text-blue-700">
                  Oui (si refus de renouvellement)
                </td>
                <td className="p-3 border border-gray-300">Non</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-300 font-medium">Congé du locataire</td>
                <td className="p-3 border border-gray-300 text-blue-700">
                  À chaque triennale (6 mois de préavis)
                </td>
                <td className="p-3 border border-gray-300">
                  À tout moment avec 6 mois de préavis
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-3 border border-gray-300 font-medium">Révision du loyer</td>
                <td className="p-3 border border-gray-300 text-blue-700">
                  Encadrée (ILC/ILAT, plafonnement)
                </td>
                <td className="p-3 border border-gray-300">Libre (clause contractuelle)</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-300 font-medium">Cession du bail</td>
                <td className="p-3 border border-gray-300 text-blue-700">
                  Possible avec le fonds de commerce
                </td>
                <td className="p-3 border border-gray-300">Possible si clause contractuelle</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-700 text-sm">
          Pour un entrepreneur qui exerce une activité commerciale ou artisanale, le bail
          commercial est nettement plus protecteur. Pour un professionnel libéral (médecin,
          avocat...), le bail professionnel est la seule option disponible.
        </p>
      </section>

      {/* SECTION 11 — LES 7 PIÈGES À ÉVITER */}
      <section aria-labelledby="pieges-bail-commercial" className="my-12">
        <h2
          id="pieges-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          11. Les 7 pièges à éviter dans un bail commercial
        </h2>
        <p className="text-gray-700 mb-6">
          Un bail commercial mal négocié ou mal rédigé peut avoir des conséquences financières
          lourdes sur 9 ans. Voici les erreurs les plus courantes à éviter absolument.
        </p>

        <div className="space-y-4">
          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              1
            </div>
            <div>
              <p className="font-semibold text-gray-900">Clause de destination trop restrictive</p>
              <p className="text-gray-700 text-sm mt-1">
                Une destination limitée à une activité précise (ex. "restauration asiatique")
                bloque toute évolution ou cession future. Négociez une clause "tous commerces" ou
                une destination large dès la signature du bail commercial.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              2
            </div>
            <div>
              <p className="font-semibold text-gray-900">Oublier l'inventaire des charges</p>
              <p className="text-gray-700 text-sm mt-1">
                Depuis la loi Pinel, le bail commercial doit comporter un inventaire précis et
                limitatif des charges. Sans cet inventaire, le bailleur peut refacturer des charges
                non prévues. Vérifiez chaque poste de charge avant de signer.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              3
            </div>
            <div>
              <p className="font-semibold text-gray-900">Négliger la clause de travaux</p>
              <p className="text-gray-700 text-sm mt-1">
                La répartition des travaux entre bailleur et locataire est librement négociée dans
                le bail commercial. Un bailleur peut imposer des travaux importants au locataire si
                le bail est mal rédigé. Identifiez précisément qui prend en charge quoi.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              4
            </div>
            <div>
              <p className="font-semibold text-gray-900">Mal calibrer la clause d'indexation</p>
              <p className="text-gray-700 text-sm mt-1">
                Une clause d'indexation basée sur le mauvais indice (ILC vs ILAT) ou mal rédigée
                peut être invalidée par un tribunal. Résultat : aucune révision du loyer n'est
                possible pendant toute la durée du bail.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              5
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Signer sans lire la clause résolutoire
              </p>
              <p className="text-gray-700 text-sm mt-1">
                La clause résolutoire détermine les conditions de résiliation pour faute. Une
                clause trop large peut permettre au bailleur de résilier le bail pour des motifs
                mineurs. À vérifier impérativement avant toute signature.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              6
            </div>
            <div>
              <p className="font-semibold text-gray-900">Ne pas prévoir la cession du bail</p>
              <p className="text-gray-700 text-sm mt-1">
                Si vous revendez votre fonds de commerce, la cession du bail commercial est
                automatiquement attachée à la vente. Mais certaines clauses contractuelles peuvent
                la bloquer ou la rendre très onéreuse. Anticipez dès la rédaction initiale.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
              7
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                Se passer du notaire pour un bail long
              </p>
              <p className="text-gray-700 text-sm mt-1">
                Pour tout bail commercial supérieur à 12 ans, le notaire est juridiquement
                obligatoire. Mais même pour un bail de 9 ans, un{" "}
                <strong>bail commercial notarié</strong> offre un titre exécutoire immédiat en cas
                d'impayés — ce qu'aucun bail sous seing privé ne peut offrir.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 12 — FAQ */}
      <section aria-labelledby="faq-bail-commercial" className="my-12">
        <h2
          id="faq-bail-commercial"
          className="text-2xl font-bold text-gray-900 mb-6"
        >
          12. FAQ — Questions fréquentes sur le bail commercial
        </h2>

        <div className="space-y-3">
          <details className="bg-white border border-gray-200 rounded-lg" open>
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Quelle est la durée minimale d'un bail commercial ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              La durée minimale d'un bail commercial est de <strong>9 ans</strong>, conformément à
              l'article L.145-4 du Code de commerce. Toute clause prévoyant une durée inférieure
              est réputée non écrite. Exception : le bail dérogatoire (art. L.145-5) peut être
              conclu pour une durée maximale de 36 mois.
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Comment résilier un bail commercial avant les 9 ans ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Le locataire peut résilier son bail commercial à l'issue de chaque période triennale
              (3 ans, 6 ans), en respectant un préavis de 6 mois par acte extrajudiciaire ou lettre
              recommandée. Le bailleur, lui, ne peut en principe pas résilier avant le terme des
              9 ans, sauf exceptions légales (reconstruction, travaux prescrits...).
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Le bail commercial doit-il être enregistré ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Oui, le bail commercial doit être enregistré dans le mois suivant sa signature auprès
              des services fiscaux. Cette formalité coûte environ{" "}
              <strong>25 € (droit fixe)</strong> et est obligatoire. Si le bail est rédigé par un
              notaire, celui-ci prend en charge l'enregistrement directement.
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Quelle est la différence entre bail commercial et bail dérogatoire ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Le bail commercial dure au minimum 9 ans et confère un droit au renouvellement. Le{" "}
              <strong>bail dérogatoire</strong> (art. L.145-5) est un contrat de courte durée
              (36 mois maximum) qui exclut expressément l'application du statut des baux
              commerciaux. À son terme, si le locataire reste dans les lieux, le bail peut se
              requalifier automatiquement en bail commercial.
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Comment est fixé le loyer d'un bail commercial ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Le loyer initial est librement fixé par les parties. En cours de bail, sa révision
              est plafonnée à la variation de l'indice ILC (activités commerciales et artisanales)
              ou ILAT (activités tertiaires). Au renouvellement, un déplafonnement est possible
              mais l'augmentation est limitée à 10 % par an du loyer précédent (loi Pinel 2014).
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Qu'est-ce que l'indemnité d'éviction dans un bail commercial ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              L'indemnité d'éviction est la somme que le bailleur doit verser au locataire lorsqu'il
              refuse le renouvellement du bail commercial sans motif grave. Elle est calculée sur la
              base de la valeur du fonds de commerce (souvent 1 à 2 ans de chiffre d'affaires) et
              peut atteindre plusieurs centaines de milliers d'euros pour un fonds important.
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Pourquoi faire un bail commercial notarié ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Un <strong>bail commercial notarié</strong> offre plusieurs avantages essentiels :
              acte authentique (force probante absolue), titre exécutoire (recouvrement des impayés
              sans jugement préalable), date certaine opposable aux tiers et conservation de
              l'original pendant 75 ans. Pour le bailleur, c'est la protection maximale en cas de
              litige commercial.
            </div>
          </details>

          <details className="bg-white border border-gray-200 rounded-lg">
            <summary className="p-5 font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 rounded-lg list-none flex justify-between items-center">
              Peut-on sous-louer un local commercial ?
              <span className="text-gray-400 text-xl leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-gray-700 text-sm border-t border-gray-100 pt-3">
              Par défaut, la sous-location d'un local commercial est interdite sauf accord exprès
              du bailleur. Cette autorisation doit être prévue dans le bail ou obtenue
              spécifiquement par écrit. Une sous-location non autorisée peut entraîner la
              résiliation judiciaire du bail commercial.
            </div>
          </details>
        </div>
      </section>

      {/* LIENS INTERNES */}
      <section className="my-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Articles complémentaires</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/blog/bail-commercial-notarie-contrat-3-6-9"
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-semibold text-gray-900 text-sm mb-1">
              Bail commercial notarié : notaire, coût, obligations
            </p>
            <p className="text-gray-500 text-xs">Pourquoi faire un bail 3/6/9 chez le notaire ?</p>
          </Link>
          <Link
            href="/blog/bail-derogatoire-article-l145-5-code-commerce"
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
          >
            <p className="font-semibold text-gray-900 text-sm mb-1">
              Bail dérogatoire : article L.145-5
            </p>
            <p className="text-gray-500 text-xs">Alternative au bail commercial classique</p>
          </Link>
        </div>
      </section>

      {/* CONCLUSION */}
      <section aria-labelledby="conclusion-bail-commercial" className="my-12">
        <div className="bg-blue-600 rounded-xl p-8 text-white">
          <h2
            id="conclusion-bail-commercial"
            className="text-2xl font-bold mb-4"
          >
            Sécurisez votre bail commercial avec un bail commercial notarié
          </h2>
          <p className="text-blue-100 mb-4">
            Le bail commercial est un contrat structurant pour la vie de votre entreprise. Neuf ans
            de loyer, de stabilité et de droit au renouvellement sont en jeu. Une clause mal
            négociée sur la destination des locaux, sur les travaux ou sur l'indexation peut coûter
            des dizaines de milliers d'euros sur la durée du bail.
          </p>
          <p className="text-blue-100 mb-6">
            Passer par un notaire pour la <strong>rédaction du bail commercial</strong> n'est pas
            une obligation pour un bail de 9 ans, mais c'est la garantie de sécurité maximale :
            acte authentique, titre exécutoire pour agir immédiatement en cas d'impayés, conseil
            juridique expert et conservation de l'original. BailNotarie vous accompagne pour
            préparer et structurer votre dossier avant la signature chez un notaire partenaire
            partout en France.
          </p>
          <Link
            href="/"
            className="inline-flex items-center bg-white text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Sécuriser mon bail commercial avec un notaire →
          </Link>
        </div>
      </section>
    </article>
  );
}
