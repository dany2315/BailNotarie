"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, ClipboardList, FileText, LayoutDashboard, UserRound } from "lucide-react";

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

export type SpaceTab = {
  key: OwnerTabKey;
  label: string;
  short: string;
  href: string;
  icon: React.ElementType;
};

/** Les trois pages du propriétaire. */
export const OWNER_TABS: SpaceTab[] = [
  { key: "dashboard", label: "Tableau de bord", short: "Accueil", href: "/client/proprietaire", icon: LayoutDashboard },
  { key: "dossiers", label: "Mes dossiers", short: "Dossiers", href: "/client/proprietaire/demandes", icon: ClipboardList },
  { key: "informations", label: "Mes informations", short: "Profil", href: "/client/proprietaire/informations", icon: UserRound },
];

/** Les trois pages du locataire. Il n'a pas de biens : ses baux tiennent la
    place que les dossiers occupent chez le propriétaire. */
export const TENANT_TABS: SpaceTab[] = [
  { key: "dashboard", label: "Tableau de bord", short: "Accueil", href: "/client/locataire", icon: LayoutDashboard },
  { key: "dossiers", label: "Mes baux", short: "Mes baux", href: "/client/locataire/baux", icon: FileText },
  { key: "informations", label: "Mes informations", short: "Profil", href: "/client/locataire/informations", icon: UserRound },
];

/* -------------------------------------------------------------------------
   Les sous-pages.

   Le détail d'un bien ou d'un bail n'est aucune des trois pages : afficher le
   segmenté au-dessus reviendrait à désigner une page où l'on n'est pas, et
   c'est « Accueil » qui s'allumait. Ces routes rattachent donc leur onglet
   parent, et remplacent le segmenté par leur propre barre — même emplacement,
   même matière, un seul niveau de navigation à l'écran.
   ------------------------------------------------------------------------- */

const DETAIL_ROUTES: Array<{ pattern: RegExp; parent: OwnerTabKey }> = [
  { pattern: /^\/client\/proprietaire\/biens\/(?!new$)[^/]+$/, parent: "dossiers" },
  { pattern: /^\/client\/proprietaire\/baux\/(?!new$)[^/]+$/, parent: "dossiers" },
  { pattern: /^\/client\/locataire\/baux\/(?!new$)[^/]+$/, parent: "dossiers" },
];

/** La sous-page de détail où l'on se trouve, s'il y en a une. */
function detailRoute(pathname: string | null) {
  if (!pathname) return null;
  return DETAIL_ROUTES.find((route) => route.pattern.test(pathname)) ?? null;
}

function useActiveTab(tabs: SpaceTab[], explicit?: OwnerTabKey): OwnerTabKey {
  const pathname = usePathname();
  if (explicit) return explicit;
  // Une sous-page allume l'onglet dont elle dépend, pas « Accueil » par défaut.
  const detail = detailRoute(pathname);
  if (detail) return detail.parent;
  const match = tabs
    .filter((tab) => tab.key !== "dashboard")
    .find((tab) => pathname?.startsWith(tab.href));
  return match?.key ?? "dashboard";
}

