"use client";

import { useState } from 'react';
import { Scale } from 'lucide-react';
import { Field, NumberInput, ResultPanel, ToolShell, formatEuro, parseAmount } from './tool-shell';

/**
 * Application d'une grille de vetuste a un element degrade.
 *
 * Modele lineaire courant : aucun abattement pendant la franchise, puis un
 * abattement constant chaque annee jusqu'a la valeur residuelle atteinte en
 * fin de duree de vie. Les valeurs par defaut ne sont qu'un exemple : seule
 * la grille convenue au bail s'applique.
 */
export function VetusteCalculator() {
  const [cost, setCost] = useState('600');
  const [age, setAge] = useState('5');
  const [lifespan, setLifespan] = useState('8');
  const [franchise, setFranchise] = useState('1');
  const [residual, setResidual] = useState('10');

  const costValue = parseAmount(cost);
  const ageValue = parseAmount(age);
  const lifeValue = parseAmount(lifespan);
  const franchiseValue = parseAmount(franchise);
  const residualRate = Math.min(Math.max(parseAmount(residual), 0), 100) / 100;

  const valid = lifeValue > franchiseValue && costValue > 0;
  const usefulYears = Math.max(lifeValue - franchiseValue, 0);
  const elapsed = Math.max(ageValue - franchiseValue, 0);
  const abatement = valid ? Math.min(1 - residualRate, (elapsed / usefulYears) * (1 - residualRate)) : 0;
  const tenantShare = valid ? costValue * (1 - abatement) : 0;
  const landlordShare = valid ? costValue - tenantShare : 0;
  const tenantPercent = valid ? Math.round((1 - abatement) * 100) : 0;

  return (
    <ToolShell
      id="simulateur-vetuste"
      icon={Scale}
      eyebrow="Simulateur"
      title="Vétusté : quelle part d’une réparation peut rester à la charge du locataire ?"
      description="Appliquez une grille de vétusté à un élément abîmé. Remplacez les valeurs d’exemple par celles de votre bail."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Coût de remise en état" hint="Devis ou facture de l'élément concerné.">
          {(id) => <NumberInput id={id} value={cost} onChange={setCost} suffix="€" />}
        </Field>
        <Field label="Âge de l'élément" hint="Depuis sa pose ou sa dernière réfection.">
          {(id) => <NumberInput id={id} value={age} onChange={setAge} suffix="ans" />}
        </Field>
        <Field label="Durée de vie (grille)" hint="Exemple : 8 ans pour une peinture.">
          {(id) => <NumberInput id={id} value={lifespan} onChange={setLifespan} suffix="ans" />}
        </Field>
        <Field label="Franchise (grille)" hint="Période sans abattement.">
          {(id) => <NumberInput id={id} value={franchise} onChange={setFranchise} suffix="ans" />}
        </Field>
        <Field label="Valeur résiduelle (grille)" hint="Part qui peut subsister en fin de vie.">
          {(id) => <NumberInput id={id} value={residual} onChange={setResidual} suffix="%" />}
        </Field>
      </div>

      {valid ? (
        <ResultPanel>
          <p className="text-sm font-medium text-blue-800">Part maximale imputable au locataire</p>
          <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">{formatEuro(tenantShare)}</p>
          <div className="mt-4">
            <div className="flex h-2.5 overflow-hidden rounded-full bg-white" role="presentation">
              <div className="bg-blue-600 transition-[width] duration-300" style={{ width: `${tenantPercent}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-600 tabular-nums">
              <span>Locataire : {tenantPercent} %</span>
              <span>Vétusté, à la charge du bailleur : {formatEuro(landlordShare)}</span>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-700">
            Ce montant suppose une dégradation réellement imputable au locataire. Une usure normale ne justifie aucune
            retenue, quel que soit l’âge de l’élément.
          </p>
        </ResultPanel>
      ) : (
        <ResultPanel tone="blocked">
          <p className="text-sm text-gray-800">
            Indiquez un coût positif et une durée de vie supérieure à la franchise pour lancer le calcul.
          </p>
        </ResultPanel>
      )}
    </ToolShell>
  );
}
