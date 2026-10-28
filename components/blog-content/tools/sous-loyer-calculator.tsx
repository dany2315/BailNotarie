"use client";

import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Field, NumberInput, ResultPanel, ToolShell, formatEuro, parseAmount } from './tool-shell';

/**
 * Plafond du sous-loyer d'une sous-location autorisee : le loyer au metre
 * carre de surface habitable sous-louee ne peut pas depasser celui paye par
 * le locataire principal (article 8 de la loi du 6 juillet 1989).
 */
export function SousLoyerCalculator() {
  const [rent, setRent] = useState('900');
  const [surface, setSurface] = useState('45');
  const [sublet, setSublet] = useState('12');
  const [asked, setAsked] = useState('400');

  const rentValue = parseAmount(rent);
  const surfaceValue = parseAmount(surface);
  const subletValue = parseAmount(sublet);
  const askedValue = parseAmount(asked);
  const valid = rentValue > 0 && surfaceValue > 0 && subletValue > 0 && subletValue <= surfaceValue;
  const perSquareMeter = valid ? rentValue / surfaceValue : 0;
  const ceiling = perSquareMeter * subletValue;
  const excess = askedValue - ceiling;

  return (
    <ToolShell
      id="calculateur-sous-loyer"
      icon={Scale}
      eyebrow="Calculateur gratuit"
      title="Quel sous-loyer maximum pour une sous-location autorisée ?"
      description="Le loyer au m² demandé au sous-locataire ne peut pas dépasser celui payé par le locataire principal."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Loyer du bail principal" hint="Mensuel, hors charges.">
          {(id) => <NumberInput id={id} value={rent} onChange={setRent} suffix="€" />}
        </Field>
        <Field label="Surface habitable du logement">
          {(id) => <NumberInput id={id} value={surface} onChange={setSurface} suffix="m²" />}
        </Field>
        <Field label="Surface sous-louée" hint="Pièce ou logement entier.">
          {(id) => <NumberInput id={id} value={sublet} onChange={setSublet} suffix="m²" />}
        </Field>
        <Field label="Sous-loyer demandé" hint="Facultatif, pour le comparer au plafond.">
          {(id) => <NumberInput id={id} value={asked} onChange={setAsked} suffix="€" />}
        </Field>
      </div>

      {valid ? (
        <ResultPanel>
          <p className="text-sm font-medium text-blue-800">Sous-loyer mensuel maximum</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{formatEuro(ceiling)}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <dt className="text-gray-500">Loyer au m²</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{formatEuro(perSquareMeter)}</dd>
            </div>
            <div className="rounded-xl bg-white/80 px-3 py-2.5">
              <dt className="text-gray-500">Écart avec le plafond</dt>
              <dd
                className={`font-semibold tabular-nums ${
                  askedValue > 0 && excess > 0.5 ? 'text-rose-700' : 'text-emerald-700'
                }`}
              >
                {askedValue > 0 ? (excess > 0.5 ? `+ ${formatEuro(excess)}` : 'Dans le plafond') : '—'}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            Le plafond ne dispense pas de l’accord écrit du bailleur, qui porte aussi sur le montant du sous-loyer. Pour
            des séjours de courte durée, faites examiner le calcul : il ne se transpose pas simplement à un prix à la nuit.
          </p>
        </ResultPanel>
      ) : (
        <ResultPanel tone="blocked">
          <p className="text-sm text-gray-800">
            Indiquez le loyer, la surface du logement et une surface sous-louée qui ne la dépasse pas.
          </p>
        </ResultPanel>
      )}
    </ToolShell>
  );
}
