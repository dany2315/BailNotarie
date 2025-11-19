"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { ClientType, ProfilType, CompletionStatus } from "@prisma/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface ClientCellProps {
  row: any;
}

export function ClientTypeCell({ row }: ClientCellProps) {
  if (!row?.type) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <StatusBadge status={row.type} />;
}

export function ClientProfilTypeCell({ row }: ClientCellProps) {
  if (!row?.profilType) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <Link href={`/interface/clients/${row.id}`} className="flex items-center gap-2 font-medium  group">
    <StatusBadge status={row.profilType} />
    <ArrowRight className="size-3 -rotate-45 group-hover:text-foreground text-background transition-colors" />
    </Link>;
}

export function ClientNameCell({ row }: ClientCellProps) {
  if (!row) {
    return <span className="text-muted-foreground">-</span>;
  }
  
  if (row.type === ClientType.PERSONNE_PHYSIQUE) {
    const name = `${row.firstName || ""} ${row.lastName || ""}`.trim();
    return <>{name || "-"}</>;
  }
  
  if (row.type === ClientType.PERSONNE_MORALE) {
    return <>{row.legalName || "-"}</>;
  }
  
  return <span className="text-muted-foreground">-</span>;
}

export function ClientDateCell({ row }: ClientCellProps) {
  if (!row?.createdAt) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <>{formatDate(row.createdAt)}</>;
}

export function ClientCreatedByCell({ row }: ClientCellProps) {
  if (!row?.createdBy) {
    return <span className="text-muted-foreground">-</span>;
  }

  const user = row.createdBy;
  const displayName = user.name || user.email || "Utilisateur inconnu";
  const initials = user.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.image || ""} alt={displayName} />
            <AvatarFallback className="bg-indigo-200 text-white text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p>{displayName}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ClientCompletionStatusCell({ row }: ClientCellProps) {
  if (!row?.completionStatus) {
    return <span className="text-muted-foreground">-</span>;
  }
  return <StatusBadge status={row.completionStatus as CompletionStatus} />;
}




