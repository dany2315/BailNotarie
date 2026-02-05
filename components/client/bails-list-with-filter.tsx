"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { FileText, Filter } from "lucide-react";
import Link from "next/link";
import { CompletionStatus, ProfilType, BailStatus, BailType } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";

type Bail = {
  id: string;
  bailType: BailType;
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

interface BailsListWithFilterProps {
  bails: Bail[];
  profilType: ProfilType;
  basePath: string; // "/client/proprietaire" ou "/client/locataire"
}

type FilterType = "all" | "completed";

const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
};

const statusColors: Record<BailStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800",
  SIGNED: "bg-green-100 text-green-800",
  TERMINATED: "bg-gray-100 text-gray-800",
};

export function BailsListWithFilter({ bails, profilType, basePath }: BailsListWithFilterProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredBails = bails.filter((bail) => {
    if (filter === "completed") {
      return bail.property.completionStatus === CompletionStatus.COMPLETED;
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Mes baux ({bails.length})
            </CardTitle>
            <CardDescription>
              Liste de tous vos baux avec leur statut de vérification
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
              Tous ({bails.length})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
            >
              Complétés ({bails.filter(b => b.property.completionStatus === CompletionStatus.COMPLETED).length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredBails.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {filter === "completed" 
                ? "Aucun bail complété pour le moment" 
                : "Aucun bail enregistré"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBails.map((bail) => {
              const otherPartyName = getOtherPartyName(bail);
              const endDate = bail.endDate || calculateBailEndDate(bail.effectiveDate, bail.bailType);

              return (
                <Link key={bail.id} href={`${basePath}/baux/${bail.id}`}>
                  <div className="border rounded-lg p-4 bg-accent transition-colors cursor-pointer hover:bg-accent/80">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {bail.property.label || bail.property.fullAddress}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {profilType === ProfilType.PROPRIETAIRE && (
                            <p>
                              Locataire : <span className="font-medium text-foreground">{otherPartyName}</span>
                            </p>
                          )}
                          {profilType === ProfilType.LOCATAIRE && (
                            <p>
                              Propriétaire : <span className="font-medium text-foreground">{otherPartyName}</span>
                            </p>
                          )}
                          <p>
                            <span className="font-medium text-foreground">{bail.rentAmount.toLocaleString()} €</span> / mois
                          </p>
                          <p>
                            Du <span className="font-medium text-foreground">{formatDate(bail.effectiveDate)}</span>
                            {" "} au <span className="font-medium text-foreground">{formatDate(endDate)}</span>
                          </p>
                          {bail.dossierAssignments.length > 0 && (
                            <p className="text-blue-600">
                              Notaire assigné : <span className="font-medium">{bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Badge className={statusColors[bail.status]}>
                          {statusLabels[bail.status]}
                        </Badge>
                        <StatusBadge status={bail.property.completionStatus} />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

