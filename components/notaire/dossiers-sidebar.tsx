"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/formatters";
import { FileText, MapPin, Calendar, Search, Phone, Settings2, ArrowLeft } from "lucide-react";
import { DossierDetailView } from "./dossier-detail-view";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getBailTypeLabel, getBailStatusLabel } from "@/lib/utils/bails-labels";
import type { DossierFilterTab, DossierSubFilter } from "@/lib/utils/bails-labels";
import { DOSSIER_FILTER_TABS, DOSSIER_TAB_STATUSES, DOSSIER_SUB_FILTERS, getBailStatusColor } from "@/lib/utils/bails-labels";
import { toast } from "sonner";

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

function getStatusBadgeVariant(status: string) {
  const color = getBailStatusColor(status);
  return { className: color.badge, label: color.label };
}

export function DossiersSidebar({ dossiers: initialDossiers }: DossiersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierIdParam = searchParams.get("dossierId");

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<DossierFilterTab>("en_cours");
  const [subFilter, setSubFilter] = useState<DossierSubFilter>("all");
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(dossierIdParam);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    } catch (error) {
      console.error("Erreur lors du chargement du dossier:", error);
      toast.error("Impossible de charger le dossier. Veuillez réessayer.");
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

  // Sur mobile, déterminer si on affiche la liste ou le détail
  const showMobileDetail = selectedDossierId && selectedDossier;

  const handleBackToList = () => {
    setSelectedDossierId(null);
    setSelectedDossier(null);
    router.replace("/notaire/dossiers");
  };

  // Couleur du dot indicateur par statut
  const statusDotColor: Record<string, string> = {
    READY_FOR_NOTARY: "bg-orange-500",
    CLIENT_CONTACTED: "bg-blue-500",
    SIGNED: "bg-emerald-500",
    DESISTE: "bg-red-500",
    CLASSE_SANS_SUITE: "bg-gray-400",
    TERMINATED: "bg-gray-400",
  };

  return (
    <div className="flex h-full">
      {/* Sidebar liste */}
      <div className={cn(
        "border-r bg-background flex flex-col h-full min-w-0",
        "w-full lg:w-[340px] lg:shrink-0",
        showMobileDetail ? "hidden lg:flex" : "flex"
      )}>
        {/* Header fixe */}
        <div className="px-4 pt-6 pb-4 shrink-0">
          <h1 className="text-lg font-semibold tracking-tight mb-4 pl-10 lg:pl-0">Mes dossiers</h1>

          {/* Onglets principaux */}
          <div className="flex gap-1 mb-3 bg-secondary dark:bg-muted rounded-lg p-1" role="tablist" aria-label="Filtrer les dossiers par statut">
            {DOSSIER_FILTER_TABS.map((tab) => {
              const isActive = activeTab === tab.value;
              const tabCountColors: Record<DossierFilterTab, string> = {
                en_cours: "bg-primary/10 text-primary",
                signes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                classes: "bg-slate-200/80 text-slate-500 dark:bg-slate-700/60 dark:text-slate-400",
              };
              return (
                <button
                  key={tab.value}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.value);
                    setSubFilter("all");
                  }}
                  className={cn(
                    "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all min-h-[40px] flex items-center justify-center gap-1.5",
                    isActive
                      ? "bg-background dark:bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50 dark:hover:bg-white/5"
                  )}
                >
                  {tab.label}
                  <span className={cn(
                    "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-semibold leading-none transition-all",
                    isActive
                      ? tabCountColors[tab.value]
                      : "bg-muted-foreground/15 text-muted-foreground/60"
                  )}>
                    {tabCounts[tab.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sous-filtres pour "En cours" */}
          {activeTab === "en_cours" && (
            <div className="flex gap-1.5 mb-3" role="tablist" aria-label="Sous-filtres en cours">
              {DOSSIER_SUB_FILTERS.map((filter) => {
                const isActive = subFilter === filter.value;
                const subFilterActiveColors: Record<DossierSubFilter, string> = {
                  all: "border-primary/25 bg-primary/8 text-primary",
                  a_contacter: "border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-700/60 dark:bg-orange-950/40 dark:text-orange-400",
                  en_traitement: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-700/60 dark:bg-blue-950/40 dark:text-blue-400",
                };
                const subFilterDotColors: Record<DossierSubFilter, string | null> = {
                  all: null,
                  a_contacter: "bg-orange-400",
                  en_traitement: "bg-blue-400",
                };
                const dotColor = subFilterDotColors[filter.value];
                return (
                  <button
                    key={filter.value}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setSubFilter(filter.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border border-2 transition-all min-h-[36px]",
                      isActive
                        ? subFilterActiveColors[filter.value]
                        : "border-border/70 bg-background/60 dark:bg-muted/50 text-muted-foreground hover:bg-background dark:hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {dotColor && (
                      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 opacity-80", dotColor)} />
                    )}
                    {filter.label}
                    <span className="tabular-nums opacity-60 text-[10px]">
                      {subFilterCounts[filter.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Nom, adresse..."
              aria-label="Rechercher un dossier par nom ou adresse"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 bg-muted/40 border-transparent focus:border-border focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Séparateur avec compteur */}
        <div className="px-4 py-2 border-t border-b bg-muted/20 flex items-center gap-2">
          <span className={cn(
            "inline-flex items-center justify-center rounded-full w-5 h-5 text-[10px] tabular-nums font-semibold",
            activeTab === "en_cours" && "bg-primary/12 text-primary",
            activeTab === "signes" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
            activeTab === "classes" && "bg-slate-200/80 text-slate-600 dark:bg-slate-700/60 dark:text-slate-400",
          )}>
            {filteredDossiers.length}
          </span>
          <p className="text-xs text-muted-foreground">
            dossier{filteredDossiers.length > 1 ? "s" : ""}
          </p>
        </div>

        {/* Liste scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {filteredDossiers.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Aucun dossier trouvé</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredDossiers.map((dossier) => {
                const clientName = getClientName(dossier.client);
                const isSelected = selectedDossierId === dossier.id;
                const status = getBailStatus(dossier);
                const statusBadge = getStatusBadgeVariant(status);
                const dotColor = statusDotColor[status] || "bg-gray-400";

                return (
                  <button
                    key={dossier.id}
                    onClick={() => handleDossierClick(dossier.id)}
                    aria-current={isSelected ? "true" : undefined}
                    className={cn(
                      "w-full text-left px-3 py-3 rounded-lg transition-all cursor-pointer min-h-[44px] group ",
                      isSelected
                        ? "bg-primary/8 ring-1 ring-primary/20"
                        : "hover:bg-muted/60"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Indicateur de statut coloré */}
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0 ring-2",
                        dotColor,
                        isSelected ? "ring-primary/20" : "ring-background"
                      )} />

                      {/* Contenu principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium truncate leading-tight",
                            isSelected ? "text-primary" : "text-foreground"
                          )}>
                            {clientName}
                          </p>
                          {dossier.bail && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] shrink-0 px-1.5 py-0 h-5 font-normal",
                                isSelected ? "border-primary/20 text-primary" : ""
                              )}
                            >
                              {getBailTypeLabel(dossier.bail.bailType)}
                            </Badge>
                          )}
                        </div>

                        {dossier.property && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground truncate">
                              {dossier.property.fullAddress}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/50" />
                            <span className="text-xs text-muted-foreground/70">
                              {formatDateTime(dossier.assignedAt)}
                            </span>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] px-1.5 py-0 h-5 font-medium border-0",
                              isSelected
                                ? "bg-primary/10 text-primary"
                                : statusBadge.className
                            )}
                          >
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className={cn(
        "flex-1 overflow-y-auto min-h-0 bg-muted/20",
        showMobileDetail ? "flex flex-col" : "hidden lg:block"
      )}>
        {/* Bouton retour mobile */}
        {showMobileDetail && (
          <div className="lg:hidden p-4 border-b bg-background shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="gap-2 min-h-[44px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux dossiers
            </Button>
          </div>
        )}

        {isLoadingDossier ? (
          <div className="flex items-center justify-center h-full" role="status" aria-label="Chargement du dossier">
            <Loader2 className="h-6 w-6 animate-spin text-primary/40" />
          </div>
        ) : selectedDossier ? (
          <div className="p-4 lg:p-6">
            <DossierDetailView dossier={selectedDossier} />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-muted/60 flex items-center justify-center">
                <FileText className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-1">Sélectionnez un dossier</h3>
              <p className="text-xs text-muted-foreground">
                Cliquez sur un dossier pour voir ses détails
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
