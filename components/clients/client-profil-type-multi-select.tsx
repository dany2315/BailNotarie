"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X, Home, User, UserPlus, Key } from "lucide-react";
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
import { ProfilType } from "@prisma/client";

interface ProfilOption {
  value: ProfilType;
  label: string;
  icon: React.ReactNode;
  variant: "default" | "secondary" | "outline";
}

const profilOptions: ProfilOption[] = [
  {
    value: "PROPRIETAIRE",
    label: "Propriétaire",
    icon: <Key className="h-4 w-4" />,
    variant: "default",
  },
  {
    value: "LOCATAIRE",
    label: "Locataire",
    icon: <User className="h-4 w-4" />,
    variant: "secondary",
  },
  {
    value: "LEAD",
    label: "Lead",
    icon: <UserPlus className="h-4 w-4" />,
    variant: "outline",
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
  placeholder = "Filtrer par profil",
}: ClientProfilTypeMultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (profilValue: ProfilType) => {
    const newValue = value.includes(profilValue)
      ? value.filter((v) => v !== profilValue)
      : [...value, profilValue];
    onValueChange?.(newValue);
  };

  const handleRemove = (profilValue: ProfilType, e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = value.filter((v) => v !== profilValue);
    onValueChange?.(newValue);
  };

  const selectedProfils = profilOptions.filter((option) =>
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
              {selectedProfils.length === 0 ? (
                <span className="text-muted-foreground">{placeholder}</span>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  {selectedProfils.length === 1 ? (
                    <div className="flex items-center gap-1.5">
                      {selectedProfils[0].icon}
                      <span className="truncate">{selectedProfils[0].label}</span>
                    </div>
                  ) : (
                    <span className="text-sm">
                      {selectedProfils.length} profils sélectionnés
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
            <CommandInput placeholder="Rechercher un profil..." />
            <CommandList>
              <CommandEmpty>Aucun profil trouvé.</CommandEmpty>
              <CommandGroup>
                {profilOptions.map((option) => {
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
                        <span className="text-foreground">{option.icon}</span>
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
      {selectedProfils.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedProfils.map((profil) => {
            const profilOption = profilOptions.find(opt => opt.value === profil.value);
            return (
              <Badge
                key={profil.value}
                variant={profilOption?.variant || "secondary"}
                className="text-xs pr-1"
              >
                <div className="flex items-center gap-1.5">
                  {profil.icon}
                  <span>{profil.label}</span>
                  <button
                    type="button"
                    className="ml-0.5 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRemove(profil.value, e as any);
                      }
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => handleRemove(profil.value, e)}
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

