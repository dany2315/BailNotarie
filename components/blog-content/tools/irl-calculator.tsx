"use client";

import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';
import { IRL_LAST_PUBLICATION, computeRevisedRent, formatIrl, getRevisionPairs, type IrlQuarter } from '@/lib/irl';
import { Field, NumberInput, ResultPanel, Segmented, SelectInput, ToolShell, formatEuro, parseAmount } from './tool-shell';

type YesNo = 'oui' | 'non';
type Dpe = 'ae' | 'fg';

const QUARTER_LABELS: Record<IrlQuarter, string> = { 1: '1er trimestre', 2: '2e trimestre', 3: '3e trimestre', 4: '4e trimestre' };

export function IrlCalculator() {
  const [rent, setRent] = useState('800');
  const [quarter, setQuarter] = useState<IrlQuarter>(2);
  const pairs = useMemo(() => getRevisionPairs(quarter), [quarter]);
  const [year, setYear] = useState<string>(String(pairs[0]?.year ?? ''));
  const [clause, setClause] = useState<YesNo>('oui');
  const [dpe, setDpe] = useState<Dpe>('ae');

  const pair = pairs.find((p) => String(p.year) === year) ?? pairs[0];
  const rentValue = parseAmount(rent);
  const revised = pair && rentValue > 0 ? computeRevisedRent(rentValue, pair.current, pair.previous) : 0;
  const delta = revised - rentValue;
  const variation = pair ? (pair.current / pair.previous - 1) * 100 : 0;
  const blocked = clause === 'non' || dpe === 'fg';

  const changeQuarter = (value: string) => {
    const q = Number(value) as IrlQuarter;
    setQuarter(q);
    setYear(String(getRevisionPairs(q)[0]?.year ?? ''));
  };

  const published = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(IRL_LAST_PUBLICATION)
  );

  return (
    <ToolShell
      id="calculateur-irl"
      icon={Calculator}
      eyebrow="Calculateur IRL"
      title="Calculez la révision de votre loyer en quelques secondes"
      description={`Indices officiels de l'Insee (France métropolitaine), dernière publication intégrée le ${published}.`}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Loyer mensuel hors charges actuel">
          {(id) => <NumberInput id={id} value={rent} onChange={setRent} suffix="€" />}
        </Field>
        <Field label="Trimestre de référence du bail" hint="Indiqué dans la clause de révision.">
          {(id) => (
            <SelectInput
              id={id}
              value={String(quarter)}
              onChange={changeQuarter}
              options={([1, 2, 3, 4] as IrlQuarter[]).map((q) => ({ value: String(q), label: QUARTER_LABELS[q] }))}
            />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Field label="Indice à appliquer" hint="Le dernier indice publié pour ce trimestre à la date de révision.">
            {(id) => (
              <SelectInput
                id={id}
                value={year}
                onChange={setYear}
                options={pairs.map((p) => ({
                  value: String(p.year),
                  label: `T${quarter} ${p.year} (${formatIrl(p.current)}) ÷ T${quarter} ${p.year - 1} (${formatIrl(p.previous)})`,
                }))}
              />
            )}
          </Field>
        </div>
        <Segmented<YesNo>
          label="Le bail prévoit une clause de révision ?"
          value={clause}
          onChange={setClause}
          options={[
            { value: 'oui', label: 'Oui' },
            { value: 'non', label: 'Non' },
          ]}
        />
        <Segmented<Dpe>
          label="Classe DPE du logement"
          value={dpe}
          onChange={setDpe}
          options={[
            { value: 'ae', label: 'A à E' },
            { value: 'fg', label: 'F ou G' },
          ]}
        />
      </div>

      {blocked ? (
        <ResultPanel tone="blocked">
          <p className="text-sm font-semibold text-amber-900">Révision a priori impossible</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-800">
            {clause === 'non'
              ? 'Sans clause de révision dans le bail, le loyer ne peut pas être augmenté au titre de la révision annuelle.'
              : 'Pour un logement classé F ou G, la révision est interdite si le bail a été signé, renouvelé ou tacitement reconduit depuis le 24 août 2022 en métropole (1er juillet 2024 dans les territoires ultramarins concernés).'}
          </p>
        </ResultPanel>
      ) : (
        pair && (
          <ResultPanel>
            <p className="text-sm font-medium text-blue-800">Nouveau loyer hors charges</p>
            <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{formatEuro(revised)}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 px-3 py-2.5">
                <dt className="text-gray-500">Hausse mensuelle</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">{formatEuro(delta)}</dd>
              </div>
              <div className="rounded-xl bg-white/80 px-3 py-2.5">
                <dt className="text-gray-500">Sur 12 mois</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">{formatEuro(delta * 12)}</dd>
              </div>
              <div className="col-span-2 rounded-xl bg-white/80 px-3 py-2.5 sm:col-span-1">
                <dt className="text-gray-500">Variation de l’IRL</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">
                  {variation.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %
                </dd>
              </div>
            </dl>
            <p className="mt-4 font-mono text-xs text-gray-600">
              {formatEuro(rentValue)} × {formatIrl(pair.current)} ÷ {formatIrl(pair.previous)} = {formatEuro(revised)}
            </p>
          </ResultPanel>
        )
      )}
    </ToolShell>
  );
}
