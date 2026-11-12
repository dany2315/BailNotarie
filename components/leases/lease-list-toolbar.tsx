"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, Check, ChevronDown, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string; count?: number };

/**
 * Filtres de la liste des dossiers, sous la recherche et les étapes : trois pastilles (frais,
 * type de bail, notaire) qui s'ouvrent en menu, puis le nombre de dossiers et le tri.
 * Une pastille active affiche son choix et se vide d'un clic sur la croix.
 */
export function LeaseListToolbar({
  total,
  paymentCounts,
  notaires,
}: {
  total: number;
  paymentCounts: { unpaid: number; paid: number };
  notaires: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (changes: Record<string, string | null>) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    });
  };

  const payment = searchParams.get("payment");
  const family = searchParams.get("type");
  const notaire = searchParams.get("notaire");
  const sort = searchParams.get("sort") === "recent" ? "recent" : "attente";
  const anyActive = !!(payment || family || notaire);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", isPending && "opacity-70")}>
      <FilterChip
        label="Frais"
        value={payment}
        disabled={isPending}
        onChange={(value) => update({ payment: value })}
        options={[
          { value: "unpaid", label: "Non payés", count: paymentCounts.unpaid },
          { value: "paid", label: "Payés", count: paymentCounts.paid },
        ]}
      />
      <FilterChip
        label="Type de bail"
        value={family}
        disabled={isPending}
        onChange={(value) => update({ type: value })}
        options={[
          { value: "HABITATION", label: "Habitation" },
          { value: "COMMERCIAL", label: "Commercial" },
        ]}
      />
      <FilterChip
        label="Notaire"
        value={notaire}
        disabled={isPending}
        onChange={(value) => update({ notaire: value })}
        options={[{ value: "none", label: "Non assigné" }, ...notaires.map((n) => ({ value: n.id, label: n.name }))]}
      />
      {anyActive && (
        <button
          type="button"
          disabled={isPending}
          onClick={() => update({ payment: null, type: null, notaire: null })}
          className="h-8 rounded-full px-2 text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Effacer
        </button>
      )}

      <div className="flex w-full items-center justify-between gap-2 text-[13px] text-muted-foreground sm:ml-auto sm:w-auto sm:justify-end">
        <span>
          {total} dossier{total > 1 ? "s" : ""}
        </span>
        <span aria-hidden className="hidden sm:inline">
          ·
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowDownUp className="size-3.5 text-muted-foreground" />
            {sort === "recent" ? "Plus récents" : "Attente la plus longue"}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-52">
            {[
              { value: "attente", label: "Attente la plus longue" },
              { value: "recent", label: "Plus récents" },
            ].map((option) => (
              <DropdownMenuItem key={option.value} onSelect={() => update({ sort: option.value === "attente" ? null : option.value })} className="gap-2">
                <Check className={cn("size-4", sort === option.value ? "opacity-100" : "opacity-0")} />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/** Pastille de filtre : « Frais ⌄ » au repos, « Frais : non payés × » une fois choisi. */
function FilterChip({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string | null;
  options: Option[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
}) {
  const selected = options.find((option) => option.value === value);

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center rounded-full border text-[13px] transition-colors",
        selected ? "border-primary/30 bg-primary/[0.06] text-primary" : "border-dashed border-muted-foreground/35 text-muted-foreground hover:border-muted-foreground/60 hover:text-foreground",
      )}
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={disabled}
          className={cn("inline-flex h-full items-center gap-1 rounded-full pl-3 font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "pr-1.5" : "pr-2.5")}
        >
          {selected ? (
            <>
              <span className="text-primary/70">{label} :</span>
              <span className="max-w-40 truncate font-semibold">{selected.label}</span>
            </>
          ) : (
            <>
              {label}
              <ChevronDown className="size-3.5" />
            </>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 min-w-48 overflow-y-auto">
          {options.map((option) => (
            <DropdownMenuItem key={option.value} onSelect={() => onChange(option.value === value ? null : option.value)} className="gap-2">
              <Check className={cn("size-4", option.value === value ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{option.label}</span>
              {option.count !== undefined && <span className="text-xs tabular-nums text-muted-foreground">{option.count}</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected && (
        <button
          type="button"
          aria-label={`Retirer le filtre ${label}`}
          disabled={disabled}
          onClick={() => onChange(null)}
          className="mr-1 flex size-6 items-center justify-center rounded-full hover:bg-primary/10"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
