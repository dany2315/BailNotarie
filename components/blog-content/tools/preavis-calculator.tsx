"use client";

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Check, Copy, ExternalLink } from 'lucide-react';
import {
  DateInput,
  Field,
  ResultPanel,
  Segmented,
  SelectInput,
  ToolShell,
  addMonths,
  formatLongDate,
  parseIsoDate,
  todayIso,
} from './tool-shell';

type LeaseType = 'vide' | 'meuble' | 'mobilite';

/** Motifs de preavis reduit d'une location vide (article 15 de la loi du 6 juillet 1989). */
const MOTIFS = [
  { value: 'aucun', label: 'Aucun de ces motifs', letter: '', proof: '' },
  {
    value: 'zone_tendue',
    label: 'Logement situé en zone tendue',
    letter: 'le logement est situé dans une commune classée en zone tendue (décret n° 2013-392 du 10 mai 2013)',
    proof: 'Mentionnez expressément la zone tendue dans la lettre et identifiez précisément le logement.',
  },
  {
    value: 'premier_emploi',
    label: 'Premier emploi',
    letter: "je viens d'obtenir un premier emploi",
    proof: 'Joindre le contrat de travail ou une attestation de l’employeur.',
  },
  {
    value: 'mutation',
    label: 'Mutation professionnelle',
    letter: "je fais l'objet d'une mutation professionnelle",
    proof: 'Joindre une attestation de l’employeur.',
  },
  {
    value: 'perte_emploi',
    label: 'Perte d’emploi',
    letter: "j'ai perdu mon emploi",
    proof: 'Joindre la lettre de licenciement, l’attestation de fin de contrat ou d’inscription à France Travail.',
  },
  {
    value: 'nouvel_emploi',
    label: 'Nouvel emploi après une perte d’emploi',
    letter: "j'ai obtenu un nouvel emploi consécutif à une perte d'emploi",
    proof: 'Joindre la preuve de la perte d’emploi et le nouveau contrat.',
  },
  {
    value: 'sante',
    label: 'État de santé (certificat médical)',
    letter: 'mon état de santé justifie un changement de domicile',
    proof: 'Joindre un certificat médical justifiant le changement de domicile.',
  },
  {
    value: 'rsa_aah',
    label: 'Bénéficiaire du RSA ou de l’AAH',
    letter: "je suis bénéficiaire du revenu de solidarité active ou de l'allocation aux adultes handicapés",
    proof: 'Joindre une attestation récente de la CAF ou de la MSA.',
  },
  {
    value: 'logement_social',
    label: 'Attribution d’un logement social',
    letter: "un logement social m'a été attribué",
    proof: 'Joindre la décision d’attribution du bailleur social.',
  },
  {
    value: 'violences',
    label: 'Violences au sein du couple ou sur un enfant',
    letter: "ma situation relève des cas de violences prévus à l'article 15 de la loi du 6 juillet 1989",
    proof: 'Joindre l’ordonnance de protection ou le document judiciaire exigé par la loi.',
  },
];

