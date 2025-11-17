import { getProperties } from "@/lib/actions/properties";
import { DataTable, Column } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPaginationParams } from "@/lib/utils/pagination";
import { PropertyOwnerCell, PropertyStatusCell, PropertyDateCell } from "@/components/properties/property-table-cells";
import { PropertyActions } from "@/components/properties/property-actions";

export default async function PropertiesPage({
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
  const result = await getProperties({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    search: params.search,
    status: urlParams.get("status") || undefined,
    ownerId: urlParams.get("ownerId") || undefined,
  });

  // Sérialiser les données pour éviter les problèmes de sérialisation
  const serializedData = JSON.parse(JSON.stringify(result.data));

  const columns: Column<(typeof serializedData)[0]>[] = [
    {
      id: "address",
      header: "Adresse",
      accessorKey: "fullAddress",
    },
    {
      id: "owner",
      header: "Propriétaire",
      cell: PropertyOwnerCell,
    },
    {
      id: "status",
      header: "Statut",
      cell: PropertyStatusCell,
    },
    {
      id: "createdAt",
      header: "Créé le",
      cell: PropertyDateCell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biens</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des propriétés immobilières
          </p>
        </div>
        <Link href="/interface/properties/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Nouveau bien
          </Button>
        </Link>
      </div>

      <DataTable
        data={serializedData}
        columns={columns}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        searchPlaceholder="Rechercher par adresse..."
        actions={PropertyActions}
      />
    </div>
  );
}


