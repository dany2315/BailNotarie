import { useEffect, useState } from "react";

export type NationalityOption = { 
  label: string; 
  value: string;
  flag: string;
  countryCode: string;
};

export function useNationalities() {
  const [options, setOptions] = useState<NationalityOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch("https://restcountries.com/v3.1/all?fields=demonyms,cca2,flags");
        const data = await res.json();

        // Créer un map pour associer les gentilés aux pays (uniquement féminin)
        const nationalityMap = new Map<string, { flag: string; countryCode: string }>();
        
        for (const c of data) {
          // Utiliser uniquement la forme féminine
          const f = c?.demonyms?.fra?.f as string | undefined;
          const flag = c?.flags?.svg || c?.flags?.png || "";
          const countryCode = c?.cca2 || "";
          
          if (f && flag && countryCode) {
            const normalized = capitalize(f);
            // Prioriser les drapeaux SVG (meilleure qualité)
            const existing = nationalityMap.get(normalized);
            if (!existing || (!existing.flag && flag) || (existing.flag && !existing.flag.includes('.svg') && flag.includes('.svg'))) {
              nationalityMap.set(normalized, { flag, countryCode });
            }
          }
        }

        const list = Array.from(nationalityMap.entries())
          .map(([label, { flag, countryCode }]) => ({ 
            label, 
            value: label,
            flag,
            countryCode
          }))
          .filter(Boolean)
          .sort((a, b) => a.label.localeCompare(b.label, "fr"));

        if (!cancelled) setOptions(list);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { options, loading };
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

