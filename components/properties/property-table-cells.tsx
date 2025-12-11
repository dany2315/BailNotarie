"use client";

import Link from "next/link";
import { ArrowRight, Building2, User } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { ClientType } from "@prisma/client";

interface PropertyCellProps {
  row: any;
}

export function PropertyFullAddressCell({ row }: PropertyCellProps) {
  if (!row?.id) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  const address = row.fullAddress || "-";
  
  return (
    <Link
      href={`/interface/properties/${row.id}`}
      className="flex items-center gap-2 font-medium hover:underline group w-full"
    >
      {address}
      <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
    </Link>
  );
}

export function PropertyOwnerCell({ row }: PropertyCellProps) {
  if (row.owner?.type === ClientType.PERSONNE_PHYSIQUE) {
    const primaryPerson = row.owner.persons?.find((p: any) => p.isPrimary) || row.owner.persons?.[0];
    const name = primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : `${row.owner.firstName || ""} ${row.owner.lastName || ""}`.trim();
    const email = primaryPerson?.email || row.owner.email;
    const hasMultiplePersons = row.owner.persons && row.owner.persons.length > 1;
    
    return (
      <div className="flex flex-col gap-1">
        <Link href={`/interface/clients/${row.owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
          <User className="size-4 text-muted-foreground" />
          <span>{name || email || "-"}</span>
          <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
        </Link>
        {hasMultiplePersons && (
          <span className="text-xs text-muted-foreground ml-6">
            +{row.owner.persons.length - 1} autre{row.owner.persons.length - 1 > 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }
  if (row.owner?.type === ClientType.PERSONNE_MORALE) {
    return (
      <Link href={`/interface/clients/${row.owner.id}`} className="flex items-center gap-2 font-medium hover:underline group w-full">
        <Building2 className="size-4 text-muted-foreground" />
        {row.owner.entreprise?.legalName || row.owner.entreprise?.name || row.owner?.legalName || row.owner.email || "-"}
        <ArrowRight className="size-4 -rotate-45 group-hover:text-foreground text-background" />
      </Link>
    );
  }
  return <span className="text-muted-foreground">-</span>;
}

export function PropertyStatusCell({ row }: PropertyCellProps) {
  return <StatusBadge status={row.status} />;
}


export function PropertyDateCell({ row }: PropertyCellProps) {
  return <>{formatDate(row.createdAt)}</>;
}










