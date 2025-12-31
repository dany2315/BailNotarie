"use client";

import * as React from "react";
import { Column } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/formatters";
import { Trash2 } from "lucide-react";
import { revokeAssignment } from "@/lib/actions/notaires";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Assignation {
  id: string;
  client: {
    id: string;
    persons?: Array<{ firstName?: string | null; lastName?: string | null; isPrimary: boolean }>;
    entreprise?: { legalName: string; name: string } | null;
  };
  property?: { id: string; fullAddress: string } | null;
  bail?: { id: string; bailType: string } | null;
  notaire: { id: string; name?: string | null; email: string };
  assignedBy: { id: string; name?: string | null; email: string };
  assignedAt: Date;
  notes?: string | null;
}

interface AssignationsTableProps {
  assignations: Assignation[];
}

export function AssignationsTable({ assignations }: AssignationsTableProps) {
  const router = useRouter();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const handleRevoke = async (assignmentId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir révoquer cette assignation ?")) {
      return;
    }

    setRevokingId(assignmentId);
    try {
      await revokeAssignment({ assignmentId });
      toast.success("Assignation révoquée avec succès");
      router.refresh();
    } catch (error: any) {
      toast.error("Erreur lors de la révocation", {
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const getClientName = (client: Assignation["client"]) => {
    if (client.entreprise) {
      return client.entreprise.legalName || client.entreprise.name;
    }
    const primaryPerson = client.persons?.find((p) => p.isPrimary) || client.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  const columns: Column<Assignation>[] = [
    {
      id: "client",
      header: "Client",
      cell: ({ row }: { row: Assignation }) => <div>{getClientName(row.client)}</div>,
    },
    {
      id: "property",
      header: "Propriété",
      cell: ({ row }: { row: Assignation }) => (
        <div className="text-sm">
          {row.property ? (
            <span>{row.property.fullAddress}</span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: "bail",
      header: "Bail",
      cell: ({ row }: { row: Assignation }) => (
        <div className="text-sm">
          {row.bail ? (
            <Badge variant="outline">{row.bail.bailType}</Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: "notaire",
      header: "Notaire",
      cell: ({ row }: { row: Assignation }) => (
        <div>
          <div className="font-medium">{row.notaire.name || row.notaire.email}</div>
          {row.notaire.name && (
            <div className="text-xs text-muted-foreground">{row.notaire.email}</div>
          )}
        </div>
      ),
    },
    {
      id: "assignedAt",
      header: "Assigné le",
      cell: ({ row }: { row: Assignation }) => (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(row.assignedAt)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Assignation }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRevoke(row.id)}
          disabled={revokingId === row.id}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtrer les données par recherche
  const filteredData = React.useMemo(() => {
    if (!search.trim()) return assignations;
    
    const searchLower = search.toLowerCase();
    return assignations.filter((assignation) => {
      const clientName = getClientName(assignation.client).toLowerCase();
      const propertyAddress = (assignation.property?.fullAddress || "").toLowerCase();
      const notaireName = (assignation.notaire.name || assignation.notaire.email).toLowerCase();
      return (
        clientName.includes(searchLower) ||
        propertyAddress.includes(searchLower) ||
        notaireName.includes(searchLower)
      );
    });
  }, [assignations, search]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      total={filteredData.length}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      searchPlaceholder="Rechercher par client, propriété ou notaire..."
      onSearch={setSearch}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
}


