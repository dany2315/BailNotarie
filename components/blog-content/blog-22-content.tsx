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
import { SolvabiliteCalculator } from './tools/solvabilite-calculator';

export function Blog22Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Confier les clés de son logement engage bien plus qu’un contrat. Pour un propriétaire, le loyer peut financer
          un crédit, compléter une retraite ou constituer une part importante des revenus du foyer.
        </p>
        <p className="text-gray-700 mb-4">
          Il est donc normal d’examiner sérieusement les candidatures. Mais comment distinguer un dossier solide d’un
          dossier simplement bien présenté ? Quels <strong>justificatifs</strong> demander sans réclamer de documents
          interdits ? Aucune méthode ne garantit l’absence d’impayés ; une sélection organisée permet en revanche de
          décider sur des éléments concrets plutôt que sur une impression.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '4', label: 'Familles de justificatifs', hint: 'Identité, domicile, activité, ressources.' },
          { value: '3 000 €', label: 'Amende maximale', hint: 'Pour un document interdit réclamé par un particulier.' },
          { value: '0 €', label: 'Vérification d’un avis d’impôt', hint: 'Service officiel gratuit de l’administration.' },
        ]}
      />

      <SectionHeading id="criteres-objectifs" step="Méthode">
        Comment choisir un bon locataire : des critères objectifs
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Avant de comparer les candidats, définissez les éléments que vous allez examiner, et appliquez la même méthode à
        chaque dossier :
      </p>
      <CheckList
        items={[
          'des ressources justifiées et régulières ;',
          'la cohérence des documents entre eux ;',
          'l’adéquation entre les revenus, le loyer et les charges ;',
          'les garanties éventuellement mobilisables (caution, Visale, assurance).',
        ]}
      />
      <p className="text-gray-700 mb-4">
        Un échange sympathique ne remplace pas la lecture du dossier, pas plus qu’un profil inhabituel ne constitue une
        preuve de risque.
      </p>
      <Callout tone="warning" title="La discrimination est un délit">
        <p>
          L’origine, la religion, le handicap, la situation familiale ou l’âge ne peuvent pas servir à écarter un
          candidat. La discrimination à la location est punie jusqu’à trois ans d’emprisonnement et 45 000 € d’amende.
        </p>
      </Callout>

      <SectionHeading id="dossier-locataire-documents" step="Dossier locataire">
        Dossier locataire : quels documents demander ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Pour une location vide ou meublée constituant la résidence principale, la liste des pièces exigibles est
        <strong> fermée</strong> : elle est fixée par le décret n° 2015-1437 du 5 novembre 2015. Le candidat fournit un
        document par catégorie, adapté à sa situation.
      </p>
      <DataTable
        caption="Pièces justificatives qu'un propriétaire peut demander à un candidat locataire"
        head={['Catégorie', 'Exemples de justificatifs autorisés']}
        rows={[
          ['Identité', 'Carte d’identité, passeport, titre de séjour'],
          ['Domicile', '3 dernières quittances de loyer, attestation d’hébergement, avis de taxe foncière'],
          ['Activité professionnelle', 'Contrat de travail, attestation d’employeur, carte d’étudiant, extrait Kbis'],
          ['Ressources', 'Dernier avis d’imposition, 3 derniers bulletins de salaire, justificatif de pension ou de bourse, 2 derniers bilans pour un indépendant'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        Un étudiant, un retraité ou un indépendant ne dispose pas des mêmes justificatifs qu’un salarié : adaptez la
        demande à la situation. Le candidat peut fournir des copies, et vous pouvez demander à voir l’original.
      </p>
      <CompareCards
        left={{
          tag: 'Interdit',
          title: 'Ce que vous ne pouvez pas exiger',
          items: [
            'Relevé de compte bancaire ou attestation de bonne tenue de compte',
            'Extrait de casier judiciaire ou dossier médical',
            'Carte Vitale, contrat de mariage, photo d’identité hors pièce d’identité',
            'Chèque de réservation ou autorisation de prélèvement',
          ],
        }}
        right={{
          tag: 'À retenir',
          title: 'Plus de pièces ne veut pas dire plus de sécurité',
          items: [
            'Réclamer un document interdit expose à une amende jusqu’à 3 000 € (15 000 € pour une société).',
            'Le mandataire qui les réclame peut aussi être sanctionné.',
            'Un dossier complet et cohérent vaut mieux qu’un dossier volumineux.',
          ],
        }}
      />

      <SectionHeading id="regle-3-fois-loyer" step="Ressources">
        La règle des 3 fois le loyer : un repère, pas une obligation
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Exiger des revenus égaux à trois fois le loyer est une pratique courante, mais <strong>aucun texte ne
        l’impose</strong>. Un salaire affiché ne suffit pas à comprendre une situation : examinez les revenus documentés,
        leur régularité et leur cohérence avec le loyer et les charges.
      </p>
      <SolvabiliteCalculator />
      <CheckList
        items={[
          'Pour un indépendant, cherchez les justificatifs adaptés à son activité (bilans, avis d’imposition).',
          'Pour une embauche récente, vérifiez les informations du contrat ou de l’attestation d’employeur.',
          'Si vous envisagez une assurance loyers impayés, consultez ses critères avant de retenir un candidat : ne supposez pas que le dossier sera accepté.',
        ]}
      />

      <SectionHeading id="verifier-dossier-locataire" step="Vérification">
        Comment vérifier un dossier locataire et repérer un faux ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Un nom différent entre deux documents, une période manquante ou un revenu difficile à rapprocher mérite une
        explication. Cela ne prouve pas forcément une falsification : un changement de situation ou une erreur peut
        l’expliquer.
      </p>
      <Steps
        steps={[
          {
            title: 'Croiser les documents entre eux',
            body: 'Identité, employeur, montants et dates doivent concorder d’une pièce à l’autre.',
          },
          {
            title: 'Vérifier l’avis d’impôt en ligne',
            body: 'Le service officiel de vérification des avis d’impôt confirme les informations du document remis. Il ne certifie pas pour autant l’ensemble du dossier.',
          },
          {
            title: 'Poser une question ciblée',
            body: '« Les montants de ces deux pièces diffèrent ; pouvez-vous m’aider à comprendre cette différence ? » plutôt qu’une accusation.',
          },
          {
            title: 'Privilégier un dossier numérique structuré',
            body: 'Le service public DossierFacile permet aux candidats de présenter un dossier vérifié, plus simple à lire.',
          },
        ]}
      />
      <Callout tone="info">
        <p>
          La vérification d’un dossier ne constitue pas une assurance contre les impayés : elle aide à décider, sans
          supprimer le risque.
        </p>
      </Callout>

      <SectionHeading id="garanties" step="Garanties">
        Caution, Visale ou assurance : vérifier le montage
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Si une caution ou une assurance est prévue, vérifiez ses conditions avant la signature. Attention au cumul : un
        bailleur qui a souscrit une assurance loyers impayés ne peut pas, en principe, exiger en plus une caution, sauf
        pour un locataire étudiant ou apprenti.
      </p>
      <ReadAlso
        href="/blog/depot-de-garantie-location"
        label="Dépôt de garantie : montant et restitution"
        hint="Plafond d’un ou deux mois de loyer selon le type de bail."
      />

      <SectionHeading id="avant-signature" step="Avant les clés">
        Préparer la relation locative avant la signature
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        La sélection ne s’arrête pas au choix du candidat. Avant la signature, clarifiez le montant du loyer, les
        charges, les dates, les équipements et les engagements de chacun. Ne laissez pas une question importante en
        suspens au motif que « tout se passera bien ».
      </p>
      <p className="text-gray-700 mb-4">
        Un dossier sérieux et un bail correctement établi remplissent deux fonctions différentes : le premier aide à
        choisir, le second organise la relation. Un{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>{' '}
        ne garantit pas la solvabilité du locataire, mais il constitue un titre exécutoire : en cas d’impayé, le
        recouvrement peut être engagé sans attendre un jugement. Il complète une sélection rigoureuse, sans la
        remplacer.
      </p>

      <InlineCta
        eyebrow="Vous avez trouvé votre locataire ?"
        title="Signez un bail qui vous protège en cas d’impayé"
        body="Préparez votre dossier de bail notarié en ligne : BailNotarie collecte les pièces du bailleur et du locataire, vérifie le dossier et le transmet à un notaire partenaire."
        points={['Titre exécutoire dès la signature', 'Pièces du locataire collectées en ligne', 'Notaires partenaires partout en France', 'Coût estimé à l’avance']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : justificatifs à fournir par le futur locataire',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1169',
          },
          {
            label: 'Service Public : discrimination à la location d’un logement',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F14750',
          },
          {
            label: 'ANIL : liste des pièces justificatives exigibles',
            href: 'https://www.anil.org/documentation-experte/analyses-juridiques-jurisprudence/analyses-juridiques/analyses-juridiques-2015/candidat-locataire-et-sa-caution-liste-des-pieces-justificatives-exigibles/',
          },
          { label: 'DossierFacile, le dossier de location numérique de l’État', href: 'https://www.dossierfacile.logement.gouv.fr' },
          { label: 'impots.gouv.fr : vérification des avis d’impôt', href: 'https://www.impots.gouv.fr' },
        ]}
      />
    </article>
  );
}
