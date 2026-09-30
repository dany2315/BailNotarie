"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";
import { getClientInfoForHeader } from "@/lib/actions/client-info";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* =========================================================================
   Espace client dans la navigation de la landing.
   Le profil est comparé en chaîne plutôt qu'avec l'enum Prisma : importer
   @prisma/client dans un composant client alourdit inutilement le bundle.
   Même logique que le header historique (/api/user/current puis
   getClientInfoForHeader), habillée pour le nouveau design.
   ========================================================================= */

interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  image: string | null;
  clientId: string | null;
  profilType: string | null;
}

interface ClientInfo {
  name: string | null;
  email: string | null;
  clientType: "entreprise" | "particulier" | null;
  profilType: string | null;
}

export interface ClientSession {
  status: "loading" | "guest" | "client";
  displayName: string;
  email: string;
  initials: string;
  isCompany: boolean;
  profilLabel: string | null;
}

const EMPTY: ClientSession = {
  status: "loading",
  displayName: "",
  email: "",
  initials: "",
  isCompany: false,
  profilLabel: null,
};

function buildInitials(name: string) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return letters || "CL";
}

/* ---------- Session partagée -------------------------------------------- */

/* La session est lue une fois et partagée par tous les composants qui en
   dépendent — la barre, son menu, le raccourci mobile. Un état local par
   composant obligeait chacun à refaire l'appel, et surtout laissait la barre
   afficher un avatar après une déconnexion : `router.refresh()` rafraîchit les
   composants serveur, pas l'état d'un composant client déjà monté. Ici, la
   déconnexion publie l'état « visiteur » et tous les abonnés se mettent à jour
   dans la même image. */

let sessionState: ClientSession = EMPTY;
let inFlight: Promise<void> | null = null;
let lastLoadedAt = 0;
const subscribers = new Set<(session: ClientSession) => void>();

function publish(next: ClientSession) {
  sessionState = next;
  for (const notify of Array.from(subscribers)) notify(next);
}

/**
 * Lit la session : l'API dit qui est connecté, l'action serveur donne le nom
 * et l'e-mail réellement affichables (raison sociale pour une entreprise,
 * personne principale pour un particulier).
 */
