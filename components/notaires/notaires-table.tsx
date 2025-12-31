"use client";

import * as React from "react";
import { Column } from "@/components/data-table/data-table";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/formatters";
import { User } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface NotaireWithCount extends User {
  _count: {
    notaireAssignments: number;
  };
}

interface NotairesTableProps {
  notaires: NotaireWithCount[];
}

export function NotairesTable({ notaires }: NotairesTableProps) {
  const [search, setSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Filtrer les données par recherche
  const filteredData = React.useMemo(() => {
    if (!search.trim()) return notaires;
    
    const searchLower = search.toLowerCase();
    return notaires.filter((notaire) => {
      const name = (notaire.name || "").toLowerCase();
      const email = notaire.email.toLowerCase();
      return name.includes(searchLower) || email.includes(searchLower);
    });
  }, [notaires, search]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  const columns: Column<NotaireWithCount>[] = [
    {
      id: "name",
      header: "Nom",
      cell: ({ row }: { row: NotaireWithCount }) => (
        <div>
          {row.name || (
            <span className="text-muted-foreground">Non renseigné</span>
          )}
        </div>
      ),
    },
    {
      id: "email",
      header: "Email",
      cell: ({ row }: { row: NotaireWithCount }) => <div className="font-mono text-sm">{row.email}</div>,
    },
    {
      id: "assignments",
      header: "Dossiers assignés",
      cell: ({ row }: { row: NotaireWithCount }) => (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {row._count.notaireAssignments} dossier{row._count.notaireAssignments !== 1 ? "s" : ""}
          </Badge>
          {row._count.notaireAssignments > 0 && (
            <Link href={`/interface/notaires/${row.id}/dossiers`}>
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4 mr-1" />
                Voir
              </Button>
            </Link>
          )}
        </div>
      ),
    },
    {
      id: "createdAt",
      header: "Créé le",
      cell: ({ row }: { row: NotaireWithCount }) => (
        <div className="text-sm text-muted-foreground">
          {formatDateTime(row.createdAt)}
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
      searchPlaceholder="Rechercher par nom ou email..."
      onSearch={setSearch}
      onPageChange={setPage}
      onPageSizeChange={(size) => {
        setPageSize(size);
        setPage(1);
      }}
    />
  );
}


