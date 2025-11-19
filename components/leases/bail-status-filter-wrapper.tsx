"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { BailStatusMultiSelect } from "./bail-status-multi-select";
import { BailStatus } from "@prisma/client";

export function BailStatusFilterWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Lire les statuts depuis l'URL
  const statusParam = searchParams.get("status");
  const currentStatuses: BailStatus[] = statusParam
    ? (statusParam.split(",").filter(Boolean) as BailStatus[])
    : [];

  const handleStatusChange = (statuses: BailStatus[]) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      
      if (statuses.length > 0) {
        params.set("status", statuses.join(","));
      } else {
        params.delete("status");
      }
      
      // Réinitialiser la page à 1 lors du changement de filtre
      params.set("page", "1");
      
      router.replace(`?${params.toString()}`);
    });
  };

  return (
    <BailStatusMultiSelect
      value={currentStatuses}
      onValueChange={handleStatusChange}
      placeholder="Filtrer par statut de bail"
    />
  );
}

