"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText, LayoutDashboard, Menu, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DOSSIER_FILTER_TABS,
  DOSSIER_TAB_STATUSES,
  getBailStatusColor,
  type DossierFilterTab,
} from "@/lib/utils/bails-labels";
import type { DossierListItem } from "@/lib/notaire/dossier-list";
import { NotaireAccount } from "./notaire-account";
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<string, string> = {
  READY_FOR_NOTARY: "bg-orange-500",
  CLIENT_CONTACTED: "bg-blue-500",
  SIGNED: "bg-emerald-500",
  DESISTE: "bg-red-500",
  CLASSE_SANS_SUITE: "bg-slate-400",
  TERMINATED: "bg-slate-400",
};

/**
 * Menus de l'espace notaire, dans l'ordre. Un nouveau menu (abonnement, paramètres…) s'ajoute ici,
 * avec sa page sous app/notaire/(protected)/.
 */
const NOTAIRE_MENU: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { href: "/notaire", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/notaire/dossiers", label: "Dossiers", icon: FileText },
];

const tabOf = (status: string): DossierFilterTab =>
  (Object.keys(DOSSIER_TAB_STATUSES) as DossierFilterTab[]).find((tab) =>
    DOSSIER_TAB_STATUSES[tab].includes(status),
  ) ?? "en_cours";

interface SidebarProps {
  list: DossierListItem[];
  /** Dossier ouvert quand l'adresse n'en précise pas. */
  defaultId: string | null;
  user: { name: string | null; email: string };
}

/**
 * Le seul menu de l'espace notaire : tableau de bord et dossiers, la liste des dossiers juste en
 * dessous (onglets, recherche), et le compte en bas. Sur téléphone, il s'ouvre par le bouton menu.
 */
export function NotaireSidebar(props: SidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();
  const onDossiers = pathname?.startsWith("/notaire/dossiers");

  return (
    <>
      <aside className="hidden w-[300px] shrink-0 flex-col border-r bg-background lg:flex">
        <SidebarContent {...props} />
      </aside>

      {/* Téléphone : barre avec le bouton menu */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Ouvrir le menu"
          className="flex size-10 items-center justify-center rounded-md text-foreground hover:bg-muted"
        >
          <Menu className="size-5" />
        </button>
        <span className="text-[15px] font-semibold">
          {onDossiers ? "Dossier" : "Tableau de bord"}
        </span>
      </div>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="flex w-[300px] flex-col gap-0 p-0 sm:max-w-[300px]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
            <SheetDescription>Tableau de bord et dossiers</SheetDescription>
          </SheetHeader>
          <SidebarContent {...props} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

function SidebarContent({
  list,
  defaultId,
  user,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onDossiers = !!pathname?.startsWith("/notaire/dossiers");
  const selectedId = onDossiers
    ? searchParams.get("dossierId") || defaultId
    : null;
  const selected = list.find((d) => d.id === selectedId);
  const [tab, setTab] = React.useState<DossierFilterTab>(
    selected ? tabOf(selected.status) : "en_cours",
  );
  const [search, setSearch] = React.useState("");

  const counts = Object.fromEntries(
    DOSSIER_FILTER_TABS.map((t) => [
      t.value,
      list.filter((d) => tabOf(d.status) === t.value).length,
    ]),
  ) as Record<DossierFilterTab, number>;
  const query = search.trim().toLowerCase();
  const shown = list.filter(
    (d) =>
      tabOf(d.status) === tab &&
      (!query ||
        [d.owner, d.tenant, d.address].some((text) =>
          text?.toLowerCase().includes(query),
        )),
  );

  const nav = NOTAIRE_MENU.map((item) => ({
    ...item,
    active:
      item.href === "/notaire"
        ? pathname === "/notaire"
        : !!pathname?.startsWith(item.href),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-2 pt-4">
        <p className="text-[15px] font-bold tracking-tight">BailNotarie</p>
        <p className="text-[12px] text-muted-foreground">Espace notaire</p>
      </div>

      <nav aria-label="Menu" className="flex flex-col gap-0.5 px-2 pb-2">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2.5 rounded-md px-3 text-[14px] font-medium transition-colors",
              item.active
                ? "bg-primary/[0.08] text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
            {item.href === "/notaire/dossiers" && (
              <span className="ml-auto text-[12px] tabular-nums opacity-70">
                {counts.en_cours}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Section « Dossiers » : la liste des dossiers, sous le menu (seulement dans cette section). */}
      {onDossiers ? (
        <>
          <div className="flex flex-col gap-2.5 border-t px-3 pb-2.5 pt-3">
            <div
              role="tablist"
              aria-label="Statut des dossiers"
              className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
            >
              {DOSSIER_FILTER_TABS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1 rounded-md text-[12.5px] font-medium transition-colors",
                    tab === t.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                  <span className="text-[11px] tabular-nums opacity-60">
                    {counts[t.value]}
                  </span>
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

          <div
            aria-label="Dossiers"
            className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
          >
            {list.length === 0 ? (
              <p className="px-3 py-8 text-center text-[12.5px] text-muted-foreground">
                Les dossiers qui vous sont confiés apparaîtront ici.
              </p>
            ) : shown.length === 0 ? (
              <p className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                Aucun dossier
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {shown.map((d) => {
                  const active = d.id === selectedId;
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/notaire/dossiers?dossierId=${d.id}`}
                        scroll={false}
                        onClick={(event) => {
                          event.preventDefault();
                          onNavigate?.();
                          router.push(`/notaire/dossiers?dossierId=${d.id}`, {
                            scroll: false,
                          });
                        }}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex flex-col gap-0.5 rounded-lg px-3 py-2 transition-colors",
                          active
                            ? "bg-primary/[0.07] ring-1 ring-primary/15"
                            : "hover:bg-muted/70",
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              STATUS_DOT[d.status] ?? "bg-slate-400",
                            )}
                          />
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[13.5px] font-semibold",
                              active && "text-primary",
                            )}
                          >
                            {d.owner}
                            {d.tenant && (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                → {d.tenant}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="truncate pl-4 text-[12px] text-muted-foreground">
                          {d.address || "Adresse non renseignée"}
                        </span>
                        <span className="pl-4 text-[11.5px] text-muted-foreground/80">
                          {getBailStatusColor(d.status).label}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1" />
      )}

      <NotaireAccount userName={user.name} userEmail={user.email} />
    </div>
  );
}
