"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DOSSIER_FILTER_TABS, DOSSIER_TAB_STATUSES, getBailStatusColor, type DossierFilterTab } from "@/lib/utils/bails-labels";
import type { NotaireDossierView } from "@/lib/notaire/dossier-view";
import type { StaffComplementRequest } from "@/lib/actions/complement-requests";
import { NotaireDossierPanel } from "./notaire-dossier-panel";
import { cn } from "@/lib/utils";

export interface DossierListItem {
  id: string;
  owner: string;
  tenant: string | null;
  address: string;
  status: string;
  bailType: string | null;
  assignedAt: string | Date;
}

const STATUS_DOT: Record<string, string> = {
  READY_FOR_NOTARY: "bg-orange-500",
  CLIENT_CONTACTED: "bg-blue-500",
  SIGNED: "bg-emerald-500",
  DESISTE: "bg-red-500",
  CLASSE_SANS_SUITE: "bg-slate-400",
  TERMINATED: "bg-slate-400",
};

const tabOf = (status: string): DossierFilterTab =>
  (Object.keys(DOSSIER_TAB_STATUSES) as DossierFilterTab[]).find((tab) => DOSSIER_TAB_STATUSES[tab].includes(status)) ?? "en_cours";

/**
 * Espace « Dossiers » du notaire : la liste à gauche, le dossier ouvert à droite
 * (sur téléphone : la liste, puis le dossier en plein écran avec un retour).
 */
export function NotaireDossiersShell({
  list,
  selectedId,
  explicit,
  view,
  requests,
}: {
  list: DossierListItem[];
  selectedId: string | null;
  /** Dossier choisi dans l'adresse (sur téléphone, on l'affiche au lieu de la liste). */
  explicit: boolean;
  view: NotaireDossierView | null;
  requests: StaffComplementRequest[];
}) {
  const router = useRouter();
  const selected = list.find((d) => d.id === selectedId);
  const [tab, setTab] = React.useState<DossierFilterTab>(selected ? tabOf(selected.status) : "en_cours");
  const [search, setSearch] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const counts = Object.fromEntries(DOSSIER_FILTER_TABS.map((t) => [t.value, list.filter((d) => tabOf(d.status) === t.value).length])) as Record<DossierFilterTab, number>;
  const query = search.trim().toLowerCase();
  const shown = list.filter(
    (d) => tabOf(d.status) === tab && (!query || [d.owner, d.tenant, d.address].some((text) => text?.toLowerCase().includes(query))),
  );

  if (list.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FileText className="size-5" />
          </span>
          <p className="mt-4 text-[15px] font-semibold">Aucun dossier pour le moment</p>
          <p className="mt-1 text-[13.5px] text-muted-foreground">Les dossiers qui vous sont confiés apparaîtront ici.</p>
        </div>
      </div>
    );
  }

  const open = (id: string) => startTransition(() => router.push(`/notaire/dossiers?dossierId=${id}`, { scroll: false }));

  return (
    <div className="flex h-full min-h-0">
      {/* Liste */}
      <aside className={cn("flex min-h-0 w-full flex-col border-r bg-background lg:w-[320px] lg:shrink-0", explicit ? "hidden lg:flex" : "flex")}>
        <div className="flex flex-col gap-3 px-4 pb-3 pt-5">
          <h1 className="text-[17px] font-semibold tracking-tight">Dossiers</h1>
          <div role="tablist" aria-label="Statut des dossiers" className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
            {DOSSIER_FILTER_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  "flex h-8 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors",
                  tab === t.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className="text-[11px] tabular-nums opacity-60">{counts[t.value]}</span>
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom ou adresse"
              aria-label="Rechercher un dossier"
              className="h-9 pl-9"
            />
          </div>
        </div>
        <nav aria-label="Dossiers" className="min-h-0 flex-1 overflow-y-auto border-t px-2 py-2">
          {shown.length === 0 ? (
            <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">Aucun dossier</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {shown.map((d) => {
                const active = d.id === selectedId;
                const status = getBailStatusColor(d.status);
                return (
                  <li key={d.id}>
                    <Link
                      href={`/notaire/dossiers?dossierId=${d.id}`}
                      scroll={false}
                      onClick={(event) => {
                        event.preventDefault();
                        open(d.id);
                      }}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg px-3 py-2.5 transition-colors",
                        active ? "bg-primary/[0.07] ring-1 ring-primary/15" : "hover:bg-muted/70",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", STATUS_DOT[d.status] ?? "bg-slate-400")} />
                        <span className={cn("min-w-0 flex-1 truncate text-[14px] font-semibold", active && "text-primary")}>
                          {d.owner}
                          {d.tenant && <span className="font-normal text-muted-foreground"> → {d.tenant}</span>}
                        </span>
                      </span>
                      <span className="truncate pl-4 text-[12.5px] text-muted-foreground">{d.address || "Adresse non renseignée"}</span>
                      <span className="pl-4 text-[12px] text-muted-foreground/80">{status.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      {/* Dossier */}
      <section className={cn("min-h-0 flex-1 overflow-y-auto bg-muted/25", explicit ? "block" : "hidden lg:block", pending && "opacity-70 transition-opacity")}>
        {explicit && (
          <div className="sticky top-0 z-10 border-b bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
            <Link href="/notaire/dossiers" className="inline-flex h-10 items-center gap-2 rounded-md px-2 text-[14px] font-medium text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" />
              Dossiers
            </Link>
          </div>
        )}
        {view ? (
          <NotaireDossierPanel key={view.assignmentId} view={view} requests={requests} />
        ) : (
          <p className="p-10 text-center text-[13.5px] text-muted-foreground">Ce dossier n&apos;est pas accessible.</p>
        )}
      </section>
    </div>
  );
}
