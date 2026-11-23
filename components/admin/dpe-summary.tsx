import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { ENERGY_CLASS_STYLE, type DpeAssessment, type EnergyClassValue } from "@/lib/utils/dpe";

/** Étiquette de classe (A à G) aux couleurs du DPE. */
export function EnergyClassBadge({ value, label }: { value: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm">
      <span
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-[13px] font-bold",
          ENERGY_CLASS_STYLE[value as EnergyClassValue] || "bg-slate-200 text-slate-700",
        )}
      >
        {value}
      </span>
      {label}
    </span>
  );
}

/** Ce qui a été saisi pour le DPE d'un bien, avec sa validité et l'avertissement éventuel. */
export function DpeSummary({
  dpeClass,
  gesClass,
  dpeDate,
  assessment,
}: {
  dpeClass: string | null;
  gesClass: string | null;
  dpeDate: Date | string | null;
  assessment: DpeAssessment;
}) {
  // Rien de saisi : le message d'assessDpe (« Classe DPE à saisir… ») suffit.
  if (!dpeClass && !dpeDate) return null;
  return (
    <span className="flex flex-col gap-1.5">
      <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {dpeClass && <EnergyClassBadge value={dpeClass} label="Énergie" />}
        {gesClass && <EnergyClassBadge value={gesClass} label="Climat (GES)" />}
      </span>
      {dpeDate && (
        <span>
          Établi le {formatDate(dpeDate)}
          {assessment.validUntil && !assessment.expired && ` · valable jusqu'au ${formatDate(assessment.validUntil)}`}
          {assessment.expired && assessment.validUntil && ` · expiré depuis le ${formatDate(assessment.validUntil)}`}
        </span>
      )}
      {assessment.warning && <span className="text-[13px] font-semibold text-orange-700">{assessment.warning}</span>}
    </span>
  );
}

/** « yyyy-MM-dd » pour l'éditeur (date stockée à minuit UTC). */
export function dpeDateValue(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
