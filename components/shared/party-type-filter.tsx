"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PartyTypeFilter({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete("type");
    } else {
      params.set("type", value);
    }
    params.set("page", "1");
    router.push(`?${params.toString()}`);
  };

  return (
    <Select defaultValue={defaultValue} onValueChange={handleChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filtrer par type" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les types</SelectItem>
        <SelectItem value="NATURAL">Particulier</SelectItem>
        <SelectItem value="LEGAL">Entreprise</SelectItem>
      </SelectContent>
    </Select>
  );
}


