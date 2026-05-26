"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  AlertCircle,
  Trophy,
  CheckCircle2,
  ChevronRight,
  Plus,
  FileText,
  User,
  UserPlus,
  Sparkles,
  ClipboardList,
  MessageSquare,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ProfilType, BailType, IntakeTarget } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";
import { deleteBailDraft, createTenantForLease } from "@/lib/actions/leases";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

const STEPS = [
  { key: "DRAFT", shortLabel: "Créé" },
  { key: "PENDING_VALIDATION", shortLabel: "Vérifié" },
  { key: "READY_FOR_NOTARY", shortLabel: "Notaire" },
  { key: "CLIENT_CONTACTED", shortLabel: "Contact" },
  { key: "SIGNED", shortLabel: "Signé" },
] as const;

const STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  PENDING_VALIDATION: 1,
  READY_FOR_NOTARY: 2,
  CLIENT_CONTACTED: 3,
  SIGNED: 4,
  TERMINATED: 5,
};

const STATUS_INFO: Record<string, { message: string; needsAction?: boolean }> = {
  DRAFT: { message: "Dossier créé — notre équipe va le vérifier prochainement." },
  PENDING_VALIDATION: { message: "Notre équipe vérifie votre dossier. Vous serez notifié bientôt." },
  READY_FOR_NOTARY: { message: "Votre dossier a été transmis à un notaire. Il vous contactera prochainement." },
  CLIENT_CONTACTED: { message: "Le notaire vous a contacté — pensez à lui répondre pour avancer.", needsAction: true },
  SIGNED: { message: "Félicitations ! Votre bail a été signé avec succès." },
  TERMINATED: { message: "Ce bail est terminé." },
};

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

const ACTIVE_STATUSES = ["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLocataireName(parties: Bail["parties"]): string {
  const loc = parties?.find((p) => p.profilType === ProfilType.LOCATAIRE);
  if (!loc) return "Locataire non renseigné";
  if (loc.entreprise) return loc.entreprise.legalName || loc.entreprise.name || "Entreprise";
  const p = loc.persons?.[0];
  if (p) return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || "Non renseigné";
  return "Non renseigné";
}

function getPropertyLabel(bail: Bail): string {
  return bail.property.label || (bail.property.fullAddress ? bail.property.fullAddress.split(",")[0] : "Bien");
}

// ─── Sous-composant : timeline ────────────────────────────────────────────────

