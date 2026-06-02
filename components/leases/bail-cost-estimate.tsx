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
}

export function BailCostEstimate({ rentAmount, peopleCount }: BailCostEstimateProps) {
  const ttc = useMemo(() => {
    const base = Math.max(0, rentAmount) * 0.5;
    const perPerson = Math.max(0, peopleCount) * PER_PERSON_FEE_HT;
    return (base + perPerson) * (1 + TVA_RATE);
  }, [rentAmount, peopleCount]);

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700">Honoraires du notaire estimés</span>
        <span className="text-base font-bold text-slate-900 tabular-nums">{formatCurrency(ttc)}</span>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">
        Paiement unique · 50% du loyer HT + 10 €/personne · TVA 20% · estimation indicative
      </p>
    </div>
  );
}
