"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Home, Filter } from "lucide-react";
import Link from "next/link";
import { CompletionStatus } from "@prisma/client";
import { formatDate } from "@/lib/utils/formatters";

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

interface PropertiesListWithFilterProps {
  properties: Property[];
}

type FilterType = "all" | "completed";

export function PropertiesListWithFilter({ properties }: PropertiesListWithFilterProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredProperties = properties.filter((property) => {
    if (filter === "completed") {
      return property.completionStatus === CompletionStatus.COMPLETED;
    }
    return true;
  });

  const getStatusLabel = (status: string) => {
    return status === "LOUER" ? "Loué" : "Disponible";
  };

  const getStatusColor = (status: string) => {
    return status === "LOUER" 
      ? "bg-green-100 text-green-800" 
      : "bg-gray-100 text-gray-800";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Mes biens ({properties.length})
            </CardTitle>
            <CardDescription>
              Liste de tous vos biens avec leur statut de vérification
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
              Tous ({properties.length})
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
            >
              Complétés ({properties.filter(p => p.completionStatus === CompletionStatus.COMPLETED).length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProperties.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {filter === "completed" 
                ? "Aucun bien complété pour le moment" 
                : "Aucun bien enregistré"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProperties.map((property) => (
              <Link key={property.id} href={`/client/proprietaire/biens/${property.id}`}>
                <div className="border rounded-lg p-4 bg-accent transition-colors cursor-pointer hover:bg-accent/80">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Home className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {property.label || property.fullAddress}
                        </span>
                      </div>
                      {property.label && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {property.fullAddress}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(property.status)}>
                          {getStatusLabel(property.status)}
                        </Badge>
                        <StatusBadge status={property.completionStatus} />
                        {property.bails.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {property.bails.length} bail{property.bails.length > 1 ? "x" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}










