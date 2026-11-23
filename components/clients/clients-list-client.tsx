"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClientActions } from "@/components/clients/client-actions";
import { COMPLETION_CHIP } from "@/components/shared/completion-chip";
import type { ClientListRow } from "@/lib/actions/admin-clients";
import { cn } from "@/lib/utils";

const ROLE_CHIPS: Record<string, { label: string; className: string }> = {
  PROPRIETAIRE: { label: "Propriétaire", className: "bg-indigo-100 text-indigo-800" },
  LOCATAIRE: { label: "Locataire", className: "bg-teal-100 text-teal-800" },
  LEAD: { label: "Prospect", className: "bg-slate-100 text-slate-700" },
};

const ROLE_TABS = [
  { value: "ALL", label: "Tous" },
  { value: "PROPRIETAIRE", label: "Propriétaires" },
  { value: "LOCATAIRE", label: "Locataires" },
  { value: "LEAD", label: "Prospects" },
] as const;

const PAGE_SIZE = 25;

function activityLabel(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} j`;
}

/** État affiché : « Prospect » pour un prospect, sinon le statut de complétion (lecture seule). */
function stateChip(row: ClientListRow) {
  if (row.profilType === "LEAD") return { label: "Prospect", className: "bg-slate-100 text-slate-700" };
  if (row.missingItems.length > 0 && row.completionStatus !== "NOT_STARTED") return COMPLETION_CHIP.PARTIAL;
  return COMPLETION_CHIP[row.completionStatus] || COMPLETION_CHIP.NOT_STARTED;
}

/** Bouton de la ligne : ce qu'il y a à faire avec ce client. */
function rowAction(row: ClientListRow): { label: string; href: string; primary: boolean } {
  const fiche = `/interface/clients/${row.id}`;
  if (row.profilType === "LEAD") return { label: "Convertir", href: fiche, primary: false };
  if (row.missingItems.length > 0) return { label: "Relancer", href: fiche, primary: true };
  const active = row.dossiers.find((d) => d.active);
  if (row.completionStatus === "PENDING_CHECK") return { label: "Vérifier", href: active ? `/interface/baux/${active.id}` : fiche, primary: true };
  return { label: "Ouvrir", href: fiche, primary: false };
}

/** Regroupe les clients liés par un bail (propriétaire puis locataire), comme avant. */
function groupLinked(rows: ClientListRow[]) {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const done = new Set<string>();
  const result: ClientListRow[] = [];
  for (const row of rows) {
    if (done.has(row.id)) continue;
    result.push(row);
    done.add(row.id);
    for (const linkedId of row.linkedIds) {
      const linked = byId.get(linkedId);
      if (linked && !done.has(linkedId)) {
        result.push(linked);
        done.add(linkedId);
      }
    }
  }
  return result;
}

export function ClientsListClient({ rows }: { rows: ClientListRow[] }) {
  const [role, setRole] = React.useState<string>("ALL");
  const [blockingOnly, setBlockingOnly] = React.useState(false);
  const [state, setState] = React.useState<string>("ALL");
  const [query, setQuery] = React.useState("");
  const [limit, setLimit] = React.useState(PAGE_SIZE);
  const deferredQuery = query.trim().toLowerCase();

  const matchesFilters = React.useCallback(
    (row: ClientListRow, ignoreRole = false) =>
      (ignoreRole || role === "ALL" || row.profilType === role) &&
      (!blockingOnly || row.blocking) &&
      (state === "ALL" || stateChip(row).label === (COMPLETION_CHIP[state]?.label || state)) &&
      (!deferredQuery || row.search.includes(deferredQuery)),
    [role, blockingOnly, state, deferredQuery],
  );

  const filtered = React.useMemo(() => groupLinked(rows.filter((r) => matchesFilters(r))), [rows, matchesFilters]);
  const visible = filtered.slice(0, limit);
  React.useEffect(() => setLimit(PAGE_SIZE), [role, blockingOnly, state, deferredQuery]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="tablist" aria-label="Rôle" className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ROLE_TABS.map((tab) => {
            const count = rows.filter((r) => (tab.value === "ALL" || r.profilType === tab.value) && matchesFilters(r, true)).length;
            const active = role === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(tab.value)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors",
                  active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="text-xs font-medium text-muted-foreground">{count}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-pressed={blockingOnly}
          onClick={() => setBlockingOnly((v) => !v)}
          className="inline-flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-sm font-medium"
        >
          <span className={cn("relative inline-block h-[22px] w-9 rounded-full transition-colors", blockingOnly ? "bg-primary" : "bg-slate-300")}>
            <span className={cn("absolute top-[3px] size-4 rounded-full bg-white transition-all", blockingOnly ? "left-[17px]" : "left-[3px]")} />
          </span>
          Bloquants seulement
        </button>
        <label className="flex h-10 items-center gap-2 rounded-lg border bg-background pl-3 text-sm text-muted-foreground">
          État
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="h-9 min-w-32 border-0 font-semibold text-foreground shadow-none focus-visible:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous</SelectItem>
              {Object.entries(COMPLETION_CHIP).map(([value, chip]) => (
                <SelectItem key={value} value={value}>
                  {chip.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      <label className="flex min-h-11 items-center gap-2.5 rounded-lg border bg-background px-3.5 focus-within:ring-2 focus-within:ring-ring">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Rechercher</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, raison sociale, e-mail, téléphone, adresse…"
          className="min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
        />
      </label>

      <p className="text-[13.5px] text-muted-foreground">
        {filtered.length} client{filtered.length > 1 ? "s" : ""}
        {blockingOnly ? " qui bloquent un dossier en cours" : ""} · les propriétaires et locataires d&apos;un même bail sont regroupés
      </p>

      {/* Ordinateur : tableau */}
      <section className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/50 text-left text-xs font-semibold text-muted-foreground">
              <th className="px-3 py-3">Client</th>
              <th className="px-3 py-3">Rôle</th>
              <th className="px-3 py-3">Contact</th>
              <th className="px-3 py-3">Dossiers</th>
              <th className="px-3 py-3">Pièces et informations</th>
              <th className="px-3 py-3">Activité</th>
              <th className="px-3 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-10 text-center text-muted-foreground">
                  Aucun client ne correspond.
                </td>
              </tr>
            ) : (
              visible.map((row) => {
                const roleChip = ROLE_CHIPS[row.profilType] || ROLE_CHIPS.LEAD;
                const chip = stateChip(row);
                const action = rowAction(row);
                return (
                  <tr key={row.id} className={cn("align-top transition-colors hover:bg-muted/30", row.blocking && "bg-red-50/40")}>
                    <td className="min-w-[140px] px-3 py-3">
                      <Link href={`/interface/clients/${row.id}`} className="font-semibold hover:underline">
                        {row.name}
                      </Link>
                      <span className="block text-[13px] text-muted-foreground">{row.kind}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold", roleChip.className)}>
                        {roleChip.label}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-3 py-3 text-[13.5px]">
                      <span className="block truncate">{row.email || "—"}</span>
                      <span className="block text-muted-foreground">{row.phone || "—"}</span>
                    </td>
                    <td className="min-w-[150px] max-w-[210px] px-3 py-3 text-[13.5px]">
                      {row.dossiers.length === 0 ? (
                        <span className="text-muted-foreground">Aucun dossier</span>
                      ) : (
                        <>
                          <Link href={`/interface/baux/${row.dossiers[0].id}`} className="hover:underline">
                            {row.dossiers[0].address}
                          </Link>
                          {row.dossiers.length > 1 && (
                            <span className="block text-xs text-muted-foreground">+ {row.dossiers.length - 1} autre{row.dossiers.length > 2 ? "s" : ""}</span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="min-w-[170px] max-w-[240px] px-3 py-3">
                      <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold", chip.className)}>{chip.label}</span>
                      <span className={cn("mt-1.5 block text-[12.5px]", row.missingItems.length > 0 ? "text-red-800" : "text-muted-foreground")}>
                        {row.stateDetail}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-[13.5px] text-muted-foreground">{activityLabel(row.activityAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="sm" variant={action.primary ? "default" : "outline"} className="h-9 px-3">
                          <Link href={action.href}>{action.label}</Link>
                        </Button>
                        <ClientActions row={row} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {/* Téléphone : cartes */}
      <ul className="flex flex-col gap-3 md:hidden">
        {visible.length === 0 && (
          <li className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-muted-foreground">Aucun client ne correspond.</li>
        )}
        {visible.map((row) => {
          const roleChip = ROLE_CHIPS[row.profilType] || ROLE_CHIPS.LEAD;
          const chip = stateChip(row);
          const action = rowAction(row);
          return (
            <li key={row.id} className={cn("flex flex-col gap-2 rounded-xl border bg-card p-4", row.blocking && "border-red-200")}>
              <div className="flex items-center justify-between gap-2">
                <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold", roleChip.className)}>{roleChip.label}</span>
                <span className="flex items-center gap-1 text-[12.5px] text-muted-foreground">
                  {activityLabel(row.activityAt)}
                  <ClientActions row={row} />
                </span>
              </div>
              <Link href={`/interface/clients/${row.id}`} className="text-[15.5px] font-semibold leading-snug hover:underline">
                {row.name}
              </Link>
              <span className="text-[13.5px] text-muted-foreground">
                {row.kind} · {row.dossiers[0]?.address || "Aucun dossier"}
              </span>
              <span className="text-[13.5px]">
                <span className={cn("mr-1.5 inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold", chip.className)}>{chip.label}</span>
                <span className={row.missingItems.length > 0 ? "text-red-800" : "text-muted-foreground"}>{row.stateDetail}</span>
              </span>
              <Button asChild variant={action.primary ? "default" : "outline"} className="h-11 w-full">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            </li>
          );
        })}
      </ul>

      {filtered.length > visible.length && (
        <Button variant="outline" className="mx-auto h-11" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Afficher {Math.min(PAGE_SIZE, filtered.length - visible.length)} de plus
        </Button>
      )}
    </div>
  );
}
