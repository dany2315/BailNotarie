"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/formatters";
import { FileText, MapPin, Calendar, Search } from "lucide-react";
import { DossierDetailView } from "./dossier-detail-view";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBailTypeLabel } from "@/lib/utils/bails-labels";

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

export function DossiersSidebar({ dossiers: initialDossiers }: DossiersSidebarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dossierIdParam = searchParams.get("dossierId");
  
  const [search, setSearch] = useState("");
  const [selectedDossierId, setSelectedDossierId] = useState<string | null>(dossierIdParam);
  const [selectedDossier, setSelectedDossier] = useState<any>(null);
  const [isLoadingDossier, setIsLoadingDossier] = useState(false);

  // Charger le dossier sélectionné depuis l'URL
  useEffect(() => {
    if (dossierIdParam && dossierIdParam !== selectedDossierId) {
      loadDossier(dossierIdParam);
    } else if (!dossierIdParam && initialDossiers.length > 0 && !selectedDossierId) {
      // Sélectionner le premier dossier par défaut
      const firstDossierId = initialDossiers[0].id;
      router.replace(`/notaire/dossiers?dossierId=${firstDossierId}`);
      loadDossier(firstDossierId);
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
      console.error("Détails de l'erreur:", error.message);
      setSelectedDossier(null);
    } finally {
      setIsLoadingDossier(false);
    }
  };

  const handleDossierClick = (dossierId: string) => {
    router.replace(`/notaire/dossiers?dossierId=${dossierId}`);
    loadDossier(dossierId);
  };

  const filteredDossiers = initialDossiers.filter((dossier) => {
    if (!search) return true;
    
    const clientName = getClientName(dossier.client);
    const propertyAddress = dossier.property?.fullAddress || "";
    const searchLower = search.toLowerCase();
    
    return (
      clientName.toLowerCase().includes(searchLower) ||
      propertyAddress.toLowerCase().includes(searchLower)
    );
  });

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
              Vous n'avez pas encore de dossiers assignés.
            </p>
          </CardContent>
        </Card>
      </div>
    );  
  }

  return (
    <div className="flex h-full gap-4 p">
      {/* Sidebar */}
      <div className="w-auto border-r bg-background flex flex-col h-full min-w-0 py-6 px-4">
        {/* Header fixe - ne scroll pas */}
        <div className="p-4 border-b shrink-0">
          <h1 className="text-xl font-bold mb-2">Mes dossiers</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {initialDossiers.length} dossier{initialDossiers.length > 1 ? "s" : ""} assigné{initialDossiers.length > 1 ? "s" : ""}
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
              Aucun dossier ne correspond à votre recherche.
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredDossiers.map((dossier) => {
                const clientName = getClientName(dossier.client);
                const isSelected = selectedDossierId === dossier.id;
                
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
                      {dossier.bail && (
                        <Badge 
                          variant={isSelected ? "secondary" : "outline"}
                          className="shrink-0 text-xs"
                        >
                          {getBailTypeLabel(dossier.bail.bailType)}
                        </Badge>
                      )}
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

