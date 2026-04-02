"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/formatters";
import { FileText, MapPin, Calendar, Search, Phone, Settings2 } from "lucide-react";
import { DossierDetailView } from "./dossier-detail-view";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBailTypeLabel, getBailStatusLabel } from "@/lib/utils/bails-labels";
import type { DossierFilterTab, DossierSubFilter } from "@/lib/utils/bails-labels";
import { DOSSIER_FILTER_TABS, DOSSIER_TAB_STATUSES, DOSSIER_SUB_FILTERS } from "@/lib/utils/bails-labels";

interface Dossier {
  id: string;
  client: {
    id: string;
    persons?: Array<{ firstName?: string | null; lastName?: string | null; isPrimary: boolean }>;
    entreprise?: { legalName: string; name: string } | null;
  };
  property?: { id: string; fullAddress: string } | null;
  bail?: { id: string; bailType: string; status: string } | null;
  assignedAt: Date;
  notes?: string | null;
}

interface DossiersSidebarProps {
  dossiers: Dossier[];
}

function getBailStatus(dossier: Dossier): string {
  return dossier.bail?.status || "READY_FOR_NOTARY";
}

function getStatusBadgeVariant(status: string): { className: string; label: string } {
  switch (status) {
    case "READY_FOR_NOTARY":
      return { className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800", label: "À contacter" };
    case "CLIENT_CONTACTED":
      return { className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800", label: "En traitement" };
    case "SIGNED":
      return { className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 border-green-200 dark:border-green-800", label: "Signé" };
    case "DESISTE":
      return { className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 border-red-200 dark:border-red-800", label: "Désisté" };
    case "CLASSE_SANS_SUITE":
      return { className: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-800", label: "Classé sans suite" };
    case "TERMINATED":
      return { className: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400 border-gray-200 dark:border-gray-800", label: "Terminé" };
    default:
      return { className: "", label: getBailStatusLabel(status) };
  }
}

export function DossiersSidebar({ dossiers: initialDossiers }: DossiersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierIdParam = searchParams.get("dossierId");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<DossierFilterTab>("en_cours");
  const [subFilter, setSubFilter] = useState<DossierSubFilter>("all");
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(dossierIdParam);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);

  // Compteurs par onglet
  const tabCounts = useMemo(() => {
    const counts: Record<DossierFilterTab, number> = { en_cours: 0, signes: 0, classes: 0 };
    for (const dossier of initialDossiers) {
      const status = getBailStatus(dossier);
      for (const tab of DOSSIER_FILTER_TABS) {
        if (DOSSIER_TAB_STATUSES[tab.value].includes(status)) {
          counts[tab.value]++;
          break;
        }
      }
    }
    return counts;
  }, [initialDossiers]);

  // Compteurs par sous-filtre (dans l'onglet en_cours)
  const subFilterCounts = useMemo(() => {
    const enCoursDossiers = initialDossiers.filter(d =>
      DOSSIER_TAB_STATUSES.en_cours.includes(getBailStatus(d))
    );
    return {
      all: enCoursDossiers.length,
      a_contacter: enCoursDossiers.filter(d => getBailStatus(d) === "READY_FOR_NOTARY").length,
      en_traitement: enCoursDossiers.filter(d => getBailStatus(d) === "CLIENT_CONTACTED").length,
    };
  }, [initialDossiers]);

  // Filtrage des dossiers
  const filteredDossiers = useMemo(() => {
    return initialDossiers.filter((dossier) => {
      // Filtre par onglet
      const status = getBailStatus(dossier);
      if (!DOSSIER_TAB_STATUSES[activeTab].includes(status)) return false;

      // Sous-filtre (seulement pour en_cours)
      if (activeTab === "en_cours" && subFilter !== "all") {
        const targetStatus = DOSSIER_SUB_FILTERS.find(f => f.value === subFilter)?.status;
        if (targetStatus && status !== targetStatus) return false;
      }

      // Filtre recherche
      if (search) {
        const clientName = getClientName(dossier.client);
        const propertyAddress = dossier.property?.fullAddress || "";
        const searchLower = search.toLowerCase();
        return (
          clientName.toLowerCase().includes(searchLower) ||
          propertyAddress.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [initialDossiers, activeTab, subFilter, search]);

  // Charger le dossier sélectionné depuis l'URL
  useEffect(() => {
    if (dossierIdParam && dossierIdParam !== selectedDossierId) {
      loadDossier(dossierIdParam);
    } else if (!dossierIdParam && initialDossiers.length > 0 && !selectedDossierId) {
      // Sélectionner le premier dossier en cours par défaut
      const enCoursDossiers = initialDossiers.filter(d =>
        DOSSIER_TAB_STATUSES.en_cours.includes(getBailStatus(d))
      );
      const firstDossier = enCoursDossiers[0] || initialDossiers[0];
      if (firstDossier) {
        router.replace(`/notaire/dossiers?dossierId=${firstDossier.id}`);
        loadDossier(firstDossier.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierIdParam]);

  const loadDossier = async (id: string) => {
    if (!id) return;

    setIsLoadingDossier(true);
    try {
      const response = await fetch(`/api/notaire/dossiers/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Erreur ${response.status}: ${response.statusText}`);
      }

      setSelectedDossier(data);
      setSelectedDossierId(id);
    } catch (error: any) {
      console.error("Erreur lors du chargement du dossier:", error);
      setSelectedDossier(null);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handleDossierClick = (dossierId: string) => {
    router.replace(`/notaire/dossiers?dossierId=${dossierId}`);
    loadDossier(dossierId);
  };

  function getClientName(client: Dossier["client"]) {
    if (client.entreprise) {
      return client.entreprise.legalName || client.entreprise.name;
    }
    const primaryPerson = client.persons?.find((p) => p.isPrimary) || client.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  }

  if (initialDossiers.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun dossier assigné</h3>
            <p className="text-muted-foreground">
              Vous n&apos;avez pas encore de dossiers assignés.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 p">
      {/* Sidebar */}
      <div className="w-[25%] border-r bg-background flex flex-col h-full min-w-0 py-6 px-4">
        {/* Header fixe */}
        <div className="p-4 border-b shrink-0">
          <h1 className="text-xl font-bold mb-2">Mes dossiers</h1>

          {/* Onglets de filtrage */}
          <div className="flex gap-1 mb-3">
            {DOSSIER_FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value);
                  setSubFilter("all");
                }}
                className={cn(
                  "flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors",
                  activeTab === tab.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label} ({tabCounts[tab.value]})
              </button>
            ))}
          </div>

          {/* Sous-filtres pour l'onglet "En cours" */}
          {activeTab === "en_cours" && (
            <div className="flex gap-1 mb-3">
              {DOSSIER_SUB_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSubFilter(filter.value)}
                  className={cn(
                    "px-2 py-1 text-xs rounded-full border transition-colors",
                    subFilter === filter.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  {filter.label} ({subFilterCounts[filter.value]})
                </button>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-4">
            {filteredDossiers.length} dossier{filteredDossiers.length > 1 ? "s" : ""}
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Liste scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredDossiers.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun dossier dans cette catégorie.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredDossiers.map((dossier) => {
                const clientName = getClientName(dossier.client);
                const isSelected = selectedDossierId === dossier.id;
                const status = getBailStatus(dossier);
                const statusBadge = getStatusBadgeVariant(status);

                return (
                  <button
                    key={dossier.id}
                    onClick={() => handleDossierClick(dossier.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-colors cursor-pointer",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card hover:bg-accent border-border"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium truncate",
                          isSelected ? "text-primary-foreground" : ""
                        )}>
                          {clientName}
                        </div>
                        {dossier.property && (
                          <div className={cn(
                            "flex items-center gap-1.5 mt-1 text-xs truncate",
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          )}>
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{dossier.property.fullAddress}</span>
                          </div>
                        )}
                        <div className={cn(
                          "flex items-center gap-1.5 mt-1 text-xs",
                          isSelected ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <Calendar className="h-3 w-3 shrink-0" />
                          {formatDateTime(dossier.assignedAt)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {dossier.bail && (
                          <Badge
                            variant={isSelected ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {getBailTypeLabel(dossier.bail.bailType)}
                          </Badge>
                        )}
                        {/* Badge de statut */}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isSelected ? "" : statusBadge.className
                          )}
                        >
                          {statusBadge.label}
                        </Badge>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal avec scroll indépendant */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoadingDossier ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : selectedDossier ? (
          <div className="p-6">
            <DossierDetailView dossier={selectedDossier} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sélectionnez un dossier</h3>
              <p className="text-muted-foreground">
                Cliquez sur un dossier dans la liste pour voir ses détails.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
