"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PropertyTypeBadge, PropertyLegalStatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatCurrency, formatSurface } from "@/lib/utils/formatters";
import { Building2, MapPin, Calendar, Euro, Users, Home, ChevronRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ClientType, ProfilType } from "@prisma/client";

interface Property {
  id: string;
  label?: string | null;
  fullAddress: string;
  status: string;
  type: string;
  legalStatus: string;
  surfaceM2?: number | null;
  bails?: Bail[];
}

interface Bail {
  id: string;
  bailType: string;
  bailFamily: string;
  status: string;
  rentAmount: number;
  monthlyCharges?: number | null;
  securityDeposit?: number | null;
  paymentDay?: number | null;
  effectiveDate: Date | string;
  parties?: Party[];
  property?: {
    fullAddress: string;
  };
}

interface Person {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  isPrimary?: boolean;
}

interface Entreprise {
  id: string;
  name?: string | null;
  legalName?: string | null;
  email?: string | null;
}

interface Party {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  type: ClientType;
  email?: string | null;
  profilType: ProfilType;
  persons?: Person[];
  entreprise?: Entreprise | null;
}

interface PropertyBailsViewerProps {
  properties: Property[];
}

export function PropertyBailsViewer({ properties }: PropertyBailsViewerProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties.length > 0 ? properties[0].id : null
  );

  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const selectedPropertyBails = selectedProperty?.bails || [];

  const getBailTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      BAIL_NU_3_ANS: "Bail nu 3 ans",
      BAIL_NU_6_ANS: "Bail nu 6 ans",
      BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
      BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  const getBailFamilyLabel = (family: string) => {
    return family.replace(/_/g, " ");
  };

  const getPartyName = (party: Party) => {
    if (party.type === ClientType.PERSONNE_PHYSIQUE) {
      const primaryPerson = party.persons?.find((p: any) => p.isPrimary) || party.persons?.[0];
      if (primaryPerson) {
        return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || primaryPerson.email || "N/A";
      }
      return `${party.firstName || ""} ${party.lastName || ""}`.trim() || party.email || "N/A";
    }
    return party.entreprise?.legalName || party.entreprise?.name || party.legalName || party.email || "N/A";
  };

  if (properties.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Card scrollable pour les biens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Biens immobiliers ({properties.length})
          </CardTitle>
          <CardDescription>Biens dont le client est propriétaire</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div className="flex gap-4 min-w-max">
              {properties.map((property) => {
                const isSelected = property.id === selectedPropertyId;
                const bailCount = property.bails?.length || 0;

                return (
                  <div
                    key={property.id}
                    className={`
                      flex-shrink-0 w-80 p-4 border-2 rounded-lg transition-all relative
                      ${isSelected 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                    `}
                  >
                    <button
                      onClick={() => setSelectedPropertyId(property.id)}
                      className="w-full text-left"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate mb-1">
                              {property.label || "Sans libellé"}
                            </h3>
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <p className="line-clamp-2">{property.fullAddress}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-4  flex-wrap">
                              <StatusBadge status={property.status} />
                              <PropertyTypeBadge type={property.type} />
                              <PropertyLegalStatusBadge status={property.legalStatus} />
                            </div>
                          </div>
                        </div>
                        

                        <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t">
                          {property.surfaceM2 && (
                            <div>
                              <span className="text-muted-foreground">Surface: </span>
                              <span className="font-medium">{formatSurface(property.surfaceM2)}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Baux: </span>
                            <span className="font-medium">{bailCount}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                    <Link 
                      href={`/interface/properties/${property.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-3 right-3"
                    >
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="h-7 w-7 p-0 cursor-pointer"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Baux du bien sélectionné */}
      {selectedProperty && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Baux du bien sélectionné
              {selectedProperty.label && (
                <span className="text-base font-normal text-muted-foreground">
                  - {selectedProperty.label}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              {selectedPropertyBails.length > 0 
                ? `${selectedPropertyBails.length} bail${selectedPropertyBails.length > 1 ? "x" : ""} associé${selectedPropertyBails.length > 1 ? "s" : ""}`
                : "Aucun bail associé à ce bien"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedPropertyBails.length > 0 ? (
              <div className="space-y-4">
                {selectedPropertyBails.map((bail) => {
                  const owner = bail.parties?.find((p) => p.profilType === ProfilType.PROPRIETAIRE);
                  const tenant = bail.parties?.find((p) => p.profilType === ProfilType.LOCATAIRE);

                  return (
                    <Link
                      key={bail.id}
                      href={`/interface/baux/${bail.id}`}
                      className="block"
                    >
                      <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="font-semibold text-sm">
                                {getBailTypeLabel(bail.bailType)} - {getBailFamilyLabel(bail.bailFamily)}
                              </h3>
                              <StatusBadge status={bail.status} />
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
                          <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Euro className="h-3 w-3" />
                              Loyer
                            </label>
                            <p className="mt-0.5 font-medium">{formatCurrency(bail.rentAmount)}</p>
                          </div>
                          {bail.monthlyCharges && bail.monthlyCharges > 0 && (
                            <div>
                              <label className="text-xs text-muted-foreground">Charges</label>
                              <p className="mt-0.5">{formatCurrency(bail.monthlyCharges)}</p>
                            </div>
                          )}
                          {bail.securityDeposit && bail.securityDeposit > 0 && (
                            <div>
                              <label className="text-xs text-muted-foreground">Dépôt de garantie</label>
                              <p className="mt-0.5">{formatCurrency(bail.securityDeposit)}</p>
                            </div>
                          )}
                          {bail.paymentDay && (
                            <div>
                              <label className="text-xs text-muted-foreground">Jour de paiement</label>
                              <p className="mt-0.5">Le {bail.paymentDay}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date d'effet
                            </label>
                            <p className="mt-0.5">{formatDate(bail.effectiveDate)}</p>
                          </div>
                        </div>

                        {bail.parties && bail.parties.length > 0 && (
                          <div className="pt-3 mt-3 border-t">
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Parties :
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {owner && (
                                <Badge variant="outline" className="text-xs">
                                  Propriétaire: {getPartyName(owner)}
                                </Badge>
                              )}
                              {tenant && (
                                <Badge variant="outline" className="text-xs">
                                  Locataire: {getPartyName(tenant)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucun bail associé à ce bien
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

