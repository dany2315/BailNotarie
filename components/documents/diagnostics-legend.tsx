"use client";

import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/* Aide-mémoire des durées de validité des diagnostics exigés pour une
   location, pour la relecture d'un bail côté administration. Les règles
   propres à la vente (durées réduites, termites, assainissement) sont
   volontairement absentes. Discret par construction : un lien d'une ligne à
   côté du titre « Diagnostics », la fiche ne s'ouvre qu'au clic. */

type Row = { name: string; rule: string; note?: string };
type Group = { title: string; dot: string; rows: Row[] };

const GROUPS: Group[] = [
  {
    title: "Illimités",
    dot: "bg-emerald-500",
    rows: [
      { name: "Amiante (DAPP)", rule: "Illimité si absence", note: "Présence : contrôle sous 3 ans" },
      { name: "Plomb (CREP)", rule: "Illimité si absence", note: "Seuil dépassé : 6 ans" },
      { name: "Surface habitable", rule: "Illimité", note: "Sauf travaux modifiant la surface" },
    ],
  },
  {
    title: "Durée limitée",
    dot: "bg-amber-500",
    rows: [
      {
        name: "DPE",
        rule: "10 ans",
        note: "Réalisés avant le 01/07/2021 : plus valides. G interdit depuis 2025, F en 2028 — loyer gelé pour F et G",
      },
      { name: "Électricité", rule: "6 ans" },
      { name: "Gaz", rule: "6 ans" },
    ],
  },
  {
    title: "Moins de 6 mois",
    dot: "bg-rose-500",
    rows: [
      { name: "Risques et pollutions (ERP)", rule: "6 mois" },
      { name: "Bruit (ENSA)", rule: "À jour", note: "Pas de durée légale, usage ≈ 6 mois" },
    ],
  },
];

export function DiagnosticsLegend({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label="Rappel des durées de validité des diagnostics"
        >
          <Info className="size-3.5" />
          Validités
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} collisionPadding={16} className="w-[min(22rem,calc(100vw-2rem))] p-3">
        <p className="mb-2.5 text-xs font-semibold text-foreground">Validité des diagnostics · location</p>
        <div className="space-y-3">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span aria-hidden className={cn("size-1.5 rounded-full", group.dot)} />
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.rows.map((row) => (
                  <li key={row.name} className="text-xs leading-snug">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-foreground">{row.name}</span>
                      <span className="shrink-0 font-medium tabular-nums text-foreground">{row.rule}</span>
                    </div>
                    {row.note && <p className="text-[11px] text-muted-foreground">{row.note}</p>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-muted-foreground">
          Requis selon le bien : plomb si construit avant 1949, amiante si permis avant juillet 1997,
          gaz et électricité si l&apos;installation a plus de 15 ans.
        </p>
      </PopoverContent>
    </Popover>
  );
}
