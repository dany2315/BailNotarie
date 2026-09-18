"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ChevronDown,
  FileText,
  LayoutDashboard,
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

/**
 * Récupère la session cliente : l'API dit qui est connecté, l'action serveur
 * donne le nom et l'e-mail réellement affichables (raison sociale pour une
 * entreprise, personne principale pour un particulier).
 */
export function useClientSession(): ClientSession {
  const [session, setSession] = React.useState<ClientSession>(EMPTY);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/user/current");
        const data = (await response.json()) as { isAuthenticated?: boolean; user?: CurrentUser };

        const user = data?.isAuthenticated ? data.user : null;
        const isClient = user?.role === "UTILISATEUR" && Boolean(user?.clientId);

        if (!user || !isClient) {
          if (!cancelled) setSession({ ...EMPTY, status: "guest" });
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

        if (!cancelled) {
          setSession({
            status: "client",
            displayName,
            email: info?.email || user.email || "",
            initials: buildInitials(displayName),
            isCompany: info?.clientType === "entreprise",
            profilLabel:
              profilType === "PROPRIETAIRE"
                ? "Propriétaire"
                : profilType === "LOCATAIRE"
                  ? "Locataire"
                  : null,
          });
        }
      } catch (error) {
        console.error("Erreur lors de la récupération de l'utilisateur:", error);
        if (!cancelled) setSession({ ...EMPTY, status: "guest" });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return session;
}

export function useSignOut() {
  const router = useRouter();
  return React.useCallback(async () => {
    try {
      await signOut();
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
      <div className={cn("hidden h-10 w-[58px] items-center rounded-xl border border-slate-200 bg-white p-1 sm:flex", className)} aria-hidden>
        <span className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
      </div>
    );
  }

  if (session.status === "guest") {
    return (
      <Link
        href="/client/login"
        className={cn(
          "hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[13.5px] font-semibold text-slate-700 transition-colors hover:border-[#4373f5]/30 hover:text-[#3563e9] sm:inline-flex xl:px-3.5",
          className,
        )}
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden xl:inline">Se connecter</span>
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
            "hidden h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 pr-1.5 transition-colors hover:border-[#4373f5]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4373f5] focus-visible:ring-offset-2 sm:inline-flex",
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

        <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 focus:bg-[#4373f5]/[0.07]">
          <Link href="/client" className="cursor-pointer">
            <LayoutDashboard className="mr-2.5 h-4 w-4 text-[#4373f5]" />
            <span className="text-[14px] font-medium text-slate-700">Mon espace client</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 focus:bg-[#4373f5]/[0.07]">
          <Link href="/commencer" className="cursor-pointer">
            <FileText className="mr-2.5 h-4 w-4 text-[#4373f5]" />
            <span className="text-[14px] font-medium text-slate-700">Constituer un dossier</span>
          </Link>
        </DropdownMenuItem>

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

/* ---------- Mobile : bloc dans le panneau déroulant --------------------- */

export function LpUserPanel({
  session,
  onNavigate,
}: {
  session: ClientSession;
  onNavigate: () => void;
}) {
  const handleSignOut = useSignOut();

  if (session.status === "loading") {
    return (
      <div className="mb-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3" aria-hidden>
        <div className="flex items-center gap-3">
          <span className="h-11 w-11 animate-pulse rounded-full bg-slate-200" />
          <span className="flex-1 space-y-2">
            <span className="block h-3.5 w-28 animate-pulse rounded bg-slate-200" />
            <span className="block h-3 w-40 animate-pulse rounded bg-slate-200" />
          </span>
        </div>
      </div>
    );
  }

  if (session.status === "guest") {
    return (
      <Link
        href="/client/login"
        onClick={onNavigate}
        className="mb-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-[15px] font-semibold text-slate-700"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#4373f5] shadow-sm">
          <LogIn className="h-4 w-4" />
        </span>
        Se connecter à mon espace
      </Link>
    );
  }

  return (
    <div className="mb-2 rounded-2xl border border-[#4373f5]/15 bg-[#4373f5]/[0.05] p-3">
      <IdentityBlock session={session} />

      <div className="mt-3 grid gap-2">
        <Link
          href="/client"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14.5px] font-semibold text-[#3563e9] shadow-sm"
        >
          <LayoutDashboard className="h-4 w-4" />
          Mon espace client
        </Link>
        <button
          type="button"
          onClick={() => {
            onNavigate();
            handleSignOut();
          }}
          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold text-red-600"
        >
          <LogOut className="h-3.5 w-3.5" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
