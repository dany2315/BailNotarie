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
import { VetusteCalculator } from './tools/vetuste-calculator';

export function Blog18Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Une peinture vieillie, une rayure sur le parquet ou un équipement endommagé peuvent provoquer un désaccord au
          moment de quitter un logement. Pour que la discussion ne repose pas sur des impressions, l’
          <strong>état des lieux de sortie</strong> doit être précis et comparé au document établi à l’entrée.
        </p>
        <p className="text-gray-700 mb-4">
          Locataire et propriétaire ont le même intérêt : disposer d’un constat clair, qui distingue l’usure normale des
          dégradations. Voici comment préparer cette étape pour un logement loué à titre de résidence principale.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '0 €', label: 'Pour le locataire', hint: 'Les frais d’état des lieux de sortie ne peuvent pas lui être facturés.' },
          { value: '1 ou 2 mois', label: 'Restitution du dépôt', hint: 'Selon que la sortie est conforme ou non à l’entrée.' },
          { value: '7 jours', label: 'Convocation minimum', hint: 'Avant un constat par commissaire de justice.' },
        ]}
      />

      <SectionHeading id="etat-des-lieux-entree-sortie" step="Les bases">
        État des lieux d’entrée et de sortie : à quoi servent-ils ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        L’état des lieux est le document qui décrit le logement, pièce par pièce, au début et à la fin de la location.
        Il est établi <strong>contradictoirement</strong>, c’est-à-dire en présence du locataire et du bailleur (ou de
        son représentant), et signé par les deux. Sa force tient à la comparaison : ce qui a changé entre l’entrée et la
        sortie permet d’apprécier les éventuelles responsabilités.
      </p>
      <CompareCards
        left={{
          tag: 'À l’arrivée',
          title: 'État des lieux d’entrée',
          items: [
            'Établi à la remise des clés, annexé au bail.',
            'Le locataire peut demander à le compléter dans les 10 jours (le premier mois de chauffe pour le chauffage).',
            'Sans état des lieux d’entrée, le locataire est présumé avoir reçu le logement en bon état, sauf si le bailleur a fait obstacle à son établissement.',
            'Avec un professionnel, la part du locataire est plafonnée (3,03 € TTC par m² habitable).',
          ],
        }}
        right={{
          tag: 'Au départ',
          title: 'État des lieux de sortie',
          items: [
            'Établi à la restitution des clés, une fois les affaires du locataire retirées.',
            'Comparé point par point avec l’état des lieux d’entrée.',
            'Fixe le point de départ du délai de restitution du dépôt de garantie.',
            'Aucun frais ne peut être facturé au locataire, même si une agence le réalise.',
          ],
        }}
      />
      <p className="text-gray-700 mb-4">
        En location meublée, les meubles et équipements du bailleur restent dans le logement et sont vérifiés à l’aide de
        l’inventaire. Les annexes louées, comme une cave ou un garage, font aussi partie du contrôle.
      </p>

      <SectionHeading id="preparer-etat-des-lieux" step="Avant le rendez-vous">
        Comment préparer l’état des lieux de sortie ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Commencez par relire l’état des lieux d’entrée : repérez les défauts déjà mentionnés et rassemblez les photos
        initiales, les échanges sur d’éventuelles réparations et les documents d’entretien utiles (chaudière, ramonage).
      </p>
      <Steps
        steps={[
          { title: 'Nettoyer les pièces et les équipements', body: 'Sols, sanitaires, électroménager fourni, placards : un logement propre évite de nombreuses discussions.' },
          { title: 'Vérifier l’entretien courant', body: 'Ampoules, joints, grilles d’aération, petits équipements. Les menues réparations restent à la charge du locataire.' },
          { title: 'Contrôler l’inventaire en meublé', body: 'Vaisselle, literie, mobilier : comparez avec la liste signée à l’entrée.' },
          { title: 'Rassembler clés, badges et télécommandes', body: 'Tous les moyens d’accès remis à l’entrée doivent être restitués.' },
          { title: 'Préparer les relevés et votre nouvelle adresse', body: 'Relevés des compteurs individuels, et nouvelle adresse indispensable pour recevoir le dépôt de garantie.' },
        ]}
      />
      <Callout tone="tip">
        <p>
          Ces vérifications facilitent la discussion, mais le logement n’a pas à être rendu neuf. Seules les dégradations
          imputables au locataire peuvent lui être réclamées.
        </p>
      </Callout>

      <SectionHeading id="contenu-etat-des-lieux" step="Le document">
        Que doit contenir un état des lieux de sortie ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le décret du 30 mars 2016 fixe le contenu de l’état des lieux. Le document doit permettre une comparaison facile
        avec celui d’entrée et mentionner notamment :
      </p>
      <CheckList
        items={[
          'La date, l’adresse du logement et l’identité des parties',
          'Les relevés des compteurs individuels',
          'Les clés et moyens d’accès restitués',
          'L’état des revêtements (sols, murs, plafonds) et des équipements, pièce par pièce',
          'La nouvelle adresse du locataire et la date de l’état des lieux d’entrée',
        ]}
      />
      <DataTable
        caption="Exemples de formulations dans un état des lieux"
        head={['Élément', 'Formulation vague', 'Formulation utile']}
        rows={[
          ['Sol du séjour', '« Sol abîmé »', '« Rayure de 8 cm devant la porte-fenêtre »'],
          ['Murs de la chambre', '« Murs sales »', '« Trois traces de frottement à hauteur de lit, mur nord »'],
          ['Évier', '« Évier usé »', '« Émail éclaté sur 1 cm, angle gauche »'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        Des photos datées peuvent compléter les observations, sans remplacer le document signé.
      </p>

      <SectionHeading id="vetuste-degradation" step="Le point sensible">
        Vétusté ou dégradation : quelle différence ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        La <strong>vétusté</strong> correspond au vieillissement lié au temps et à un usage normal. Elle ne peut entraîner
        aucune retenue sur le dépôt de garantie. Une <strong>dégradation</strong>, au contraire, résulte d’un usage
        anormal ou d’un accident imputable au locataire.
      </p>
      <DataTable
        caption="Vétusté et dégradation : exemples à apprécier au cas par cas"
        head={['Élément', 'Plutôt de la vétusté', 'Plutôt une dégradation']}
        rows={[
          ['Peinture', 'Teinte passée après plusieurs années', 'Brûlure, inscriptions, trous nombreux non rebouchés'],
          ['Parquet', 'Vernis terni dans les zones de passage', 'Rayures profondes, tache d’eau, brûlure'],
          ['Moquette', 'Tassement aux passages', 'Déchirure, brûlure de cigarette'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        L’état initial, l’ancienneté de l’élément et les circonstances du dommage doivent être pris en compte. Une{' '}
        <strong>grille de vétusté</strong> convenue au bail aide à chiffrer la part éventuellement due : le locataire n’a
        pas à financer une remise à neuf simplement parce qu’un équipement est ancien.
      </p>

      <VetusteCalculator />

      <SectionHeading id="litige-etat-des-lieux" step="En cas de désaccord">
        Litige sur l’état des lieux de sortie : que faire ?
      </SectionHeading>
      <Steps
        steps={[
          {
            title: 'Relire avant de signer',
            body: 'Demandez la correction des mentions inexactes. Une réserve explicite peut préciser les points contestés.',
          },
          {
            title: 'Récupérer son exemplaire',
            body: 'Chaque partie doit recevoir son exemplaire au moment de la signature, sur papier ou par voie électronique.',
          },
          {
            title: 'Faire appel à un commissaire de justice',
            body: 'Si l’état des lieux amiable est impossible (refus de participer ou de signer), l’une ou l’autre partie peut demander un constat. Les parties sont convoquées au moins 7 jours à l’avance et le coût, réglementé, est partagé par moitié.',
          },
          {
            title: 'Saisir la commission de conciliation',
            body: 'La commission départementale de conciliation peut être saisie gratuitement avant toute action en justice.',
          },
        ]}
      />

      <SectionHeading id="depot-de-garantie" step="La suite">
        Quel effet sur la restitution du dépôt de garantie ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le délai de restitution commence à la remise des clés. Il est d’<strong>un mois</strong> lorsque l’état des lieux
        de sortie est conforme à celui d’entrée, et de <strong>deux mois</strong> lorsqu’il ne l’est pas.
      </p>
      <p className="text-gray-700 mb-4">
        Une différence ne permet pas de conserver automatiquement tout le dépôt. Les retenues doivent être justifiées,
        notamment par la comparaison des états des lieux et un devis ou une facture. Des loyers ou charges restant dus
        peuvent aussi être déduits, avec justificatifs.
      </p>
      <ReadAlso
        href="/blog/depot-de-garantie-location"
        label="Dépôt de garantie : montant, délai de restitution et litiges"
        hint="Plafonds, retenues autorisées et pénalité de retard de 10 %."
      />

      <SectionHeading id="proprietaire-dossier" step="Côté propriétaire">
        Un dossier complet dès la signature du bail
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Conserver le bail, ses annexes, les états des lieux et les échanges pendant toute la location facilite le
        règlement des désaccords. Avec un{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>
        , le contrat est conservé par le notaire et constitue un titre exécutoire : si les sommes dues dépassent le dépôt
        de garantie, le recouvrement est plus rapide. Même avec un bail notarié, un état des lieux rigoureux reste
        indispensable.
      </p>

      <InlineCta
        eyebrow="Prochaine mise en location"
        title="Repartez sur un bail solide, préparé en ligne"
        body="BailNotarie organise votre dossier de bail notarié : pièces, diagnostics, informations du locataire, puis transmission à un notaire partenaire jusqu’à la signature."
        points={['Acte authentique conservé par le notaire', 'Titre exécutoire en cas d’impayé', 'Parcours guidé, 100 % en ligne', 'Notaires partenaires partout en France']}
        primary={{ href: '/commencer', label: 'Constituer mon dossier' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : état des lieux de sortie',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F33671',
          },
          {
            label: 'Service Public : état des lieux d’entrée',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31270',
          },
          {
            label: 'Service Public : dépôt de garantie dans un bail d’habitation',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31269',
          },
          { label: 'ANIL : agence nationale pour l’information sur le logement', href: 'https://www.anil.org' },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (article 3-2)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
