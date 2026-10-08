"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

// Par défaut (comme la maquette) : les dossiers qui attendent depuis le plus longtemps d'abord.
const OPTIONS = [
  { value: "attente", label: "Attente la plus longue" },
  { value: "recent", label: "Plus récents" },
] as const;

/** Tri de la liste des dossiers, porté par le paramètre `sort`. */
export function LeaseSortToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get("sort") === "recent" ? "recent" : "attente";

  const select = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === "attente") params.delete("sort");
      else params.set("sort", value);
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <div role="group" aria-label="Tri" className="flex flex-wrap items-center gap-1 rounded-xl bg-muted p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={current === option.value}
          disabled={isPending}
          onClick={() => select(option.value)}
          className={cn(
            "inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium transition-colors disabled:opacity-60",
            current === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
