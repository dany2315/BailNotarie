"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { CopyButton } from "@/components/shared/copy-button";
import Link from "next/link";
import { Building2, User2 } from "lucide-react";
import { ClientType } from "@prisma/client";

interface IntakeCellProps {
  row: any;
}

export function IntakeTokenCell({ row }: IntakeCellProps) {
  if (!row?.token) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  // Pour les leads, le lien doit pointer vers /convert
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const urlPath = row.target === "LEAD" 
    ? `/intakes/${row.token}/convert`
    : `/intakes/${row.token}`;
  const fullUrl = `${baseUrl}${urlPath}`;
  
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1 rounded">
        {row.token.slice(0, 8)}...
      </code>
      <CopyButton
        text={fullUrl}
        label="Copier l'URL"
      />
    </div>
  );
}

export function IntakeTargetCell({ row }: IntakeCellProps) {
  if (!row?.target) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <Link href={row.target === "LEAD" ? `/intakes/${row.token}/convert` : `/intakes/${row.token}`} target="_blank">
    <StatusBadge
      status={row.target === "OWNER" ? "PROPRIETAIRE" :row.target === "TENANT" ? "LOCATAIRE" : "LEAD"}
      className={row.target === "OWNER" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
    />
    </Link>
  );
}

export function IntakePropertyCell({ row }: IntakeCellProps) {
  if (!row) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>
  <Link href={`/interface/clients/${row.client?.id}`} target="_blank" >
  <div className="flex items-center gap-2 font-medium hover:underline group w-full">
    {row.client?.type === ClientType.PERSONNE_PHYSIQUE && <User2 className="size-4 text-muted-foreground" />}
    {row.client?.type === ClientType.PERSONNE_MORALE && <Building2 className="size-4 text-muted-foreground" />}
    {row.client?.firstName || row.client?.lastName ||row.client?.legalName ||row.client?.email || row.client?.phone || "-"}
  </div>
  </Link>
  </>
}

export function IntakeStatusCell({ row }: IntakeCellProps) {
  if (!row?.status) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <StatusBadge status={row.status} />;
}

export function IntakeExpiresAtCell({ row }: IntakeCellProps) {
  if (!row?.expiresAt) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatDate(row.expiresAt)}</>;
}

export function IntakeSubmittedAtCell({ row }: IntakeCellProps) {
  if (!row?.submittedAt) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatDate(row.submittedAt)}</>;
}

