"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/formatters";
import { FileText, MapPin, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";

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

interface DossiersListProps {
  dossiers: Dossier[];
}

export function DossiersList({ dossiers: initialDossiers }: DossiersListProps) {
  const [search, setSearch] = useState("");

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
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Aucun dossier assigné</h3>
          <p className="text-muted-foreground">
            Vous n'avez pas encore de dossiers assignés.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Input
          placeholder="Rechercher par client ou adresse..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="grid gap-4">
        {filteredDossiers.map((dossier) => {
          const clientName = getClientName(dossier.client);
          
          return (
            <Link
              key={dossier.id}
              href={`/notaire/dossiers/${dossier.id}`}
              className="block"
            >
              <Card className="hover:bg-accent transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{clientName}</CardTitle>
                      {dossier.property && (
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {dossier.property.fullAddress}
                        </div>
                      )}
                    </div>
                    {dossier.bail && (
                      <Badge variant="secondary">
                        {dossier.bail.bailType}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Assigné le {formatDateTime(dossier.assignedAt)}
                    </div>
                    {dossier.notes && (
                      <div className="flex-1 truncate">
                        Note: {dossier.notes}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {filteredDossiers.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Aucun dossier ne correspond à votre recherche.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}





