"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, FileText, CircleDot, CheckCircle2 } from "lucide-react";
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
import { BailStatus } from "@prisma/client";

interface BailStatusOption {
  value: BailStatus;
  label: string;
  icon: React.ReactNode;
}

const statusOptions: BailStatusOption[] = [
  {
    value: "DRAFT",
    label: "Brouillon",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    value: "PENDING_VALIDATION",
    label: "En validation",
    icon: <CircleDot className="h-4 w-4" />,
  },
  {
    value: "READY_FOR_NOTARY",
    label: "Prêt pour notaire",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: "SIGNED",
    label: "Signé",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    value: "TERMINATED",
    label: "Terminé",
    icon: <FileText className="h-4 w-4" />,
  },
];

interface BailStatusMultiSelectProps {
  value?: BailStatus[];
  onValueChange?: (value: BailStatus[]) => void;
  placeholder?: string;
}

export function BailStatusMultiSelect({
  value = [],
  onValueChange,
  placeholder = "Filtrer par statut",
}: BailStatusMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (statusValue: BailStatus) => {
    const newValue = value.includes(statusValue)
      ? value.filter((v) => v !== statusValue)
      : [...value, statusValue];
    onValueChange?.(newValue);
  };

  const handleRemove = (statusValue: BailStatus, e: React.MouseEvent) => {
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
                        {option.icon}
                        <span className="flex-1">{option.label}</span>
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
          {selectedStatuses.map((status) => (
            <Badge
              key={status.value}
              variant="secondary"
              className="text-xs pr-1"
            >
              <div className="flex items-center gap-1.5">
                {status.icon}
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
          ))}
        </div>
      )}
    </div>
  );
}







