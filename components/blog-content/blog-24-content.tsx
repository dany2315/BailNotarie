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
import { NouveauBailChecker } from './tools/nouveau-bail-checker';

export function Blog24Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Vous utilisez depuis plusieurs années le même modèle de bail pour vos locations ? Une vérification s’impose
          avant votre prochaine signature.
        </p>
        <p className="text-gray-700 mb-4">
          Depuis le <strong>1er octobre 2026</strong>, les contrats types de location ont évolué. Clause résolutoire,
          mention liée à l’obligation de résidence principale et coordonnées téléphoniques : plusieurs éléments doivent
          être distingués pour comprendre ce qui est obligatoire, facultatif ou applicable seulement à certains logements.
          Une nouvelle <strong>notice d’information</strong> est également à prendre en compte depuis le 18 octobre 2026.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: '1er oct.', label: 'Nouveaux contrats types', hint: 'Baux conclus ou renouvelés depuis le 1er octobre 2026.' },
          { value: '18 oct.', label: 'Nouvelle notice', hint: 'Annexe des contrats conclus ou renouvelés depuis cette date.' },
          { value: '6 semaines', label: 'Commandement de payer', hint: 'Délai avant le jeu de la clause résolutoire.' },
        ]}
      />

      <SectionHeading id="contrats-concernes" step="Champ d’application">
        Nouveau bail de location 2026 : quels contrats sont concernés ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le décret n° 2026-596 du 6 juillet 2026 modifie les contrats types utilisés pour les locations constituant la{' '}
        <strong>résidence principale du locataire</strong>. Les modifications s’appliquent aux contrats conclus ou
        renouvelés à compter du 1er octobre 2026.
      </p>
      <DataTable
        caption="Les locations visées par les nouveaux contrats types"
        head={['Type de location', 'Nouveau modèle', 'Point de vigilance']}
        rows={[
          ['Location vide', 'Oui', 'Résidence principale du locataire'],
          ['Location meublée', 'Oui', 'Résidence principale du locataire'],
          ['Colocation à bail unique', 'Oui', 'Un seul contrat signé par tous les colocataires'],
          ['Bail mobilité', 'Non, pas comme un meublé classique', 'Régime propre à vérifier'],
          ['Location touristique ou saisonnière', 'Non', 'Hors du régime de la résidence principale'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        Il ne faut pas en déduire que tous les baux signés avant cette date sont devenus invalides : un{' '}
        <strong>bail en cours n’a pas à être réécrit</strong> uniquement parce que le modèle réglementaire a changé.
      </p>

      <NouveauBailChecker />

      <SectionHeading id="clause-resolutoire-bail" step="Clause résolutoire">
        Clause résolutoire du bail : elle figure désormais dans le modèle officiel
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Les nouveaux contrats types intègrent la clause de résiliation de plein droit pour défaut de paiement du loyer,
        des charges ou de versement du dépôt de garantie.
      </p>
      <p className="text-gray-700 mb-4">
        L’obligation d’insérer cette clause n’est pas née en octobre 2026 : elle résulte de la{' '}
        <strong>loi du 27 juillet 2023</strong>. La modification du contrat type met le modèle réglementaire en
        cohérence avec cette obligation. Le bon réflexe consiste donc à vérifier la rédaction du contrat utilisé, plutôt
        qu’à supposer qu’un ancien modèle de bail téléchargé reste à jour.
      </p>

      <SectionHeading id="commandement-de-payer-6-semaines" step="Délai">
        Que signifie le délai de six semaines ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Pour les impayés concernés, la mise en œuvre de la clause repose sur un <strong>commandement de payer</strong>{' '}
        demeuré sans effet pendant six semaines, selon les règles applicables.
      </p>
      <Steps
        steps={[
          {
            title: 'Impayé constaté',
            body: 'Le délai ne commence ni au premier retard ni à l’envoi d’un simple message au locataire.',
          },
          {
            title: 'Commandement de payer',
            body: 'Acte formel délivré par un commissaire de justice, qui vise la clause résolutoire.',
          },
          {
            title: 'Six semaines sans régularisation',
            body: 'La clause peut alors jouer, sous le contrôle du juge, qui peut accorder des délais et la suspendre.',
          },
        ]}
      />
      <Callout tone="warning" title="Résiliation n’est pas expulsion">
        <p>
          Le délai de six semaines ne permet pas de récupérer matériellement le logement : l’expulsion nécessite une
          décision de justice et ne peut pas être exécutée pendant la trêve hivernale. Une clause résolutoire n’autorise
          jamais le propriétaire à changer lui-même les serrures.
        </p>
      </Callout>
      <ReadAlso
        href="/blog/force-executoire-lavantage-majeur-du-bail-notarie"
        label="Force exécutoire : l’avantage majeur du bail notarié"
        hint="Recouvrer les loyers impayés sans attendre un jugement."
      />

      <SectionHeading id="obligation-residence-principale" step="Mention particulière">
        Logements soumis à une obligation de résidence principale
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Lorsque le logement est soumis à une <strong>obligation spécifique d’occupation à titre de résidence
        principale</strong>, cette information doit figurer dans le bail. Cette évolution prend en compte les dispositifs
        permettant à certaines communes d’imposer une telle affectation à certains logements, notamment dans leur plan
        local d’urbanisme.
      </p>
      <p className="text-gray-700 mb-4">
        Il ne faut pas confondre cette obligation particulière avec la qualification habituelle d’un bail de résidence
        principale. Avant d’ajouter une mention ou une clause correspondante, vérifiez si votre bien est effectivement
        concerné, au regard des documents d’urbanisme et de son historique.
      </p>

      <SectionHeading id="numero-telephone-bail" step="Coordonnées">
        Le numéro de téléphone portable reste facultatif
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Les contrats types permettent désormais d’indiquer le numéro de téléphone portable du bailleur et du locataire,
        ou des colocataires. Cette mention est <strong>facultative</strong> : elle vise à faciliter les échanges,
        notamment lorsque des difficultés de paiement apparaissent.
      </p>
      <Callout tone="info">
        <p>
          Un appel ou un SMS ne remplace pas les notifications formelles : il ne vaut ni commandement de payer ni congé
          régulièrement délivré.
        </p>
      </Callout>

      <SectionHeading id="notice-information-2026" step="Notice">
        Notice d’information du locataire : une nouvelle version depuis le 18 octobre
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        La mise à jour du modèle de bail n’est pas le seul changement à vérifier. L’<strong>arrêté du 9 octobre
        2026</strong> remplace la notice d’information annexée aux contrats de location concernés. La nouvelle version
        doit accompagner les contrats conclus ou renouvelés depuis le 18 octobre 2026.
      </p>
      <p className="text-gray-700 mb-4">
        Cette notice explique notamment les droits et obligations des parties, le loyer, les garanties, les impayés et le
        règlement des litiges. Vérifiez donc les annexes de votre dossier, pas seulement les pages du contrat.
      </p>

      <SectionHeading id="verifier-avant-signature" step="Checklist">
        Que vérifier avant votre prochaine signature ?
      </SectionHeading>
      <CheckList
        items={[
          'le régime de la location : vide, meublée, colocation, bail mobilité ;',
          'la date de conclusion ou de renouvellement du contrat ;',
          'la version du modèle de bail utilisé ;',
          'la rédaction de la clause résolutoire ;',
          'les mentions propres au logement, dont une éventuelle obligation de résidence principale ;',
          'la notice d’information jointe et les autres annexes, comme les diagnostics.',
        ]}
      />
      <p className="text-gray-700 mb-4">
        Ne modifiez pas un bail ancien en remplaçant uniquement un délai : sa situation et sa rédaction doivent être
        examinées dans leur ensemble. Si votre contrat est préparé par un professionnel, demandez-lui de confirmer les
        textes et modèles pris en compte.
      </p>

      <SectionHeading id="bail-notarie-2026" step="Bail notarié">
        Et si vous choisissez un bail notarié ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le recours à un notaire ne permet pas de contourner les règles du bail d’habitation : les clauses doivent rester
        adaptées au logement, au régime locatif et aux{' '}
        <Link href="/blog/les-obligations-legales-dans-un-bail-notarie" className="font-medium text-blue-700 hover:underline">
          obligations légales du bail
        </Link>
        . BailNotarie accompagne les propriétaires dans la constitution de leur dossier et sa transmission à un notaire
        partenaire. La vérification juridique, la rédaction et l’authentification de l’acte relèvent du notaire.
      </p>
      <p className="text-gray-700 mb-4">
        L’objectif n’est pas d’ajouter le plus de clauses possible, mais de disposer d’un contrat à jour, compréhensible
        et adapté à votre location.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Un bail à jour des textes de 2026, rédigé par un notaire"
        body="BailNotarie prépare votre dossier de bail notarié en ligne et le transmet à un notaire partenaire, qui rédige et authentifie l’acte."
        points={['Contrat vérifié par le notaire', 'Annexes et notice à jour', 'Titre exécutoire en cas d’impayé', 'Notaires partenaires partout en France']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Légifrance : décret n° 2026-596 du 6 juillet 2026 relatif aux contrats types de location',
            href: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000054393114',
          },
          {
            label: 'Service Public : nouveaux contrats types et notice d’information mise à jour',
            href: 'https://www.service-public.gouv.fr/particuliers/actualites/A19067',
          },
          {
            label: 'ANIL : contrats types de location de résidence principale',
            href: 'https://www.anil.org/aj-contrats-types-de-location-de-logement-residence-principale/',
          },
          {
            label: 'ANIL : loi du 27 juillet 2023 et clause résolutoire',
            href: 'https://www.anil.org/aj-occupation-illicite-logement/',
          },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (article 24)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
