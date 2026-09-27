"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";

/* =========================================================================
   Navigation de l'espace client.

   Choix assumé : sur mobile, les trois pages passent dans une barre basse
   fixe, à portée du pouce, au lieu du rail de pastilles qui vivait sous la
   barre du site — on ne remonte plus en haut de l'écran pour changer de page,
   et le haut de page est rendu au contenu. Sur grand écran, un segmenté
   centré sous la barre du site : trois onglets se lisent d'un bloc, et
   l'endroit où l'on se trouve est visible sans compter les bordures.

   Les libellés courts (« Dossiers » plutôt que « Mes dossiers ») évitent la
   troncature en paysage sur un téléphone.
   ========================================================================= */

export type OwnerTabKey = "dashboard" | "dossiers" | "informations";

const TABS: Array<{ key: OwnerTabKey; label: string; short: string; href: string; icon: React.ElementType }> = [
  {
    key: "dashboard",
    label: "Tableau de bord",
    short: "Accueil",
    href: "/client/proprietaire",
    icon: LayoutDashboard,
  },
  {
    key: "dossiers",
    label: "Mes dossiers",
    short: "Dossiers",
    href: "/client/proprietaire/demandes",
    icon: ClipboardList,
  },
  {
    key: "informations",
    label: "Mes informations",
    short: "Profil",
    href: "/client/proprietaire/informations",
    icon: UserRound,
  },
];

function useActiveTab(explicit?: OwnerTabKey): OwnerTabKey {
  const pathname = usePathname();
  if (explicit) return explicit;
  if (pathname?.startsWith("/client/proprietaire/demandes")) return "dossiers";
  if (pathname?.startsWith("/client/proprietaire/informations")) return "informations";
  return "dashboard";
}

/** Le segmenté du haut (à partir de 640 px). */
export function OwnerTabsBar({
  active: explicitActive,
  onSelect,
  className,
}: {
  active?: OwnerTabKey;
  onSelect?: (key: OwnerTabKey) => void;
  className?: string;
}) {
  const active = useActiveTab(explicitActive);

  return (
    <div className={cn("hidden justify-center px-4 pt-4 sm:flex", className)}>
      <div className="inline-flex gap-1 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_44px_-28px_rgba(30,58,138,0.35)] backdrop-blur-xl">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const content = (
            <>
              <tab.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
              {tab.label}
            </>
          );
          const classes = cn(
            "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors",
            isActive
              ? "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_8px_20px_-10px_rgba(53,99,233,0.8)]"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
          );
          return onSelect ? (
            <button key={tab.key} type="button" onClick={() => onSelect(tab.key)} className={classes}>
              {content}
            </button>
          ) : (
            <Link key={tab.key} href={tab.href} className={classes}>
              {content}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** La barre basse fixe (en dessous de 640 px). */
export function OwnerTabsDock({
  active: explicitActive,
  onSelect,
}: {
  active?: OwnerTabKey;
  onSelect?: (key: OwnerTabKey) => void;
}) {
  const active = useActiveTab(explicitActive);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md">
        {TABS.map((tab) => {
          const isActive = tab.key === active;
          const content = (
            <>
              <span
                className={cn(
                  "flex h-8 w-14 items-center justify-center rounded-xl transition-colors",
                  isActive ? "bg-[#4373f5]/10 text-[#3563e9]" : "text-slate-400",
                )}
              >
                <tab.icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className={cn(
                  "text-[10.5px] font-semibold",
                  isActive ? "text-[#3563e9]" : "text-slate-400",
                )}
              >
                {tab.short}
              </span>
            </>
          );
          const classes = "flex flex-1 flex-col items-center gap-0.5 py-2";
          return onSelect ? (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              className={classes}
              aria-current={isActive ? "page" : undefined}
            >
              {content}
            </button>
          ) : (
            <Link
              key={tab.key}
              href={tab.href}
              className={classes}
              aria-current={isActive ? "page" : undefined}
            >
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
