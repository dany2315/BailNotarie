import { getCurrentUser } from "@/lib/auth-helpers";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users } from "lucide-react";
import { KPICard } from "@/components/shared/kpi-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NotaireDashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  const dossiers = await getDossiersByNotaire(user.id);
  type DossierType = Awaited<ReturnType<typeof getDossiersByNotaire>>[number];

  const stats = {
    total: dossiers.length,
    avecBail: dossiers.filter((d: DossierType) => d.bailId).length,
    sansBail: dossiers.filter((d: DossierType) => !d.bailId).length,
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Bienvenue, {user.name || user.email}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <KPICard
          title="Total dossiers"
          value={stats.total}
          icon={FileText}
          description="Dossiers assignés"
        />
        <KPICard
          title="Dossiers avec bail"
          value={stats.avecBail}
          icon={FileText}
          description="Baux notariés"
        />
        <KPICard
          title="Dossiers sans bail"
          value={stats.sansBail}
          icon={Users}
          description="En attente"
        />
      </div>

      {/* Dossiers récents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers récents</CardTitle>
            <Link href="/notaire/dossiers">
              <Button variant="outline" size="sm">
                Voir tous
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {dossiers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun dossier assigné pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {dossiers.slice(0, 5).map((dossier: DossierType) => {
                const clientName = dossier.client.entreprise?.legalName ||
                  (dossier.client.persons?.[0] 
                    ? `${dossier.client.persons[0].firstName || ""} ${dossier.client.persons[0].lastName || ""}`.trim()
                    : "Client") ||
                  "Client";
                
                return (
                  <Link
                    key={dossier.id}
                    href={`/notaire/dossiers/${dossier.id}`}
                    className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{clientName}</h3>
                        {dossier.property && (
                          <p className="text-sm text-muted-foreground">
                            {dossier.property.fullAddress}
                          </p>
                        )}
                      </div>
                      {dossier.bail && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                          Avec bail
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

