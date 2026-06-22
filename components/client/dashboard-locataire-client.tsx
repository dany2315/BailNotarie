"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Clock,
  AlertCircle,
  Trophy,
  CheckCircle2,
  ChevronRight,
  FileText,
  User,
  Sparkles,
  ClipboardList,
  MessageSquare,
  Home,
  Store,
  Calendar,
  Euro,
  ArrowRight,
  ExternalLink,
  Scale,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfilType, BailType, BailFamille } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";
import { BailChatSheet } from "./bail-chat-sheet";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";

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
  intakeUrl: string;
  stage: "identity" | "property" | "bail" | "finalize";
  description: string;
  propertyLabel: string | null;
  bailType: string | null;
  bailId: string | null;
};

interface DashboardLocataireClientProps {
  baux: Bail[];
  pendingRequests: PendingRequest[];
  activeIntake: ActiveIntake | null;
  userName: string | null;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const BAIL_STEPS = [
  { key: "verification", shortLabel: "Vérification" },
  { key: "notaire", shortLabel: "Notaire" },
  { key: "signe", shortLabel: "Signé" },
];

const BAIL_STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  AWAITING_TENANT: 0,
  AWAITING_TENANT_FORM: 0,
  PENDING_VALIDATION: 0,
  READY_FOR_NOTARY: 1,
  CLIENT_CONTACTED: 1,
  SIGNED: 2,
  TERMINATED: 2,
};

const BAIL_STATUS_CONFIG: Record<string, { badgeBg: string; label: string; icon: React.ElementType }> = {
  DRAFT: { badgeBg: "bg-blue-50 text-blue-700 border-blue-200", label: "En vérification", icon: Clock },
  AWAITING_TENANT: { badgeBg: "bg-orange-50 text-orange-700 border-orange-200", label: "En attente", icon: Clock },
  AWAITING_TENANT_FORM: { badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Formulaire à compléter", icon: FileText },
  PENDING_VALIDATION: { badgeBg: "bg-blue-50 text-blue-700 border-blue-200", label: "En vérification", icon: Clock },
  READY_FOR_NOTARY: { badgeBg: "bg-violet-50 text-violet-700 border-violet-200", label: "Chez le notaire", icon: Scale },
  CLIENT_CONTACTED: { badgeBg: "bg-violet-50 text-violet-700 border-violet-200", label: "Chez le notaire", icon: Scale },
  SIGNED: { badgeBg: "bg-green-50 text-green-700 border-green-200", label: "Signé", icon: CheckCircle2 },
  TERMINATED: { badgeBg: "bg-gray-100 text-gray-500 border-gray-200", label: "Terminé", icon: FileText },
};

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const BAIL_FAMILY_LABELS: Record<string, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
};

const STAGE_LABELS: Record<string, string> = {
  identity: "Informations personnelles",
  property: "Bien immobilier",
  bail: "Détails du bail",
  finalize: "Documents",
};

const ACTIVE_STATUSES = ["DRAFT", "AWAITING_TENANT_FORM", "PENDING_VALIDATION", "READY_FOR_NOTARY", "CLIENT_CONTACTED"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProprietaireName(parties: Bail["parties"]): string | null {
  const prop = parties?.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
  if (!prop) return null;
  if (prop.entreprise) return prop.entreprise.legalName || prop.entreprise.name || "Entreprise";
  const p = prop.persons?.[0];
  if (p) return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || null;
  return null;
}

// ─── Timeline 3 étapes ───────────────────────────────────────────────────────

function BailStatusTimeline({ status }: { status: string }) {
  const stepIdx = BAIL_STEP_INDEX[status] ?? 0;
  const isTerminated = status === "TERMINATED";

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute inset-x-0 top-[5px] h-px bg-border" />
        <div className="flex justify-between">
          {BAIL_STEPS.map((step, i) => {
            const done = isTerminated || stepIdx > i;
            const active = !isTerminated && stepIdx === i;
            return (
              <div
                key={step.key}
                className={cn(
                  "relative z-10 w-2.5 h-2.5 rounded-full transition-all",
                  done ? "bg-primary" : active ? "bg-primary ring-[3px] ring-primary/20" : "bg-border"
                )}
              />
            );
          })}
        </div>
      </div>
      <div className="relative flex justify-between">
        {BAIL_STEPS.map((step, i) => {
          const done = isTerminated || stepIdx > i;
          const active = !isTerminated && stepIdx === i;
          const colorCn = active
            ? "font-semibold text-primary"
            : done ? "text-primary/50" : "text-muted-foreground/50";
          if (i === 1) {
            return (
              <p key={step.key} className={cn("absolute left-1/2 -translate-x-1/2 text-[9px] text-center", colorCn)}>
                {step.shortLabel}
              </p>
            );
          }
          return (
            <p key={step.key} className={cn("text-[9px]", i === 0 ? "text-left" : "text-right", colorCn)}>
              {step.shortLabel}
            </p>
          );
        })}
      </div>
    </div>
  );
}

