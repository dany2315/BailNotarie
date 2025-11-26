"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { CompletionStatusMultiSelect } from "@/components/shared/completion-status-multi-select";
import { ClientProfilTypeMultiSelect } from "@/components/clients/client-profil-type-multi-select";
import { formatDateTime } from "@/lib/utils/formatters";
import { CompletionStatus, ProfilType, ClientType } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Client {
  id: string;
  type: ClientType;
  profilType: ProfilType;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  email?: string | null;
  completionStatus: CompletionStatus;
  updatedAt: string | Date;
}

interface ClientsListDashboardProps {
  clients: Client[];
}

export function ClientsListDashboard({ clients: initialClients }: ClientsListDashboardProps) {
  const [search, setSearch] = React.useState("");
  const [completionStatusFilter, setCompletionStatusFilter] = React.useState<CompletionStatus[]>([]);
  const [profilTypeFilter, setProfilTypeFilter] = React.useState<ProfilType[]>([]);
  const [page, setPage] = React.useState(1);
  const pageSize = 10;

  // Filtrer les clients
  const filteredClients = React.useMemo(() => {
    let filtered = [...initialClients];

    // Filtrer par statut de completion
    if (completionStatusFilter.length > 0) {
      filtered = filtered.filter((client) =>
        completionStatusFilter.includes(client.completionStatus)
      );
    }

    // Filtrer par profil type
    if (profilTypeFilter.length > 0) {
      filtered = filtered.filter((client) =>
        profilTypeFilter.includes(client.profilType)
      );
    }

    // Filtrer par recherche
    if (search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filtered = filtered.filter((client) => {
        const firstName = (client.firstName || "").toLowerCase();
        const lastName = (client.lastName || "").toLowerCase();
        const legalName = (client.legalName || "").toLowerCase();
        const email = (client.email || "").toLowerCase();
        const fullName = `${firstName} ${lastName}`.trim();

        return (
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower) ||
          legalName.includes(searchLower) ||
          email.includes(searchLower)
        );
      });
    }

    return filtered;
  }, [initialClients, completionStatusFilter, profilTypeFilter, search]);

  // Pagination
  const paginatedClients = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredClients.slice(start, end);
  }, [filteredClients, page]);

  const totalPages = Math.ceil(filteredClients.length / pageSize);

  const getClientName = (client: Client) => {
    if (client.type === ClientType.PERSONNE_PHYSIQUE) {
      const name = `${client.firstName || ""} ${client.lastName || ""}`.trim();
      return name || client.email || "N/A";
    }
    return client.legalName || client.email || "N/A";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Statuts clients</CardTitle>
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <CompletionStatusMultiSelect
            value={completionStatusFilter}
            onValueChange={(value) => {
              setCompletionStatusFilter(value);
              setPage(1);
            }}
            placeholder="Statut de completion"
          />
          <ClientProfilTypeMultiSelect
            value={profilTypeFilter}
            onValueChange={(value) => {
              setProfilTypeFilter(value);
              setPage(1);
            }}
            placeholder="Type de profil"
          />
        </div>
      </CardHeader>
      <CardContent>
        {filteredClients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Aucun client trouvé
          </p>
        ) : (
          <>
            <div className="space-y-3">
              {paginatedClients.map((client) => (
                <Link
                  key={client.id}
                  href={`/interface/clients/${client.id}`}
                  className="block"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{getClientName(client)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <StatusBadge status={client.profilType} />
                        <StatusBadge status={client.completionStatus} />
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-1">
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        Modifié le {formatDateTime(client.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""} au total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} sur {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}






