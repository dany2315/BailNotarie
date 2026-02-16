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
      label: "Particulier",
      icon: <User className="size-4" />
    },
    PERSONNE_MORALE: { 
      variant: "default", 
      label: "Entreprise",
      icon: <Building2 className="size-4" />
    },
    // ProfilType
    PROPRIETAIRE: { 
      variant: "default", 
      label: "Propriétaire",
      icon: <Key className="size-4" />
    },
    LOCATAIRE: { 
      variant: "secondary", 
      label: "Locataire",
      icon: <Home className="size-4" />
    },
    LEAD: {
      variant: "outline",
      label: "Lead",
      icon: <CircleDot className="size-4" />
    },
    // PropertyStatus
    LOUER: { 
      variant: "default", 
      label: "Loué",
      icon: <CheckCircle2 className="size-4" />
    },
    NON_LOUER: { 
      variant: "outline", 
      label: "Non loué",
      icon: <XCircle className="size-4" />
    },
    // BailStatus
    DRAFT: { 
      variant: "outline", 
      label: "Brouillon",
      icon: <FileText className="size-4" />
    },
    PENDING_VALIDATION: { 
      variant: "secondary", 
      label: "En cours de validation",
      icon: <CircleDot className="size-4" />
    },
    READY_FOR_NOTARY: { 
      variant: "default", 
      label: "Prêt pour notaire",
      icon: <CheckCircle2 className="size-4" />
    },
    SIGNED: {
      variant: "default",
      label: "Signé",
      icon: <CheckCircle2 className="size-4" />
    },
    ACTIVE: {
      variant: "default",
      label: "Actif",
      icon: <CheckCircle2 className="size-4" />
    },
    TERMINATED: { 
      variant: "outline", 
      label: "Terminé",
      icon: <FileText className="size-4" />
    },
    CANCELED: { 
      variant: "destructive", 
      label: "Annulé",
      icon: <XCircle className="size-4" />
    },
    // IntakeLink status
    PENDING: { 
      variant: "secondary", 
      label: "En attente",
      icon: <CircleDot className="size-4" />
    },
    SUBMITTED: { 
      variant: "default", 
      label: "Soumis",
      icon: <CheckCircle2 className="size-4" />
    },
    EXPIRED: { 
      variant: "destructive", 
      label: "Expiré",
      icon: <XCircle className="size-4" />
    },
    REVOKED: { 
      variant: "destructive", 
      label: "Révoqué",
      icon: <XCircle className="size-4" />
    },
    // CompletionStatus
    NOT_STARTED: { 
      variant: "outline", 
      label: "Non commencé",
      icon: <Circle className="size-4" />
    },
    PARTIAL: { 
      variant: "outline", 
      label: "Partiellement complété",
      icon: <CircleDot className="size-4" />
    },
    PENDING_CHECK: { 
      variant: "outline", 
      label: "En cours de vérification",
      icon: <CircleDot className="size-4" />
    },
    COMPLETED: { 
      variant: "outline", 
      label: "Complété",
      icon: <CheckCircle2 className="size-4" />
    },
  };

  const config = variants[status] || { variant: "outline" as const, label: status, icon: null };

  // Classes de couleur personnalisées pour les statuts de complétion
  const completionStatusClasses: Record<string, string> = {
    NOT_STARTED: "!border-slate-300 !text-slate-700 !bg-slate-50 dark:!border-slate-600 dark:!text-slate-300 dark:!bg-slate-900/50 space-x-2 px-2 py-1",
    PARTIAL: "!border-amber-400 !text-amber-700 !bg-amber-50 dark:!border-amber-600 dark:!text-amber-400 dark:!bg-amber-950/40 space-x-2 px-2 py-1",
    PENDING_CHECK: "!border-blue-400 !text-blue-700 !bg-blue-50 dark:!border-blue-500 dark:!text-blue-300 dark:!bg-blue-950/40 space-x-2 px-2 py-1",
    COMPLETED: "!border-emerald-400 !text-emerald-700 !bg-emerald-50 dark:!border-emerald-500 dark:!text-emerald-300 dark:!bg-emerald-950/40 space-x-2 px-2 py-1",
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
      ) + "space-x-2 px-2 py-1"}
    >
      {config.icon}
      <span >{config.label}</span>
    </Badge>
  );
}

// Badge pour le type de bien
export function PropertyTypeBadge({ type, className }: { type: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    APPARTEMENT: {
      label: "Appartement",
      icon: <Building className="size-4" />,
      variant: "default"
    },
    MAISON: {
      label: "Maison",
      icon: <Home className="size-4" />,
      variant: "secondary"
    }
  };

  const config = configs[type] || { label: type, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className) + "space-x-2 px-2 py-1"}>
      {config.icon}
      <span >{config.label}</span>
    </Badge>
  );
}

// Badge pour le statut légal du bien
export function PropertyLegalStatusBadge({ status, className }: { status: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    PLEIN_PROPRIETE: {
      label: "Plein propriété",
      icon: <Shield className="size-4" />,
      variant: "default"
    },
    CO_PROPRIETE: {
      label: "Copropriété",
      icon: <Users className="size-4" />,
      variant: "secondary"
    },
    LOTISSEMENT: {
      label: "Lotissement",
      icon: <Map className="size-4" />,
      variant: "outline"
    }
  };

  const config = configs[status] || { label: status, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className) + "space-x-2 px-2 py-1"}>
      {config.icon}
      <span >{config.label}</span>
    </Badge>
  );
}

// Badge pour le statut familial
export function FamilyStatusBadge({ status, className }: { status: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    CELIBATAIRE: {
      label: "Célibataire",
      icon: <User className="size-4" />,
      variant: "outline"
    },
    MARIE: {
      label: "Marié(e)",
      icon: <Heart className="size-4" />,
      variant: "default"
    },
    DIVORCE: {
      label: "Divorcé(e)",
      icon: <HeartOff className="size-4" />,
      variant: "outline"
    },
    VEUF: {
      label: "Veuf(ve)",
      icon: <HeartOff className="size-4" />,
      variant: "outline"
    },
    PACS: {
      label: "Pacsé(e)",
      icon: <Sparkles className="size-4" />,
      variant: "secondary"
    }
  };

  const config = configs[status] || { label: status, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className) + "space-x-2 px-2 py-1"}>
      {config.icon}
      <span >{config.label}</span>
    </Badge>
  );
}

// Badge pour le régime matrimonial
export function MatrimonialRegimeBadge({ regime, className }: { regime: string; className?: string }) {
  const configs: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "secondary" | "outline" }> = {
    COMMUNAUTE_REDUITE: {
      label: "Communauté réduite aux acquêts",
      icon: <Sparkles className="size-4" />,
      variant: "default"
    },
    SEPARATION_DE_BIENS: {
      label: "Séparation de biens",
      icon: <Shield className="size-4" />,
      variant: "secondary"
    },
    PARTICIPATION_AUX_AQUETS: {
      label: "Participation aux acquêts",
      icon: <Sparkles className="size-4" />,
      variant: "secondary"
    },
    COMMUNAUTE_UNIVERSELLE: {
      label: "Communauté universelle",
      icon: <Sparkles className="size-4" />,
      variant: "default"
    }
  };

  const config = configs[regime] || { label: regime, icon: null, variant: "outline" as const };

  return (
    <Badge variant={config.variant} className={cn(className) + "space-x-2 px-2 py-1"}>
      {config.icon}
      <span >{config.label}</span>  
    </Badge>
  );
}
