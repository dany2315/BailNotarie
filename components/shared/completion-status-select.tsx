"use client";

import { useState, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CompletionStatus } from "@prisma/client";
import { updateClientCompletionStatus } from "@/lib/actions/clients";
import { updatePropertyCompletionStatus } from "@/lib/actions/properties";
import { toast } from "sonner";
import { StatusBadge } from "./status-badge";
import { Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompletionStatusSelectProps {
  type: "client" | "property";
  id: string;
  currentStatus: CompletionStatus;
  className?: string;
  viewLabel?: boolean;
  asChild?: boolean;
}

const statusLabels: Record<CompletionStatus, string> = {
  NOT_STARTED: "Non commencé",
  PARTIAL: "Partiel",
  PENDING_CHECK: "En vérification",
  COMPLETED: "Complété",
};

const statusConfig: Record<CompletionStatus, { 
  label: string; 
  icon: React.ReactNode;
  textColor: string;
  bgColor: string;
}> = {
  NOT_STARTED: {
    label: "Non commencé",
    icon: <Circle className="size-3 text-slate-700 dark:text-slate-300" />,
    textColor: "text-slate-700 dark:text-slate-300",
    bgColor: "bg-slate-50 dark:bg-slate-950/40",
  },
  PARTIAL: {
    label: "Partiel",
    icon: <CircleDot className="size-3 text-amber-700 dark:text-amber-400" />,
    textColor: "text-amber-700 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/40",
  },
  PENDING_CHECK: {
    label: "En vérification",
    icon: <CircleDot className="size-3 text-blue-700 dark:text-blue-300" />,
    textColor: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
  },
  COMPLETED: {
    label: "Complété",
    icon: <CheckCircle2 className="size-3 text-emerald-700 dark:text-emerald-300" />,
    textColor: "text-emerald-700 dark:text-emerald-300",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
  },
};

export function CompletionStatusSelect({
  type,
  id,
  currentStatus,
  className,
  viewLabel = true,
  asChild = false,
}: CompletionStatusSelectProps) {
  const [status, setStatus] = useState<CompletionStatus>(currentStatus);
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (newStatus: CompletionStatus) => {
    setStatus(newStatus);
    startTransition(async () => {
      try {
        if (type === "client") {
          await updateClientCompletionStatus({ id, completionStatus: newStatus });
        } else {
          await updatePropertyCompletionStatus({ id, completionStatus: newStatus });
        }
        toast.success("Statut de complétion mis à jour");
      } catch (error) {
        toast.error("Erreur lors de la mise à jour du statut");
        setStatus(currentStatus); // Revert on error
      }
    });
  };

  const currentConfig = statusConfig[status];

  const selectContent = (
    <Select
      value={status}
      onValueChange={handleStatusChange}
      disabled={isPending}
    >
      <SelectTrigger className={cn(className ? `cursor-pointer ${className}` : "cursor-pointer", currentConfig.bgColor)}>
        <SelectValue>
          <div className={cn("flex items-center gap-2", currentConfig.textColor)}>
            {currentConfig.icon}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, config]) => (
          <SelectItem key={value} value={value} >
            <div className={cn("flex items-center gap-2", config.textColor)}>
              {config.icon}
              <span className="font-medium">
                {config.label}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (asChild || !viewLabel) {
    return selectContent;
  }

  return (
    <div className="flex flex-col items-end justify-between">
      <label className="text-sm font-medium text-muted-foreground mb-2 block">
        Statut de complétion
      </label>
      {selectContent}
    </div>
  );
}


