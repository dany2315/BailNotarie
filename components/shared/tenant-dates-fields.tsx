"use client";

import * as React from "react";
import { getBailTenantDates } from "@/lib/actions/leases";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Date de prise d'effet et jour de paiement, demandés au moment où l'on ajoute le locataire à un bail qui
 * n'a pas encore ces deux valeurs (elles se saisissent avec le locataire, dans le même parcours).
 */

export type TenantDatesState = {
  loading: boolean;
  /** Le bail n'a pas encore ces valeurs : elles sont à saisir ici. */
  needed: boolean;
  effectiveDate: string;
  paymentDay: string;
};

const INITIAL: TenantDatesState = { loading: false, needed: false, effectiveDate: "", paymentDay: "" };

/** À l'ouverture de la fenêtre, regarde si le bail a déjà sa date d'effet et son jour de paiement. */
export function useTenantDates(bailId: string, open: boolean, enabled = true) {
  const [state, setState] = React.useState<TenantDatesState>(INITIAL);
  React.useEffect(() => {
    if (!open || !enabled) {
      setState(INITIAL);
      return;
    }
    let alive = true;
    setState({ ...INITIAL, loading: true });
    getBailTenantDates(bailId)
      .then((dates) => {
        if (alive) setState({ loading: false, needed: dates.needed, effectiveDate: dates.effectiveDate ?? "", paymentDay: dates.paymentDay ? String(dates.paymentDay) : "" });
      })
      // En cas d'échec de lecture, on demande les valeurs : le serveur les exige de toute façon.
      .catch(() => alive && setState({ ...INITIAL, needed: true }));
    return () => {
      alive = false;
    };
  }, [bailId, open, enabled]);
  return [state, setState] as const;
}

/** Message d'erreur si les deux valeurs sont attendues et incomplètes ; null sinon. */
export function tenantDatesError(state: TenantDatesState): string | null {
  if (!state.needed) return null;
  if (!state.effectiveDate) return "Indiquez la date de prise d'effet du bail";
  const day = Number.parseInt(state.paymentDay, 10);
  if (!Number.isFinite(day) || day < 1 || day > 28) return "Indiquez le jour de paiement du loyer (entre 1 et 28)";
  return null;
}

export function TenantDatesFields({
  state,
  onChange,
  disabled,
  inputClassName,
}: {
  state: TenantDatesState;
  onChange: (next: TenantDatesState) => void;
  disabled?: boolean;
  inputClassName?: string;
}) {
  if (!state.needed) return null;
  return (
    <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
      <p className="text-[13px] leading-snug text-muted-foreground">
        Avec un locataire, nous avons besoin de la date de prise d&apos;effet du bail et du jour de paiement du loyer.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="tenant-effective-date" className="text-[12.5px]">
            Date de prise d&apos;effet *
          </Label>
          <Input
            id="tenant-effective-date"
            type="date"
            value={state.effectiveDate}
            onChange={(event) => onChange({ ...state, effectiveDate: event.target.value })}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tenant-payment-day" className="text-[12.5px]">
            Jour de paiement *
          </Label>
          <Input
            id="tenant-payment-day"
            type="number"
            inputMode="numeric"
            min={1}
            max={28}
            placeholder="Ex. 5"
            value={state.paymentDay}
            onChange={(event) => onChange({ ...state, paymentDay: event.target.value })}
            disabled={disabled}
            className={inputClassName}
          />
        </div>
      </div>
    </div>
  );
}
