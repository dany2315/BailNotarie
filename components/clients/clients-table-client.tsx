"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table/data-table";
import { ClientProfilTypeCell, ClientNameCell, ClientDateCell, ClientCreatedByCell } from "@/components/clients/client-table-cells";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientProfilTypeMultiSelect } from "@/components/clients/client-profil-type-multi-select";
import { CompletionStatusMultiSelect } from "@/components/shared/completion-status-multi-select";
import { ProfilType, CompletionStatus } from "@prisma/client";
import { ClientType } from "@prisma/client";

interface Client {
  id: string;
  type: ClientType;
  profilType: ProfilType;
  completionStatus?: CompletionStatus;
  firstName?: string | null;
  lastName?: string | null;
  legalName?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: Date | string;
  createdBy?: any;
}

interface ClientsTableClientProps {
  initialData: Client[];
  columns: Column<Client>[];
}

export function ClientsTableClient({ initialData, columns }: ClientsTableClientProps) {
  const [search, setSearch] = React.useState("");
  const [profilTypeFilter, setProfilTypeFilter] = React.useState<ProfilType[]>([]);
  const [completionStatusFilter, setCompletionStatusFilter] = React.useState<CompletionStatus[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtrer les données côté client
  const filteredData = React.useMemo(() => {
    let filtered = [...initialData];

    // Filtrer par profil (multi-select)
    if (profilTypeFilter.length > 0) {
      filtered = filtered.filter((client) => profilTypeFilter.includes(client.profilType));
    }

    // Filtrer par statut de completion (multi-select)
    if (completionStatusFilter.length > 0) {
      filtered = filtered.filter((client) => 
        client.completionStatus && completionStatusFilter.includes(client.completionStatus)
      );
    }

    // Filtrer par recherche (nom, prénom, raison sociale, email)
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
  }, [initialData, profilTypeFilter, completionStatusFilter, search]);

  // Pagination côté client
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  const totalPages = Math.ceil(filteredData.length / pageSize);

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      total={filteredData.length}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      searchPlaceholder="Rechercher par nom, prénom, raison sociale, email..."
      onSearch={setSearch}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
      filters={
        <div className="flex flex-wrap gap-2">
          <ClientProfilTypeMultiSelect
            value={profilTypeFilter}
            onValueChange={(value) => {
              setProfilTypeFilter(value);
              setPage(1);
            }}
          />
          <CompletionStatusMultiSelect
            value={completionStatusFilter}
            onValueChange={(value) => {
              setCompletionStatusFilter(value);
              setPage(1);
            }}
            placeholder="Filtrer par statut de complétion"
          />
        </div>
      }
      actions={ClientActions}
    />
  );
}








