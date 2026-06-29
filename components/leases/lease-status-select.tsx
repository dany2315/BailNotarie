"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BailStatus } from "@prisma/client";
import { updateLease } from "@/lib/actions/leases";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Home,
  CircleDot,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Clock,
} from "lucide-react";

interface LeaseStatusSelectProps {
  leaseId: string;
  currentStatus: BailStatus;
  className?: string;
}

const statusConfig: Record<
  BailStatus,
  { label: string; icon: React.ReactNode; textColor: string; bgColor: string }
> = {
  DRAFT: {
    label: "Brouillon",
    icon: <FileText className="size-3" />,
    textColor: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-50 dark:bg-slate-950/40",
  },
  AWAITING_TENANT: {
    label: "En attente du locataire",
    icon: <Home className="size-3" />,
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  AWAITING_TENANT_FORM: {
    label: "Formulaire locataire en attente",
    icon: <Clock className="size-3" />,
    textColor: "text-orange-700 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/40",
  },
  PENDING_VALIDATION: {
    label: "En cours de validation",
    icon: <CircleDot className="size-3" />,
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  READY_FOR_NOTARY: {
    label: "Prêt pour notaire",
    icon: <CheckCircle2 className="size-3" />,
    textColor: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  CLIENT_CONTACTED: {
    label: "Client contacté",
    icon: <PhoneCall className="size-3" />,
    textColor: "text-violet-700 dark:text-violet-300",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
  },
  SIGNED: {
    label: "Signé",
    icon: <CheckCircle2 className="size-3" />,
    textColor: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-50 dark:bg-green-950/40",
  },
  TERMINATED: {
    label: "Terminé",
    icon: <FileText className="size-3" />,
    textColor: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-900/40",
  },
  DESISTE: {
    label: "Désisté",
    icon: <XCircle className="size-3" />,
    textColor: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-950/40",
  },
  CLASSE_SANS_SUITE: {
    label: "Classé sans suite",
    icon: <XCircle className="size-3" />,
    textColor: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/40",
  },
};

export function LeaseStatusSelect({
  leaseId,
  currentStatus,
  className,
}: LeaseStatusSelectProps) {
  const [status, setStatus] = useState<BailStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: string) => {
    const bailStatus = newStatus as BailStatus;
    setStatus(bailStatus);
    startTransition(async () => {
      try {
        await updateLease({ id: leaseId, status: newStatus });
        toast.success("Statut du bail mis à jour");
      } catch {
        toast.error("Erreur lors de la mise à jour du statut");
        setStatus(currentStatus);
      }
    });
  };

  const currentConfig = statusConfig[status];

  return (
    <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
      <SelectTrigger
        className={cn(
          "cursor-pointer h-9 gap-1.5 text-xs font-medium border",
          currentConfig.bgColor,
          currentConfig.textColor,
          className
        )}
      >
        <SelectValue>
          <div className={cn("flex items-center gap-1.5", currentConfig.textColor)}>
            {currentConfig.icon}
            <span className="hidden sm:inline">{currentConfig.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(statusConfig) as [BailStatus, (typeof statusConfig)[BailStatus]][]).map(
          ([value, config]) => (
            <SelectItem key={value} value={value}>
              <div className={cn("flex items-center gap-2", config.textColor)}>
                {config.icon}
                <span className="font-medium">{config.label}</span>
              </div>
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}
