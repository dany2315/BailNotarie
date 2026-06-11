import { useMemo } from "react";
import {
  NATIONALITIES_FR_FEM,
  flagUrlFromCode,
} from "@/lib/data/nationalities";

export type NationalityOption = {
  label: string;
  value: string;
  flag: string;
  countryCode: string;
};

/**
 * Liste statique des nationalités (forme féminine FR + drapeau via flagcdn).
 * Aucune dépendance à une API externe : la liste apparaît tout de suite et
 * fonctionne hors-ligne, derrière un proxy ou si l'API tiers est down.
 */
export function useNationalities() {
  const options = useMemo<NationalityOption[]>(
    () =>
      NATIONALITIES_FR_FEM.map(({ label, countryCode }) => ({
        label,
        value: label,
        countryCode,
        flag: flagUrlFromCode(countryCode),
      })),
    []
  );

  return { options, loading: false };
}
