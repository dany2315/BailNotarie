"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { remindComplementRequest } from "@/lib/actions/complement-requests";
import { REASON_LABELS, type ComplementReasonValue } from "@/lib/utils/complement";
import type { StaffComplementItem } from "@/lib/actions/complement-requests";
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
  requestId: string;
  requestStatus: string;
  email: string;
  sentCount: number;
  /** La ligne de la demande (pour l'accepter ou la redemander sur place). */
  item: StaffComplementItem;
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
        "inline-flex items-center gap-1 text-[12.5px] font-medium hover:underline",
        received ? "font-semibold text-blue-700" : "text-amber-800",
      )}
    >
      {/* Ce qui a été réclamé, en toutes lettres (une ligne de la fiche peut regrouper plusieurs informations). */}
      {received
        ? `● ${claim.item.label} · reçu${claim.submittedAt ? ` le ${day(claim.submittedAt)}` : ""}, à contrôler`
        : `⏳ ${claim.item.label} · ${claim.reason === "MISSING" ? "demandé" : "redemandé"}${by} le ${day(claim.sentAt)}`}
    </a>
  );
}

/** Pastille courte d'un contrôle fait par le logiciel ou à surveiller, sur la ligne concernée. */
export function RuleTag({ tone, children }: { tone: "ok" | "warn" | "bad" | "neutral"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center text-[12.5px] font-medium leading-tight",
        tone === "ok" && "text-green-700",
        tone === "warn" && "text-amber-800",
        tone === "bad" && "font-semibold text-red-700",
        tone === "neutral" && "text-muted-foreground",
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

const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

/** « le 18/11 à 14:32 » (heure de Paris). */
function dateAndTime(date: Date) {
  const parts = TIME_FORMAT.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `le ${get("day")}/${get("month")} à ${get("hour")}:${get("minute")}`;
}

/**
 * Depuis quand : « à l'instant », « il y a 25 min », « il y a 3 h », puis au-delà d'un jour la date et
 * l'heure (« le 18/11 à 14:32 »). Se met à jour toute seule ; d'abord la date (identique serveur et navigateur).
 */
export function Since({ iso, className }: { iso: string | Date | null | undefined; className?: string }) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  if (!iso) return null;
  const date = new Date(iso);
  const minutes = now === null ? null : Math.floor((now - date.getTime()) / 60_000);
  const text =
    minutes === null || minutes >= 24 * 60
      ? dateAndTime(date)
      : minutes < 1
        ? "à l'instant"
        : minutes < 60
          ? `il y a ${minutes} min`
          : `il y a ${Math.floor(minutes / 60)} h${minutes % 60 >= 5 ? ` ${minutes % 60} min` : ""}`;
  return (
    <time dateTime={date.toISOString()} title={dateAndTime(date)} className={className}>
      {text}
    </time>
  );
}

/**
 * La fiche se remet à jour seule : en revenant sur l'onglet, et toutes les 45 secondes tant qu'il est
 * visible (pièce envoyée par le client, demande du notaire, autre membre de l'équipe, analyse terminée).
 * Ses propres changements la mettent déjà à jour tout de suite (chaque action recharge la fiche).
 */
export function FicheAutoRefresh({ everyMs = 45_000 }: { everyMs?: number }) {
  const router = useRouter();
  React.useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < 5_000) return;
      last = Date.now();
      router.refresh();
    };
    const timer = window.setInterval(refresh, everyMs);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [router, everyMs]);
  return null;
}