// ─── Carte bail dossier ───────────────────────────────────────────────────────

function BailCard({ bail }: { bail: Bail }) {
  const cfg = BAIL_STATUS_CONFIG[bail.status] ?? BAIL_STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const notaire = bail.dossierAssignments?.[0]?.notaire;
  const notaireName = notaire ? notaire.name || notaire.email || "Notaire" : null;
  const proprietaireName = getProprietaireName(bail.parties);
  const proprietaireInitial = proprietaireName ? proprietaireName[0].toUpperCase() : null;
  const propertyLabel = bail.property.label || bail.property.fullAddress?.split(",")[0] || "Bien";

  const endDate = bail.endDate
    ? bail.endDate
    : bail.effectiveDate && bail.bailType
    ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType).toISOString()
    : null;

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden pb-2 pt-0">
      <CardContent className="p-0">
        <div className="p-4 space-y-3.5">
          {/* Titre : bien + famille */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={cn(
                "rounded-md p-1.5 shrink-0",
                isCommercial ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
              )}>
                {isCommercial ? <Store className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate leading-tight">{propertyLabel}</p>
                <p className="text-xs text-muted-foreground">{bail.bailFamily ? BAIL_FAMILY_LABELS[bail.bailFamily] : "Bail"}</p>
              </div>
            </div>
            
          </div>


          {/* Chips */}
          <div className="flex flex-wrap gap-1.5">
            {bail.rentAmount != null && bail.rentAmount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                <Euro className="h-3 w-3" />
                {bail.rentAmount.toLocaleString()} €/mois
              </span>
            )}
            {bail.bailType && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                <FileText className="h-3 w-3" />
                {BAIL_TYPE_LABELS[bail.bailType] || bail.bailType}
              </span>
            )}
            {bail.effectiveDate && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                <Calendar className="h-3 w-3" />
                {formatDate(bail.effectiveDate)}
                {endDate && (
                  <>
                    <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                    {formatDate(endDate)}
                  </>
                )}
              </span>
            )}
          </div>

          {/* Propriétaire */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
              proprietaireName ? "bg-primary/20 text-primary" : "bg-muted"
            )}>
              {proprietaireName ? proprietaireInitial : <User className="h-3 w-3 text-muted-foreground" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5">Propriétaire</span>
              <span className={cn("text-sm truncate", proprietaireName ? "text-foreground" : "text-muted-foreground italic text-xs")}>
                {proprietaireName ?? "Non renseigné"}
              </span>
            </div>
          </div>

          {/* timeline */}
          <div className="space-y-2">
            <BailStatusTimeline status={bail.status} />
          </div>
        </div>

        

        {/* Footer d'actions */}
        <div className="border-t px-4 py-3 flex items-center gap-2 bg-muted/30">
          {notaire ? (
            <BailChatSheet
              bailId={bail.id}
              trigger={
                <Button size="sm" className="flex-1 gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Contacter le notaire
                </Button>
              }
            />
          ) : (
            <div className="flex-1 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              Assignation en cours…
            </div>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" asChild>
            <Link href={`/client/locataire/baux/${bail.id}`}>
              <ExternalLink className="h-3.5 w-3.5" />
              Dossier
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Carte intake ─────────────────────────────────────────────────────────────

function IntakeCard({ intake }: { intake: ActiveIntake }) {
  const stageLabel = STAGE_LABELS[intake.stage];

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 transition-all hover:shadow-md">
      <CardContent className="px-4 sm:px-5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900 p-1.5 sm:p-2 shrink-0 mt-0.5">
            <ClipboardList className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm sm:text-base leading-tight text-amber-900 dark:text-amber-200">
              Formulaire à compléter
            </p>
            {intake.propertyLabel ? (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5 truncate">{intake.propertyLabel}</p>
            ) : (
              <p className="text-xs text-amber-600/70 dark:text-amber-500 mt-0.5 italic">Bien non renseigné</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-lg px-3 py-2 bg-amber-100/60 dark:bg-amber-900/30 text-xs sm:text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug">
            Votre propriétaire a initié ce dossier — complétez vos informations pour débloquer le bail. À compléter : {stageLabel}
          </span>
        </div>
        <div className="mt-3">
          <Button asChild size="sm" className="w-full">
            <Link href={intake.intakeUrl}>Compléter mon dossier</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Carte bail en attente (sans lien intake) ─────────────────────────────────

function AwaitingBailCard({ count }: { count: number }) {
  return (
    <Card className="border-border/60 bg-muted/20">
      <CardContent className="px-4 py-4 flex items-start gap-3">
        <div className="rounded-full bg-muted p-2 shrink-0">
          <Clock className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-sm">
            {count > 1 ? `${count} dossiers en attente` : "Dossier en attente"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Votre propriétaire prépare votre bail. Vous recevrez un lien pour compléter votre dossier dès qu'il sera prêt.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DashboardLocataireClient({
  baux,
  pendingRequests,
  activeIntake,
  userName,
}: DashboardLocataireClientProps) {
  // Bails couverts par un intake en cours → ne pas afficher comme dossier card
  const intakeBailIds = new Set([activeIntake?.bailId].filter(Boolean));

  const awaitingBails = baux.filter(
    (b) => b.status === "AWAITING_TENANT" || b.status === "AWAITING_TENANT_FORM" || intakeBailIds.has(b.id)
  );
  const activeBails = baux.filter(
    (b) => b.status !== "AWAITING_TENANT" && b.status !== "AWAITING_TENANT_FORM" && !intakeBailIds.has(b.id)
  );

  const enCours = activeBails.filter((b) => ACTIVE_STATUSES.includes(b.status)).length;
  const signes = activeBails.filter((b) => b.status === "SIGNED").length;
  const aTraiter = pendingRequests.length + (activeIntake ? 1 : 0);
  const hasAttention = aTraiter > 0;

  const recentBails = [...activeBails]
    .sort((a, b) => {
      const p = (s: string) =>
        s === "CLIENT_CONTACTED" ? 0 : s === "AWAITING_TENANT_FORM" ? 1 : s === "PENDING_VALIDATION" ? 2 : s === "READY_FOR_NOTARY" ? 3 : s === "DRAFT" ? 4 : s === "SIGNED" ? 5 : 6;
      return p(a.status) - p(b.status);
    })
    .slice(0, 4);

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 md:max-w-2xl md:mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
          {userName ? `Bonjour, ${userName.split(" ")[0]}` : "Dashboard"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {enCours > 0 ? `${enCours} dossier${enCours > 1 ? "s" : ""} en cours` : "Bienvenue dans votre espace locataire"}
        </p>
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

      {/* ── Attention requise ────────────────────────────────── */}
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
                      <Link href={`/client/locataire/baux/${request.bail.id}?chat=1`}>Répondre</Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {/* ── Mes baux ─────────────────────────────────────────── */}
      <section className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-muted-foreground">
            {activeBails.length > 4 ? "Baux récents" : "Mes baux"}
          </h2>
          {activeBails.length > 0 && (
            <Link href="/client/locataire/baux" className="flex items-center gap-1 text-xs text-primary hover:underline font-medium">
              Voir tout
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {/* État vide */}
        {activeBails.length === 0 && !activeIntake && awaitingBails.length === 0 && (
          <Card className="border-dashed border-2">
            <CardContent className="py-10 sm:py-14 flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-primary/10 p-4 sm:p-5">
                <FileText className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-semibold text-base sm:text-lg">Aucun bail pour l'instant</h3>
                <p className="text-sm text-muted-foreground max-w-xs leading-snug">
                  Vous serez notifié dès qu'un bail vous sera associé.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-3">
          {/* Intake en cours → formulaire à remplir */}
          {activeIntake && <IntakeCard intake={activeIntake} />}

          {/* Baux en attente sans lien intake */}
          {awaitingBails.length > 0 && !activeIntake && (
            <AwaitingBailCard count={awaitingBails.length} />
          )}

          {/* Baux actifs */}
          {recentBails.map((bail) => (
            <BailCard key={bail.id} bail={bail} />
          ))}
        </div>
      </section>
    </div>
  );
}
