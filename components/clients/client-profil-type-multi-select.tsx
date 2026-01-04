"use client";

import * as React from "react";
import { Check, ChevronDown, X, User, UserPlus, Key } from "lucide-react";
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
import { ProfilType } from "@prisma/client";

interface ProfilOption {
  value: ProfilType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  colorClass: string;
}

const profilOptions: ProfilOption[] = [
  {
    value: "PROPRIETAIRE",
    label: "Propriétaire",
    shortLabel: "Proprio",
    icon: <Key className="size-3.5" />,
    colorClass: "text-blue-600 dark:text-blue-400",
  },
  {
    value: "LOCATAIRE",
    label: "Locataire",
    shortLabel: "Locataire",
    icon: <User className="size-3.5" />,
    colorClass: "text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "LEAD",
    label: "Lead",
    shortLabel: "Lead",
    icon: <UserPlus className="size-3.5" />,
    colorClass: "text-amber-600 dark:text-amber-400",
  },
];

interface ClientProfilTypeMultiSelectProps {
  value?: ProfilType[];
  onValueChange?: (value: ProfilType[]) => void;
  placeholder?: string;
}

export function ClientProfilTypeMultiSelect({
  value = [],
  onValueChange,
  placeholder = "Profil",
}: ClientProfilTypeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (profilValue: ProfilType) => {
    const newValue = value.includes(profilValue)
      ? value.filter((v) => v !== profilValue)
      : [...value, profilValue];
    onValueChange?.(newValue);
  };

  const selectedProfils = profilOptions.filter((option) =>
    value.includes(option.value)
  );

  const hasSelection = selectedProfils.length > 0;

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
            ) : selectedProfils.length === 1 ? (
              <div className="flex items-center gap-1.5">
                <span className={selectedProfils[0].colorClass}>{selectedProfils[0].icon}</span>
                <span className="hidden md:inline">{selectedProfils[0].label}</span>
                <span className="md:hidden">{selectedProfils[0].shortLabel}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  {selectedProfils.slice(0, 2).map((p) => (
                    <span key={p.value} className={cn("size-4 flex items-center justify-center rounded-full bg-background border", p.colorClass)}>
                      {p.icon}
                    </span>
                  ))}
                </div>
                <span className="text-sm font-medium">{selectedProfils.length}</span>
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
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-[180px] p-1" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {profilOptions.map((option) => {
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

