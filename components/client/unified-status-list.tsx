"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Home, FileText, Filter, MapPin, Euro, Calendar, User, Building2 } from "lucide-react";
import Link from "next/link";
import { CompletionStatus, ProfilType, BailStatus, BailType, BailFamille } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";

type Property = {
  id: string;
  label: string | null;
  fullAddress: string | null;
  status: string;
  completionStatus: string;
  createdAt: string;
  bails: Array<{
    id: string;
    status: string;
    effectiveDate: string | null;
    endDate: string | null;
  }>;
};

type Bail = {
  id: string;
  bailType: string;
  bailFamily: string;
  status: string;
  rentAmount: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  property: {
    id: string;
    label: string | null;
    fullAddress: string | null;
    status: string;
    completionStatus: string;
  };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise?: {
      legalName: string | null;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  dossierAssignments: Array<{
    notaire: {
      name: string | null;
      email: string;
    };
  }>;
};

interface UnifiedStatusListProps {
  properties?: Property[];
  bails: Bail[];
  profilType: ProfilType;
  basePath: string; // "/client/proprietaire" ou "/client/locataire"
}

type FilterType = "all" | "completed";

type UnifiedItem = {
  id: string;
  type: "property" | "bail";
  title: string;
  address: string;
  completionStatus: string;
  createdAt: Date | string | null;
  data: Property | Bail;
};



const statusColors: Record<BailStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800",
  SIGNED: "bg-green-100 text-green-800",
  TERMINATED: "bg-gray-100 text-gray-800",
};

