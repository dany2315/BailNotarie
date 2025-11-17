"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";

interface PropertyCellProps {
  row: any;
}

export function PropertyOwnerCell({ row }: PropertyCellProps) {
  if (row.owner?.type === "NATURAL") {
    return <>{`${row.owner.person?.firstName || ""} ${row.owner.person?.lastName || ""}`.trim() || "-"}</>;
  }
  return <>{row.owner?.company?.legalName || "-"}</>;
}

export function PropertyStatusCell({ row }: PropertyCellProps) {
  return <StatusBadge status={row.status} />;
}


export function PropertyDateCell({ row }: PropertyCellProps) {
  return <>{formatDate(row.createdAt)}</>;
}










