"use client";

import * as React from "react";
import { AlertTriangle, ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface RentControlAlertProps {
  propertyId?: string;
  inseeCode?: string | null | undefined;
  rentAmount?: number;
  surfaceM2?: number | null;
  validationResult?: any;
  className?: string;
}

// Cache simple pour éviter les appels répétés
const zoneTendueCache = new Map<string, { isTightZone: boolean; city: string | null; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function RentControlAlert({
  propertyId,
  inseeCode,
  className,
}: RentControlAlertProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [rentInfo, setRentInfo] = React.useState<{
    isTightZone: boolean;
    city: string | null;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function fetchRentInfo() {
      const cacheKey = propertyId || inseeCode || "";
      
      // Vérifier le cache d'abord
      if (cacheKey) {
        const cached = zoneTendueCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          if (!cancelled) {
            setRentInfo({
              isTightZone: cached.isTightZone,
              city: cached.city,
            });
            setIsLoading(false);
          }
          return;
        }
      }

      setIsLoading(true);

      try {
        // Si on a un propertyId, utiliser la méthode existante
        if (propertyId) {
          // Utiliser l'API au lieu de l'import dynamique pour éviter le délai
          const response = await fetch(`/api/zone-tendue/check?propertyId=${encodeURIComponent(propertyId)}`);
          if (response.ok) {
            const data = await response.json();
            if (!cancelled) {
              const info = {
                isTightZone: data.isTightZone || false,
                city: data.zoneTendue?.city || null,
              };
              setRentInfo(info);
              zoneTendueCache.set(cacheKey, { ...info, timestamp: Date.now() });
            }
          }
        } 
        // Sinon, si on a un inseeCode, vérifier directement
        else if (inseeCode) {
          const response = await fetch(`/api/zone-tendue/check?inseeCode=${encodeURIComponent(inseeCode)}`);
          if (response.ok) {
            const data = await response.json();
            if (!cancelled) {
              const info = {
                isTightZone: data.isTightZone || false,
                city: data.zoneTendue?.city || null,
              };
              setRentInfo(info);
              zoneTendueCache.set(cacheKey, { ...info, timestamp: Date.now() });
            }
          }
        }
      } catch (error) {
        console.error("Erreur lors de la vérification de la zone tendue:", error);
        if (!cancelled) {
          setRentInfo({ isTightZone: false, city: null });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchRentInfo();

    return () => {
      cancelled = true;
    };
  }, [propertyId, inseeCode]);

  // Ne rien afficher pendant le chargement ou si ce n'est pas une zone tendue
  if (isLoading || !rentInfo || !rentInfo.isTightZone) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/50 overflow-hidden",
        className
      )}
    >
      {/* En-tête compact — toujours visible, cliquable */}
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex-1 min-w-0 truncate">
          Zone tendue{rentInfo.city ? ` — ${rentInfo.city}` : ""}
          <span className="font-normal text-amber-700/70 dark:text-amber-400/70"> · Loyer encadré</span>
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 transition-transform duration-200",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Détails — dépliable */}
      {isExpanded && (
        <div className="px-3 pb-2.5 space-y-2 text-amber-900/80 dark:text-amber-200/80">
          <p className="text-xs leading-relaxed">
            Si le logement a été loué au cours des <strong>18 mois</strong> précédant ce bail, le loyer ne peut pas dépasser le dernier loyer appliqué au précédent locataire.
          </p>
          <p className="text-xs leading-relaxed flex items-start gap-1.5 text-amber-700/80 dark:text-amber-300/70">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              <strong>Exception :</strong> hausse possible si des travaux d'un montant ≥ à la dernière année de loyer ont été réalisés.
            </span>
          </p>
        </div>
      )}
    </div>
  );
}



