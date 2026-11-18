"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { remindComplementRequest } from "@/lib/actions/complement-requests";
import { REASON_LABELS, type ComplementReasonValue } from "@/lib/utils/complement";
import { cn } from "@/lib/utils";

/*
 * Fiche dossier de l'équipe (présentation « une page ») : ce module ne lit et n'écrit rien.
 * Il dit seulement, pour chaque ligne de la fiche, si elle a déjà été réclamée au client
 * (demande de pièces en cours) ou si sa réponse est arrivée, avec la même clé que la fenêtre « Demander ».
 */

export interface FicheClaim {
  status: "PENDING" | "PROVIDED";
  target: "OWNER" | "TENANT";
  origin: "TEAM" | "NOTAIRE";
  reason: ComplementReasonValue;
  sentAt: string;
  submittedAt: string | null;
}

const FicheContext = React.createContext<{ claims: Record<string, FicheClaim> } | null>(null);

export function FicheProvider({ claims, children }: { claims: Record<string, FicheClaim>; children: React.ReactNode }) {
  const value = React.useMemo(() => ({ claims }), [claims]);
  return <FicheContext.Provider value={value}>{children}</FicheContext.Provider>;
}

/** Présent seulement sur la fiche dossier : les lignes prennent la présentation de la maquette. */
export function useFiche() {
  return React.useContext(FicheContext);
}

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** « Réclamé le 18/11 · illisible » ou « Reçu le 20/11 · à contrôler », sur la ligne concernée. */
export function ClaimTag({ keys }: { keys?: string[] }) {
  const fiche = useFiche();
  if (!fiche || !keys || keys.length === 0) return null;
  const found = keys.map((key) => fiche.claims[key]).filter(Boolean);
  const received = found.find((c) => c.status === "PROVIDED");
  const waiting = found.find((c) => c.status === "PENDING");
  const claim = received ?? waiting;
  if (!claim) return null;
  const by = claim.origin === "NOTAIRE" ? " par le notaire" : "";
  return (
    <a
      href="#demandes"
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-md px-2 text-[12px] font-semibold",
        received ? "bg-blue-600 text-white" : "bg-amber-100 text-amber-900",
      )}
    >
      {received
        ? `● Reçu${claim.submittedAt ? ` le ${day(claim.submittedAt)}` : ""} · à contrôler`
        : `⏳ Réclamé${by} le ${day(claim.sentAt)} · ${REASON_LABELS[claim.reason].toLowerCase()}`}
    </a>
  );
}

/** Pastille courte d'un contrôle fait par le logiciel ou à surveiller, sur la ligne concernée. */
export function RuleTag({ tone, children }: { tone: "ok" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded-md px-2 py-0.5 text-[12px] font-semibold leading-tight",
        tone === "ok" && "bg-green-50 text-green-800",
        tone === "warn" && "bg-amber-50 text-amber-900",
        tone === "bad" && "bg-red-50 text-red-800",
        tone === "neutral" && "bg-slate-100 text-slate-700",
      )}
    >
      {children}
    </span>
  );
}

/** « Relancer » d'une demande de pièces en attente (même e-mail de rappel que dans la carte de la demande). */
export function RemindRequestButton({ requestId, email, className }: { requestId: string; email: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={cn("h-9 gap-1.5", className)}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await remindComplementRequest({ requestId });
        setBusy(false);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success(`Relance envoyée à ${email}`);
        router.refresh();
      }}
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
      Relancer
    </Button>
  );
}
