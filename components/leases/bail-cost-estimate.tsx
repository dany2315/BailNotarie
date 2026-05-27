"use client";

import { useMemo } from "react";
import { Calculator, Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

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
  const estimate = useMemo(() => {
    const base = Math.max(0, rentAmount) * 0.5;
    const perPerson = Math.max(0, peopleCount) * PER_PERSON_FEE_HT;
    const ht = base + perPerson;
    const ttc = ht * (1 + TVA_RATE);
    return { base, perPerson, ht, ttc };
  }, [rentAmount, peopleCount]);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <Calculator className="h-4 w-4 text-blue-600" />
        Estimation du coût notaire
      </div>

      <div className="space-y-2 max-w-[220px]">
        <Label htmlFor="bail-cost-people" className="text-xs text-slate-700">
          Nombre de personnes au bail
        </Label>
        <Input
          id="bail-cost-people"
          type="number"
          min={1}
          max={20}
          value={peopleCount || ""}
          onChange={(e) => onPeopleCountChange(Math.max(1, Number(e.target.value) || 1))}
          disabled={disabled}
          className="h-9"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          Base (50% du loyer HT)
          <div className="text-slate-900 font-semibold">{formatCurrency(estimate.base)}</div>
        </div>
        <div>
          Débours ({peopleCount} × {PER_PERSON_FEE_HT} €)
          <div className="text-slate-900 font-semibold">{formatCurrency(estimate.perPerson)}</div>
        </div>
      </div>

      <div className="flex items-baseline justify-between border-t border-blue-200 pt-2">
        <span className="text-sm text-slate-700">Total estimé TTC</span>
        <span className="text-lg font-bold text-slate-900">{formatCurrency(estimate.ttc)}</span>
      </div>

      <p className="flex items-start gap-1.5 text-[11px] text-slate-500">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        Estimation indicative (TVA 20% incluse). Le montant final est confirmé par le notaire.
      </p>
    </div>
  );
}
