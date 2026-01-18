import { getCurrentUser } from "@/lib/auth-helpers";
import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getLocataireStats, getClientBails } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LocataireDashboardPage() {
  const { user, client } = await requireLocataireAuth();
  
  const [stats, baux] = await Promise.all([
    getLocataireStats(client.id),
    getClientBails(client.id, ProfilType.LOCATAIRE),
  ]);

  const bauxActifs = baux.filter(b => b.status === "SIGNED");
  const demandesEnAttente = baux.filter(b => 
    b.dossierAssignments.length > 0 && 
    b.dossierAssignments[0]?.requests &&
    b.dossierAssignments[0].requests.length > 0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bienvenue dans votre espace locataire</p>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bauxActifs}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalBaux} baux au total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baux terminés</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bauxTermines}</div>
            <p className="text-xs text-muted-foreground">
              {stats.bauxEnCours} en cours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Demandes en attente</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{demandesEnAttente.length}</div>
            <p className="text-xs text-muted-foreground">
              Réponses requises
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Baux actifs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mes baux actifs</CardTitle>
              <CardDescription>Vos baux en cours</CardDescription>
            </div>
            <Link href="/client/locataire/baux">
              <Button variant="outline" size="sm">
                Voir tout
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {bauxActifs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun bail actif pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {bauxActifs.map((bail) => (
                <div key={bail.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <Link href={`/client/locataire/baux/${bail.id}`}>
                          <span className="font-medium hover:underline">
                            {bail.property.label || bail.property.fullAddress}
                          </span>
                        </Link>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {bail.rentAmount.toLocaleString()} € / mois
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Du {formatDateTime(bail.effectiveDate)} au {bail.endDate ? formatDateTime(bail.endDate) : "indéterminé"}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Actif
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demandes en attente */}
      {demandesEnAttente.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Demandes en attente
            </CardTitle>
            <CardDescription>
              Le notaire a besoin de votre réponse
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {demandesEnAttente.map((bail) => (
                <div key={bail.id} className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link href={`/client/locataire/baux/${bail.id}`}>
                        <span className="font-medium hover:underline">
                          {bail.property.label || bail.property.fullAddress}
                        </span>
                      </Link>
                      <p className="text-sm text-muted-foreground mt-1">
                        Des documents ou informations sont requis
                      </p>
                    </div>
                    <Link href={`/client/locataire/baux/${bail.id}`}>
                      <Button variant="outline" size="sm">
                        Répondre
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

