import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { KPICard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Link as LinkIcon, AlertCircle, Plus, Users } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import { BailStatus, CompletionStatus, PropertyStatus  } from "@prisma/client";
import { getAllClients } from "@/lib/actions/clients";
import { getAllBails } from "@/lib/actions/leases";
import { ClientsListDashboard } from "@/components/dashboard/clients-list-dashboard";
import { BailsListDashboard } from "@/components/dashboard/bails-list-dashboard";

export default async function InterfacePage() {
  const user = await getCurrentUser();

  // KPIs
  const [completedClients, signedLeases, pendingIntakes, readyForNotary, allClients, allBails] = await Promise.all([
    prisma.client.count({ where: { completionStatus: CompletionStatus.COMPLETED } }),
    prisma.bail.count({ where: { status: BailStatus.SIGNED } }),
    prisma.intakeLink.count({ where: { status: "PENDING" } }),
    prisma.bail.count({ where: { status: BailStatus.READY_FOR_NOTARY } }),
    getAllClients(),
    getAllBails(),
  ]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Bienvenue, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link href="/interface/properties/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Créer Bien</span>
              <span className="sm:hidden">Bien</span>
            </Button>
          </Link>
          <Link href="/interface/baux/new" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              <Plus className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Créer Bail</span>
              <span className="sm:hidden">Bail</span>
            </Button>
          </Link>
          <Link href="/interface/intakes" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto">
              <LinkIcon className="size-4 sm:mr-2" />
              <span className="hidden sm:inline">Créer Intake</span>
              <span className="sm:hidden">Intake</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Clients complets"
          value={completedClients}
          icon={Users}
          description=""
        />
        <KPICard
          title="Baux signés"
          value={signedLeases}
          icon={FileText}
          description=""
        />
        <KPICard
          title="Baux prêts pour notaire"
          value={readyForNotary}
          icon={AlertCircle}
          description=""
        />
        <KPICard
          title="Liens en attente"
          value={pendingIntakes}
          icon={LinkIcon}
          description=""
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Liste des baux */}
        <BailsListDashboard bails={allBails} />

        {/* Liste des clients */}
        <ClientsListDashboard clients={allClients} />
      </div>

      {/* To-do Notaire */}
      {readyForNotary > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">To-do Notaire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {readyForNotary} bail{readyForNotary > 1 ? "x" : ""} en attente de validation notariale
            </p>
            <Link href="/interface/baux?status=READY_FOR_NOTARY" className="block">
              <Button className="w-full sm:w-auto">
                <span className="hidden sm:inline">Voir les baux prêts pour notaire</span>
                <span className="sm:hidden">Voir les baux</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