/** Le fût commun au segmenté et à la barre des sous-pages. */
function TopBarShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="pointer-events-none sticky top-0 z-30 flex justify-center px-4 pb-3"
      style={{ paddingTop: "calc(var(--lp-nav-h, 76px) + 0.5rem)" }}
    >
      {/* Le contenu qui remonte se dissout dans la couleur de la page avant
          d'atteindre la barre, au lieu de la traverser en pleine lisibilité. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-background via-background/85 to-transparent"
      />
      {children}
    </div>
  );
}

/** Le segmenté du haut (à partir de 640 px). */
export function OwnerTabsBar({
  tabs = OWNER_TABS,
  active: explicitActive,
  onSelect,
  className,
}: {
  tabs?: SpaceTab[];
  active?: OwnerTabKey;
  onSelect?: (key: OwnerTabKey) => void;
  className?: string;
}) {
  const active = useActiveTab(tabs, explicitActive);
  const pathname = usePathname();

  // Sur une sous-page, c'est sa barre à elle qui occupe cet emplacement.
  if (detailRoute(pathname)) return null;

  return (
    <div
      className={cn(
        "pointer-events-none sticky top-0 z-30 hidden justify-center px-4 pb-3 sm:flex",
        className,
      )}
      style={{ paddingTop: "calc(var(--lp-nav-h, 76px) + 0.5rem)" }}
    >
      {/* Le contenu qui remonte se dissout dans la couleur de la page avant
          d'atteindre la barre, au lieu de la traverser en pleine lisibilité. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full bg-gradient-to-b from-background via-background/85 to-transparent"
      />
      <div className="pointer-events-auto relative inline-flex gap-1 rounded-2xl border border-slate-200/80 bg-white/80 p-1.5 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_44px_-28px_rgba(30,58,138,0.35)] backdrop-blur-xl">
        {tabs.map((tab) => {
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
  tabs = OWNER_TABS,
  active: explicitActive,
  onSelect,
}: {
  tabs?: SpaceTab[];
  active?: OwnerTabKey;
  onSelect?: (key: OwnerTabKey) => void;
}) {
  const active = useActiveTab(tabs, explicitActive);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-md gap-1 px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.key === active;
          const content = (
            <>
              <tab.icon
                className={cn(
                  "h-[18px] w-[18px]",
                  isActive ? "text-[#3563e9]" : "text-slate-400",
                )}
              />
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
          // La teinte de l'onglet actif couvre le bouton entier, icône et
          // libellé compris : c'est le bouton qui est actif, pas l'icône.
          const classes = cn(
            "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition-colors",
            isActive ? "bg-[#4373f5]/10" : "active:bg-slate-100",
          );
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

/* -------------------------------------------------------------------------
   La barre d'une sous-page.

   Elle occupe l'emplacement du segmenté, dans la même matière — pastille
   blanche, anneau froid, flou, dégradé de dissolution — mais porte la
   navigation de la sous-page : la flèche de retour et le fil d'Ariane.
   Contrairement au segmenté, elle s'affiche aussi sur mobile : c'est là que
   le besoin de savoir où l'on est se fait le plus sentir.
   ------------------------------------------------------------------------- */

export function SubPageBar({
  backHref,
  trail,
}: {
  /** Où aller quand il n'y a pas d'historique : lien direct, onglet neuf. */
  backHref: string;
  /** Du plus général au plus précis. Le dernier est la page courante. */
  trail: Array<{ label: string; href?: string }>;
}) {
  const router = useRouter();

  // La flèche revient en arrière — elle ne choisit pas une destination. C'est
  // le fil d'Ariane qui nomme les étapes. Sans historique (lien reçu par mail,
  // onglet ouvert directement), elle retombe sur le parent.
  const goBack = React.useCallback(() => {
    // Deux repères, parce qu'aucun n'est fiable seul : Next numérote ses
    // propres entrées dans `history.state.idx` quand il le fournit ; sinon on
    // se rabat sur la longueur de l'historique, qui vaut 1 dans un onglet
    // ouvert directement. Sans rien derrière nous, la flèche rejoint le parent
    // plutôt que de faire sortir du site.
    if (typeof window !== "undefined") {
      const state = window.history.state as { idx?: number } | null;
      const enArriere =
        typeof state?.idx === "number" ? state.idx > 0 : window.history.length > 1;
      if (enArriere) {
        router.back();
        return;
      }
    }
    router.push(backHref);
  }, [router, backHref]);

  return (
    <TopBarShell>
      <nav
        aria-label="Fil d'Ariane"
        className="pointer-events-auto relative flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 py-1.5 pl-1.5 pr-3.5 shadow-[0_2px_4px_rgba(15,23,42,0.04),0_18px_44px_-28px_rgba(30,58,138,0.35)] backdrop-blur-xl"
      >
        <button
          type="button"
          onClick={goBack}
          title="Retour"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5]/50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Retour</span>
        </button>

        {/* Sur un téléphone, le fil défile plutôt que de passer à la ligne. */}
        <ol className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-[12px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {trail.map((step, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={`${step.label}-${index}`} className="flex shrink-0 items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-slate-300" />}
                {step.href && !last ? (
                  <Link
                    href={step.href}
                    className="font-medium text-slate-400 transition-colors hover:text-slate-700"
                  >
                    {step.label}
                  </Link>
                ) : (
                  <span
                    aria-current={last ? "page" : undefined}
                    className={cn("font-semibold", last ? "text-slate-800" : "text-slate-400")}
                  >
                    {step.label}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </TopBarShell>
  );
}
