"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronRight, Plus, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IntakeTarget } from "@prisma/client";
import { deleteBailDraft } from "@/lib/actions/leases";
import { toast } from "sonner";
import { OwnerBailCard } from "@/components/client/owner-bail-card";
import { OwnerProgressCard } from "@/components/client/owner-progress-card";

// ─── Types ───────────────────────────────────────────────────────────────────

type Bail = {
  id: string;
  bailType: string | null;
  bailFamily: string | null;
  status: string;
  rentAmount: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  property: {
    id: string;
    label: string | null;
    fullAddress: string | null;
  };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise?: {
      legalName: string | null;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  dossierAssignments: Array<{
    id: string;
    notaire: { id: string; name: string | null; email: string };
  }>;
};

type PendingRequest = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string | Date;
  bail: {
    id: string;
    property: { id: string; label: string | null; fullAddress: string | null };
  } | null;
};

type ActiveIntake = {
  token: string;
  target: IntakeTarget;
  intakeUrl: string;
  stage: "identity" | "property" | "bail" | "finalize";
  description: string;
  propertyLabel: string | null;
  bailType: string | null;
};

type BailDraft = {
  id: string;
  bailType: string;
  rentAmount: number;
  effectiveDate: string;
  updatedAt: string;
  property: { id: string; label: string | null; fullAddress: string | null };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null } | null;
  }>;
};

