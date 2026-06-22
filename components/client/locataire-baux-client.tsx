"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Euro,
  ArrowRight,
  Clock,
  Scale,
  Store,
  Home,
  CheckCircle2,
  User,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { BailType, BailFamille, ProfilType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { BailChatSheet } from "./bail-chat-sheet";

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
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null; email: string | null } | null;
  }>;
  dossierAssignments: Array<{
    id: string;
    notaire: { id: string; name: string | null; email: string } | null;
  }>;
};

interface LocataireBauxClientProps {
  baux: Bail[];
}

const bailTypeLabels: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const bailFamilyLabels: Record<string, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
};

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
            : done
            ? "text-primary/50"
            : "text-muted-foreground/50";
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

function getProprietaireName(parties: Bail["parties"]): string | null {
  const prop = parties?.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
  if (!prop) return null;
  if (prop.entreprise) return prop.entreprise.legalName || prop.entreprise.name || "Entreprise";
  const p = prop.persons?.[0];
  if (p) return `${p.firstName || ""} ${p.lastName || ""}`.trim() || p.email || null;
  return null;
}

function BailCard({ bail }: { bail: Bail }) {
  const cfg = BAIL_STATUS_CONFIG[bail.status] ?? BAIL_STATUS_CONFIG.DRAFT;
  const StatusIcon = cfg.icon;
  const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const notaire = bail.dossierAssignments?.[0]?.notaire;
  const notaireName = notaire ? notaire.name || notaire.email || "Notaire" : null;
  const proprietaireName = getProprietaireName(bail.parties);
  const proprietaireInitial = proprietaireName ? proprietaireName[0].toUpperCase() : null;
  const propertyLabel = bail.property.label || bail.property.fullAddress || "Bien";

  const endDate = bail.endDate
    ? bail.endDate
    : bail.effectiveDate && bail.bailType
    ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType).toISOString()
    : null;

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden">
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
                <p className="text-xs text-muted-foreground">{bail.bailFamily ? bailFamilyLabels[bail.bailFamily] : "Bail"}</p>
              </div>
            </div>
            {notaireName && (
              <span className="text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">
                Me {notaireName}
              </span>
            )}
          </div>

          {/* Badge statut + timeline */}
          <div className="space-y-2">
            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium border rounded-full px-2.5 py-0.5", cfg.badgeBg)}>
              <StatusIcon className="h-3 w-3" />
              {cfg.label}
            </span>
            <BailStatusTimeline status={bail.status} />
          </div>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {bail.rentAmount && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                <Euro className="h-3 w-3" />
                {bail.rentAmount.toLocaleString()} €/mois
              </span>
            )}
            {bail.bailType && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                <FileText className="h-3 w-3" />
                {bailTypeLabels[bail.bailType] || bail.bailType}
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

export function LocataireBauxClient({ baux }: LocataireBauxClientProps) {
  if (baux.length === 0) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="py-14 flex flex-col items-center text-center gap-4">
          <div className="rounded-full bg-primary/10 p-5">
            <FileText className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-lg">Aucun bail pour l'instant</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-snug">
              Vous serez notifié dès qu'un bail vous sera associé.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {baux.map((bail) => (
        <BailCard key={bail.id} bail={bail} />
      ))}
    </div>
  );
}
