"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { useNationalities, type NationalityOption } from "@/hooks/useNationalities";

interface NationalitySelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NationalitySelect({
  value,
  onValueChange,
  disabled = false,
  placeholder = "Sélectionner la nationalité",
}: NationalitySelectProps) {
  const [open, setOpen] = React.useState(false);
  const { options: nationalities, loading } = useNationalities();

  const selectedNationality = React.useMemo(
    () => nationalities.find((n) => n.value === value),
    [nationalities, value]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 font-normal"
          disabled={disabled || loading}
          type="button"
        >
          {selectedNationality ? (
            <div className="flex items-center gap-2">
              {selectedNationality.flag && (
                <img
                  src={selectedNationality.flag}
                  alt={selectedNationality.label}
                  className="h-4 w-6 object-cover rounded-sm"
                  onError={(e) => {
                    // Cacher l'image si elle ne charge pas
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}
              <span>{selectedNationality.label}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">
              {loading ? "Chargement..." : placeholder}
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Rechercher une nationalité..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Chargement..." : "Aucune nationalité trouvée."}
            </CommandEmpty>
            
              {nationalities.map((nationality) => (
                <CommandItem
                  key={nationality.value}
                  value={nationality.label}
                  onSelect={() => {
                    // Utiliser directement la valeur de la nationalité de la closure
                    onValueChange?.(nationality.value === value ? "" : nationality.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  {nationality.flag && (
                    <img
                      src={nationality.flag}
                      alt={nationality.label}
                      className="h-4 w-6 object-cover rounded-sm flex-shrink-0 mr-2"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      draggable={false}
                    />
                  )}
                  <span className="flex-1">{nationality.label}</span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === nationality.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

