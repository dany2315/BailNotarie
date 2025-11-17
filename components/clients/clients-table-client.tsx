"use client";

import * as React from "react";
import { DataTable, Column } from "@/components/data-table/data-table";
import { ClientProfilTypeCell, ClientNameCell, ClientDateCell, ClientCreatedByCell } from "@/components/clients/client-table-cells";
import { ClientActions } from "@/components/clients/client-actions";
import { ClientProfilTypeFilter } from "@/components/clients/client-profil-type-filter";
import { ProfilType } from "@prisma/client";
import { ClientType } from "@prisma/client";

interface Client {
  id: string;
  type: ClientType;
  profilType: ProfilType;
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
  const [profilTypeFilter, setProfilTypeFilter] = React.useState<ProfilType | "all">("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtrer les données côté client
  const filteredData = React.useMemo(() => {
    let filtered = [...initialData];

    // Filtrer par profil
    if (profilTypeFilter !== "all") {
      filtered = filtered.filter((client) => client.profilType === profilTypeFilter);
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
  }, [initialData, profilTypeFilter, search]);

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
        <ClientProfilTypeFilter
          value={profilTypeFilter}
          onValueChange={(value) => {
            setProfilTypeFilter(value as ProfilType | "all");
            setPage(1);
          }}
        />
      }
      actions={ClientActions}
    />
  );
}





