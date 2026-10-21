"use client";

import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import {
  DateInput,
  Field,
  ResultPanel,
  Segmented,
  ToolShell,
  addMonths,
  formatLongDate,
  parseIsoDate,
  todayIso,
} from './tool-shell';

type LeaseType = 'vide' | 'meuble';
type Owner = 'physique' | 'morale';

/** Fin d'une periode de bail : veille de la date anniversaire. */
function periodEnd(start: Date, years: number): Date {
  const end = addMonths(start, years * 12);
  end.setDate(end.getDate() - 1);
  return end;
}

/**
 * Premiere echeance pour laquelle un conge peut encore etre recu a temps.
 * Le bail se renouvelle par periodes de meme duree (3 ou 6 ans en vide,
 * 1 an en meuble) : on avance d'echeance en echeance.
 */
function nextReachableTerm(start: Date, years: number, noticeMonths: number, today: Date) {
  for (let n = 1; n < 200; n += 1) {
    const end = periodEnd(start, years * n);
    const deadline = addMonths(end, -noticeMonths);
    if (deadline >= today) return { end, deadline };
  }
  return null;
}

export function CongeBailleurCalculator() {
  const [leaseType, setLeaseType] = useState<LeaseType>('vide');
  const [owner, setOwner] = useState<Owner>('physique');
  const [startOn, setStartOn] = useState('');
  const [today, setToday] = useState('');

  // Dates posees apres le montage pour eviter un ecart d'hydratation.
  useEffect(() => {
    const t = todayIso();
    setToday(t);
    setStartOn((current) => {
      if (current) return current;
      const d = addMonths(new Date(), -30);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    });
  }, []);

  const years = leaseType === 'meuble' ? 1 : owner === 'morale' ? 6 : 3;
  const noticeMonths = leaseType === 'meuble' ? 3 : 6;
  const start = parseIsoDate(startOn);
  const now = parseIsoDate(today);
  const term = start && now ? nextReachableTerm(start, years, noticeMonths, now) : null;
  const safeSend = term ? new Date(term.deadline.getFullYear(), term.deadline.getMonth(), term.deadline.getDate() - 21) : null;

  return (
    <ToolShell
      id="calculateur-conge-bailleur"
      icon={CalendarCheck}
      eyebrow="Calculateur gratuit"
      title="Jusqu’à quand pouvez-vous donner congé à votre locataire ?"
      description="Indiquez la date de prise d’effet du bail : vous obtenez la prochaine échéance accessible et la date limite de réception du congé."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Segmented<LeaseType>
          label="Type de location"
          value={leaseType}
          onChange={setLeaseType}
          options={[
            { value: 'vide', label: 'Vide' },
            { value: 'meuble', label: 'Meublée' },
          ]}
        />
        {leaseType === 'vide' ? (
          <Segmented<Owner>
            label="Le bailleur est"
            value={owner}
            onChange={setOwner}
            options={[
              { value: 'physique', label: 'Particulier / SCI fam.' },
              { value: 'morale', label: 'Société' },
            ]}
          />
        ) : (
          <div className="hidden sm:block" aria-hidden="true" />
        )}
        <div className="sm:col-span-2">
          <Field
            label="Date de prise d’effet du bail"
            hint="Indiquée en tête du contrat. Le bail se renouvelle ensuite par périodes de même durée."
          >
            {(id) => <DateInput id={id} value={startOn} onChange={setStartOn} />}
          </Field>
        </div>
      </div>

      {term && safeSend ? (
        <ResultPanel>
          <p className="text-sm font-medium text-blue-800">Prochaine échéance accessible</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">{formatLongDate(term.end)}</p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-white/80 px-3.5 py-3">
              <dt className="text-gray-500">Congé reçu au plus tard le</dt>
              <dd className="mt-0.5 font-semibold text-gray-900">{formatLongDate(term.deadline)}</dd>
            </div>
            <div className="rounded-xl bg-white/80 px-3.5 py-3">
              <dt className="text-gray-500">Envoi conseillé avant le</dt>
              <dd className="mt-0.5 font-semibold text-gray-900">{formatLongDate(safeSend)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            Préavis de {noticeMonths} mois avant une échéance de bail de {years} an{years > 1 ? 's' : ''}. C’est la
            réception par le locataire qui compte, pas l’envoi : gardez une marge pour un recommandé non retiré.
          </p>
        </ResultPanel>
      ) : (
        <ResultPanel tone="blocked">
          <p className="text-sm text-gray-800">Indiquez la date de prise d’effet du bail pour lancer le calcul.</p>
        </ResultPanel>
      )}
    </ToolShell>
  );
}
