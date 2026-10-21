"use client";

import React from 'react';
import Link from 'next/link';
import {
  Callout,
  CheckList,
  CompareCards,
  DataTable,
  InlineCta,
  KeyFacts,
  ReadAlso,
  SectionHeading,
  Sources,
  Steps,
} from './article-kit';
import { CongeBailleurCalculator } from './tools/conge-bailleur-calculator';

export function Blog21Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Vous souhaitez habiter votre appartement, y loger un proche ou vendre votre bien libre de toute occupation.
          En tant que propriétaire, pouvez-vous simplement demander au locataire de partir ?
        </p>
        <p className="text-gray-700 mb-4">
          Pour une résidence principale louée avec un bail d’habitation classique, la réponse est non. Récupérer son
          logement suppose de respecter <strong>un motif, une échéance et des formalités précises</strong>. Voici les
          points à vérifier avant d’engager votre projet, et un calculateur pour connaître votre date limite.
        </p>
        <p className="text-gray-700 mb-4">
          Les baux étudiants de neuf mois, les baux mobilité et les régimes particuliers nécessitent une analyse
          distincte.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '6 mois', label: 'Préavis en location vide', hint: 'Congé reçu avant l’échéance du bail.' },
          { value: '3 mois', label: 'Préavis en meublé', hint: 'Pour un bail meublé classique d’un an.' },
          { value: '3 motifs', label: 'Seulement', hint: 'Reprise, vente, ou motif légitime et sérieux.' },
        ]}
      />

      <SectionHeading id="recuperer-son-logement" step="Le principe">
        Peut-on récupérer son logement loué à tout moment ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Non. Le congé donné par le propriétaire intervient pour l’<strong>échéance du bail</strong>, et non à la date
        qu’il choisit. Il doit reposer sur l’un des motifs admis par la loi :
      </p>
      <DataTable
        caption="Les trois motifs de congé du bailleur"
        head={['Motif', 'Ce qu’il permet', 'Point de vigilance']}
        rows={[
          ['Congé pour reprise', 'Habiter le logement ou y loger un proche autorisé', 'Bénéficiaire identifié, projet réel et sérieux'],
          ['Congé pour vente', 'Vendre le bien libre d’occupation', 'En location vide, le congé vaut offre de vente au locataire'],
          ['Motif légitime et sérieux', 'Par exemple, des manquements graves du locataire', 'Le motif doit être établi, le juge peut le contrôler'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        Un projet personnel ne suffit donc pas à interrompre le contrat en cours. La première étape consiste à retrouver
        le bail, sa date de prise d’effet et son échéance actuelle.
      </p>

      <CongeBailleurCalculator />

      <SectionHeading id="conge-pour-reprise" step="Reprise">
        Congé pour reprise : récupérer son appartement pour y vivre
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        La reprise doit correspondre à un <strong>projet réel d’habitation principale</strong>. Elle peut bénéficier au
        propriétaire ou à certaines personnes définies par la loi :
      </p>
      <CheckList
        items={[
          'le propriétaire lui-même ;',
          'son conjoint, son partenaire de Pacs ou son concubin notoire depuis au moins un an ;',
          'ses ascendants et descendants, ou ceux de son conjoint, partenaire ou concubin.',
        ]}
      />
      <p className="text-gray-700 mb-4">
        Il ne suffit pas d’écrire « reprise familiale ». Le congé doit <strong>identifier le bénéficiaire</strong>,
        préciser son adresse et son lien avec le bailleur. En location vide, il faut également justifier le caractère
        réel et sérieux de la reprise.
      </p>
      <Callout tone="info" title="Logement détenu par une société">
        <p>
          Si le bien appartient à une SCI ou à une autre société, faites examiner les possibilités de reprise selon sa
          forme : les règles ne se transposent pas automatiquement de celles d’un propriétaire particulier.
        </p>
      </Callout>

      <SectionHeading id="conge-pour-vente" step="Vente">
        Vendre occupé ou donner congé pour vente ?
      </SectionHeading>
      <CompareCards
        left={{
          tag: 'Sans congé',
          title: 'Vente occupée',
          items: [
            'Le bien est vendu avec le bail en cours.',
            'L’acquéreur devient le nouveau bailleur.',
            'Aucun délai d’échéance à attendre.',
          ],
        }}
        right={{
          tag: 'Avec congé',
          title: 'Congé pour vendre libre',
          items: [
            'En location vide, le congé vaut offre de vente : il indique le prix et les conditions.',
            'Le locataire bénéficie d’un droit de préemption, sauf exceptions légales.',
            'En meublé classique, le congé pour vendre ne donne pas ce droit de priorité.',
          ],
        }}
      />

      <SectionHeading id="delai-conge" step="Délais">
        Quels délais respecter pour donner congé ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le locataire doit <strong>recevoir</strong> le congé au moins <strong>six mois</strong> avant l’échéance pour une
        location vide, ou <strong>trois mois</strong> pour une location meublée classique. Ce n’est pas la date
        d’expédition qui compte : une lettre recommandée non retirée peut compromettre la démarche.
      </p>
      <Steps
        steps={[
          {
            title: 'Lettre recommandée avec avis de réception',
            body: 'Le délai part de la réception effective par le locataire.',
          },
          {
            title: 'Remise en main propre',
            body: 'Contre récépissé ou émargement daté et signé.',
          },
          {
            title: 'Acte de commissaire de justice',
            body: 'La solution la plus sûre quand la remise risque d’être difficile.',
          },
        ]}
      />
      <Callout tone="tip">
        <p>
          Prévoyez une marge de plusieurs semaines pour faire vérifier le document et gérer une difficulté de remise.
        </p>
      </Callout>

      <SectionHeading id="lettre-conge-reprise" step="Formalités">
        Lettre de congé pour reprise ou vente : quels documents joindre ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le contenu varie selon le motif et le régime du bail : copier un modèle de lettre sans vérifier son champ
        d’application expose à des erreurs. Vérifiez au minimum :
      </p>
      <CheckList
        items={[
          <>Le <strong>motif</strong> précis et, pour une reprise, l’identité, l’adresse et le lien du bénéficiaire.</>,
          <>Pour une vente en location vide, le <strong>prix et les conditions</strong> de la vente.</>,
          <>
            En location vide, la <strong>notice d’information réglementaire</strong>, qui rappelle les obligations du
            bailleur et les recours du locataire.
          </>,
          <>Les <strong>destinataires</strong> : chaque titulaire du bail en présence de plusieurs locataires.</>,
        ]}
      />

      <SectionHeading id="locataire-protege" step="Cas particuliers">
        Locataire âgé, achat récent : les situations à vérifier
      </SectionHeading>
      <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900">Locataire de plus de 65 ans</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            Si ses ressources sont inférieures à un plafond, le bailleur doit lui proposer un relogement adapté, sauf
            s’il est lui-même âgé de plus de 65 ans ou dispose de ressources modestes.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900">Logement acheté occupé</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            En location vide, un congé pour reprise ne peut prendre effet moins de deux ans après l’achat, et le congé
            pour vente obéit lui aussi à un calendrier aménagé.
          </p>
        </div>
      </div>
      <p className="text-gray-700 mb-4">
        Avant de fixer une date de déménagement ou de promettre une vente libre, faites vérifier ces situations.
      </p>
      <Callout tone="warning" title="Un congé frauduleux coûte cher">
        <p>
          Le bailleur qui ne réalise pas le projet annoncé s’expose à une amende pénale pouvant atteindre 6 000 € (30 000 €
          pour une société), en plus de dommages et intérêts au locataire.
        </p>
      </Callout>

      <SectionHeading id="locataire-reste" step="Après l’échéance">
        Et si le locataire reste après l’échéance ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Même avec un congé que vous estimez valable, vous ne pouvez <strong>pas changer les serrures</strong>, retirer
        les affaires du locataire ou le contraindre vous-même à partir : ce serait un délit, puni jusqu’à trois ans
        d’emprisonnement et 30 000 € d’amende. Une procédure judiciaire peut être nécessaire, et aucune expulsion n’est
        exécutée pendant la trêve hivernale, du 1er novembre au 31 mars.
      </p>
      <p className="text-gray-700 mb-4">
        Préparez votre dossier avec le bail, ses avenants, les preuves de notification et les justificatifs du motif
        retenu.
      </p>
      <ReadAlso
        href="/blog/bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement"
        label="Bail notarié et expulsion : ce qui change vraiment"
        hint="Le titre exécutoire accélère le recouvrement, pas l’expulsion."
      />

      <SectionHeading id="proprietaire-anticiper" step="Côté propriétaire">
        Anticiper dès la signature du bail
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Un{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>{' '}
        ne donne pas un droit de reprise immédiat et ne remplace pas une décision de justice lorsqu’elle est nécessaire.
        Il apporte en revanche une date certaine, un contrat conservé par le notaire et un titre exécutoire pour
        recouvrer les loyers impayés : autant d’éléments utiles le jour où la fin du bail se prépare.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Préparez votre prochain bail sur des bases solides"
        body="BailNotarie prépare votre dossier de bail notarié en ligne : pièces, informations du locataire et transmission à un notaire partenaire jusqu’à la signature."
        points={['Date certaine et acte conservé', 'Titre exécutoire en cas d’impayé', 'Dossier guidé, 100 % en ligne', 'Notaires partenaires partout en France']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : préavis et formalités du congé donné par le propriétaire',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F929',
          },
          {
            label: 'Service Public : vendre un logement loué',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F35784',
          },
          {
            label: 'ANIL : document à joindre au congé pour reprise ou vente',
            href: 'https://www.anil.org/aj-document-joindre-bailleur-reprise-vente-logement/',
          },
          {
            label: 'ANIL : fin du bail d’une location meublée',
            href: 'https://www.anil.org/votre-besoin/louer/type-de-location/location-meublee/fin-du-bail/',
          },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (articles 15 et 25-8)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
