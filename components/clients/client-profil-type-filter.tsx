"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ClientProfilTypeFilterProps {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
}

export function ClientProfilTypeFilter({ 
  value, 
  onValueChange, 
  defaultValue 
}: ClientProfilTypeFilterProps) {
  const currentValue = value || defaultValue || "all";

  const handleChange = (newValue: string) => {
    onValueChange?.(newValue);
  };

  return (
    <Select 
      value={currentValue} 
      onValueChange={handleChange}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Filtrer par profil" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les profils</SelectItem>
        <SelectItem value="PROPRIETAIRE">Propriétaire</SelectItem>
        <SelectItem value="LOCATAIRE">Locataire</SelectItem>
        <SelectItem value="LEAD">Lead</SelectItem>
      </SelectContent>
    </Select>
  );
}

