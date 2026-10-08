"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { STAGES, STAGE_ORDER, type StageKey } from "@/lib/utils/bail-stage";

interface LeaseStageTabsProps {
  /** Nombre de dossiers par statut (clé = statut en base). */
  statusCounts: Record<string, number>;
}

/**
 * Onglets d'étape au-dessus de la liste des dossiers. Une étape regroupe un ou
 * plusieurs statuts : l'onglet pose ces statuts dans le paramètre `status`,
 * celui qu'utilise déjà le filtre de statut.
 */
export function LeaseStageTabs({ statusCounts }: LeaseStageTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = (searchParams.get("status") || "").split(",").filter(Boolean).sort().join(",");
  const activeStage = STAGE_ORDER.find((key) => [...STAGES[key].statuses].sort().join(",") === current);
  const total = Object.values(statusCounts).reduce((sum, n) => sum + n, 0);

  const select = (stage: StageKey | "all") => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (stage === "all") params.delete("status");
      else params.set("status", STAGES[stage].statuses.join(","));
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  const tabs: Array<{ key: StageKey | "all"; label: string; count: number }> = [
    { key: "all", label: "Tous", count: total },
    ...STAGE_ORDER.map((key) => ({
      key,
      label: STAGES[key].label,
      count: STAGES[key].statuses.reduce((sum, s) => sum + (statusCounts[s] || 0), 0),
    })),
  ];

  return (
    <div
      role="tablist"
      aria-label="Étape du dossier"
      className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] sm:flex-wrap [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.key === "all" ? !current : tab.key === activeStage;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={isPending}
            onClick={() => select(tab.key)}
            className={cn(
              "inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors disabled:opacity-60",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span className="text-xs font-medium text-muted-foreground">{tab.count}</span>
          </button>
        );
      })}
    </div>
  );
}
