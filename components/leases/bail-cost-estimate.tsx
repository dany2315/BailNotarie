"use client";

import { useMemo } from "react";

const TVA_RATE = 0.2;
const PER_PERSON_FEE_HT = 10;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

interface BailCostEstimateProps {
  rentAmount: number;
  peopleCount: number;
  onPeopleCountChange: (value: number) => void;
  disabled?: boolean;
}

export function BailCostEstimate({
  rentAmount,
  peopleCount,
  onPeopleCountChange,
  disabled,
}: BailCostEstimateProps) {
  const ttc = useMemo(() => {
    const base = Math.max(0, rentAmount) * 0.5;
    const perPerson = Math.max(0, peopleCount) * PER_PERSON_FEE_HT;
    return (base + perPerson) * (1 + TVA_RATE);
  }, [rentAmount, peopleCount]);

  return (
    <div className="space-y-1 px-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700">
          Estimation notaire pour{" "}
          <input
            type="number"
            min={1}
            max={20}
            value={peopleCount || ""}
            onChange={(e) => onPeopleCountChange(Math.max(1, Number(e.target.value) || 1))}
            disabled={disabled}
            className="w-12 text-center font-semibold text-slate-900 bg-transparent border-b border-dashed border-slate-400 focus:outline-none focus:border-blue-600 disabled:opacity-50"
            aria-label="Nombre de personnes au bail"
          />{" "}
          personne{peopleCount > 1 ? "s" : ""}
        </span>
        <span className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(ttc)}</span>
      </div>
      <p className="text-[11px] text-slate-500">
        50% du loyer HT + 10 €/personne · TVA 20% · estimation indicative
      </p>
    </div>
  );
}
