import { cn } from "@/lib/utils";

/** Libellés et couleurs du statut de complétion (maquette « Clients »). */
export const COMPLETION_CHIP: Record<string, { label: string; className: string }> = {
  NOT_STARTED: { label: "Pas commencé", className: "bg-amber-100 text-amber-900" },
  PARTIAL: { label: "Incomplet", className: "bg-red-100 text-red-800" },
  PENDING_CHECK: { label: "À vérifier", className: "bg-blue-100 text-blue-800" },
  COMPLETED: { label: "Vérifié", className: "bg-green-100 text-green-800" },
};

/** Pastille en lecture seule du statut de complétion d'un client ou d'un bien. */
export function CompletionChip({ status, className }: { status?: string | null; className?: string }) {
  const chip = COMPLETION_CHIP[status || "NOT_STARTED"] || COMPLETION_CHIP.NOT_STARTED;
  return (
    <span className={cn("inline-flex h-7 items-center whitespace-nowrap rounded-md px-2.5 text-[12.5px] font-semibold", chip.className, className)}>
      {chip.label}
    </span>
  );
}
