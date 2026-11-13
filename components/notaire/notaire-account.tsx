"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/lib/auth-client";

/** Bas du menu latéral : le notaire connecté et la déconnexion. */
export function NotaireAccount({ userName, userEmail }: { userName?: string | null; userEmail: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/notaire/login");
      router.refresh();
    } catch {
      toast.error("La déconnexion n'a pas abouti, réessayez.");
    }
  };

  const initials =
    (userName || userEmail)
      .split(/[\s.@]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "N";

  return (
    <div className="flex items-center gap-3 border-t px-4 py-3">
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium leading-tight">{userName || "Notaire"}</p>
        <p className="truncate text-[12px] text-muted-foreground">{userEmail}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        aria-label="Déconnexion"
        title="Déconnexion"
        className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
