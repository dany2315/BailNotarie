import { getIntakeLinks } from "@/lib/actions/intakes";
import { DataTable, Column } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPaginationParams } from "@/lib/utils/pagination";
import { IntakeActions } from "@/components/intakes/intake-actions";
import {
  IntakeTokenCell,
  IntakeTargetCell,
  IntakePropertyCell,
  IntakeStatusCell,
  IntakeExpiresAtCell,
  IntakeSubmittedAtCell,
} from "@/components/intakes/intake-table-cells";

export default async function IntakesPage({
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
  const result = await getIntakeLinks({
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    status: urlParams.get("status") || undefined,
    target: urlParams.get("target") || undefined,
  });

  // Sérialiser les données pour éviter les problèmes de sérialisation
  const serializedData = JSON.parse(JSON.stringify(result.data));

  const columns: Column<(typeof serializedData)[0]>[] = [
    {
      id: "token",
      header: "Token",
      cell: IntakeTokenCell,
    },
    {
      id: "target",
      header: "Cible",
      cell: IntakeTargetCell,
    },
    {
      id: "property",
      header: "Bien / Bail",
      cell: IntakePropertyCell,
    },
    {
      id: "status",
      header: "Statut",
      cell: IntakeStatusCell,
    },
    {
      id: "expiresAt",
      header: "Expire le",
      cell: IntakeExpiresAtCell,
    },
    {
      id: "submittedAt",
      header: "Soumis le",
      cell: IntakeSubmittedAtCell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intakes</h1>
          <p className="text-muted-foreground mt-1">
            Gestion des liens d'intake
          </p>
        </div>
        <Link href="/interface/intakes/new">
          <Button>
            <Plus className="size-4 mr-2" />
            Nouveau lien
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
        searchPlaceholder="Rechercher par token..."
        actions={IntakeActions}
      />
    </div>
  );
}


