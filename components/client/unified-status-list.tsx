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
  fullAddress: string;
  status: string;
  completionStatus: CompletionStatus;
  createdAt: Date;
  bails: Array<{
    id: string;
    status: string;
    effectiveDate: Date;
    endDate: Date | null;
  }>;
};

type Bail = {
  id: string;
  bailType: BailType;
  bailFamily: BailFamille;
  status: BailStatus;
  rentAmount: number;
  effectiveDate: Date;
  endDate: Date | null;
  property: {
    id: string;
    label: string | null;
    fullAddress: string;
    status: string;
    completionStatus: CompletionStatus;
  };
  parties: Array<{
    id: string;
    profilType: ProfilType;
    persons?: Array<{
      firstName: string | null;
      lastName: string | null;
    }>;
    entreprise?: {
      legalName: string | null;
      name: string | null;
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
  completionStatus: CompletionStatus;
  createdAt: Date | string;
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
          title: property.label || property.fullAddress,
          address: property.fullAddress,
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
        title: bail.property.label || bail.property.fullAddress,
        address: bail.property.fullAddress,
        completionStatus: bail.property.completionStatus,
        createdAt: bail.effectiveDate,
        data: bail,
      });
    });

    // Trier par date de création (plus récent en premier)
    return items.sort((a, b) => {
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
        return locataire.entreprise.legalName || locataire.entreprise.name || "Non défini";
      }
      if (locataire?.persons && locataire.persons.length > 0) {
        const person = locataire.persons[0];
        return `${person.firstName || ""} ${person.lastName || ""}`.trim() || "Non défini";
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
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Statut de mes éléments ({totalItems})
            </CardTitle>
            <CardDescription>
              Liste unifiée de tous vos biens et baux avec leur statut de vérification
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              Tous ({totalItems})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
            >
              Complétés ({completedItems})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {filter === "completed" 
                ? "Aucun élément complété pour le moment" 
                : "Aucun élément enregistré"}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredItems.map((item) => {
              if (item.type === "property") {
                const property = item.data as Property;
                return (
                  <Link key={`property-${item.id}`} href={`${basePath}/biens/${item.id}`}>
                    <div className="group border rounded-xl p-5 bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/20 mt-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 flex flex-row justify-between items-center min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                              <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base truncate">{item.title}</h3>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  Bien
                                </Badge>
                              </div>
                              {property.label && (
                                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{item.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap ml-[52px]">
                            <StatusBadge status={item.completionStatus} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              } else {
                const bail = item.data as Bail;
                const otherPartyName = getOtherPartyName(bail);
                const endDate = bail.endDate || calculateBailEndDate(bail.effectiveDate, bail.bailType);
                const bailTypeLabel = bail.bailFamily === BailFamille.HABITATION ? "Bail d'habitation" : "Bail commercial";

                return (
                  <Link key={`bail-${item.id}`} href={`${basePath}/baux/${item.id}`}>
                    <div className="group border rounded-xl p-5 bg-card hover:bg-accent/50 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                              <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {/* Type de bail */}
                              <div className="mb-2">
                                <Badge variant="outline" className="text-sm font-medium">
                                  {bailTypeLabel}
                                </Badge>
                              </div>
                              
                              {/* Bien de : [nom] */}
                              <div className="mb-3">
                                <p className="text-sm text-muted-foreground">
                                  Locataire : <span className="font-medium text-foreground">{otherPartyName}</span>
                                </p>
                              </div>

                              {/*bien en question*/}
                              <div className="mb-3">
                                <p className="text-sm text-muted-foreground">Bien en question : <span className="font-medium text-foreground">{bail.property.label || bail.property.fullAddress}</span></p>
                              </div>

                              {/* Informations du bail */}
                              <div className="space-y-2 text-sm">
                                {/* Date du bail */}
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Du</span>
                                  <span className="font-medium text-foreground">{formatDate(bail.effectiveDate)}</span>
                                  <span className="text-muted-foreground">au</span>
                                  <span className="font-medium text-foreground">{formatDate(endDate)}</span>
                                </div>
                                
                                {/* Loyer */}
                                <div className="flex items-center gap-2">
                                  <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
                                  <span className="text-muted-foreground">Loyer :</span>
                                  <span className="font-semibold text-foreground">{bail.rentAmount.toLocaleString()} €</span>
                                  <span className="text-muted-foreground">/mois</span>
                                </div>
                                
                                {/* Notaire assigné */}
                                {bail.dossierAssignments.length > 0 && (
                                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                    <User className="h-4 w-4 shrink-0" />
                                    <span className="text-sm">
                                      Notaire assigné : <span className="font-medium">{bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <StatusBadge status={item.completionStatus} />
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

