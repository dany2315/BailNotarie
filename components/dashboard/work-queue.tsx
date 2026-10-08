"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { STALE_AFTER_DAYS, STATUS_LABELS, getStage, type BailStatusValue } from "@/lib/utils/bail-stage";
import type { QueueItem } from "@/lib/actions/admin-dashboard";

type TabKey = "nous" | "client" | "notaire";

const TABS: Array<{ key: TabKey; label: string; short: string; hint: string }> = [
  {
    key: "nous",
    label: "À faire par nous",
    short: "À faire",
    hint: "Dossiers où BailNotarie doit agir. Les plus anciens en premier ; point rouge : plus de 7 jours sans activité.",
  },
  {
    key: "client",
    label: "En attente du client",
    short: "Client",
    hint: "Rien à vérifier : le propriétaire ou le locataire doit agir. Une relance suffit.",
  },
  {
    key: "notaire",
    label: "Chez le notaire",
    short: "Notaire",
    hint: "Suivi uniquement : le notaire a la main.",
  },
];

function belongsTo(item: QueueItem, tab: TabKey) {
  if (tab === "nous") return item.actor === "nous";
  if (tab === "notaire") return item.actor === "notaire";
  return item.actor === "proprietaire" || item.actor === "locataire" || item.actor === "client";
}

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Meublé 9 mois",
};

export function WorkQueue({ items }: { items: QueueItem[] }) {
  const [tab, setTab] = React.useState<TabKey>("nous");
  const current = TABS.find((t) => t.key === tab)!;
  const visible = items.filter((item) => belongsTo(item, tab));

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border bg-card">
      <div role="tablist" aria-label="File de travail" className="flex gap-1 border-b px-2">
        {TABS.map((t) => {
          const count = items.filter((item) => belongsTo(item, t.key)).length;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-2 text-sm font-semibold transition-colors sm:flex-none sm:px-3",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground">{count}</span>
            </button>
          );
        })}
      </div>
      <p className="border-b bg-muted/40 px-4 py-2.5 text-sm text-muted-foreground">{current.hint}</p>

      {visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Rien à traiter ici pour le moment.</p>
      ) : (
        <ul className="divide-y">
          {visible.map((item) => {
            const stage = getStage(item.status);
            const stale = item.days > STALE_AFTER_DAYS;
            return (
              <li
                key={item.id}
                className="grid grid-cols-[10px_minmax(0,1fr)] items-start gap-x-3 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:grid-cols-[10px_minmax(0,1fr)_auto] sm:items-center"
              >
                <span
                  aria-hidden
                  className={cn("mt-2 size-2.5 rounded-full sm:mt-0", stale ? "bg-red-600" : item.days >= 3 ? "bg-amber-500" : "bg-green-600")}
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link href={`/interface/baux/${item.id}`} className="font-semibold hover:underline">
                      {item.address}
                    </Link>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", stage.className)}>{stage.label}</span>
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-xs font-semibold",
                        item.paidAt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
                      )}
                    >
                      {item.paidAt ? "Payé" : "Non payé"}
                    </span>
                  </div>
                  <span className="text-sm text-foreground/80">
                    {item.ownerName || "Propriétaire non renseigné"}
                    <span className="text-muted-foreground"> → </span>
                    {item.tenantName || <span className="text-muted-foreground">locataire à ajouter</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {/* L'action principale figure déjà sur le bouton : on ne la répète pas. */}
                    {!item.primary && <strong className="font-semibold text-foreground">{item.action} · </strong>}
                    {BAIL_TYPE_LABELS[item.bailType] || item.bailType} · {STATUS_LABELS[item.status as BailStatusValue] || item.status}
                    {item.detail ? ` · ${item.detail}` : ""}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                  <span
                    className={cn(
                      "whitespace-nowrap text-sm tabular-nums sm:w-24 sm:text-right",
                      stale ? "font-semibold text-red-700" : "text-muted-foreground",
                    )}
                  >
                    {item.days === 0 ? "aujourd'hui" : `depuis ${item.days} j`}
                  </span>
                  <Button asChild size="sm" variant={item.primary ? "default" : "outline"} className="sm:min-w-36">
                    <Link href={`/interface/baux/${item.id}`}>{item.primary ? item.action : "Ouvrir le dossier"}</Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
