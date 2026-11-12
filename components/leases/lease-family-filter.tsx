"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/** Filtre « Type de bail » de la liste des dossiers (paramètre `type` : HABITATION ou COMMERCIAL). */
export function LeaseFamilyFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = searchParams.get("type") || "all";

  const select = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value === "all") params.delete("type");
      else params.set("type", value);
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <label className="flex h-10 items-center gap-2 rounded-lg border bg-background pl-3 text-sm text-muted-foreground">
      Type de bail
      <Select value={current} onValueChange={select} disabled={isPending}>
        <SelectTrigger className="h-9 min-w-32 border-0 font-semibold text-foreground shadow-none focus-visible:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous</SelectItem>
          <SelectItem value="HABITATION">Habitation</SelectItem>
          <SelectItem value="COMMERCIAL">Commercial</SelectItem>
        </SelectContent>
      </Select>
    </label>
  );
}
