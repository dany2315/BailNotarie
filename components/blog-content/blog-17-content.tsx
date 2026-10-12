"use client";

import React from 'react';
import Link from 'next/link';
import {
  Callout,
  CheckList,
  DataTable,
  InlineCta,
  KeyFacts,
  ReadAlso,
  SectionHeading,
  Sources,
  Steps,
} from './article-kit';
import { PreavisCalculator } from './tools/preavis-calculator';

export function Blog17Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Quitter un logement ne se résume pas à prévenir son propriétaire de la date du déménagement. Le locataire
          doit respecter un <strong>préavis</strong>, dont la durée dépend du type de location et, pour un logement
          vide, de sa situation. Quand peut-on bénéficier d’un mois au lieu de trois ? À quelle date commence le délai ?
          Voici les règles essentielles pour préparer son départ, et un calculateur pour obtenir votre date exacte.
        </p>
        <p className="text-gray-700 mb-4">
          Ce guide concerne les logements loués à titre de résidence principale, avec un bail d’habitation vide ou
          meublé classique (loi du 6 juillet 1989).
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '3 mois', label: 'Location vide', hint: 'Délai de principe pour le locataire.' },
          { value: '1 mois', label: 'Meublée ou zone tendue', hint: 'Et dans plusieurs situations justifiées.' },
          { value: 'Jour J', label: 'Réception du courrier', hint: 'Le délai court à la réception, pas à l’envoi.' },
        ]}
      />

      <SectionHeading id="duree-preavis" step="L’essentiel">
        Préavis de location : 1 mois ou 3 mois ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        La durée du préavis dépend d’abord du type de bail. La durée du contrat ne doit pas être confondue avec le délai
        nécessaire pour le quitter : un locataire peut partir à tout moment, à condition de respecter ce délai.
      </p>
      <DataTable
        caption="Durée du préavis du locataire selon le type de location"
        head={['Situation', 'Préavis du locataire', 'Justificatif']}
        rows={[
          ['Location vide, cas général', <strong key="a">3 mois</strong>, 'Aucun'],
          ['Location vide en zone tendue', <strong key="b">1 mois</strong>, 'Mention de la zone tendue dans la lettre'],
          ['Location vide avec motif légal', <strong key="c">1 mois</strong>, 'Pièce justificative jointe au congé'],
          ['Location meublée', <strong key="d">1 mois</strong>, 'Aucun'],
          ['Bail étudiant meublé (9 mois)', <strong key="e">1 mois</strong>, 'Aucun'],
          ['Bail mobilité', <strong key="f">1 mois</strong>, 'Aucun'],
        ]}
      />

      <PreavisCalculator />

      <SectionHeading id="preavis-location-vide" step="Location vide">
        Préavis location vide : 3 mois, sauf exceptions
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Pour une location vide, le préavis du locataire est en principe de <strong>trois mois</strong>. La loi prévoit
        toutefois plusieurs situations permettant de le réduire à un mois. Le motif doit être{' '}
        <strong>indiqué et justifié lors de l’envoi du congé</strong> : sans cela, le délai applicable reste de trois
        mois, même si vous remplissiez les conditions.
      </p>

      <SectionHeading id="preavis-zone-tendue" step="Zone tendue">
        Préavis en zone tendue : 1 mois, à condition de l’écrire
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Lorsque le logement se situe dans une commune classée en <strong>zone tendue</strong>, le préavis d’une location
        vide est réduit à un mois. La liste des communes est fixée par décret et a été fortement élargie en 2023 : de
        nombreuses villes moyennes et communes touristiques y figurent désormais.
      </p>
      <CheckList
        items={[
          <>Vérifiez que votre commune figure bien sur la liste, avec le simulateur officiel de Service Public.</>,
          <>Invoquez <strong>expressément</strong> la zone tendue dans votre lettre de congé.</>,
          <>Identifiez précisément le logement concerné (adresse complète, étage, numéro de lot si besoin).</>,
        ]}
      />
      <p className="text-gray-700 mb-4">
        <a
          href="https://www.service-public.gouv.fr/simulateur/calcul/zones-tendues"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-700 hover:underline"
        >
          Vérifier si une commune est en zone tendue
        </a>{' '}
        prend moins d’une minute et évite une erreur coûteuse : deux mois de loyer supplémentaires.
      </p>

      <SectionHeading id="motifs-preavis-1-mois" step="Préavis réduit">
        Les autres motifs de préavis à 1 mois
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Hors zone tendue, le locataire d’un logement vide peut aussi bénéficier d’un mois de préavis dans les situations
        suivantes, prévues par l’article 15 de la loi du 6 juillet 1989 :
      </p>
      <CheckList
        items={[
          'Obtention d’un premier emploi',
          'Mutation professionnelle',
          'Perte d’emploi, ou nouvel emploi consécutif à une perte d’emploi',
          'État de santé justifiant un changement de domicile, constaté par un certificat médical',
          'Bénéfice du RSA ou de l’AAH',
          'Attribution d’un logement social',
          'Certaines situations de violences, avec les justificatifs exigés par la loi',
        ]}
      />
      <Callout tone="warning" title="Démission et retraite ne suffisent pas">
        <p>
          Une démission ou un départ à la retraite ne permet pas, à lui seul, de bénéficier du préavis réduit. Dans ces
          cas, le délai reste de trois mois, sauf si le logement est en zone tendue.
        </p>
      </Callout>

      <SectionHeading id="preavis-location-meublee" step="Location meublée">
        Préavis location meublée : toujours 1 mois
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Pour une location meublée, le préavis du locataire est d’<strong>un mois</strong>, sans avoir à justifier son
        départ ni à se trouver en zone tendue. Cette règle vaut aussi pour le départ anticipé d’un logement loué avec un
        bail étudiant meublé de neuf mois (article 25-8 de la loi du 6 juillet 1989).
      </p>
      <ReadAlso
        href="/blog/location-meublee-ou-location-nue-quelles-differences"
        label="Location meublée ou location nue : quelles différences ?"
        hint="Durée du bail, préavis, fiscalité : le comparatif complet."
      />

      <Callout tone="info" title="Et si c’est le propriétaire qui donne congé ?">
        <p>
          Les règles sont différentes : le bailleur ne peut donner congé que pour l’échéance du bail, avec un préavis
          de six mois en location vide et de trois mois en location meublée, et uniquement pour vendre, reprendre le
          logement ou pour un motif légitime et sérieux.
        </p>
      </Callout>

      <SectionHeading id="lettre-preavis" step="Formalités">
        Comment envoyer sa lettre de préavis au propriétaire ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">Le congé peut être transmis de trois façons :</p>
      <Steps
        steps={[
          {
            title: 'Lettre recommandée avec avis de réception',
            body: 'La méthode la plus courante. Le préavis court à la date de réception effective par le bailleur.',
          },
          {
            title: 'Remise en main propre',
            body: 'Contre signature ou récépissé daté, qui sert de point de départ au délai.',
          },
          {
            title: 'Signification par un commissaire de justice',
            body: 'Plus coûteuse, elle donne une date certaine quand le bailleur est difficile à joindre.',
          },
        ]}
      />
      <p className="text-gray-700 mb-4">
        Le courrier doit identifier le locataire et le logement, annoncer clairement la volonté de mettre fin au bail et
        préciser le motif du préavis réduit lorsqu’il est invoqué. Conservez une copie du courrier, les justificatifs et
        la preuve de remise. Le calculateur ci-dessus génère une lettre pré-remplie selon votre situation.
      </p>
      <Callout tone="warning" title="Un email ne vaut pas congé">
        <p>
          Un simple email ne constitue pas un congé valable. La lettre recommandée électronique obéit à des conditions
          particulières, notamment l’accord préalable du destinataire lorsqu’il s’agit d’un particulier.
        </p>
      </Callout>

      <SectionHeading id="date-preavis" step="Calcul du délai">
        À quelle date commence et se termine le préavis ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le préavis commence à la <strong>réception effective</strong> de la lettre recommandée, à la remise en main
        propre ou à la signification par le commissaire de justice. La date d’envoi ne suffit pas. Une lettre
        recommandée non retirée et retournée à son expéditeur ne fait pas courir le délai.
      </p>
      <div className="not-prose my-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Préavis d’un mois</p>
          <p className="mt-2 text-sm text-gray-700">
            Congé reçu le <strong>12 octobre</strong> : fin le <strong>12 novembre à minuit</strong>.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Préavis de trois mois</p>
          <p className="mt-2 text-sm text-gray-700">
            Congé reçu le <strong>12 octobre</strong> : fin le <strong>12 janvier à minuit</strong>.
          </p>
        </div>
      </div>
      <p className="text-gray-700 mb-4">
        Les week-ends et jours fériés ne reportent pas automatiquement l’échéance.
      </p>

      <SectionHeading id="loyer-pendant-preavis" step="Loyer">
        Peut-on arrêter de payer le loyer en déménageant plus tôt ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Non : le loyer et les charges restent dus jusqu’à la fin du préavis, même si le logement est déjà vide. Deux
        exceptions permettent d’arrêter plus tôt :
      </p>
      <CheckList
        items={[
          <>
            Un <strong>nouveau locataire</strong> entre dans les lieux avant l’échéance, avec l’accord du bailleur :
            l’ancien locataire ne paie plus à partir de cette entrée.
          </>,
          <>
            Les parties conviennent d’une <strong>fin anticipée</strong> : formalisez alors par écrit la date et les
            conditions retenues.
          </>,
        ]}
      />
      <p className="text-gray-700 mb-4">
        Avant d’envoyer votre congé, organisez aussi la suite : l’état des lieux de sortie, la remise des clés et la
        restitution du dépôt de garantie.
      </p>
      <ReadAlso
        href="/blog/etat-des-lieux-de-sortie"
        label="État des lieux de sortie : comment éviter les conflits"
        hint="Préparation, vétusté, désaccords : la méthode pour une sortie sereine."
      />

      <SectionHeading id="proprietaire-relocation" step="Côté propriétaire">
        Un départ annoncé : le bon moment pour sécuriser le prochain bail
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Pour le bailleur, le préavis ouvre une fenêtre de un à trois mois pour trouver le prochain locataire et repartir
        sur un contrat solide. C’est le moment de choisir un{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>
        : signé devant notaire, il a la valeur d’un acte authentique et constitue un titre exécutoire pour recouvrer
        les loyers impayés sans attendre un jugement.
      </p>
      <p className="text-gray-700 mb-4">
        Un bail notarié ne dispense pas de respecter les règles de préavis : la qualité du contrat et la préparation du
        départ se complètent.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Relouez avec un bail notarié, préparé en ligne"
        body="Constituez votre dossier en quelques minutes : BailNotarie collecte les pièces, vérifie le dossier et le transmet à un notaire partenaire jusqu’à la signature."
        points={['Titre exécutoire en cas d’impayé', 'Dossier 100 % en ligne', 'Notaires partenaires partout en France', 'Coût connu à l’avance']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : préavis et formalités du congé donné par le locataire',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1168',
          },
          {
            label: 'Service Public : simulateur des communes en zone tendue',
            href: 'https://www.service-public.gouv.fr/simulateur/calcul/zones-tendues',
          },
          { label: 'ANIL : agence nationale pour l’information sur le logement', href: 'https://www.anil.org' },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (articles 15 et 25-8)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