function BailTimeline({ status }: { status: string }) {
  const stepIdx = STEP_INDEX[status] ?? 0;
  const isTerminated = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"].includes(status);
  if (isTerminated) return null;

  return (
    <div className="flex items-start">
      {STEPS.map((step, i) => {
        const done = stepIdx > i;
        const active = stepIdx === i;
        return (
          <div key={step.key} className="flex items-start flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-colors",
                  done ? "bg-primary" : active ? "bg-primary ring-[3px] ring-primary/20" : "bg-muted border border-border"
                )}
              >
                {done && <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary-foreground" />}
                {active && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-foreground" />}
              </div>
              <p className={cn(
                "text-[9px] sm:text-[10px] text-center whitespace-nowrap",
                active ? "font-semibold text-primary" : done ? "text-primary/60" : "text-muted-foreground"
              )}>
                {step.shortLabel}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-0.5 flex-1 mt-2 sm:mt-2.5 transition-colors", done ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Carte : dossier bail soumis ──────────────────────────────────────────────

const NO_TENANT_STATUSES = ["DRAFT", "PENDING_VALIDATION", "READY_FOR_NOTARY"];

function DossierCard({ bail }: { bail: Bail }) {
  const router = useRouter();
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [tenantEmail, setTenantEmail] = useState("");
  const [isAddingTenant, setIsAddingTenant] = useState(false);

  const isSigned = bail.status === "SIGNED";
  const needsAction = bail.status === "CLIENT_CONTACTED";
  const info = STATUS_INFO[bail.status];
  const locataire = getLocataireName(bail.parties);
  const property = getPropertyLabel(bail);
  const missingTenant = locataire === "Locataire non renseigné" && NO_TENANT_STATUSES.includes(bail.status);

  const handleAddTenant = async () => {
    if (!tenantEmail.includes("@")) { toast.error("Email invalide"); return; }
    try {
      setIsAddingTenant(true);
      await createTenantForLease({ bailId: bail.id, email: tenantEmail });
      toast.success("Locataire ajouté — un email lui a été envoyé");
      setTenantDialogOpen(false);
      setTenantEmail("");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur", { description: error.message });
    } finally {
      setIsAddingTenant(false);
    }
  };

  return (
    <>
      <Link href={`/client/proprietaire/demandes?open=bail-${bail.id}`}>
        <Card className={cn("transition-all hover:shadow-md cursor-pointer group", needsAction && "ring-2 ring-amber-400", isSigned && "ring-1 ring-green-300")}>
          <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className={cn("rounded-full p-1.5 sm:p-2 shrink-0 mt-0.5", isSigned ? "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400" : needsAction ? "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" : "bg-primary/10 text-primary")}>
                  {isSigned ? <Trophy className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : needsAction ? <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm sm:text-base truncate leading-tight">{property}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <User className="h-3 w-3 text-muted-foreground shrink-0" />
                    <p className="text-xs text-muted-foreground truncate">{locataire}</p>
                  </div>
                  {bail.bailType && <p className="text-[11px] text-muted-foreground mt-0.5">{BAIL_TYPE_LABELS[bail.bailType] || bail.bailType}</p>}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <BailTimeline status={bail.status} />
            {missingTenant && (
              <div className="flex items-start gap-2 rounded-lg px-3 py-2 bg-blue-50 dark:bg-blue-950/30 text-xs sm:text-sm text-blue-800 dark:text-blue-300">
                <UserPlus className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">
                  Locataire non renseigné — vous pouvez l'ajouter dès que vous l'avez trouvé.
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTenantDialogOpen(true); }}
                    className="block mt-1.5 text-blue-700 dark:text-blue-400 font-medium underline underline-offset-2 hover:text-blue-900"
                  >
                    Ajouter un locataire
                  </button>
                </div>
              </div>
            )}
            {info && !missingTenant && (
              <div className={cn("flex items-start gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm", needsAction ? "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200" : isSigned ? "bg-green-50 text-green-800 dark:bg-green-950/60 dark:text-green-200" : "bg-muted/70 text-muted-foreground")}>
                {needsAction ? <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : isSigned ? <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5" /> : <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
                <span className="leading-snug">{info.message}</span>
              </div>
            )}
            {bail.effectiveDate && (
              <p className="text-[11px] text-muted-foreground">
                Début le {formatDate(bail.effectiveDate)}
                {bail.endDate && ` · Fin le ${formatDate(bail.endDate)}`}
              </p>
            )}
          </CardContent>
        </Card>
      </Link>

      <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Ajouter un locataire
            </DialogTitle>
            <DialogDescription>
              Entrez l'adresse email de votre locataire. Il recevra un lien pour compléter son dossier.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Email *</Label>
            <Input
              type="email"
              placeholder="locataire@example.com"
              value={tenantEmail}
              onChange={(e) => setTenantEmail(e.target.value)}
              disabled={isAddingTenant}
              inputMode="email"
              autoComplete="email"
              className="h-11"
              onKeyDown={(e) => { if (e.key === "Enter") handleAddTenant(); }}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleAddTenant} disabled={isAddingTenant || !tenantEmail} className="w-full">
              {isAddingTenant ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Ajout en cours...</> : <><UserPlus className="mr-2 h-4 w-4" />Ajouter le locataire</>}
            </Button>
            <Button variant="outline" onClick={() => { setTenantDialogOpen(false); setTenantEmail(""); }} disabled={isAddingTenant} className="w-full">
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Carte : intake en cours ──────────────────────────────────────────────────

function IntakeCard({ intake }: { intake: ActiveIntake }) {
  const stageLabel = STAGE_LABELS[intake.stage];

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 transition-all hover:shadow-md ">
      <CardContent className="px-4 sm:px-5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-1.5 sm:p-2 shrink-0 mt-0.5">
            <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm sm:text-base leading-tight text-amber-900 dark:text-amber-200">
              Demande de bail en cours
            </p>
            {intake.propertyLabel ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">{intake.propertyLabel}</p>
            ) : (
              <p className="text-xs text-amber-600/70 dark:text-amber-500 mt-0.5 italic">Bien non renseigné</p>
            )}
            {intake.bailType && (
              <p className="text-[11px] text-amber-600/80 dark:text-amber-500 mt-0.5">{BAIL_TYPE_LABELS[intake.bailType] || intake.bailType}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 bg-amber-100/60 dark:bg-amber-900/30 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug">À compléter : {stageLabel} — {intake.description}</span>
        </div>
        <div className="mt-3">
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
            <Link href={intake.intakeUrl}>Continuer ma demande</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 transition-all hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-1.5 sm:p-2 shrink-0 mt-0.5">
            <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm sm:text-base leading-tight text-amber-900 dark:text-amber-200">
              Demande de bail en cours
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">{propertyLabel}</p>
            {tenantName && (
              <div className="flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3 text-amber-600/70 dark:text-amber-500 shrink-0" />
                <p className="text-[11px] text-amber-600/80 dark:text-amber-500 truncate">{tenantName}</p>
              </div>
            )}
            {draft.bailType && (
              <p className="text-[11px] text-amber-600/80 dark:text-amber-500 mt-0.5">{BAIL_TYPE_LABELS[draft.bailType] || draft.bailType}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 bg-amber-100/60 dark:bg-amber-900/30 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug">À compléter : {stepLabel} — {description}</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300">
            <Link href={`/client/proprietaire/baux/new?draftId=${draft.id}`}>Continuer ma demande</Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="text-amber-700 hover:text-destructive dark:text-amber-400 h-8 px-2"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Supprimer
          </Button>
        </div>
      </CardContent>
    </Card>
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
        s === "CLIENT_CONTACTED" ? 0 : s === "PENDING_VALIDATION" ? 1 : s === "READY_FOR_NOTARY" ? 2 : s === "DRAFT" ? 3 : s === "SIGNED" ? 4 : 5;
      return p(a.status) - p(b.status);
    })
    .slice(0, 4);

  // Nombre total de cartes "en cours" (intakes + drafts)
  const inProgressCount = activeIntakes.length + bailDrafts.length;

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">

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
            <DossierCard key={bail.id} bail={bail} />
          ))}
        </div>

      </section>
    </div>
  );
}
