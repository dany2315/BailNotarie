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
import { SousLoyerCalculator } from './tools/sous-loyer-calculator';

export function Blog23Content() {
  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Vous découvrez votre appartement sur une plateforme de location. Les photos correspondent à votre logement,
          mais vous n’avez jamais autorisé sa sous-location. Ou des informations vous laissent penser que votre locataire
          fait payer d’autres occupants.
        </p>
        <p className="text-gray-700 mb-4">
          Avant d’accuser ou d’engager une procédure, il faut <strong>vérifier les faits et le régime du bail</strong>.
          Une présence inhabituelle ne suffit pas à prouver une sous-location illégale. Voici les points essentiels pour
          protéger vos intérêts sans prendre de mesures qui pourraient se retourner contre vous.
        </p>
      </section>

      <KeyFacts
        items={[
          { value: 'Écrit', label: 'Accord du bailleur', hint: 'Sur le principe et sur le montant du sous-loyer.' },
          { value: '≤ m²', label: 'Sous-loyer plafonné', hint: 'Pas plus cher au m² que le loyer principal.' },
          { value: 'Restitution', label: 'Des sous-loyers', hint: 'Possible en cas de sous-location non autorisée.' },
        ]}
      />

      <SectionHeading id="sous-location-autorisation" step="Le principe">
        Sous-location : le locataire peut-il sous-louer sans votre accord ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Non. Pour une sous-location classique d’un logement privé soumis à la loi du 6 juillet 1989, le locataire doit
        obtenir l’<strong>accord écrit du bailleur</strong>, y compris sur le montant du loyer de sous-location. Une
        sous-location régulière réunit plusieurs conditions :
      </p>
      <DataTable
        caption="Les conditions d’une sous-location autorisée"
        head={['Condition', 'Ce qu’elle implique']}
        rows={[
          ['Accord écrit du bailleur', 'Il porte sur le principe de la sous-location, pas seulement sur une tolérance orale'],
          ['Accord sur le sous-loyer', 'Le montant demandé au sous-locataire doit être validé par écrit'],
          ['Loyer au m² plafonné', 'Il ne peut pas dépasser celui payé par le locataire principal'],
          ['Information du sous-locataire', 'Le locataire lui remet l’autorisation écrite et une copie du bail en cours'],
          ['Durée encadrée', 'La sous-location ne peut pas dépasser la durée du bail principal'],
        ]}
      />
      <p className="text-gray-700 mb-4">
        Une conversation vague ou une tolérance supposée ne remplace donc pas un accord correctement formalisé. Des
        régimes particuliers existent, notamment pour la cohabitation intergénérationnelle solidaire ou les logements
        sociaux : ce guide concerne la sous-location classique d’un logement privé.
      </p>

      <SousLoyerCalculator />

      <SectionHeading id="comment-savoir-locataire-sous-loue" step="Vérifier">
        Comment savoir si votre locataire sous-loue ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Commencez par distinguer les <strong>faits observés</strong> des suppositions. Certains éléments méritent d’être
        examinés :
      </p>
      <CheckList
        items={[
          'une annonce qui présente les pièces de votre logement, son adresse ou son immeuble ;',
          'des dates proposées à la réservation sur une plateforme de location courte durée ;',
          'des échanges ou des avis évoquant une occupation payante du logement ;',
          'un signalement du syndic ou du voisinage sur des rotations régulières de voyageurs.',
        ]}
      />
      <p className="text-gray-700 mb-4">
        À l’inverse, le seul passage de plusieurs personnes ne permet pas de connaître leur situation : le locataire peut
        héberger gratuitement des proches sans sous-louer.
      </p>

      <SectionHeading id="prouver-sous-location" step="Preuves">
        Comment prouver que votre locataire sous-loue ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Si une annonce est accessible publiquement, conservez son adresse, sa date de consultation et les informations
        visibles. Vérifiez que les photographies et la description correspondent réellement au bien.
      </p>
      <Steps
        steps={[
          {
            title: 'Conserver les éléments publics',
            body: 'Adresse de l’annonce, captures datées, calendrier de disponibilités, prix affiché.',
          },
          {
            title: 'Rapprocher l’annonce du logement',
            body: 'Photos, agencement, vue, équipements : notez ce qui permet d’identifier votre bien.',
          },
          {
            title: 'Faire établir un constat si nécessaire',
            body: 'Un commissaire de justice peut constater le contenu d’une annonce en ligne de manière probante.',
          },
        ]}
      />
      <p className="text-gray-700 mb-4">
        Ces premiers éléments aident un professionnel à apprécier le dossier. Ils ne permettent pas, à eux seuls, de
        conclure automatiquement à une faute ou à son étendue.
      </p>

      <SectionHeading id="que-faire-locataire-sous-loue" step="Première démarche">
        Mon locataire sous-loue mon appartement : que faire ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Adressez une <strong>demande écrite, factuelle et précise</strong>, de préférence par lettre recommandée avec
        avis de réception. Par exemple :
      </p>
      <blockquote className="my-6 border-l-4 border-blue-200 bg-blue-50/50 px-5 py-4 text-gray-800 italic">
        « Une annonce présentant le logement situé à cette adresse est accessible sur cette plateforme. Pouvez-vous
        m’expliquer cette situation et me transmettre les éléments correspondants ? »
      </blockquote>
      <p className="text-gray-700 mb-4">
        Évitez les accusations publiques et les menaces. L’objectif est de comprendre ce qui se passe, de vérifier
        l’existence d’un accord antérieur et de conserver une trace des explications reçues. Si les éléments confirment
        une sous-location non autorisée, faites examiner le bail et les preuves par un professionnel compétent, qui
        déterminera les demandes à formuler et les suites adaptées.
      </p>

      <SectionHeading id="sanctions-sous-location-illegale" step="Sanctions">
        Sous-location illégale : quelles sanctions pour le locataire ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">Une sous-location sans autorisation peut entraîner :</p>
      <CheckList
        items={[
          <>la <strong>résiliation du bail</strong>, prononcée par le juge ;</>,
          <>la <strong>restitution des sous-loyers</strong> perçus par le locataire ;</>,
          <>des <strong>dommages et intérêts</strong>, lorsqu’un préjudice est établi.</>,
        ]}
      />
      <p className="text-gray-700 mb-4">
        La Cour de cassation a jugé en 2019 que les sous-loyers tirés d’une sous-location non autorisée, notamment sur
        Airbnb, reviennent en principe au propriétaire. Ces conséquences ne se déclenchent toutefois pas automatiquement
        à la découverte d’une annonce : les faits, les preuves et les demandes doivent être examinés dans le cadre
        approprié.
      </p>
      <Callout tone="info">
        <p>
          Ne présumez donc ni du montant récupérable ni de la date à laquelle vous pourriez retrouver votre logement.
        </p>
      </Callout>

      <SectionHeading id="sous-location-airbnb" step="Location touristique">
        Sous-location Airbnb : l’accord du propriétaire règle-t-il tout ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Non. L’autorisation du bailleur et le respect des règles administratives sont deux questions distinctes. Avant
        d’accepter un projet de sous-location touristique, faites vérifier :
      </p>
      <CheckList
        items={[
          'les obligations locales : déclaration, numéro d’enregistrement, limites propres à la commune ;',
          'la situation du logement et les éventuelles restrictions du règlement de copropriété ;',
          'la durée envisagée, la partie du logement concernée et les modalités pratiques.',
        ]}
      />
      <p className="text-gray-700 mb-4">
        Ne considérez pas qu’une annonce acceptée par une plateforme démontre la régularité de l’opération. Une
        autorisation générale et imprécise laisse davantage de place aux désaccords.
      </p>

      <SectionHeading id="erreurs-proprietaire" step="À éviter">
        Quelles erreurs le propriétaire doit-il éviter ?
      </SectionHeading>
      <CheckList
        variant="cross"
        items={[
          'entrer dans le logement sans l’accord de l’occupant ;',
          'changer les serrures ou retirer les affaires des occupants ;',
          'contacter les personnes présentes avec des menaces ;',
          'diffuser leurs informations personnelles ou l’annonce en ligne avec des accusations.',
        ]}
      />
      <Callout tone="warning" title="Le logement reste le domicile de ses occupants">
        <p>
          Même en cas de sous-location irrégulière, forcer l’entrée ou expulser soi-même les occupants est un délit. Une
          réaction documentée et proportionnée protège mieux vos intérêts qu’une intervention précipitée.
        </p>
      </Callout>
      <ReadAlso
        href="/blog/bail-notarie-et-expulsion-efficacite-juridique-et-strategie-de-recouvrement"
        label="Bail notarié et expulsion : ce qui change vraiment"
        hint="Ce que le titre exécutoire permet, et ce qui reste du ressort du juge."
      />

      <SectionHeading id="prevenir-sous-location" step="Prévenir">
        Prévenir la sous-location dès la préparation du bail
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Relisez la clause de sous-location et conservez toute demande ou autorisation écrite. Si vous acceptez une
        sous-location, faites préciser son périmètre, sa durée et le sous-loyer autorisé. Les{' '}
        <Link href="/blog/nouveau-bail-location-2026" className="font-medium text-blue-700 hover:underline">
          nouveaux contrats types de location
        </Link>{' '}
        en vigueur depuis le 1er octobre 2026 sont aussi l’occasion de vérifier l’ensemble de votre modèle de bail.
      </p>
      <p className="text-gray-700 mb-4">
        Le{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>{' '}
        ne rend pas une sous-location impossible et ne permet pas une expulsion automatique : il ne remplace ni les
        preuves ni les procédures nécessaires en cas de litige. Il apporte en revanche un contrat daté, conservé par le
        notaire, et un titre exécutoire pour recouvrer les loyers impayés.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Préparez votre prochaine location sur des bases claires"
        body="BailNotarie accompagne la constitution de votre dossier de bail et sa transmission à un notaire partenaire, jusqu’à la signature."
        points={['Clauses relues par le notaire', 'Acte daté et conservé', 'Titre exécutoire en cas d’impayé', 'Dossier guidé, 100 % en ligne']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : un locataire peut-il sous-louer son logement ?',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2449',
          },
          {
            label: 'Service Public : sous-location d’un logement du secteur privé',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F36010',
          },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (article 8)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
