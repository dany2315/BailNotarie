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
} from "@/components/leases/lease-table-cells";

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
  const result = await getLeases({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    search: params.search,
    status: urlParams.get("status") || undefined,
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
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Baux</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des baux notariés
          </p>
        </div>
        <Link href="/interface/baux/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Nouveau bail
          </Button>
        </Link>
      </div>

      <DataTable
        data={result.data}
        columns={columns}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        searchPlaceholder="Rechercher par bien, locataire..."
        actions={LeaseActions}
      />
    </div>
  );
}