async function loadClientSession() {
  try {
    const response = await fetch("/api/user/current");
    const data = (await response.json()) as { isAuthenticated?: boolean; user?: CurrentUser };

    const user = data?.isAuthenticated ? data.user : null;
    const isClient = user?.role === "UTILISATEUR" && Boolean(user?.clientId);

    if (!user || !isClient) {
      publish({ ...EMPTY, status: "guest" });
      return;
    }

    let info: ClientInfo | null = null;
    try {
      info = (await getClientInfoForHeader(user.clientId as string)) as ClientInfo | null;
    } catch (error) {
      console.error("Erreur lors de la récupération des informations du client:", error);
    }

    const profilType = info?.profilType ?? user.profilType ?? null;
    const displayName = info?.name || user.name || "Mon espace";

    publish({
      status: "client",
      displayName,
      email: info?.email || user.email || "",
      initials: buildInitials(displayName),
      isCompany: info?.clientType === "entreprise",
      profilLabel:
        profilType === "PROPRIETAIRE" ? "Propriétaire" : profilType === "LOCATAIRE" ? "Locataire" : null,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'utilisateur:", error);
    publish({ ...EMPTY, status: "guest" });
  } finally {
    lastLoadedAt = Date.now();
  }
}

function ensureLoaded(force = false) {
  if (inFlight) return;
  if (!force && sessionState.status !== "loading") return;
  inFlight = loadClientSession().finally(() => {
    inFlight = null;
  });
}

/** Publie l'état « visiteur » sans attendre le serveur : on vient de partir. */
export function clearClientSession() {
  publish({ ...EMPTY, status: "guest" });
  lastLoadedAt = Date.now();
}

/** Relit la session, par exemple au retour sur l'onglet. */
export function refreshClientSession() {
  ensureLoaded(true);
}

/** Délai en deçà duquel un retour sur l'onglet ne relance pas de lecture. */
const REVALIDATE_AFTER_MS = 30_000;

/** Abonnement commun : lecture initiale, publication, revalidation. */
function useSessionSubscription(onChange: (session: ClientSession) => void) {
  const ref = React.useRef(onChange);
  ref.current = onChange;

  React.useEffect(() => {
    const listener = (session: ClientSession) => ref.current(session);
    subscribers.add(listener);
    // L'état a pu changer entre le premier rendu et l'abonnement.
    listener(sessionState);
    ensureLoaded();

    // Déconnexion depuis un autre onglet, session expirée pendant une absence :
    // au retour sur l'onglet, on relit — mais pas à chaque aller-retour.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastLoadedAt < REVALIDATE_AFTER_MS) return;
      ensureLoaded(true);
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      subscribers.delete(listener);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

export function useClientSession(): ClientSession {
  const [session, setSession] = React.useState<ClientSession>(sessionState);
  useSessionSubscription(setSession);
  return session;
}

export function useSignOut() {
  const router = useRouter();
  return React.useCallback(async () => {
    try {
      await signOut();
      // Avant la navigation : la barre doit reprendre son bouton « Se
      // connecter » dans l'image qui suit, pas au prochain chargement complet.
      clearClientSession();
      toast.success("Déconnexion réussie");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Erreur lors de la déconnexion");
    }
  }, [router]);
}

/* ---------- Pastille d'avatar ------------------------------------------- */

export function ClientAvatar({
  initials,
  size = "md",
  className,
}: {
  initials: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5b85f7] to-[#3563e9] font-semibold text-white shadow-[0_6px_16px_-8px_rgba(53,99,233,0.9)] ring-2 ring-white",
        size === "sm" && "h-8 w-8 text-[11px]",
        size === "md" && "h-9 w-9 text-[12px]",
        size === "lg" && "h-11 w-11 text-[14px]",
        className,
      )}
    >
      {initials}
    </span>
  );
}

/* ---------- Bloc identité partagé (entête du menu) ---------------------- */

function IdentityBlock({ session }: { session: ClientSession }) {
  return (
    <div className="flex items-start gap-3">
      <ClientAvatar initials={session.initials} size="lg" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[14.5px] font-semibold text-slate-900">{session.displayName}</p>
          {session.isCompany ? (
            <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Compte entreprise" />
          ) : (
            <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-label="Compte particulier" />
          )}
        </div>
        {session.email && <p className="mt-0.5 truncate text-[12.5px] text-slate-500">{session.email}</p>}
        {session.profilLabel && (
          <span className="mt-2 inline-flex items-center rounded-full bg-[#4373f5]/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#3563e9]">
            {session.profilLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- Desktop : avatar + menu déroulant --------------------------- */

export function LpUserMenu({ session, className }: { session: ClientSession; className?: string }) {
  const handleSignOut = useSignOut();

  if (session.status === "loading") {
    return (
      <div
        className={cn(
          "flex h-11 w-[58px] shrink-0 items-center rounded-xl border border-slate-200 bg-white p-1 sm:h-10",
          className,
        )}
        aria-hidden
      >
        <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (session.status === "guest") {
    return (
      <Link
        href="/client/login"
        aria-label="Se connecter à mon espace client"
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9] sm:h-10 xl:px-3.5",
          className,
        )}
      >
        <LogIn className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        {/* Le libellé s'affiche dès qu'il reste de la place : sur téléphone à
            partir de 400 px, et à nouveau en grand écran. Entre les deux, les
            liens de navigation occupent la barre et le bouton reste à l'icône,
            dont le sens est porté par son `aria-label`. */}
        <span className="hidden min-[400px]:inline lg:hidden xl:inline">Se connecter</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Mon espace client — ${session.displayName}`}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 pr-1.5 transition-colors hover:border-[#4373f5]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5] focus-visible:ring-offset-2 sm:h-10",
            className,
          )}
        >
          <ClientAvatar initials={session.initials} size="sm" />
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[286px] rounded-2xl border border-white/80 bg-white/95 p-2 shadow-[0_30px_70px_-30px_rgba(30,58,138,0.55)] backdrop-blur-xl"
      >
        <div className="p-3">
          <IdentityBlock session={session} />
        </div>

        <DropdownMenuSeparator className="mx-1 bg-slate-100" />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-red-50"
        >
          <LogOut className="mr-2.5 h-4 w-4 text-red-500" />
          <span className="text-[14px] font-medium text-red-600">Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------- Action principale, selon la session ------------------------- */

/**
 * Destination et libellé du bouton d'action de la page d'accueil.
 *
 * Proposer « Constituer mon dossier » à quelqu'un qui a déjà un dossier en
 * cours, c'est lui proposer de recommencer : le bouton le ramène donc à son
 * espace. Tant que la session n'est pas lue, on garde la version visiteur —
 * c'est elle qui est rendue côté serveur, et c'est aussi la bonne réponse pour
 * l'immense majorité des visiteurs.
 */
export function useDossierCta(): { href: string; label: string; connected: boolean } {
  /* Un booléen, pas la session entière : la lecture publie deux fois — une
     fois pour l'identité sommaire, une fois pour le nom affichable obtenu du
     serveur — et sans ce filtre, le second passage ferait re-rendre tous les
     boutons pour rien. React abandonne le rendu quand la valeur ne change pas. */
  const [connected, setConnected] = React.useState(sessionState.status === "client");
  useSessionSubscription(React.useCallback((session: ClientSession) => {
    setConnected(session.status === "client");
  }, []));

  return {
    href: connected ? "/client" : "/commencer",
    label: connected ? "Mon espace client" : "Constituer mon dossier",
    connected,
  };
}

/**
 * Isole l'abonnement dans une feuille de l'arbre.
 *
 * Appeler le crochet directement dans une section la fait re-rendre tout
 * entière à l'arrivée de la session — et certaines sont lourdes : la visite
 * guidée monte cinq maquettes, le tarif un curseur. Ici, seul ce composant se
 * re-rend, et la section reste intacte.
 */
export function WithDossierCta({
  children,
}: {
  children: (cta: { href: string; label: string; connected: boolean }) => React.ReactNode;
}) {
  const cta = useDossierCta();
  return <>{children(cta)}</>;
}