interface DashboardProprietaireClientProps {
  baux: Bail[];
  pendingRequests: PendingRequest[];
  activeIntakes: ActiveIntake[];
  bailDrafts: BailDraft[];
  userName: string | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const STAGE_LABELS: Record<string, string> = {
  identity: "Informations personnelles",
  property: "Bien immobilier",
  bail: "Détails du bail",
  finalize: "Documents",
};

const ACTIVE_STATUSES = ["DRAFT", "AWAITING_TENANT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED"];

// ─── Carte : intake en cours ──────────────────────────────────────────────────

function IntakeCard({ intake }: { intake: ActiveIntake }) {
  const stageLabel = STAGE_LABELS[intake.stage];

  return (
    <OwnerProgressCard
      propertyLabel={intake.propertyLabel}
      bailTypeLabel={intake.bailType ? BAIL_TYPE_LABELS[intake.bailType] || intake.bailType : null}
      message={`À compléter : ${stageLabel} — ${intake.description}`}
      continueHref={intake.intakeUrl}
    />
  );
}

// ─── Carte : brouillon bail depuis interface ──────────────────────────────────

function DraftCard({ draft, onDelete }: { draft: BailDraft; onDelete: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const tenant = draft.parties.find((p) => p.profilType === "LOCATAIRE");
  const tenantName = tenant
    ? tenant.entreprise?.legalName || tenant.entreprise?.name || `${tenant.persons?.[0]?.firstName || ""} ${tenant.persons?.[0]?.lastName || ""}`.trim() || tenant.persons?.[0]?.email || null
    : null;
  const propertyLabel = draft.property.label || draft.property.fullAddress?.split(",")[0] || "Bien";
  const hasRent = draft.rentAmount > 0;

  const stepLabel = !tenantName
    ? "Sélection du locataire"
    : !hasRent
    ? "Détails du bail"
    : "Paiement";

  const description = !tenantName
    ? `Bien sélectionné : ${propertyLabel}. Ajoutez un locataire pour continuer.`
    : !hasRent
    ? `Locataire : ${tenantName}. Renseignez le loyer et les dates du bail.`
    : `Bail prêt pour le paiement. Finalisez votre demande pour la soumettre.`;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(draft.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <OwnerProgressCard
      propertyLabel={propertyLabel}
      tenantName={tenantName}
      bailTypeLabel={draft.bailType ? BAIL_TYPE_LABELS[draft.bailType] || draft.bailType : null}
      message={`À compléter : ${stepLabel} — ${description}`}
      continueHref={`/client/proprietaire/baux/new?draftId=${draft.id}`}
      onDelete={handleDelete}
      deleting={deleting}
    />
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DashboardProprietaireClient({
  baux,
  pendingRequests,
  activeIntakes,
  bailDrafts: initialBailDrafts,
  userName,
}: DashboardProprietaireClientProps) {
  const [bailDrafts, setBailDrafts] = useState(initialBailDrafts);

  const handleDeleteDraft = async (id: string) => {
    try {
      await deleteBailDraft(id);
      setBailDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Brouillon supprimé");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  // Stats
  const enCours = baux.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const aTraiter = pendingRequests.length + activeIntakes.length + bailDrafts.length;
  const signes = baux.filter((b) => b.status === "SIGNED").length;
  const hasAttention = aTraiter > 0;

  // Bails triés : en attente d'action d'abord, puis récents (max 4, hors drafts — ceux-ci sont séparés)
  const recentBails = [...baux]
    .sort((a, b) => {
      const p = (s: string) =>
        s === "CLIENT_CONTACTED" ? 0 : s === "AWAITING_TENANT_FORM" ? 1 : s === "PENDING_VALIDATION" ? 2 : s === "READY_FOR_NOTARY" ? 3 : s === "AWAITING_TENANT" ? 4 : s === "DRAFT" ? 5 : s === "SIGNED" ? 6 : 7;
      return p(a.status) - p(b.status);
    })
    .slice(0, 4);

  // Nombre total de cartes "en cours" (intakes + drafts)
  const inProgressCount = activeIntakes.length + bailDrafts.length;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 md:max-w-2xl md:mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
            {userName ? `Bonjour, ${userName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {enCours > 0 ? `${enCours} dossier${enCours > 1 ? "s" : ""} en cours` : "Aucun dossier en cours"}
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/client/proprietaire/baux/new">
            <Plus className="h-4 w-4 mr-1.5" />
            <span className="hidden xs:inline">Nouvelle demande</span>
            <span className="xs:hidden">Nouveau</span>
          </Link>
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 divide-x rounded-xl border bg-card">
        <div className="flex flex-col items-center gap-0.5 px-3 py-4 sm:py-5">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums">{enCours}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">En cours</p>
        </div>
        <div className={cn("flex flex-col items-center gap-0.5 px-3 py-4 sm:py-5", hasAttention && "bg-amber-50/60 dark:bg-amber-950/30")}>
          <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", hasAttention && "text-amber-600 dark:text-amber-400")}>{aTraiter}</p>
          <p className={cn("text-[11px] sm:text-xs", hasAttention ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground")}>À traiter</p>
        </div>
        <div className="flex flex-col items-center gap-0.5 px-3 py-4 sm:py-5">
          <p className={cn("text-2xl sm:text-3xl font-bold tabular-nums", signes > 0 && "text-green-600 dark:text-green-400")}>{signes}</p>
          <p className="text-[11px] sm:text-xs text-muted-foreground">Signés</p>
        </div>
      </div>

      {/* ── Attention requise — demandes notaire uniquement ──── */}
      {pendingRequests.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
            <h2 className="font-semibold text-sm text-amber-700 dark:text-amber-400">Votre attention est requise</h2>
          </div>
          {pendingRequests.map((request) => (
            <Card key={request.id} className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-2 shrink-0">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div>
                    <p className="font-semibold text-sm text-amber-900 dark:text-amber-200 line-clamp-1">{request.title}</p>
                    {request.bail?.property && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{request.bail.property.label || request.bail.property.fullAddress}</p>
                    )}
                  </div>
                  {request.bail && (
                    <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
                      <Link href={`/client/proprietaire/demandes?open=bail-${request.bail.id}&chat=1`}>Répondre</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* ── Mes dossiers (unifié) ────────────────────────────── */}
      <section className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground">
            {baux.length + inProgressCount > 4 ? "Dossiers récents" : "Mes dossiers"}
          </h2>
          {baux.length > 0 && (
            <Link href="/client/proprietaire/demandes" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Voir tout
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* État vide */}
        {baux.length === 0 && inProgressCount === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 sm:py-14 flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-primary/10 p-4 sm:p-5">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base sm:text-lg">Aucun dossier pour l'instant</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-snug">
                  Créez votre première demande de bail notarié pour commencer le suivi.
                </p>
              </div>
              <Button asChild>
                <Link href="/client/proprietaire/baux/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer un dossier
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 sm:gap-4">
          {/* Intakes en cours d'abord */}
          {activeIntakes.map((intake) => (
            <IntakeCard key={intake.token} intake={intake} />
          ))}

          {/* Brouillons interface */}
          {bailDrafts.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onDelete={handleDeleteDraft} />
          ))}

          {/* Bails soumis */}
          {recentBails.map((bail) => (
            <OwnerBailCard
              key={bail.id}
              bail={bail}
              context="dashboard"
              detailHref={`/client/proprietaire/demandes?open=bail-${bail.id}`}
            />
          ))}
        </div>

      </section>
    </div>
  );
}
