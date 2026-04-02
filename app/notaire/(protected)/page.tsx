import { getCurrentUser } from "@/lib/auth-helpers";
import { getDossiersByNotaire } from "@/lib/actions/notaires";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Phone, Settings2, CheckCircle, Archive } from "lucide-react";
import { KPICard } from "@/components/shared/kpi-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DOSSIER_TAB_STATUSES } from "@/lib/utils/bails-labels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NotaireDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  const dossiers = await getDossiersByNotaire(user.id);
  type DossierType = Awaited<ReturnType<typeof getDossiersByNotaire>>[number];

  const getBailStatus = (d: DossierType) => d.bail?.status || "READY_FOR_NOTARY";

  const stats = {
    enCours: dossiers.filter((d: DossierType) => DOSSIER_TAB_STATUSES.en_cours.includes(getBailStatus(d))).length,
    aContacter: dossiers.filter((d: DossierType) => getBailStatus(d) === "READY_FOR_NOTARY").length,
    enTraitement: dossiers.filter((d: DossierType) => getBailStatus(d) === "CLIENT_CONTACTED").length,
    signes: dossiers.filter((d: DossierType) => getBailStatus(d) === "SIGNED").length,
    classes: dossiers.filter((d: DossierType) => DOSSIER_TAB_STATUSES.classes.includes(getBailStatus(d))).length,
  };

  // Uniquement les dossiers en cours pour la liste récente
  const dossiersEnCours = dossiers.filter((d: DossierType) =>
    DOSSIER_TAB_STATUSES.en_cours.includes(getBailStatus(d))
  );

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Bienvenue, {user.name || user.email}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="En cours"
          value={stats.enCours}
          icon={FileText}
          description="Dossiers actifs"
        />
        <KPICard
          title="À contacter"
          value={stats.aContacter}
          icon={Phone}
          description="En attente de prise de contact"
        />
        <KPICard
          title="En traitement"
          value={stats.enTraitement}
          icon={Settings2}
          description="Client déjà contacté"
        />
        <KPICard
          title="Signés"
          value={stats.signes}
          icon={CheckCircle}
          description="Dossiers finalisés"
        />
      </div>

      {/* Dossiers en cours récents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Dossiers en cours</CardTitle>
            <Link href="/notaire/dossiers">
              <Button variant="outline" size="sm">
                Voir tous
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {dossiersEnCours.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun dossier en cours pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {dossiersEnCours.slice(0, 5).map((dossier: DossierType) => {
                const clientName = dossier.client.entreprise?.legalName ||
                  (dossier.client.persons?.[0]
                    ? `${dossier.client.persons[0].firstName || ""} ${dossier.client.persons[0].lastName || ""}`.trim()
                    : "Client") ||
                  "Client";

                const status = getBailStatus(dossier);
                const isAContacter = status === "READY_FOR_NOTARY";

                return (
                  <Link
                    key={dossier.id}
                    href={`/notaire/dossiers?dossierId=${dossier.id}`}
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
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={isAContacter
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400 border-orange-200 dark:border-orange-800"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                          }
                        >
                          {isAContacter ? "À contacter" : "En traitement"}
                        </Badge>
                      </div>
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
