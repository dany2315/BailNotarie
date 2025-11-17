"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { CopyButton } from "@/components/shared/copy-button";

interface IntakeCellProps {
  row: any;
}

export function IntakeTokenCell({ row }: IntakeCellProps) {
  if (!row?.token) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1 rounded">
        {row.token.slice(0, 8)}...
      </code>
      <CopyButton
        text={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/intakes/${row.token}`}
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
    <StatusBadge
      status={row.target}
      className={row.target === "OWNER" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}
    />
  );
}

export function IntakePropertyCell({ row }: IntakeCellProps) {
  if (!row) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{row.property?.fullAddress || row.lease?.id || "-"}</>;
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

