"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";

interface LeaseCellProps {
  row: any;
}

export function LeaseReferenceCell({ row }: LeaseCellProps) {
  if (!row?.id) {
    return <span className="text-muted-foreground">-</span>;
  }
  // Utiliser les 8 derniers caractères de l'ID comme numéro de référence
  const reference = row.id.slice(-8).toUpperCase();
  return <span className="font-mono text-sm font-medium">#{reference}</span>;
}

export function LeasePropertyCell({ row }: LeaseCellProps) {
  if (!row?.property) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{row.property.fullAddress || "-"}</>;
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
    const name = `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim();
    return <>{name || tenant.email || "-"}</>;
  }
  
  if (tenant.type === "PERSONNE_MORALE") {
    return <>{tenant.legalName || "-"}</>;
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
      const name = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
      return <>{name || owner.email || "-"}</>;
    }
    
    if (owner.type === "PERSONNE_MORALE") {
      return <>{owner.legalName || "-"}</>;
    }
    
    return <span className="text-muted-foreground">-</span>;
  }
  
  const owner = row.property.owner;
  
  // Afficher le nom selon le type de client
  if (owner.type === "PERSONNE_PHYSIQUE") {
    const name = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
    return <>{name || owner.email || "-"}</>;
  }
  
  if (owner.type === "PERSONNE_MORALE") {
    return <>{owner.legalName || "-"}</>;
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

export function LeaseDepositCell({ row }: LeaseCellProps) {
  if (!row?.securityDeposit) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatCurrency(Number(row.securityDeposit))}</>;
}

