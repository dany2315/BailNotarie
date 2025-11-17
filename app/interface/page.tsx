import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { KPICard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, FileText, Link as LinkIcon, AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InterfacePage() {
  const user = await getCurrentUser();

  // KPIs
  const [activeProperties, activeLeases, pendingIntakes, readyForNotary] = await Promise.all([
    prisma.property.count({ where: { status: "NON_LOUER" } }),
    prisma.bail.count({ where: { status: "ACTIVE" } }),
    prisma.intakeLink.count({ where: { status: "PENDING" } }),
    prisma.bail.count({ where: { status: "READY_FOR_NOTARY" } }),
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
console.log("recentLeases", recentLeases);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Bienvenue, {user?.name || user?.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/interface/properties/new">
            <Button size="sm">
              <Plus className="size-4 mr-2" />
              Créer Bien
            </Button>
          </Link>
          <Link href="/interface/leases/new">
            <Button size="sm">
              <Plus className="size-4 mr-2" />
              Créer Bail
            </Button>
          </Link>
          <Link href="/interface/intakes">
            <Button size="sm" variant="outline">
              <LinkIcon className="size-4 mr-2" />
              Créer Intake
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Biens actifs"
          value={activeProperties}
          icon={Building2}
          description="Biens en statut ACTIVE"
        />
        <KPICard
          title="Baux actifs"
          value={activeLeases}
          icon={FileText}
          description="Baux en statut ACTIVE"
        />
        <KPICard
          title="Intakes en attente"
          value={pendingIntakes}
          icon={LinkIcon}
          description="Liens PENDING"
        />
        <KPICard
          title="Prêts pour notaire"
          value={readyForNotary}
          icon={AlertCircle}
          description="Baux READY_FOR_NOTARY"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Derniers baux modifiés */}
        <Card>
          <CardHeader>
            <CardTitle>Derniers baux modifiés</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun bail récent
              </p>
            ) : (
              <div className="space-y-4">
                {recentLeases.map((lease) => {
                  const tenant = lease.parties.find((p: any) => p.profilType === "LOCATAIRE");
                  const owner = lease.parties.find((p: any) => p.profilType === "PROPRIETAIRE");
                  const displayName = tenant
                    ? tenant.firstName && tenant.lastName
                      ? `${tenant.firstName} ${tenant.lastName}`
                      : tenant.email || "N/A"
                    : owner
                    ? owner.legalName || (owner.firstName && owner.lastName ? `${owner.firstName} ${owner.lastName}` : owner.email) || "N/A"
                    : "N/A";

                  return (
                    <div
                      key={lease.id}
                      className="flex items-center justify-between border-b pb-3 last:border-0"
                    >
                      <div className="flex-1">
                        <Link
                          href={`/interface/leases/${lease.id}`}
                          className="font-medium hover:underline"
                        >
                          {lease.property.fullAddress}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {displayName}
                        </p>
                      </div>
                      <div className="text-right">
                        <StatusBadge status={lease.status} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(lease.updatedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <Link href="/interface/leases">
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
            <CardTitle>Intakes récents</CardTitle>
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
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {intake.target === "OWNER" ? "Propriétaire" : "Locataire"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {intake.property?.fullAddress || intake.bail?.id || "N/A"}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={intake.status} />
                      <p className="text-xs text-muted-foreground mt-1">
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
            <CardTitle>To-do Notaire</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {readyForNotary} bail{readyForNotary > 1 ? "x" : ""} en attente de validation notariale
            </p>
            <Link href="/interface/leases?status=READY_FOR_NOTARY">
              <Button>Voir les baux prêts pour notaire</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