export function UnifiedStatusList({ properties = [], bails, profilType, basePath }: UnifiedStatusListProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  // Fusionner les biens et baux en une seule liste
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    // Ajouter les biens (seulement pour les propriétaires)
    if (profilType === ProfilType.PROPRIETAIRE && properties) {
      properties.forEach((property) => {
        items.push({
          id: property.id,
          type: "property",
          title: property.label || property.fullAddress || "Bien sans libellé",
          address: property.fullAddress || "Adresse non renseignée",
          completionStatus: property.completionStatus,
          createdAt: property.createdAt,
          data: property,
        });
      });
    }

    // Ajouter les baux
    bails.forEach((bail) => {
      items.push({
        id: bail.id,
        type: "bail",
        title: bail.property.label || bail.property.fullAddress || "Bien sans libellé",
        address: bail.property.fullAddress || "Adresse non renseignée",
        completionStatus: bail.property.completionStatus,
        createdAt: bail.effectiveDate,
        data: bail,
      });
    });

    // Trier par date de création (plus récent en premier)
    return items.sort((a, b) => {
      if (!a.createdAt) return 1;
      if (!b.createdAt) return -1;
      const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }, [properties, bails, profilType]);

  // Filtrer selon le statut de completion
  const filteredItems = unifiedItems.filter((item) => {
    if (filter === "completed") {
      return item.completionStatus === CompletionStatus.COMPLETED;
    }
    return true;
  });

  const getOtherPartyName = (bail: Bail) => {
    if (profilType === ProfilType.PROPRIETAIRE) {
      const locataire = bail.parties.find(p => p.profilType === ProfilType.LOCATAIRE);
      if (locataire?.entreprise) {
        return locataire.entreprise.legalName || locataire.entreprise.name || locataire.entreprise.email || "Non défini";
      }
      if (locataire?.persons && locataire.persons.length > 0) {
        const person = locataire.persons[0];
        return `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || "Non défini";
      }
      return "Non défini";
    } else {
      const proprietaire = bail.parties.find(p => p.profilType === ProfilType.PROPRIETAIRE);
      if (proprietaire?.entreprise) {
        return proprietaire.entreprise.legalName || proprietaire.entreprise.name || "Non défini";
      }
      if (proprietaire?.persons && proprietaire.persons.length > 0) {
        const person = proprietaire.persons[0];
        return `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Non défini";
      }
      return "Non défini";
    }
  };

  const getStatusLabel = (status: string) => {
    return status === "LOUER" ? "Loué" : "Disponible";
  };

  const getStatusColor = (status: string) => {
    return status === "LOUER" 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-800";
  };

  const totalItems = unifiedItems.length;
  const completedItems = unifiedItems.filter(item => item.completionStatus === CompletionStatus.COMPLETED).length;

  return (
    <Card>
      <CardHeader className="px-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
              <span className="truncate">Statut de mes éléments ({totalItems})</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Liste unifiée de tous vos biens et baux avec leur statut de vérification
            </CardDescription>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2 mt-4">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:block" />
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              Tous ({totalItems})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
              className="flex-1 sm:flex-initial text-xs sm:text-sm"
            >
              Complétés ({completedItems})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {filter === "completed" 
                ? "Aucun élément complété pour le moment" 
                : "Aucun élément enregistré"}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-5">
            {filteredItems.map((item) => {
              if (item.type === "property") {
                const property = item.data as Property;
                return (
                  <Link key={`property-${item.id}`} href={`${basePath}/biens/${item.id}`}>
                    <div className="group border rounded-lg sm:rounded-xl p-3 sm:px-5 bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/20 mt-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                            <Home className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <h3 className="font-semibold text-sm sm:text-base truncate">{item.title}</h3>
                              <Badge variant="outline" className="text-xs shrink-0 w-fit">
                                Bien
                              </Badge>
                            </div>
                            {property.label && (
                              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                                <span className="truncate">{item.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-start sm:justify-end gap-2 sm:ml-0">
                          <StatusBadge status={item.completionStatus} />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              } else {
                const bail = item.data as Bail;
                const otherPartyName = getOtherPartyName(bail);
                const endDate = bail.endDate 
                  ? (typeof bail.endDate === 'string' ? new Date(bail.endDate) : bail.endDate)
                  : (bail.effectiveDate 
                      ? calculateBailEndDate(
                          typeof bail.effectiveDate === 'string' ? new Date(bail.effectiveDate) : bail.effectiveDate,
                          bail.bailType as BailType
                        )
                      : null);
                const bailTypeLabel = bail.bailFamily === BailFamille.HABITATION || bail.bailFamily === "HABITATION" ? "Bail d'habitation" : "Bail commercial";

                return (
                  <Link key={`bail-${item.id}`} href={`${basePath}/baux/${item.id}`}>
                    <div className="group border rounded-lg sm:rounded-xl p-3 sm:p-5 bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/20 mt-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                            <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Type de bail */}
                              <div className="mb-2">
                                <Badge variant="outline" className="text-xs sm:text-sm font-medium">
                                  {bailTypeLabel}
                                </Badge>
                              </div>

                              <div className="mb-2 sm:mb-3 flex items-center justify-start sm:justify-end gap-2 shrink-0 sm:ml-0">
                                <StatusBadge status={item.completionStatus} />
                              </div>
                              
                              {/* Locataire/Propriétaire */}
                              <div className="mb-2 sm:mb-3">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  {profilType === ProfilType.PROPRIETAIRE ? "Locataire" : "Propriétaire"} : <span className="font-medium text-foreground break-words">{otherPartyName}</span>
                                </p>
                              </div>

                              {/* Bien en question */}
                              <div className="mb-2 sm:mb-3">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                  Bien : <span className="font-medium text-foreground break-words">{bail.property.label || bail.property.fullAddress || "Bien sans libellé"}</span>
                                </p>
                              </div>

                              {/* Informations du bail */}
                              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                                {/* Date du bail */}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Du</span>
                                  <span className="font-medium text-foreground">{formatDate(bail.effectiveDate)}</span>
                                  <span className="text-muted-foreground">au</span>
                                  <span className="font-medium text-foreground">{formatDate(endDate)}</span>
                                </div>
                                
                                {/* Loyer */}
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <Euro className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Loyer :</span>
                                  <span className="font-semibold text-foreground">{bail.rentAmount ? bail.rentAmount.toLocaleString() : "-"} €</span>
                                  <span className="text-muted-foreground">/mois</span>
                                </div>
                                
                                {/* Notaire assigné */}
                                {bail.dossierAssignments.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-blue-600 dark:text-blue-400">
                                    <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                                    <span className="text-xs sm:text-sm break-words">
                                      Notaire : <span className="font-medium">{bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

