"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { AddressSuggestion, AddressData, BANResponse } from "@/lib/types/address";

interface AddressAutocompleteProps {
  value?: string;
  onAddressSelect?: (address: AddressData) => void;
  onChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  error?: string;
}

const BAN_API_URL = "https://api-adresse.data.gouv.fr/search/";
const DEBOUNCE_DELAY = 300;

export function AddressAutocomplete({
  value = "",
  onAddressSelect,
  onChange,
  disabled = false,
  placeholder = "Rechercher une adresse...",
  className,
  error,
}: AddressAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const [suggestions, setSuggestions] = React.useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedAddress, setSelectedAddress] = React.useState<AddressSuggestion | null>(null);
  const [hasSelectedFromList, setHasSelectedFromList] = React.useState(false);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  // Synchroniser la valeur externe avec l'état interne
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fonction pour rechercher des adresses via l'API BAN
  const searchAddresses = React.useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const url = new URL(BAN_API_URL);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", "10");
      url.searchParams.set("autocomplete", "1");

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Erreur lors de la recherche d'adresse");
      }

      const data: BANResponse = await response.json();
      const addressSuggestions = data.features.map((feature) => {
        const props = feature.properties;
        const [longitude, latitude] = feature.geometry.coordinates;
        
        // Extraire le département et la région depuis le contexte
        // Format: "93, Seine-Saint-Denis, Île-de-France" ou "75, Paris, Île-de-France"
        let department = props.context || "";
        let region: string | undefined = undefined;
        
        if (props.context) {
          const contextParts = props.context.split(",").map(s => s.trim());
          // Le premier élément est le numéro de département
          department = contextParts[0] || props.context;
          // Le dernier élément est généralement la région
          if (contextParts.length > 2) {
            region = contextParts[contextParts.length - 1];
          } else if (contextParts.length === 2) {
            // Si seulement 2 parties, la deuxième peut être la région
            region = contextParts[1];
          }
        }
        
        return {
          label: props.label,
          value: props.label,
          housenumber: props.housenumber,
          street: props.street,
          postcode: props.postcode,
          city: props.city,
          citycode: props.citycode,
          department: department,
          region: region,
          district: props.district,
          coordinates: {
            longitude,
            latitude,
          },
        };
      });

      // Garder l'adresse sélectionnée dans la liste si elle existe
      let newSuggestions: AddressSuggestion[] = addressSuggestions;
      if (selectedAddress && !addressSuggestions.find(s => s.value === selectedAddress.value)) {
        newSuggestions = [selectedAddress, ...addressSuggestions];
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Erreur lors de la recherche d'adresse:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAddress]);

  // Debounce de la recherche
  const handleInputChange = React.useCallback((newValue: string) => {
    setInputValue(newValue);
    onChange?.(newValue);
    setHasSelectedFromList(false); // Réinitialiser le flag quand l'utilisateur tape

    // Si l'adresse sélectionnée ne correspond plus à la saisie, réinitialiser la sélection
    if (selectedAddress && selectedAddress.value !== newValue) {
      setSelectedAddress(null);
    }

    // Annuler le timer précédent
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Créer un nouveau timer
    debounceTimerRef.current = setTimeout(() => {
      if (newValue.length >= 3) {
        searchAddresses(newValue);
        setOpen(true);
        setHighlightedIndex(-1);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    }, DEBOUNCE_DELAY);
  }, [onChange, searchAddresses, selectedAddress]);

  // Gérer la sélection d'une adresse
  const handleSelect = React.useCallback((suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion);
    setInputValue(suggestion.value);
    setHasSelectedFromList(true); // Marquer qu'une sélection a été faite
    onChange?.(suggestion.value);
    setOpen(false);
    setHighlightedIndex(-1);

    // Convertir en AddressData et appeler le callback
    const addressData: AddressData = {
      fullAddress: suggestion.value,
      housenumber: suggestion.housenumber,
      street: suggestion.street,
      postalCode: suggestion.postcode,
      city: suggestion.city,
      inseeCode: suggestion.citycode,
      department: suggestion.department,
      region: suggestion.region,
      district: suggestion.district,
      latitude: suggestion.coordinates.latitude,
      longitude: suggestion.coordinates.longitude,
    };
    
    // Logger l'adresse sélectionnée
    console.log("📍 Adresse sélectionnée:", addressData);
    
    onAddressSelect?.(addressData);
  }, [onChange, onAddressSelect]);

  // Gérer les événements clavier
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        setHighlightedIndex((prev) => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (inputValue.length >= 3) {
        setOpen(true);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (open && suggestions.length > 0) {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    }
  }, [open, suggestions, highlightedIndex, inputValue, handleSelect]);

  // Nettoyer le timer au démontage
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Calculer l'erreur : afficher une erreur si l'utilisateur tape manuellement au lieu de sélectionner
  // L'erreur s'affiche si :
  // - Il y a une erreur externe (prop error)
  // - OU l'utilisateur a tapé au moins 3 caractères, il y a des suggestions disponibles, mais il n'a pas sélectionné dans la liste
  const shouldShowValidationError = inputValue.length >= 3 && !hasSelectedFromList && suggestions.length > 0 && !loading;
  const displayError = error || (shouldShowValidationError ? "Veuillez sélectionner une adresse dans la liste au lieu de saisir manuellement" : undefined);

  return (
    <div className={cn("w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0 && inputValue.length >= 3) {
                  setOpen(true);
                }
              }}
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "w-full pr-8",
                displayError && "border-destructive focus-visible:ring-destructive"
              )}
              type="text"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={(e) => {
                e.preventDefault();
                setOpen(!open);
              }}
              disabled={disabled}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0" 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Ne pas fermer si on clique sur l'input
            if (e.target === inputRef.current || inputRef.current?.contains(e.target as Node)) {
              e.preventDefault();
            }
          }}
        >
          <div 
            ref={listRef}
            className="max-h-[300px] overflow-y-auto p-1"
          >
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Recherche...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {inputValue.length < 3
                  ? "Tapez au moins 3 caractères pour rechercher"
                  : "Aucune adresse trouvée"}
              </div>
            ) : (
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.citycode}-${suggestion.postcode}-${index}`}
                    onClick={() => handleSelect(suggestion)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      highlightedIndex === index
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent hover:text-accent-foreground",
                      selectedAddress?.value === suggestion.value && "bg-accent/50"
                    )}
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{suggestion.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {suggestion.postcode} {suggestion.city}
                          {suggestion.district && ` - ${suggestion.district}`}
                        </div>
                      </div>
                    </div>
                    {selectedAddress?.value === suggestion.value && (
                      <Check className="ml-2 h-4 w-4 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {displayError && (
        <p className="text-sm text-destructive mt-1">{displayError}</p>
      )}
    </div>
  );
}
