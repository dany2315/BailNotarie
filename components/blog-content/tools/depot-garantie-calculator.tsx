"use client";

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import {
  DateInput,
  Field,
  NumberInput,
  ResultPanel,
  Segmented,
  ToolShell,
  addMonths,
  formatEuro,
  formatLongDate,
  parseAmount,
  parseIsoDate,
  todayIso,
} from './tool-shell';

type LeaseType = 'vide' | 'meuble' | 'mobilite';
type Conformity = 'conforme' | 'differences';

const CAP_MONTHS: Record<LeaseType, number> = { vide: 1, meuble: 2, mobilite: 0 };

/** Nombre de periodes mensuelles commencees entre l'echeance et la restitution. */
function startedLateMonths(deadline: Date, returnedOn: Date): number {
  if (returnedOn <= deadline) return 0;
  let periods = 0;
  while (addMonths(deadline, periods) < returnedOn) periods += 1;
  return periods;
}

export function DepotGarantieCalculator() {
  const [rent, setRent] = useState('800');
  const [leaseType, setLeaseType] = useState<LeaseType>('vide');
  const [keysOn, setKeysOn] = useState('');
  const [conformity, setConformity] = useState<Conformity>('conforme');
  const [returnedOn, setReturnedOn] = useState('');

  // Dates posees apres le montage pour eviter un ecart d'hydratation.
  useEffect(() => {
    const today = todayIso();
    setReturnedOn((current) => current || today);
    setKeysOn((current) => {
      if (current) return current;
      const d = addMonths(new Date(), -3);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
  }, []);

  const rentValue = parseAmount(rent);
  const cap = rentValue * CAP_MONTHS[leaseType];
  const keysDate = parseIsoDate(keysOn);
  const returnedDate = parseIsoDate(returnedOn);
  const deadline = keysDate ? addMonths(keysDate, conformity === 'conforme' ? 1 : 2) : null;
  const latePeriods = deadline && returnedDate ? startedLateMonths(deadline, returnedDate) : 0;
  const penalty = latePeriods * rentValue * 0.1;

  return (
    <ToolShell
      id="calculateur-depot-garantie"
      icon={Wallet}
      eyebrow="Calculateur gratuit"
      title="Plafond, délai de restitution et pénalité de retard"
      description="Vérifiez le montant maximal du dépôt, la date limite de restitution et la majoration due en cas de retard."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Loyer mensuel hors charges">
          {(id) => <NumberInput id={id} value={rent} onChange={setRent} suffix="€" />}
        </Field>
        <Segmented<LeaseType>
          label="Type de bail"
          value={leaseType}
          onChange={setLeaseType}
          options={[
            { value: 'vide', label: 'Vide' },
            { value: 'meuble', label: 'Meublé' },
            { value: 'mobilite', label: 'Mobilité' },
          ]}
        />
      </div>

      <ResultPanel>
        <p className="text-sm font-medium text-blue-800">Dépôt de garantie maximal</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
          {leaseType === 'mobilite' ? 'Interdit' : formatEuro(cap)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {leaseType === 'mobilite'
            ? 'Aucun dépôt de garantie ne peut être demandé dans un bail mobilité.'
            : `Soit ${CAP_MONTHS[leaseType]} mois de loyer hors charges au plus. C'est un plafond, pas un montant obligatoire.`}
        </p>
      </ResultPanel>

      {leaseType !== 'mobilite' && (
        <>
          <div className="mt-8 border-t border-gray-100 pt-6">
            <p className="text-sm font-semibold text-gray-900">Le dépôt ne vous a pas été rendu ?</p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <Field label="Date de remise des clés">
                {(id) => <DateInput id={id} value={keysOn} onChange={setKeysOn} />}
              </Field>
              <Segmented<Conformity>
                label="État des lieux de sortie"
                value={conformity}
                onChange={setConformity}
                options={[
                  { value: 'conforme', label: 'Conforme' },
                  { value: 'differences', label: 'Différences' },
                ]}
              />
              <Field label="Date de restitution (ou aujourd'hui)">
                {(id) => <DateInput id={id} value={returnedOn} onChange={setReturnedOn} />}
              </Field>
            </div>
          </div>

          {deadline && (
            <ResultPanel tone={latePeriods > 0 ? 'blocked' : 'default'}>
              <p className="text-sm font-medium text-gray-700">Date limite de restitution</p>
              <p className="mt-1 text-xl font-bold text-gray-900">{formatLongDate(deadline)}</p>
              {latePeriods > 0 ? (
                <p className="mt-3 text-sm leading-relaxed text-gray-800">
                  <strong className="text-gray-900">
                    {latePeriods} période{latePeriods > 1 ? 's' : ''} mensuelle{latePeriods > 1 ? 's' : ''} de retard
                    commencée{latePeriods > 1 ? 's' : ''}
                  </strong>
                  , soit une majoration de <strong className="text-gray-900">{formatEuro(penalty)}</strong> (10 % du
                  loyer hors charges par période) qui s&apos;ajoute au solde restant dû. Elle ne s&apos;applique pas si
                  le retard vient de l&apos;absence de transmission de votre nouvelle adresse.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-gray-700">
                  Pas de retard à cette date : le bailleur est encore dans le délai légal.
                </p>
              )}
            </ResultPanel>
          )}
        </>
      )}
    </ToolShell>
  );
}
