import { getCurrentUser } from "@/lib/auth-helpers";
import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getProprietaireStats, getPendingNotaireRequests, getClientBails, getClientProperties } from "@/lib/actions/client-space";
import { ProfilType, BailStatus } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";
import { UnifiedStatusList } from "@/components/client/unified-status-list";
import { CompletionStatusBanner } from "@/components/client/completion-status-banner";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireDashboardPage() {
  const { user, client } = await requireProprietaireAuth();
  
  const [stats, pendingRequests, baux, properties] = await Promise.all([
    getProprietaireStats(client.id),
    getPendingNotaireRequests(client.id, ProfilType.PROPRIETAIRE),
    getClientBails(client.id, ProfilType.PROPRIETAIRE),
    getClientProperties(client.id),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenue dans votre espace propriétaire</p>
        </div>
      </div>

      {/* Bannière de statut de vérification */}
      <CompletionStatusBanner 
        completionStatus={client.completionStatus} 
        informationsPath="/client/proprietaire/informations"
      />

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biens</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProperties}</div>
            <p className="text-xs text-muted-foreground">
              {stats.propertiesLouees} loués, {stats.propertiesNonLouees} disponibles
            </p>
          </CardContent>
        </Card>
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
      </div>

      {/* Demandes du notaire non traitées */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  Demandes du notaire en attente
                </CardTitle>
                <CardDescription>
                  Le notaire a besoin de votre réponse
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">{request.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {request.content}
                      </p>
                      {request.bail && (
                        <Link href={`/client/proprietaire/baux/${request.bail.id}`}>
                          <p className="text-xs text-muted-foreground hover:underline">
                            Bail : {request.bail.property?.label || request.bail.property?.fullAddress}
                          </p>
                        </Link>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Demandé le {formatDateTime(request.createdAt)}
                      </p>
                    </div>
                    {request.bail ? (
                      <Link href={`/client/proprietaire/baux/${request.bail.id}`}>
                        <Button variant="outline" size="sm">
                          Répondre
                        </Button>
                      </Link>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        Répondre
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pendingRequests.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Aucune demande en attente du notaire
            </p>
          </CardContent>
        </Card>
      )}

      {/* Liste unifiée des biens et baux avec filtres */}
      <UnifiedStatusList 
        properties={properties}
        bails={baux} 
        profilType={ProfilType.PROPRIETAIRE}
        basePath="/client/proprietaire"
      />
    </div>
  );
}








