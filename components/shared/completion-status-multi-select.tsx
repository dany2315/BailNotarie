"use client";

import * as React from "react";
import { Check, ChevronDown, X, Circle, CircleDot, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CompletionStatus } from "@prisma/client";

interface CompletionStatusOption {
  value: CompletionStatus;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  colorClass: string;
}

const statusOptions: CompletionStatusOption[] = [
  {
    value: "NOT_STARTED",
    label: "Non commencé",
    shortLabel: "Non commencé",
    icon: <Circle className="size-3.5" />,
    colorClass: "text-slate-500 dark:text-slate-400",
  },
  {
    value: "PARTIAL",
    label: "Partiel",
    shortLabel: "Partiel",
    icon: <CircleDot className="size-3.5" />,
    colorClass: "text-amber-500 dark:text-amber-400",
  },
  {
    value: "PENDING_CHECK",
    label: "En vérification",
    shortLabel: "Vérif.",
    icon: <CircleDot className="size-3.5" />,
    colorClass: "text-blue-500 dark:text-blue-400",
  },
  {
    value: "COMPLETED",
    label: "Complété",
    shortLabel: "Complété",
    icon: <CheckCircle2 className="size-3.5" />,
    colorClass: "text-emerald-500 dark:text-emerald-400",
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
  placeholder = "Statut",
}: CompletionStatusMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (statusValue: CompletionStatus) => {
    const newValue = value.includes(statusValue)
      ? value.filter((v) => v !== statusValue)
      : [...value, statusValue];
    onValueChange?.(newValue);
  };

  const selectedStatuses = statusOptions.filter((option) =>
    value.includes(option.value)
  );

  const hasSelection = selectedStatuses.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full md:w-auto justify-between h-10 font-normal text-sm rounded-lg border-muted-foreground/20 gap-2",
            hasSelection && "border-primary/40 bg-primary/5"
          )}
          type="button"
        >
          <div className="flex items-center gap-2 min-w-0">
            {!hasSelection ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selectedStatuses.length === 1 ? (
              <div className="flex items-center gap-1.5">
                <span className={selectedStatuses[0].colorClass}>{selectedStatuses[0].icon}</span>
                <span className="hidden md:inline">{selectedStatuses[0].label}</span>
                <span className="md:hidden">{selectedStatuses[0].shortLabel}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {selectedStatuses.slice(0, 2).map((s) => (
                    <span key={s.value} className={cn("size-4 flex items-center justify-center rounded-full bg-background border", s.colorClass)}>
                      {s.icon}
                    </span>
                  ))}
                </div>
                <span className="text-sm font-medium">{selectedStatuses.length}</span>
              </div>
            )}
          </div>
          {hasSelection ? (
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange?.([]);
              }}
            >
              <X className="size-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          ) : (
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[200px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {statusOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer rounded-md px-2 py-2"
                  >
                    <div className="flex items-center gap-2.5 flex-1">
                      <div
                        className={cn(
                          "flex size-4 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>
                      <span className={cn("size-4 flex items-center justify-center", option.colorClass)}>
                        {option.icon}
                      </span>
                      <span className="flex-1 text-sm">{option.label}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

