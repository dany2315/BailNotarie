"use client";

import * as React from "react";
import { Column } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/formatters";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, Trash2 } from "lucide-react";
import { revokeAssignment } from "@/lib/actions/notaires";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Dossier {
  id: string;
  client: {
    id: string;
    persons?: Array<{ firstName?: string; lastName?: string; isPrimary?: boolean }>;
    entreprise?: { legalName?: string; name?: string };
  };
  property?: {
    id: string;
    fullAddress?: string;
  } | null;
  bail?: {
    id: string;
    bailType?: string;
  } | null;
  assignedAt: Date;
  notes?: string | null;
}

interface DossiersNotaireTableProps {
  dossiers: Dossier[];
}

export function DossiersNotaireTable({ dossiers }: DossiersNotaireTableProps) {
  const router = useRouter();
  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

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
      toast.error("Erreur", {
        description: error.message || "Impossible de révoquer l'assignation",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const getClientName = (client: Dossier["client"]) => {
    if (client.entreprise) {
      return client.entreprise.legalName || client.entreprise.name || "Entreprise";
    }
    const primaryPerson = client.persons?.find((p) => p.isPrimary) || client.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  // Filtrer les données par recherche
  const filteredData = React.useMemo(() => {
    if (!search.trim()) return dossiers;
    
    const searchLower = search.toLowerCase();
    return dossiers.filter((dossier) => {
      const clientName = getClientName(dossier.client).toLowerCase();
      const propertyAddress = dossier.property?.fullAddress?.toLowerCase() || "";
      return clientName.includes(searchLower) || propertyAddress.includes(searchLower);
    });
  }, [dossiers, search]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  const columns: Column<Dossier>[] = [
    {
      id: "client",
      header: "Client",
      cell: ({ row }: { row: Dossier }) => (
        <div>
          <Link 
            href={`/interface/clients/${row.client.id}`}
            className="hover:underline font-medium"
          >
            {getClientName(row.client)}
          </Link>
        </div>
      ),
    },
    {
      id: "property",
      header: "Propriété",
      cell: ({ row }: { row: Dossier }) => (
        <div className="text-sm">
          {row.property ? (
            <Link 
              href={`/interface/properties/${row.property.id}`}
              className="hover:underline"
            >
              {row.property.fullAddress || "Propriété"}
            </Link>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: "bail",
      header: "Bail",
      cell: ({ row }: { row: Dossier }) => (
        <div className="text-sm">
          {row.bail ? (
            <Link 
              href={`/interface/baux/${row.bail.id}`}
              className="hover:underline"
            >
              <Badge variant="outline">
                {row.bail.bailType || "Bail"}
              </Badge>
            </Link>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      id: "assignedAt",
      header: "Assigné le",
      cell: ({ row }: { row: Dossier }) => (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(row.assignedAt)}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: Dossier }) => (
        <div className="flex items-center gap-2">
          {row.bail && (
            <Link href={`/interface/baux/${row.bail.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleRevoke(row.id)}
            disabled={revokingId === row.id}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      data={paginatedData}
      columns={columns}
      total={filteredData.length}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      searchPlaceholder="Rechercher par client ou propriété..."
      onSearch={setSearch}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
}



