"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  User, 
  Building2, 
  Key, 
  Home, 
  Shield, 
  Users, 
  Map, 
  CheckCircle2, 
  XCircle, 
  Circle, 
  CircleDot, 
  FileText, 
  Heart, 
  HeartOff,
  Building,
  Sparkles
} from "lucide-react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variants: Record<string, { 
    variant: "default" | "secondary" | "destructive" | "outline"; 
    label: string;
    icon?: React.ReactNode;
  }> = {
    // ClientType
    PERSONNE_PHYSIQUE: { 
      variant: "default", 
      label: "Personne physique",
      icon: <User className="size-3" />
    },
    PERSONNE_MORALE: { 
      variant: "default", 
      label: "Personne morale",
      icon: <Building2 className="size-3" />
    },
    // ProfilType
    PROPRIETAIRE: { 
      variant: "default", 
      label: "Propriétaire",
      icon: <Key className="size-3" />
    },
    LOCATAIRE: { 
      variant: "secondary", 
      label: "Locataire",
      icon: <Home className="size-3" />
    },
    LEAD: {
      variant: "outline",
      label: "Lead",
      icon: <CircleDot className="size-3" />
    },
    // PropertyStatus
    LOUER: { 
      variant: "default", 
      label: "Loué",
      icon: <CheckCircle2 className="size-3" />
    },
    NON_LOUER: { 
      variant: "outline", 
      label: "Non loué",
      icon: <XCircle className="size-3" />
    },
    // BailStatus
    DRAFT: { 
      variant: "outline", 
      label: "Brouillon",
      icon: <FileText className="size-3" />
    },
    PENDING_VALIDATION: { 
      variant: "secondary", 
      label: "En validation",
      icon: <CircleDot className="size-3" />
    },
    READY_FOR_NOTARY: { 
      variant: "default", 
      label: "Prêt pour notaire",
      icon: <CheckCircle2 className="size-3" />
    },
    SIGNED: {
      variant: "default",
      label: "Signé",
      icon: <CheckCircle2 className="size-3" />
    },
    ACTIVE: {
      variant: "default",
      label: "Actif",
      icon: <CheckCircle2 className="size-3" />
    },
    TERMINATED: { 
      variant: "outline", 
      label: "Terminé",
      icon: <FileText className="size-3" />
    },
    CANCELED: { 
      variant: "destructive", 
      label: "Annulé",
      icon: <XCircle className="size-3" />
    },
    // IntakeLink status
    PENDING: { 
      variant: "secondary", 
      label: "En attente",
      icon: <CircleDot className="size-3" />
    },
    SUBMITTED: { 
      variant: "default", 
      label: "Soumis",
      icon: <CheckCircle2 className="size-3" />
    },
    EXPIRED: { 
      variant: "destructive", 
      label: "Expiré",
      icon: <XCircle className="size-3" />
    },
    REVOKED: { 
      variant: "destructive", 
      label: "Révoqué",
      icon: <XCircle className="size-3" />
    },
    // CompletionStatus
    NOT_STARTED: { 
      variant: "outline", 
      label: "Non commencé",
      icon: <Circle className="size-3" />
    },
    PARTIAL: { 
      variant: "outline", 
      label: "Partiel",
      icon: <CircleDot className="size-3" />
    },
    PENDING_CHECK: { 
      variant: "outline", 
      label: "En vérification",
      icon: <CircleDot className="size-3" />
    },
    COMPLETED: { 
      variant: "outline", 
      label: "Complété",
      icon: <CheckCircle2 className="size-3" />
    },
  };

  const config = variants[status] || { variant: "outline" as const, label: status, icon: null };

  // Classes de couleur personnalisées pour les statuts de complétion
  const completionStatusClasses: Record<string, string> = {
    NOT_STARTED: "!border-slate-300 !text-slate-700 !bg-slate-50 dark:!border-slate-600 dark:!text-slate-300 dark:!bg-slate-900/50",
    PARTIAL: "!border-amber-400 !text-amber-700 !bg-amber-50 dark:!border-amber-600 dark:!text-amber-400 dark:!bg-amber-950/40",
    PENDING_CHECK: "!border-blue-400 !text-blue-700 !bg-blue-50 dark:!border-blue-500 dark:!text-blue-300 dark:!bg-blue-950/40",
    COMPLETED: "!border-emerald-400 !text-emerald-700 !bg-emerald-50 dark:!border-emerald-500 dark:!text-emerald-300 dark:!bg-emerald-950/40",
  };

  // Appliquer les classes personnalisées pour les statuts de complétion
  const isCompletionStatus = ["NOT_STARTED", "PARTIAL", "PENDING_CHECK", "COMPLETED"].includes(status);
  const customClasses = isCompletionStatus ? completionStatusClasses[status] : "";

  return (
    <Badge 
      variant={config.variant} 
      className={cn(
        isCompletionStatus && "font-medium",
        customClasses,
        className
      )}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Badge pour le type de bien
export function PropertyTypeBadge({ type, className }: { type: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    APPARTEMENT: {
      label: "Appartement",
      icon: <Building className="size-3" />,
      variant: "default"
    },
    MAISON: {
      label: "Maison",
      icon: <Home className="size-3" />,
      variant: "secondary"
    }
  };

  const config = configs[type] || { label: type, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Badge pour le statut légal du bien
export function PropertyLegalStatusBadge({ status, className }: { status: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    PLEIN_PROPRIETE: {
      label: "Plein propriété",
      icon: <Shield className="size-3" />,
      variant: "default"
    },
    CO_PROPRIETE: {
      label: "Copropriété",
      icon: <Users className="size-3" />,
      variant: "secondary"
    },
    LOTISSEMENT: {
      label: "Lotissement",
      icon: <Map className="size-3" />,
      variant: "outline"
    }
  };

  const config = configs[status] || { label: status, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Badge pour le statut familial
export function FamilyStatusBadge({ status, className }: { status: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    CELIBATAIRE: {
      label: "Célibataire",
      icon: <User className="size-3" />,
      variant: "outline"
    },
    MARIE: {
      label: "Marié(e)",
      icon: <Heart className="size-3" />,
      variant: "default"
    },
    DIVORCE: {
      label: "Divorcé(e)",
      icon: <HeartOff className="size-3" />,
      variant: "outline"
    },
    VEUF: {
      label: "Veuf(ve)",
      icon: <HeartOff className="size-3" />,
      variant: "outline"
    },
    PACS: {
      label: "Pacsé(e)",
      icon: <Sparkles className="size-3" />,
      variant: "secondary"
    }
  };

  const config = configs[status] || { label: status, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// Badge pour le régime matrimonial
export function MatrimonialRegimeBadge({ regime, className }: { regime: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    COMMUNAUTE_REDUITE: {
      label: "Communauté réduite aux acquêts",
      icon: <Sparkles className="size-3" />,
      variant: "default"
    },
    SEPARATION_DE_BIENS: {
      label: "Séparation de biens",
      icon: <Shield className="size-3" />,
      variant: "secondary"
    },
    PARTICIPATION_AUX_AQUETS: {
      label: "Participation aux acquêts",
      icon: <Sparkles className="size-3" />,
      variant: "secondary"
    },
    COMMUNAUTE_UNIVERSELLE: {
      label: "Communauté universelle",
      icon: <Sparkles className="size-3" />,
      variant: "default"
    }
  };

  const config = configs[regime] || { label: regime, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className)}>
      {config.icon}
      {config.label}
    </Badge>
  );
}
