"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Filtre « Notaire » de la liste des dossiers (paramètre `notaire`). */
export function LeaseNotaireFilter({ notaires }: { notaires: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get("notaire") || "all";

  const select = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === "all") params.delete("notaire");
      else params.set("notaire", value);
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border bg-background pl-3 text-sm text-muted-foreground">
      Notaire
      <Select value={current} onValueChange={select} disabled={isPending}>
        <SelectTrigger className="h-9 min-w-36 border-0 font-semibold text-foreground shadow-none focus-visible:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="none">Non assigné</SelectItem>
          {notaires.map((n) => (
            <SelectItem key={n.id} value={n.id}>
              {n.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