export function PreavisCalculator() {
  const [leaseType, setLeaseType] = useState<LeaseType>('vide');
  const [motif, setMotif] = useState('aucun');
  const [receivedOn, setReceivedOn] = useState('');
  const [copied, setCopied] = useState(false);

  // La date du jour est posee apres le montage : la calculer au rendu serveur
  // produirait un ecart d'hydratation autour de minuit ou entre fuseaux.
  useEffect(() => {
    setReceivedOn((current) => current || todayIso());
  }, []);

  const motifData = MOTIFS.find((m) => m.value === motif) ?? MOTIFS[0];
  const months = leaseType === 'vide' && motif === 'aucun' ? 3 : 1;
  const receivedDate = parseIsoDate(receivedOn);
  const endDate = receivedDate ? addMonths(receivedDate, months) : null;

  const letter = useMemo(() => {
    const reason =
      leaseType === 'vide' && motif !== 'aucun'
        ? `Je bénéficie d'un préavis réduit à un mois, car ${motifData.letter}${
            motif === 'zone_tendue' ? '' : ' (justificatif ci-joint)'
          }.`
        : leaseType === 'meuble'
          ? "Le logement étant loué meublé, mon préavis est d'un mois."
          : leaseType === 'mobilite'
            ? "Le logement étant loué dans le cadre d'un bail mobilité, mon préavis est d'un mois."
            : 'Mon préavis est de trois mois.';
    return [
      '[Prénom Nom]',
      '[Adresse du logement loué]',
      '',
      '[Nom du bailleur]',
      '[Adresse du bailleur]',
      '',
      'Lettre recommandée avec avis de réception',
      'Objet : congé du logement situé [adresse du logement]',
      '',
      'Madame, Monsieur,',
      '',
      'Par la présente, je vous informe de ma décision de mettre fin au bail du logement situé [adresse du logement], que je loue depuis le [date d’entrée dans les lieux].',
      '',
      `${reason} Il court à compter de la réception de ce courrier.`,
      '',
      "Je vous propose de convenir ensemble de la date de l'état des lieux de sortie et de la remise des clés. Ma nouvelle adresse est la suivante : [nouvelle adresse].",
      '',
      "Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.",
      '',
      '[Date et signature]',
    ].join('\n');
  }, [leaseType, motif, motifData.letter]);

  const copyLetter = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <ToolShell
      id="calculateur-preavis"
      icon={CalendarClock}
      eyebrow="Calculateur gratuit"
      title="Quelle est la durée de votre préavis, et quand se termine-t-il ?"
      description="Répondez à deux questions : la durée applicable, la date de fin et une lettre de congé prête à compléter."
    >
      <div className="space-y-5">
        <Segmented<LeaseType>
          label="Type de location"
          value={leaseType}
          onChange={setLeaseType}
          options={[
            { value: 'vide', label: 'Vide' },
            { value: 'meuble', label: 'Meublée' },
            { value: 'mobilite', label: 'Bail mobilité' },
          ]}
        />

        {leaseType === 'vide' && (
          <Field
            label="Motif de préavis réduit"
            hint="Le motif doit être indiqué et justifié dans la lettre de congé, sinon le délai reste de trois mois."
          >
            {(id) => (
              <SelectInput
                id={id}
                value={motif}
                onChange={setMotif}
                options={MOTIFS.map((m) => ({ value: m.value, label: m.label }))}
              />
            )}
          </Field>
        )}

        <Field
          label="Date de réception du congé par le bailleur"
          hint="C'est la réception effective qui compte, pas la date d'envoi."
        >
          {(id) => <DateInput id={id} value={receivedOn} onChange={setReceivedOn} />}
        </Field>
      </div>

      <ResultPanel>
        <p className="text-sm font-medium text-blue-800">Votre préavis</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900">{months === 1 ? '1 mois' : '3 mois'}</p>
        {endDate && (
          <p className="mt-2 text-[0.95rem] leading-relaxed text-gray-700">
            Fin du préavis le <strong className="text-gray-900">{formatLongDate(endDate)}</strong> à minuit. Le loyer
            et les charges restent dus jusqu’à cette date, sauf entrée anticipée d’un nouveau locataire avec l’accord
            du bailleur.
          </p>
        )}
        {leaseType === 'vide' && motif !== 'aucun' && motifData.proof && (
          <p className="mt-3 rounded-xl bg-white/80 px-3.5 py-2.5 text-sm text-gray-700">
            <strong className="text-gray-900">À prévoir :</strong> {motifData.proof}
          </p>
        )}
        {leaseType === 'vide' && motif === 'zone_tendue' && (
          <a
            href="https://www.service-public.gouv.fr/simulateur/calcul/zones-tendues"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 underline-offset-4 hover:underline"
          >
            Vérifier si ma commune est en zone tendue (Service Public)
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        )}
      </ResultPanel>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Votre lettre de congé, pré-remplie</p>
          <button
            type="button"
            onClick={copyLetter}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-800 transition-colors hover:border-blue-300 hover:text-blue-700"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Copiée' : 'Copier'}
          </button>
        </div>
        <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl border border-gray-200 bg-gray-50 p-4 font-sans text-[0.85rem] leading-relaxed text-gray-700">
          {letter}
        </pre>
        <p className="mt-2 text-xs text-gray-500">
          Complétez les éléments entre crochets, puis envoyez la lettre en recommandé avec avis de réception, remettez-la
          en main propre contre signature ou faites-la signifier par un commissaire de justice.
        </p>
      </div>
    </ToolShell>
  );
}
