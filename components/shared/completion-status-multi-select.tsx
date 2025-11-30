"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CompletionStatus } from "@prisma/client";

interface CompletionStatusOption {
  value: CompletionStatus;
  label: string;
  icon: React.ReactNode;
  colorClasses: string;
}

const statusOptions: CompletionStatusOption[] = [
  {
    value: "NOT_STARTED",
    label: "Non commencé",
    icon: <Circle className="h-4 w-4" />,
    colorClasses: "text-slate-700 dark:text-slate-300",
  },
  {
    value: "PARTIAL",
    label: "Partiel",
    icon: <CircleDot className="h-4 w-4" />,
    colorClasses: "text-amber-700 dark:text-amber-400",
  },
  {
    value: "PENDING_CHECK",
    label: "En vérification",
    icon: <CircleDot className="h-4 w-4" />,
    colorClasses: "text-blue-700 dark:text-blue-300",
  },
  {
    value: "COMPLETED",
    label: "Complété",
    icon: <CheckCircle2 className="h-4 w-4" />,
    colorClasses: "text-emerald-700 dark:text-emerald-300",
  },
];

interface CompletionStatusMultiSelectProps {
  value?: CompletionStatus[];
  onValueChange?: (value: CompletionStatus[]) => void;
  placeholder?: string;
}

export function CompletionStatusMultiSelect({
  value = [],
  onValueChange,
  placeholder = "Filtrer par statut",
}: CompletionStatusMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (statusValue: CompletionStatus) => {
    const newValue = value.includes(statusValue)
      ? value.filter((v) => v !== statusValue)
      : [...value, statusValue];
    onValueChange?.(newValue);
  };

  const handleRemove = (statusValue: CompletionStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = value.filter((v) => v !== statusValue);
    onValueChange?.(newValue);
  };

  const selectedStatuses = statusOptions.filter((option) =>
    value.includes(option.value)
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between h-9 font-normal"
            type="button"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedStatuses.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {selectedStatuses.length === 1 ? (
                    <div className="flex items-center gap-1.5">
                      {selectedStatuses[0].icon}
                      <span className="truncate">{selectedStatuses[0].label}</span>
                    </div>
                  ) : (
                    <span className="text-sm">
                      {selectedStatuses.length} statuts sélectionnés
                    </span>
                  )}
                </div>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Rechercher un statut..." />
            <CommandList>
              <CommandEmpty>Aucun statut trouvé.</CommandEmpty>
              <CommandGroup>
                {statusOptions.map((option) => {
                  const isSelected = value.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => handleSelect(option.value)}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50 [&_svg]:invisible"
                          )}
                        >
                          <Check className="h-3 w-3" />
                        </div>
                        <span className={cn(option.colorClasses)}>{option.icon}</span>
                        <span className={cn("flex-1", option.colorClasses)}>{option.label}</span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedStatuses.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedStatuses.map((status) => {
            const statusOption = statusOptions.find(opt => opt.value === status.value);
            const colorClasses = statusOption?.colorClasses || "";
            const badgeClasses: Record<string, string> = {
              NOT_STARTED: "!border-slate-300 !text-slate-700 !bg-slate-50 dark:!border-slate-600 dark:!text-slate-300 dark:!bg-slate-900/50",
              PARTIAL: "!border-amber-400 !text-amber-700 !bg-amber-50 dark:!border-amber-600 dark:!text-amber-400 dark:!bg-amber-950/40",
              PENDING_CHECK: "!border-blue-400 !text-blue-700 !bg-blue-50 dark:!border-blue-500 dark:!text-blue-300 dark:!bg-blue-950/40",
              COMPLETED: "!border-emerald-400 !text-emerald-700 !bg-emerald-50 dark:!border-emerald-500 dark:!text-emerald-300 dark:!bg-emerald-950/40",
            };
            
            return (
              <Badge
                key={status.value}
                variant="outline"
                className={cn("text-xs pr-1 font-medium", badgeClasses[status.value] || "")}
              >
                <div className="flex items-center gap-1.5">
                  <span className={colorClasses}>{status.icon}</span>
                  <span>{status.label}</span>
                  <button
                    type="button"
                    className="ml-0.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRemove(status.value, e as any);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => handleRemove(status.value, e)}
                  >
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

