"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { ArrowRight, Building2, User, GraduationCap, CheckCircle2, CreditCard } from "lucide-react";
import Link from "next/link";
import { LeaseActions } from "@/components/leases/lease-actions";
import { cn } from "@/lib/utils";
import {
  ACTOR_LABELS,
  STATUS_LABELS,
  STALE_AFTER_DAYS,
  daysSince,
  getLastActivity,
  getNextAction,
  getStage,
  isActiveStage,
  type BailStatusValue,
} from "@/lib/utils/bail-stage";

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Meublé 9 mois",
};

interface LeaseCellProps {
  row: any;
}

export function LeaseReferenceCell({ row }: LeaseCellProps) {
  if (!row?.id) {
    return <span className="text-muted-foreground">-</span>;
  }
  // Utiliser les 8 derniers caractères de l'ID comme numéro de référence
  const reference = row.id.slice(-8).toUpperCase();
  return (
  <Link
      href={`/interface/baux/${row.id}`}
      className="flex items-center gap-2 font-medium hover:underline group w-full"
    >
      Bail #{row.id.slice(-8).toUpperCase()}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />

    </Link>
  )
}

export function LeasePropertyCell({ row }: LeaseCellProps) {
  if (!row?.property) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>
  <Link href={`/interface/properties/${row.property.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
    {row.property.fullAddress || "-"}
    <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
  </Link>
  </>;
}

export function LeaseTenantCell({ row }: LeaseCellProps) {
  if (!row?.parties || !Array.isArray(row.parties)) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  // Trouver le locataire dans les parties
  const tenant = row.parties.find((p: any) => p.profilType === "LOCATAIRE");
  
  if (!tenant) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  // Afficher le nom selon le type de client
  if (tenant.type === "PERSONNE_PHYSIQUE") {
    const primaryPerson = tenant.persons?.find((p: any) => p.isPrimary) || tenant.persons?.[0];
    const name = primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : "";
    const email = primaryPerson?.email || "";
    const hasMultiplePersons = tenant.persons && tenant.persons.length > 1;
    
    return (
      <div className="flex flex-col gap-1">
        <Link href={`/interface/clients/${tenant.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
          <User className="size-4 text-muted-foreground" />
          <span>{name || email || "-"}</span>
          <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
        </Link>
        {hasMultiplePersons && (
          <span className="text-xs text-muted-foreground ml-6">
            +{tenant.persons.length - 1} autre{tenant.persons.length - 1 > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }
  
  if (tenant.type === "PERSONNE_MORALE") {
    const entrepriseName = tenant.entreprise?.legalName || tenant.entreprise?.name || "-";
    return (
      <Link href={`/interface/clients/${tenant.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <Building2 className="size-4 text-muted-foreground" />
        {entrepriseName}
        <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
      </Link>
    );
  }
  
  return <span className="text-muted-foreground">-</span>;
}

export function LeaseOwnerCell({ row }: LeaseCellProps) {
  if (!row?.property?.owner) {
    // Si pas de propriétaire dans property, chercher dans parties
    if (!row?.parties || !Array.isArray(row.parties)) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    const owner = row.parties.find((p: any) => p.profilType === "PROPRIETAIRE");
    
    if (!owner) {
      return <span className="text-muted-foreground">-</span>;
    }
    
    // Afficher le nom selon le type de client
    if (owner.type === "PERSONNE_PHYSIQUE") {
      const primaryPerson = owner.persons?.find((p: any) => p.isPrimary) || owner.persons?.[0];
      const name = primaryPerson
        ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
        : "";
      const email = primaryPerson?.email || "";
      const hasMultiplePersons = owner.persons && owner.persons.length > 1;
      
      return (
        <div className="flex flex-col gap-1">
          <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
            <User className="size-4 text-muted-foreground" />
            <span>{name || email || "-"}</span>
            <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
          </Link>
          {hasMultiplePersons && (
            <span className="text-xs text-muted-foreground ml-6">
              +{owner.persons.length - 1} autre{owner.persons.length - 1 > 1 ? "s" : ""}
            </span>
          )}
        </div>
      );
    }
    
    if (owner.type === "PERSONNE_MORALE") {
      const entrepriseName = owner.entreprise?.legalName || owner.entreprise?.name || "-";
      return (
        <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
          <Building2 className="size-4 text-muted-foreground" />
          {entrepriseName}
          <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
        </Link>
      );
    }
    
    return <span className="text-muted-foreground">-</span>;
  }
  
  const owner = row.property.owner;
  
  // Afficher le nom selon le type de client
  if (owner.type === "PERSONNE_PHYSIQUE") {
    const primaryPerson = owner.persons?.find((p: any) => p.isPrimary) || owner.persons?.[0];
    const name = primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : "";
    const email = primaryPerson?.email || "";
    const hasMultiplePersons = owner.persons && owner.persons.length > 1;
    
    return (
      <div className="flex flex-col gap-1">
        <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
          <User className="size-4 text-muted-foreground" />
          <span>{name || email || "-"}</span>
          <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
        </Link>
        {hasMultiplePersons && (
          <span className="text-xs text-muted-foreground ml-6">
            +{owner.persons.length - 1} autre{owner.persons.length - 1 > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }
  
  if (owner.type === "PERSONNE_MORALE") {
    const entrepriseName = owner.entreprise?.legalName || owner.entreprise?.name || "-";
    return (
      <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <Building2 className="size-4 text-muted-foreground" />
        {entrepriseName}
        <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
      </Link>
    );
  }
  
  return <span className="text-muted-foreground">-</span>;
}

export function LeaseStatusCell({ row }: LeaseCellProps) {
  if (!row?.status) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <StatusBadge status={row.status} />;
}

export function LeaseDateCell({ row }: LeaseCellProps) {
  if (!row?.effectiveDate) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatDate(row.effectiveDate)}</>;
}

export function LeaseCreatedDateCell({ row }: LeaseCellProps) {
  if (!row?.createdAt) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatDate(row.createdAt)}</>;
}

export function LeaseDepositCell({ row }: LeaseCellProps) {
  if (!row?.securityDeposit) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatCurrency(Number(row.securityDeposit))}</>;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison" };

/** Frais de dossier : pastille et date (ou « à régler »). */
export function LeasePaymentCell({ row }: LeaseCellProps) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span
        className={cn(
          "inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold",
          row?.paidAt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
        )}
      >
        {row?.paidAt ? "Payés" : "Non payés"}
      </span>
      <span className="whitespace-nowrap text-xs text-muted-foreground">{row?.paidAt ? `le ${formatDate(row.paidAt)}` : "à régler"}</span>
    </div>
  );
}

function partyName(party: any): string {
  if (!party) return "";
  if (party.type === "PERSONNE_MORALE") return party.entreprise?.legalName || party.entreprise?.name || "";
  const names = (party.persons || []).map((p: any) => [p.firstName, p.lastName].filter(Boolean).join(" ")).filter(Boolean);
  return names.join(" et ") || party.persons?.[0]?.email || "";
}

function rowParties(row: any) {
  const parties: any[] = Array.isArray(row?.parties) ? row.parties : [];
  return {
    owner: parties.find((p) => p.profilType === "PROPRIETAIRE") || row?.property?.owner || null,
    tenant: parties.find((p) => p.profilType === "LOCATAIRE") || null,
  };
}

/** Propriétaire puis locataire (liens vers les fiches clients). */
export function LeasePartiesCell({ row }: LeaseCellProps) {
  const { owner, tenant } = rowParties(row);
  return (
    <div className="flex min-w-[140px] max-w-[180px] flex-col gap-0.5 text-sm">
      {owner ? (
        <Link href={`/interface/clients/${owner.id}`} className="font-medium hover:underline">
          {partyName(owner) || "Sans nom"}
        </Link>
      ) : (
        <span className="text-muted-foreground">Propriétaire non renseigné</span>
      )}
      {tenant ? (
        <Link href={`/interface/clients/${tenant.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
          {partyName(tenant) || "Sans nom"}
        </Link>
      ) : (
        <span className="text-amber-700">Locataire à ajouter</span>
      )}
    </div>
  );
}

/** Adresse du bien (lien vers le dossier), type de bail et de bien. */
export function LeaseDossierCell({ row }: LeaseCellProps) {
  if (!row?.id) return <span className="text-muted-foreground">-</span>;
  const address = row.property?.fullAddress || row.property?.label || `Bail #${row.id.slice(-8).toUpperCase()}`;
  return (
    <div className="flex min-w-[150px] max-w-[180px] flex-col gap-0.5">
      <Link href={`/interface/baux/${row.id}`} className="font-semibold hover:underline">
        {address}
      </Link>
      <span className="text-xs text-muted-foreground">
        {[BAIL_TYPE_LABELS[row.bailType] || row.bailType, PROPERTY_TYPE_LABELS[row.property?.type] || null].filter(Boolean).join(" · ")}
      </span>
    </div>
  );
}

/** Étape (regroupement des statuts) et statut exact en dessous. */
export function LeaseStageCell({ row }: LeaseCellProps) {
  if (!row?.status) return <span className="text-muted-foreground">-</span>;
  const stage = getStage(row.status);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className={cn("inline-flex h-6 items-center whitespace-nowrap rounded-md px-2 text-xs font-semibold", stage.className)}>
        {stage.label}
      </span>
      <span className="max-w-[120px] text-xs text-muted-foreground">{STATUS_LABELS[row.status as BailStatusValue] || row.status}</span>
    </div>
  );
}

function rowNextAction(row: any) {
  const hasTenant = Array.isArray(row?.parties) && row.parties.some((p: any) => p.profilType === "LOCATAIRE");
  const hasNotaire = Array.isArray(row?.dossierAssignments) && row.dossierAssignments.length > 0;
  const pendingNotaireRequests = hasNotaire
    ? row.dossierAssignments.reduce((sum: number, a: any) => sum + (a?._count?.requests || 0), 0)
    : 0;
  return getNextAction({ status: row?.status, hasTenant, hasNotaire, pendingNotaireRequests });
}

function rowWaitingDays(row: any): number | null {
  if (!row?.updatedAt || !isActiveStage(getStage(row.status).key)) return null;
  return daysSince(getLastActivity(row.updatedAt, row.auditLogs?.[0]?.createdAt));
}

/** Ce qu'il reste à faire et qui doit le faire. */
export function LeaseNextActionCell({ row }: LeaseCellProps) {
  if (!row?.status) return <span className="text-muted-foreground">-</span>;
  const action = rowNextAction(row);
  if (action.actor === "personne") return <span className="text-muted-foreground">Aucune</span>;
  return (
    <div className="flex min-w-[130px] max-w-[160px] flex-col gap-0.5">
      <span className="font-semibold">{action.label}</span>
      <span className="text-xs text-muted-foreground">{ACTOR_LABELS[action.actor]}</span>
    </div>
  );
}

/** Jours depuis la dernière activité, en rouge au-delà du seuil. */
export function LeaseWaitingCell({ row }: LeaseCellProps) {
  const days = rowWaitingDays(row);
  if (days === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn("whitespace-nowrap font-medium", days > STALE_AFTER_DAYS ? "font-semibold text-red-700" : "text-foreground")}
      title="Jours depuis la dernière activité sur le dossier"
    >
      {days === 0 ? "< 1 j" : `${days} j`}
    </span>
  );
}

export function LeaseNotaireCell({ row }: LeaseCellProps) {
  const notaire = row?.dossierAssignments?.[0]?.notaire;
  if (!notaire) return <span className="whitespace-nowrap text-muted-foreground">Non assigné</span>;
  return (
    <Link href={`/interface/notaires/${notaire.id}/dossiers`} className="block max-w-[140px] font-medium hover:underline">
      {notaire.name || notaire.email}
    </Link>
  );
}

/** Verbe court du bouton de ligne, tiré de la prochaine action. */
const ACTION_VERBS: Record<string, string> = {
  "Relancer le propriétaire": "Relancer",
  "Relancer le locataire": "Relancer",
  "Ajouter le locataire": "Ajouter",
  "Envoyer le formulaire au locataire": "Envoyer",
  "Vérifier le dossier": "Vérifier",
  "Assigner un notaire": "Assigner",
};

/** Bouton d'action de la ligne (ouvre le dossier) et menu « … » des autres actions. */
export function LeaseRowActionCell({ row }: LeaseCellProps) {
  if (!row?.id) return null;
  return (
    <div className="flex items-center justify-end gap-1">
      <LeaseRowActionButton row={row} />
      <LeaseActions row={row} />
    </div>
  );
}

function LeaseRowActionButton({ row, className }: LeaseCellProps & { className?: string }) {
  const action = rowNextAction(row);
  const verb = ACTION_VERBS[action.label] || "Ouvrir";
  return (
    <Link
      href={`/interface/baux/${row.id}`}
      className={cn(
        "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3.5 text-sm font-semibold transition-colors",
        action.primary && verb !== "Ouvrir"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border bg-background hover:bg-muted",
        className,
      )}
    >
      {verb}
    </Link>
  );
}

/** Carte d'un dossier sur téléphone : mêmes informations que la ligne du tableau. */
export function LeaseMobileCard({ row }: LeaseCellProps) {
  if (!row?.id) return null;
  const stage = getStage(row.status);
  const address = row.property?.fullAddress || row.property?.label || `Bail #${row.id.slice(-8).toUpperCase()}`;
  const { owner, tenant } = rowParties(row);
  const notaire = row.dossierAssignments?.[0]?.notaire;
  const action = rowNextAction(row);
  const days = rowWaitingDays(row);
  const stale = days !== null && days > STALE_AFTER_DAYS;

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", stage.className)}>{stage.label}</span>
        <span
          className={cn(
            "rounded-md px-2 py-0.5 text-xs font-semibold",
            row.paidAt ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
          )}
        >
          {row.paidAt ? "Payés" : "Non payés"}
        </span>
        <span className="ml-auto flex items-center gap-1">
          {days !== null && (
            <span className={cn("text-[13px] font-medium", stale ? "text-red-700" : "text-muted-foreground")}>
              {days === 0 ? "< 1 j" : `${days} j`}
            </span>
          )}
          <LeaseActions row={row} />
        </span>
      </div>
      <Link href={`/interface/baux/${row.id}`} className="text-[15.5px] font-semibold leading-snug hover:underline">
        {address}
      </Link>
      <p className="text-[13.5px] text-muted-foreground">
        {partyName(owner) || "Propriétaire non renseigné"} →{" "}
        {tenant ? partyName(tenant) || "Sans nom" : <span className="text-amber-700">Locataire à ajouter</span>}
      </p>
      {action.actor !== "personne" && (
        <p className="text-[13.5px]">
          <strong className="font-semibold">{action.label}</strong>{" "}
          <span className="text-muted-foreground">· {ACTOR_LABELS[action.actor]}</span>
        </p>
      )}
      <p className="text-[13px] text-muted-foreground">Notaire : {notaire ? notaire.name || notaire.email : "non assigné"}</p>
      <LeaseRowActionButton row={row} className="h-11 w-full" />
    </div>
  );
}
