"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { ClientType, ProfilType, CompletionStatus } from "@prisma/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import Link from "next/link";
import { ArrowRight, Mail, Phone, Building2, User, Calendar } from "lucide-react";

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
  
  // Fonction pour obtenir tous les emails
  const getAllEmails = () => {
    if (row.type === ClientType.PERSONNE_PHYSIQUE) {
      const emails: string[] = [];
      if (row.persons && row.persons.length > 0) {
        row.persons.forEach((person: any) => {
          if (person.email) emails.push(person.email);
        });
      }
      if (row.email && !emails.includes(row.email)) emails.push(row.email);
      return emails;
    }
    if (row.type === ClientType.PERSONNE_MORALE) {
      const emails: string[] = [];
      if (row.entreprise?.email) emails.push(row.entreprise.email);
      if (row.email && !emails.includes(row.email)) emails.push(row.email);
      return emails;
    }
    return row.email ? [row.email] : [];
  };

  // Fonction pour obtenir tous les téléphones
  const getAllPhones = () => {
    if (row.type === ClientType.PERSONNE_PHYSIQUE) {
      const phones: string[] = [];
      if (row.persons && row.persons.length > 0) {
        row.persons.forEach((person: any) => {
          if (person.phone) phones.push(person.phone);
        });
      }
      if (row.phone && !phones.includes(row.phone)) phones.push(row.phone);
      return phones;
    }
    if (row.type === ClientType.PERSONNE_MORALE) {
      const phones: string[] = [];
      if (row.entreprise?.phone) phones.push(row.entreprise.phone);
      if (row.phone && !phones.includes(row.phone)) phones.push(row.phone);
      return phones;
    }
    return row.phone ? [row.phone] : [];
  };

  // Fonction pour obtenir le nom d'affichage (insensible à row.type manquant ou incohérent)
  const getDisplayName = () => {
    if (row.type === ClientType.PERSONNE_PHYSIQUE || (row.persons && row.persons.length > 0)) {
      const primaryPerson = row.persons?.find((p: any) => p.isPrimary) || row.persons?.[0];
      if (primaryPerson) {
        const name = `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim();
        if (name) return name;
      }
      const fallback = `${(row as { firstName?: string }).firstName || ""} ${(row as { lastName?: string }).lastName || ""}`.trim();
      if (fallback) return fallback;
    }
    if (row.type === ClientType.PERSONNE_MORALE || row.entreprise) {
      const name = (row as { legalName?: string }).legalName || row.entreprise?.legalName || row.entreprise?.name;
      if (name) return name;
    }
    return "-";
  };

  const displayName = getDisplayName();
  const emails = getAllEmails();
  const phones = getAllPhones();
  const hasMultiplePersons = row.type === ClientType.PERSONNE_PHYSIQUE && row.persons && row.persons.length > 1;

  if (row.type === ClientType.PERSONNE_PHYSIQUE) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex flex-col gap-1 cursor-pointer">
            <span className="font-medium hover:underline">{displayName || "-"}</span>
            {hasMultiplePersons && (
              <span className="text-xs text-muted-foreground">
                +{row.persons.length - 1} autre{row.persons.length - 1 > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {hasMultiplePersons ? `${row.persons.length} personne${row.persons.length > 1 ? "s" : ""}` : "Particulier"}
                </p>
              </div>
            </div>
            
            {emails.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Email{emails.length > 1 ? "s" : ""}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {emails.map((email, index) => (
                    <p key={index} className="text-xs text-muted-foreground">{email}</p>
                  ))}
                </div>
              </div>
            )}

            {phones.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Téléphone{phones.length > 1 ? "s" : ""}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {phones.map((phone, index) => (
                    <p key={index} className="text-xs text-muted-foreground">{phone}</p>
                  ))}
                </div>
              </div>
            )}

            {row.createdAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Créé le {formatDate(row.createdAt)}</span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }
  
  if (row.type === ClientType.PERSONNE_MORALE) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <span className="font-medium cursor-pointer hover:underline">{displayName}</span>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-semibold">{displayName}</p>
                <p className="text-xs text-muted-foreground">Entreprise</p>
              </div>
            </div>
            
            {emails.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Email{emails.length > 1 ? "s" : ""}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {emails.map((email, index) => (
                    <p key={index} className="text-xs text-muted-foreground">{email}</p>
                  ))}
                </div>
              </div>
            )}

            {phones.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Téléphone{phones.length > 1 ? "s" : ""}</span>
                </div>
                <div className="pl-6 space-y-0.5">
                  {phones.map((phone, index) => (
                    <p key={index} className="text-xs text-muted-foreground">{phone}</p>
                  ))}
                </div>
              </div>
            )}

            {row.createdAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>Créé le {formatDate(row.createdAt)}</span>
              </div>
            )}
          </div>
        </HoverCardContent>
      </HoverCard>
    );
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
    return <span className="text-muted-foreground">via formulaire</span>;
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

export function ClientEmailCell({ row }: ClientCellProps) {
  if (!row) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Collecter tous les emails depuis toutes les sources (insensible à row.type manquant ou incohérent)
  const emails: string[] = [];
  const add = (email: string | null | undefined) => {
    if (email && typeof email === "string" && email.trim() && !emails.includes(email)) {
      emails.push(email.trim());
    }
  };
  if (row.persons && Array.isArray(row.persons)) {
    row.persons.forEach((person: { email?: string | null }) => add(person?.email));
  }
  if (row.entreprise?.email) add(row.entreprise.email);
  if ((row as { email?: string | null }).email) add((row as { email?: string | null }).email);

  if (emails.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="text-sm" title={emails.length > 1 ? emails.join(", ") : undefined}>
      {emails.join(", ")}
    </span>
  );
}

export function ClientPhoneCell({ row }: ClientCellProps) {
  if (!row) {
    return <span className="text-muted-foreground">-</span>;
  }

  // Collecter tous les téléphones depuis toutes les sources (insensible à row.type manquant ou incohérent)
  const phones: string[] = [];
  const add = (phone: string | null | undefined) => {
    if (phone && typeof phone === "string" && phone.trim() && !phones.includes(phone)) {
      phones.push(phone.trim());
    }
  };
  if (row.persons && Array.isArray(row.persons)) {
    row.persons.forEach((person: { phone?: string | null }) => add(person?.phone));
  }
  if (row.entreprise?.phone) add(row.entreprise.phone);
  if ((row as { phone?: string | null }).phone) add((row as { phone?: string | null }).phone);

  if (phones.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="text-sm" title={phones.length > 1 ? phones.join(", ") : undefined}>
      {phones.join(", ")}
    </span>
  );
}





