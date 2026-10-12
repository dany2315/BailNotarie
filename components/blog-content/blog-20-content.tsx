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
import { DepotGarantieCalculator } from './tools/depot-garantie-calculator';

export function Blog20Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          À l’entrée dans un logement, le <strong>dépôt de garantie</strong> représente une dépense importante. Au départ,
          sa restitution peut devenir une source de désaccord. Combien le propriétaire peut-il demander ? Quelles sommes
          peut-il retenir ? Comment réagir si l’argent n’est pas rendu ?
        </p>
        <p className="text-gray-700 mb-4">
          Comprendre son fonctionnement permet aux propriétaires comme aux locataires de préparer la location avec des
          règles claires. Ce guide concerne les baux d’habitation portant sur la résidence principale.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '1 mois', label: 'Plafond en location vide', hint: 'De loyer hors charges.' },
          { value: '2 mois', label: 'Plafond en meublé', hint: 'Aucun dépôt en bail mobilité.' },
          { value: '10 %', label: 'Majoration de retard', hint: 'Du loyer mensuel, par mois de retard commencé.' },
        ]}
      />

      <SectionHeading id="depot-ou-caution" step="Vocabulaire">
        Dépôt de garantie ou caution : quelle différence ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Dans le langage courant, on parle souvent de « récupérer sa caution ». Juridiquement, ce sont pourtant deux
        mécanismes différents, qui ne doivent pas être confondus dans les documents de location.
      </p>
      <CompareCards
        left={{
          tag: 'Une personne',
          title: 'La caution',
          items: [
            'Une personne ou un organisme (comme Visale) qui s’engage à payer les dettes locatives si le locataire ne le fait pas.',
            'Formalisée par un acte de cautionnement.',
          ],
        }}
        right={{
          tag: 'Une somme',
          title: 'Le dépôt de garantie',
          items: [
            'Une somme versée au bailleur à la signature du bail.',
            'Couvre certains manquements du locataire : loyers impayés, dégradations.',
            'Restituée au départ, déduction faite des sommes justifiées.',
          ],
        }}
      />

      <SectionHeading id="montant-depot" step="Montant">
        Quel montant de dépôt de garantie peut être demandé ?
      </SectionHeading>
      <DataTable
        caption="Plafond du dépôt de garantie selon le type de bail, exemple pour un loyer de 800 € hors charges"
        head={['Type de bail', 'Plafond légal', 'Pour 800 € HC']}
        rows={[
          ['Location vide', '1 mois de loyer hors charges', <strong key="a">800 €</strong>],
          ['Location meublée classique', '2 mois de loyer hors charges', <strong key="b">1 600 €</strong>],
          ['Bail mobilité', 'Aucun dépôt autorisé', <strong key="c">0 €</strong>],
        ]}
      />
      <CheckList
        items={[
          'Ce sont des plafonds, pas des montants obligatoires.',
          'Le montant figure dans le bail et se verse à la signature.',
          'Il ne peut pas être augmenté pendant le contrat ni lors de son renouvellement.',
          'Si le loyer est payable d’avance pour plus de deux mois, le dépôt n’est pas exigible (sauf passage au paiement mensuel demandé par le locataire).',
        ]}
      />

      <DepotGarantieCalculator />

      <SectionHeading id="retenues" step="Retenues">
        Quelles retenues le propriétaire peut-il faire ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le dépôt peut couvrir des loyers ou charges impayés, ainsi que des réparations imputables au locataire. Chaque
        retenue doit être <strong>expliquée et justifiée</strong> : états des lieux, devis, factures ou documents
        établissant la dette.
      </p>
      <div className="not-prose my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900">Retenues possibles</p>
          <CheckList
            items={[
              'Loyers et charges restant dus',
              'Dégradations constatées par comparaison des états des lieux',
              'Réparations locatives non effectuées, sur devis ou facture',
            ]}
          />
        </div>
        <div className="rounded-2xl border border-gray-200 p-5">
          <p className="font-semibold text-gray-900">Retenues injustifiées</p>
          <CheckList
            variant="cross"
            items={[
              'L’usure normale liée au temps (vétusté)',
              'Une mention vague comme « appartement à refaire »',
              'Des frais d’état des lieux de sortie',
            ]}
          />
        </div>
      </div>
      <p className="text-gray-700 mb-4">
        Si les frais justifiés dépassent le dépôt, le bailleur peut réclamer le complément : le dépôt ne limite pas à lui
        seul la responsabilité du locataire.
      </p>
      <ReadAlso
        href="/blog/etat-des-lieux-de-sortie"
        label="État des lieux de sortie : vétusté ou dégradation ?"
        hint="Comment préparer la sortie et chiffrer la part réellement due."
      />

      <SectionHeading id="delai-restitution" step="Délai">
        Délai de restitution du dépôt de garantie : 1 ou 2 mois
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le délai commence à la <strong>remise des clés</strong>, et non à la simple date du déménagement.
      </p>
      <Steps
        steps={[
          {
            title: '1 mois si l’état des lieux de sortie est conforme',
            body: 'Aucune différence avec l’état des lieux d’entrée : le bailleur restitue dans le mois, déduction faite des éventuelles sommes restant dues.',
          },
          {
            title: '2 mois en cas de différences',
            body: 'Le bailleur dispose de deux mois pour restituer le solde, retenues justifiées déduites.',
          },
          {
            title: 'Provision de 20 % en copropriété',
            body: 'Une provision justifiée, limitée à 20 % du dépôt, peut être conservée jusqu’à l’arrêté annuel des comptes. La régularisation intervient dans le mois suivant leur approbation définitive.',
          },
        ]}
      />

      <SectionHeading id="caution-non-rendue" step="Litige">
        Caution non rendue : que faire ?
      </SectionHeading>
      <Steps
        steps={[
          {
            title: 'Demander un décompte écrit',
            body: 'Réclamez le détail des retenues et leurs justificatifs (devis, factures, décomptes de charges).',
          },
          {
            title: 'Envoyer une mise en demeure',
            body: 'Si le délai est dépassé, par lettre recommandée avec avis de réception, en rappelant la majoration légale.',
          },
          {
            title: 'Calculer la majoration',
            body: 'Le solde dû est majoré de 10 % du loyer mensuel hors charges pour chaque période mensuelle de retard commencée, sauf si le retard vient de l’absence de transmission de votre nouvelle adresse.',
          },
          {
            title: 'Tenter la conciliation',
            body: 'Un conciliateur de justice ou la commission départementale de conciliation peuvent être saisis gratuitement.',
          },
          {
            title: 'Saisir le juge si nécessaire',
            body: 'Vérifiez la procédure adaptée au montant réclamé avant d’engager une action.',
          },
        ]}
      />
      <Callout tone="warning" title="Ne remplacez pas le dernier loyer par le dépôt">
        <p>
          Le locataire ne doit pas décider seul de ne pas payer son dernier loyer en comptant sur le dépôt de garantie :
          ces paiements restent distincts, et le bailleur pourrait réclamer le loyer impayé.
        </p>
      </Callout>

      <SectionHeading id="proprietaire-preuves" step="Côté propriétaire">
        Préparer la restitution dès le début de la location
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Un montant clairement inscrit au bail, une preuve de versement conservée et des documents précis facilitent la
        restitution. À la sortie, gardez une preuve de remise des clés et demandez la nouvelle adresse du locataire.
      </p>
      <p className="text-gray-700 mb-4">
        Le dépôt de garantie ne couvre qu’un mois ou deux de loyer. Au-delà, c’est la qualité du contrat qui protège le
        bailleur : un{' '}
        <Link href="/blog/force-executoire-lavantage-majeur-du-bail-notarie" className="font-medium text-blue-700 hover:underline">
          bail notarié a force exécutoire
        </Link>{' '}
        et permet d’engager le recouvrement des impayés sans attendre un jugement. Il ne dispense pas, en revanche, de
        respecter les règles du dépôt de garantie.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Protégez vos loyers au-delà du dépôt de garantie"
        body="Avec un bail notarié, le recouvrement des impayés s’appuie directement sur l’acte, signé devant notaire. BailNotarie prépare le dossier en ligne et l’accompagne jusqu’à la signature."
        points={['Titre exécutoire dès la signature', 'Montant du dépôt inscrit dans un acte authentique', 'Dossier guidé, 100 % en ligne', 'Notaires partenaires partout en France']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : dépôt de garantie dans un bail d’habitation',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31269',
          },
          {
            label: 'Service Public : que faire en cas de litige lié à la location ?',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F31301',
          },
          { label: 'ANIL : agence nationale pour l’information sur le logement', href: 'https://www.anil.org' },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (article 22)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
