"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { ArrowRight, Building2, User } from "lucide-react";
import Link from "next/link";

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
    const name = `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim();
    return <>
    <Link href={`/interface/clients/${tenant.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
      <User className="size-4 text-muted-foreground" />
      {name || tenant.email || "-"}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
    </Link>
    </>;
  }
  
  if (tenant.type === "PERSONNE_MORALE") {
    return <>
    <Link href={`/interface/clients/${tenant.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
      <Building2 className="size-4 text-muted-foreground" />
      {tenant.legalName || "-"}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
    </Link>
    </>;
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
      return <>
      <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <User className="size-4 text-muted-foreground" />
        {name || owner.email || "-"}
        <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
      </Link>
      </>;
    }
    
    if (owner.type === "PERSONNE_MORALE") {
      return <>
      <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <Building2 className="size-4 text-muted-foreground" />
        {owner.legalName || "-"}
        <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
      </Link>
      </>;
    }
    
    return <span className="text-muted-foreground">-</span>;
  }
  
  const owner = row.property.owner;
  
  // Afficher le nom selon le type de client
  if (owner.type === "PERSONNE_PHYSIQUE") {
    const name = `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
    return <>
    <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
      <User className="size-4 text-muted-foreground" />
      {name || owner.email || "-"}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
    </Link>
    </>;
  }
  
  if (owner.type === "PERSONNE_MORALE") {
    return <>
    <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
      <Building2 className="size-4 text-muted-foreground" />
      {owner.legalName || "-"}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background " />
    </Link>
    </>;
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

