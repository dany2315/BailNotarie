"use client";

import { useState } from 'react';
import { Gauge } from 'lucide-react';
import { Field, NumberInput, ResultPanel, ToolShell, formatEuro, parseAmount } from './tool-shell';

/**
 * Taux d'effort d'un candidat : part du loyer charges comprises dans ses
 * revenus nets mensuels. Les seuils affiches sont des reperes de lecture
 * courants, pas une regle legale : chaque assureur loyers impayes fixe ses
 * propres criteres.
 */
export function SolvabiliteCalculator() {
  const [rent, setRent] = useState('750');
  const [charges, setCharges] = useState('80');
  const [income, setIncome] = useState('2600');

  const total = parseAmount(rent) + parseAmount(charges);
  const incomeValue = parseAmount(income);
  const valid = total > 0 && incomeValue > 0;
  const effort = valid ? (total / incomeValue) * 100 : 0;
  const multiple = valid ? incomeValue / total : 0;
  const target = total * 3;

  const band =
    effort <= 33
      ? { label: 'Taux d’effort modéré', tone: 'text-emerald-700', bar: 'bg-emerald-500' }
      : effort <= 40
        ? { label: 'Taux d’effort à examiner', tone: 'text-amber-700', bar: 'bg-amber-500' }
        : { label: 'Taux d’effort élevé', tone: 'text-rose-700', bar: 'bg-rose-500' };

  return (
    <ToolShell
      id="calculateur-solvabilite"
      icon={Gauge}
      eyebrow="Calculateur gratuit"
      title="Taux d’effort et règle des 3 fois le loyer"
      description="Rapportez le loyer charges comprises aux revenus nets justifiés du foyer candidat."
    >
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Loyer hors charges">
          {(id) => <NumberInput id={id} value={rent} onChange={setRent} suffix="€" />}
        </Field>
        <Field label="Charges mensuelles">
          {(id) => <NumberInput id={id} value={charges} onChange={setCharges} suffix="€" />}
        </Field>
        <Field label="Revenus nets du foyer" hint="Mensuels, tous titulaires du bail.">
          {(id) => <NumberInput id={id} value={income} onChange={setIncome} suffix="€" />}
        </Field>
      </div>

      {valid ? (
        <ResultPanel>
          <p className="text-sm font-medium text-blue-800">Taux d’effort</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
            {effort.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %
          </p>
          <p className={`mt-1 text-sm font-semibold ${band.tone}`}>{band.label}</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white" role="presentation">
            <div className={`h-full ${band.bar} transition-[width] duration-300`} style={{ width: `${Math.min(effort, 100)}%` }} />
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <dt className="text-gray-500">Revenus / loyer CC</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">
                {multiple.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} fois
              </dd>
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <dt className="text-gray-500">Revenus pour « 3 fois »</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{formatEuro(target)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            Repère de lecture, pas une règle légale : la régularité des revenus, la situation professionnelle et les
            garanties comptent autant. Si vous souscrivez une assurance loyers impayés, ses propres critères s’imposent.
          </p>
        </ResultPanel>
      ) : (
        <ResultPanel tone="blocked">
          <p className="text-sm text-gray-800">Indiquez un loyer et des revenus pour lancer le calcul.</p>
        </ResultPanel>
      )}
    </ToolShell>
  );
}
