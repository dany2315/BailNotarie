"use client";

import React from 'react';
import Link from 'next/link';
import { IRL_SERIES, LATEST_IRL, computeRevisedRent, formatIrl, getAnnualVariation, getIrl } from '@/lib/irl';
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
import { IrlCalculator } from './tools/irl-calculator';

const QUARTER_SHORT = ['', 'T1', 'T2', 'T3', 'T4'];

function formatPercent(value: number | undefined) {
  if (value === undefined) return '—';
  return `${value >= 0 ? '+' : ''}${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

export function Blog19Content() {
  // Exemple chiffre sur des indices reels : 2e trimestre 2026 contre 2e trimestre 2025.
  const exampleNew = getIrl(2026, 2) ?? LATEST_IRL.value;
  const exampleOld = getIrl(2025, 2) ?? LATEST_IRL.value;
  const exampleRent = computeRevisedRent(800, exampleNew, exampleOld);
  const latestLabel = `${QUARTER_SHORT[LATEST_IRL.quarter]} ${LATEST_IRL.year}`;

  return (
    <article>
      <section aria-label="Introduction">
        <p className="text-lg text-gray-700 mb-4">
          Une hausse de loyer modifie directement le budget du locataire et les revenus du propriétaire. Pourtant,
          l’augmentation annuelle n’est ni automatique ni libre : elle dépend du contrat, de l’indice applicable et de
          certaines restrictions.
        </p>
        <p className="text-gray-700 mb-4">
          Avant de demander ou d’accepter un nouveau montant, plusieurs éléments sont à vérifier. Ce guide concerne la
          révision annuelle des locations privées vides ou meublées constituant la résidence principale, soumises à la
          loi du 6 juillet 1989.
        </p>
      </section>

      <KeyFacts
        items={[
          {
            value: formatIrl(LATEST_IRL.value),
            label: `Dernier IRL publié (${latestLabel})`,
            hint: `${formatPercent(getAnnualVariation(LATEST_IRL))} sur un an, France métropolitaine.`,
          },
          { value: '1 an', label: 'Pour demander la révision', hint: 'À compter de la date prévue au bail.' },
          { value: '0 €', label: 'De rattrapage rétroactif', hint: 'La hausse ne joue qu’à partir de la demande.' },
        ]}
      />

      <SectionHeading id="conditions-revision" step="Conditions">
        Le propriétaire peut-il augmenter le loyer chaque année ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Oui, mais seulement si une <strong>clause de révision</strong> figure dans le bail. Sans cette clause, le
        propriétaire ne peut pas appliquer de hausse au titre de la révision annuelle.
      </p>
      <p className="text-gray-700 mb-4">
        Lorsqu’elle est prévue, la révision intervient une fois par an, à la date convenue dans le contrat ou, à défaut,
        à sa date anniversaire. L’évolution de l’indice ne déclenche pas à elle seule une augmentation : le bailleur doit
        manifester sa volonté de l’appliquer (article 17-1 de la loi du 6 juillet 1989).
      </p>

      <SectionHeading id="irl" step="L’indice">
        Qu’est-ce que l’indice de référence des loyers (IRL) ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        L’<strong>IRL</strong> encadre la révision : la hausse ne peut pas dépasser sa variation sur un an. Il est publié
        chaque trimestre par l’Insee. Pour le calcul, on compare l’indice du trimestre de référence prévu au bail avec
        celui du même trimestre de l’année précédente. À défaut de référence dans le contrat, on retient le dernier
        indice publié à la date de signature.
      </p>
      <DataTable
        caption="Derniers indices de référence des loyers publiés par l'Insee, France métropolitaine"
        head={['Trimestre', 'IRL', 'Variation sur un an']}
        rows={IRL_SERIES.slice(0, 6).map((v) => [
          `${QUARTER_SHORT[v.quarter]} ${v.year}`,
          <span key="v" className="tabular-nums">{formatIrl(v.value)}</span>,
          <span key="p" className="tabular-nums">{formatPercent(getAnnualVariation(v))}</span>,
        ])}
      />
      <Callout tone="warning" title="Ne prenez pas simplement le dernier indice paru">
        <p>
          Il faut l’indice du <strong>trimestre prévu au bail</strong>, et le comparer au même trimestre un an plus tôt.
          Les indices diffèrent aussi en Corse et dans les territoires ultramarins.
        </p>
      </Callout>

      <IrlCalculator />

      <SectionHeading id="calcul-revision" step="La formule">
        Comment calculer la révision du loyer ?
      </SectionHeading>
      <div className="not-prose my-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-5 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Formule légale</p>
        <p className="mt-2 text-base font-semibold text-gray-900 sm:text-lg">
          Nouveau loyer = loyer hors charges × nouvel IRL ÷ IRL de l’année précédente
        </p>
      </div>
      <p className="text-gray-700 mb-4">
        Exemple avec un bail dont le trimestre de référence est le 2e trimestre, et un loyer de 800 € hors charges :
      </p>
      <p className="not-prose my-4 rounded-xl bg-blue-50/70 px-4 py-3 font-mono text-sm text-gray-800 ring-1 ring-blue-100">
        800 × {formatIrl(exampleNew)} ÷ {formatIrl(exampleOld)} = {exampleRent.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
      </p>
      <p className="text-gray-700 mb-4">
        La hausse mensuelle est donc de {(exampleRent - 800).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €.
        Avant d’envoyer une demande, vérifiez :
      </p>
      <CheckList
        items={[
          'Le montant de départ, bien hors charges',
          'Le trimestre de référence indiqué dans la clause',
          'Les deux valeurs de l’indice et le territoire concerné',
          'L’arrondi au centime',
        ]}
      />

      <SectionHeading id="revision-oubliee" step="Délai">
        Hausse oubliée : peut-on la réclamer plusieurs mois plus tard ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Le bailleur dispose d’<strong>un an</strong> à compter de la date prévue pour demander la révision. Une demande
        faite dans ce délai prend effet à compter de la demande, sans rattrapage des mois précédents.
      </p>
      <Callout tone="info" title="Exemple">
        <p>
          La révision était prévue en janvier mais n’a été demandée qu’en avril : le propriétaire ne peut pas réclamer de
          supplément pour janvier, février et mars. Une fois le délai d’un an dépassé, la révision de l’année écoulée est
          perdue.
        </p>
      </Callout>

      <SectionHeading id="dpe-f-g" step="Restrictions">
        Logements classés F ou G : révision interdite
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Une clause de révision ne suffit pas toujours. Pour les logements classés <strong>F ou G au DPE</strong>, la
        révision est interdite lorsque le bail a été signé, renouvelé ou tacitement reconduit depuis le{' '}
        <strong>24 août 2022</strong> en métropole, ou depuis le <strong>1er juillet 2024</strong> dans les territoires
        ultramarins concernés. Le loyer d’un <strong>bail mobilité</strong> ne peut pas non plus être révisé pendant le
        contrat.
      </p>
      <ReadAlso
        href="/blog/diagnostics-immobiliers-2026-durees-de-validite-couts-et-pieges-juridiques"
        label="Diagnostics immobiliers : DPE et durées de validité"
        hint="Vérifiez la classe énergétique avant toute révision."
      />

      <SectionHeading id="contester-augmentation" step="Locataire">
        Comment vérifier ou contester une augmentation de loyer ?
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Une demande claire doit permettre de retrouver la clause invoquée, la date d’application, le loyer de départ,
        les deux indices et le calcul.
      </p>
      <Steps
        steps={[
          { title: 'Demander le détail par écrit', body: 'Clause, indices utilisés, date d’effet et calcul.' },
          {
            title: 'Désigner précisément l’erreur',
            body: 'Mauvais trimestre, calcul incorrect, absence de clause, délai d’un an dépassé ou logement classé F ou G.',
          },
          { title: 'Conserver les pièces', body: 'Bail, DPE, quittances et échanges avec le bailleur.' },
          { title: 'Se faire accompagner', body: 'Une ADIL examine gratuitement votre situation avant toute démarche.' },
        ]}
      />

      <SectionHeading id="autres-hausses" step="À ne pas confondre">
        Révision, réévaluation, relocation : trois mécanismes distincts
      </SectionHeading>
      <DataTable
        caption="Les différents mécanismes de hausse du loyer"
        head={['Mécanisme', 'Quand ?', 'Règle principale']}
        rows={[
          ['Révision annuelle', 'En cours de bail, une fois par an', 'Clause au bail, plafonnée par l’IRL'],
          ['Réévaluation', 'Au renouvellement du bail', 'Loyer manifestement sous-évalué, procédure spécifique'],
          ['Fixation du loyer', 'Entre deux locataires', 'Règles propres, encadrées en zone tendue'],
        ]}
      />
      <p className="text-gray-700 mb-4">L’IRL ne permet donc pas de justifier indistinctement toutes les hausses.</p>

      <SectionHeading id="proprietaire-clause" step="Côté propriétaire">
        Une clause claire évite les désaccords
      </SectionHeading>
      <p className="text-gray-700 mb-4">
        Une révision bien préparée repose sur une clause compréhensible et un calcul vérifiable : propriétaire et
        locataire doivent pouvoir identifier les mêmes références et la même date d’application. Dans un{' '}
        <Link href="/blog/bail-notarie-quest-ce-que-cest-et-pourquoi-le-choisir" className="font-medium text-blue-700 hover:underline">
          bail notarié
        </Link>
        , la clause de révision est rédigée et vérifiée par le notaire, et l’acte constitue un titre exécutoire pour
        recouvrer les loyers impayés. Un acte notarié ne permet pas, en revanche, de contourner les limites légales de
        révision.
      </p>

      <InlineCta
        eyebrow="Propriétaire bailleur"
        title="Un bail sans zone grise, de la clause de révision au recouvrement"
        body="Préparez votre bail notarié en ligne : BailNotarie structure le dossier et le transmet à un notaire partenaire, qui rédige l’acte et le fait signer."
        points={['Clause de révision vérifiée par le notaire', 'Titre exécutoire en cas d’impayé', 'Dossier guidé, 100 % en ligne', 'Coût estimé à l’avance']}
        primary={{ href: '/commencer', label: 'Préparer mon bail notarié' }}
        secondary={{ href: '/simulateur-prix-bail-notarie', label: 'Estimer le coût' }}
      />

      <Sources
        items={[
          {
            label: 'Service Public : augmentation et révision du loyer en cours de bail',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1311',
          },
          {
            label: 'Service Public : indice de référence des loyers (IRL)',
            href: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F13723',
          },
          { label: 'ANIL : tableau des valeurs de l’IRL', href: 'https://www.anil.org/outils/indices-et-plafonds/tableau-de-lirl/' },
          {
            label: 'Légifrance : loi n° 89-462 du 6 juillet 1989 (article 17-1)',
            href: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000509310',
          },
        ]}
      />
    </article>
  );
}
