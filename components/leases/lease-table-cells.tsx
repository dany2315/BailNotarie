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
    const primaryPerson = tenant.persons?.find((p: any) => p.isPrimary) || tenant.persons?.[0];
    const name = primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim();
    const email = primaryPerson?.email || tenant.email;
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
      const primaryPerson = owner.persons?.find((p: any) => p.isPrimary) || owner.persons?.[0];
      const name = primaryPerson
        ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
        : `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
      const email = primaryPerson?.email || owner.email;
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
      return (
        <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
          <Building2 className="size-4 text-muted-foreground" />
          {owner.entreprise?.legalName || owner.entreprise?.name || owner.legalName || "-"}
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
      : `${owner.firstName || ""} ${owner.lastName || ""}`.trim();
    const email = primaryPerson?.email || owner.email;
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
    return (
      <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <Building2 className="size-4 text-muted-foreground" />
        {owner.entreprise?.legalName || owner.entreprise?.name || owner.legalName || "-"}
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

export function LeaseDepositCell({ row }: LeaseCellProps) {
  if (!row?.securityDeposit) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatCurrency(Number(row.securityDeposit))}</>;
}

