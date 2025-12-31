import { getLeases } from "@/lib/actions/leases";
import { DataTable, Column } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPaginationParams } from "@/lib/utils/pagination";
import { LeaseActions } from "@/components/leases/lease-actions";
import {
  LeaseReferenceCell,
  LeasePropertyCell,
  LeaseTenantCell,
  LeaseOwnerCell,
  LeaseStatusCell,
  LeaseDateCell,
  LeaseDepositCell,
  LeaseNotaireCell,
} from "@/components/leases/lease-table-cells";
import { BailStatusFilterWrapper } from "@/components/leases/bail-status-filter-wrapper";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const urlParams = new URLSearchParams();
  
  // Convertir searchParams en URLSearchParams
  Object.entries(resolvedSearchParams).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => urlParams.append(key, v));
      } else {
        urlParams.append(key, value);
      }
    }
  });
  
  const params = getPaginationParams(urlParams);
  
  // Gérer le filtre de statut (peut être multiple via URL)
  const statusParam = urlParams.get("status");
  const statusFilter = statusParam || undefined;
  
  const result = await getLeases({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    search: params.search,
    status: statusFilter,
    propertyId: urlParams.get("propertyId") || undefined,
    tenantId: urlParams.get("tenantId") || undefined,
  });

  const columns: Column<(typeof result.data)[0]>[] = [
    {
      id: "reference",
      header: "N° Référence",
      cell: LeaseReferenceCell,
    },
    {
      id: "tenant",
      header: "Locataire",
      cell: LeaseTenantCell,
    },
    {
      id: "owner",
      header: "Propriétaire",
      cell: LeaseOwnerCell,
    },
    {
      id: "status",
      header: "Statut",
      cell: LeaseStatusCell,
    },
    {
      id: "property",
      header: "Bien",
      cell: LeasePropertyCell,
    },
    {
      id: "notaire",
      header: "Notaire assigné",
      cell: LeaseNotaireCell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Gestion des baux notariés
          </p>
        </div>
        <div className="flex-shrink-0">
          <Link href="/interface/baux/new">
            <Button className="w-full sm:w-auto">
              <Plus className="size-4 mr-2" />
              <span className="hidden sm:inline">Nouveau bail</span>
              <span className="sm:hidden">Nouveau</span>
            </Button>
          </Link>
        </div>
      </div>

      <DataTable
        data={result.data}
        columns={columns}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        searchPlaceholder="Rechercher par bien, locataire..."
        filters={<BailStatusFilterWrapper />}
        actions={LeaseActions}
      />
    </div>
  );
}


