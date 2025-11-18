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

export default async function InterfacePage() {
  const user = await getCurrentUser();

  // KPIs
  const [completedClients, signedLeases, pendingIntakes, readyForNotary] = await Promise.all([
    prisma.client.count({ where: { completionStatus: CompletionStatus.COMPLETED } }),
    prisma.bail.count({ where: { status: BailStatus.SIGNED } }),
    prisma.intakeLink.count({ where: { status: "PENDING" } }),
    prisma.bail.count({ where: { status: BailStatus.READY_FOR_NOTARY } }),
  ]);

  // Derniers baux modifiés
  const recentLeases = await prisma.bail.findMany({
    take: 5,
    orderBy: { updatedAt: "desc" },
    include: {
      property: {
        include: {
          owner: true,
        },
      },
      parties: true,
    },
  });
  // Intakes récents
  const recentIntakes = await prisma.intakeLink.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      property: true,
      client: true,
      bail: {
        include: {
          parties: true,
        },
      },
    },
  });


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

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {/* Derniers baux modifiés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Derniers baux modifiés</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun bail récent
              </p>
            ) : (
              <div className="space-y-4">
                {recentLeases.map((lease) => {
                  const tenant = lease.parties.find((p: any) => p.profilType === "LOCATAIRE") as any;
                  const owner = lease.parties.find((p: any) => p.profilType === "PROPRIETAIRE") as any;
                  
                  if (!tenant || !owner) {
                    return null;
                  }
                  
                  const displayNameTenant = tenant.firstName && tenant.lastName
                    ? `${tenant.firstName} ${tenant.lastName}`
                    : tenant.email || tenant.legalName || "N/A";
                  
                  const displayNameOwner = owner.firstName && owner.lastName
                    ? `${owner.firstName} ${owner.lastName}`
                    : owner.email || owner.legalName || "N/A";

                  return (
                    <div
                      key={lease.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/interface/baux/${lease.id}`}
                          className="font-medium hover:underline block truncate"
                        >
                          Bail #{lease.id.slice(-8).toUpperCase()}
                        </Link>
                        <p className="text-sm text-muted-foreground truncate">
                          {displayNameTenant}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {displayNameOwner}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1">
                        <StatusBadge status={lease.status} />
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(lease.updatedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <Link href="/interface/baux">
                  <Button variant="outline" className="w-full">
                    Voir tous les baux
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Intakes récents */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Intakes récents</CardTitle>
          </CardHeader>
          <CardContent>
            {recentIntakes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun intake récent
              </p>
            ) : (
              <div className="space-y-4">
                {recentIntakes.map((intake) => (
                  <div
                    key={intake.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {intake.target === "OWNER" ? "Propriétaire" : "Locataire"}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {intake.property?.fullAddress || intake.bail?.id || "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 sm:gap-1">
                      <StatusBadge status={intake.status} />
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(intake.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
                <Link href="/interface/intakes">
                  <Button variant="outline" className="w-full">
                    Voir tous les intakes
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
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
