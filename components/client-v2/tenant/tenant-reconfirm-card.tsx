"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { confirmBailTermsAsTenant } from "@/lib/actions/tenant-agreement";
import type { AgreementTerms } from "@/lib/bail/tenant-agreement";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { IconTile, PrimaryAction, Surface } from "../owner-ui";

/**
 * Nouvelle confirmation demandée au locataire : les conditions du bail ont changé depuis son accord
 * (ou il remplace un autre locataire). Il relit les conditions actuelles et les confirme ici.
 */
export function TenantReconfirmCard({
  bailId,
  terms,
  commercial,
}: {
  bailId: string;
  /** Conditions actuelles, telles que le serveur les connaît : renvoyées avec la confirmation. */
  terms: AgreementTerms;
  commercial: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const confirm = () =>
    startTransition(async () => {
      const result = await confirmBailTermsAsTenant({ bailId, terms });
      if (result.success) {
        toast.success("Merci, votre confirmation est enregistrée.");
      } else {
        toast.error(result.error);
        setChecked(false);
      }
      router.refresh();
    });

  const rent = Number(terms.rentAmount ?? 0);
  const charges = Number(terms.monthlyCharges ?? 0);
  const deposit = Number(terms.securityDeposit ?? 0);

  return (
    <Surface tone="warn" className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <IconTile icon={RefreshCw} tone="amber" size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900">Votre confirmation est à renouveler</p>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">
            Les conditions du bail ont été mises à jour. Relisez-les, puis confirmez votre accord.
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#4373f5]"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          disabled={pending}
        />
        <span className="text-[13.5px] leading-relaxed text-slate-700">
          Je confirme le loyer de <strong>{formatCurrency(rent)}</strong>
          {commercial ? " hors taxes" : ""} par mois
          {charges > 0 ? (
            <>
              , les charges de <strong>{formatCurrency(charges)}</strong> par mois
            </>
          ) : null}
          {deposit > 0 ? (
            <>
              , le dépôt de garantie de <strong>{formatCurrency(deposit)}</strong>
            </>
          ) : null}
          {terms.effectiveDate ? (
            <>
              {" "}
              et l&apos;entrée dans les lieux le <strong>{formatDate(String(terms.effectiveDate))}</strong>
            </>
          ) : null}
          .
        </span>
      </label>

      <PrimaryAction className="mt-4 w-full py-3 sm:w-auto" disabled={!checked || pending} onClick={confirm}>
        <Check className="h-4 w-4" />
        {pending ? "Enregistrement…" : "Confirmer les conditions"}
      </PrimaryAction>
    </Surface>
  );
}
