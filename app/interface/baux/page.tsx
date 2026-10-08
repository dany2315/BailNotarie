import { getLeasePaymentCounts, getLeaseStatusCounts, getLeases } from "@/lib/actions/leases";
import { DataTable, Column } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { getPaginationParams } from "@/lib/utils/pagination";
import {
  LeaseDossierCell,
  LeasePartiesCell,
  LeaseMobileCard,
  LeaseWaitingCell,
  LeaseRowActionCell,
  LeaseStageCell,
  LeaseNextActionCell,
  LeaseNotaireCell,
  LeasePaymentCell,
} from "@/components/leases/lease-table-cells";
import { BailStatusFilterWrapper } from "@/components/leases/bail-status-filter-wrapper";
import { LeasePaymentTabs } from "@/components/leases/lease-payment-tabs";
import { LeaseStageTabs } from "@/components/leases/lease-stage-tabs";
import { LeaseSortToggle } from "@/components/leases/lease-sort-toggle";
import { LeaseNotaireFilter } from "@/components/leases/lease-notaire-filter";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

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
  const paymentParam = urlParams.get("payment");
  const paymentFilter = paymentParam === "paid" || paymentParam === "unpaid" ? paymentParam : undefined;
  
  const notaireFilter = urlParams.get("notaire") || undefined;
  const baseFilters = {
    search: params.search,
    status: statusFilter,
    propertyId: urlParams.get("propertyId") || undefined,
    tenantId: urlParams.get("tenantId") || undefined,
    notaire: notaireFilter,
  };

  // Par défaut : les dossiers qui attendent depuis le plus longtemps d'abord.
  const sortParam = urlParams.get("sort") === "recent" ? "recent" : "attente";

  const [result, paymentCounts, statusCounts, notaires] = await Promise.all([
    getLeases({
      page: params.page || 1,
      pageSize: params.pageSize || 10,
      ...baseFilters,
      payment: paymentFilter,
      sort: sortParam,
    }),
    getLeasePaymentCounts(baseFilters),
    getLeaseStatusCounts({ search: params.search, payment: paymentFilter, notaire: notaireFilter }),
    prisma.user.findMany({
      where: { role: Role.NOTAIRE },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Le paiement vient juste après le dossier : le statut ne dit pas si les
  // frais sont réglés (un dossier créé depuis l'interface peut être en attente
  // du locataire sans avoir été payé).
  const columns: Column<(typeof result.data)[0]>[] = [
    {
      id: "dossier",
      header: "Dossier",
      cell: LeaseDossierCell,
    },
    {
      id: "payment",
      header: "Frais de dossier",
      cell: LeasePaymentCell,
    },
    {
      id: "stage",
      header: "Étape",
      cell: LeaseStageCell,
    },
    {
      id: "parties",
      header: "Propriétaire → Locataire",
      cell: LeasePartiesCell,
    },
    {
      id: "next",
      header: "Prochaine action",
      cell: LeaseNextActionCell,
    },
    {
      id: "notaire",
      header: "Notaire",
      cell: LeaseNotaireCell,
    },
    {
      id: "waiting",
      header: "Attente",
      cell: LeaseWaitingCell,
    },
    {
      id: "action",
      header: "",
      cell: LeaseRowActionCell,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dossiers</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Un dossier = un bail, son bien et ses parties.
          </p>
        </div>
        <Button asChild className="w-full gap-2 sm:w-auto">
          <Link href="/interface/baux/new">
            <Plus className="size-4" />
            Nouveau dossier
          </Link>
        </Button>
      </div>

      <DataTable
        data={result.data}
        columns={columns}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        searchPlaceholder="Rechercher par adresse, nom, e-mail..."
        belowSearchContent={
          <div className="flex flex-col gap-3">
            <LeaseStageTabs statusCounts={statusCounts} />
            <div className="flex flex-wrap items-center gap-3">
              <LeasePaymentTabs counts={paymentCounts} />
              <LeaseNotaireFilter notaires={notaires.map((n) => ({ id: n.id, name: n.name || n.email }))} />
              <LeaseSortToggle />
            </div>
            <p className="text-[13.5px] text-muted-foreground">
              {result.total} dossier{result.total > 1 ? "s" : ""} ·{" "}
              {sortParam === "attente"
                ? "triés par attente, du plus ancien au plus récent"
                : "triés du plus récent au plus ancien"}
            </p>
          </div>
        }
        filters={<BailStatusFilterWrapper />}
        compact
        mobileCard={LeaseMobileCard}
        highlightRowsWithout="paidAt"
      />
    </div>
  );
}


