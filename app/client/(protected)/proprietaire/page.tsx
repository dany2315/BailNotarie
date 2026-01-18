import { getCurrentUser } from "@/lib/auth-helpers";
import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getProprietaireStats, getClientBails, getClientProperties } from "@/lib/actions/client-space";
import { ProfilType } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireDashboardPage() {
  const { user, client } = await requireProprietaireAuth();
  
  const [stats, baux, biens] = await Promise.all([
    getProprietaireStats(client.id),
    getClientBails(client.id, ProfilType.PROPRIETAIRE),
    getClientProperties(client.id),
  ]);

  const bauxRecents = baux.slice(0, 5);
  const biensRecents = biens.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bienvenue dans votre espace propriétaire</p>
        </div>
        <div className="flex gap-2">
          <Link href="/client/proprietaire/biens/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Créer un bien
            </Button>
          </Link>
          <Link href="/client/proprietaire/baux/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Créer un bail
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">En attente</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bauxEnCours}</div>
            <p className="text-xs text-muted-foreground">
              Baux en cours de traitement
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Baux récents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Baux récents</CardTitle>
                <CardDescription>Vos derniers baux</CardDescription>
              </div>
              <Link href="/client/proprietaire/baux">
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {bauxRecents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun bail pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {bauxRecents.map((bail) => (
                  <div key={bail.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <Link href={`/client/proprietaire/baux/${bail.id}`}>
                            <span className="font-medium hover:underline">
                              {bail.property.label || bail.property.fullAddress}
                            </span>
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {bail.rentAmount.toLocaleString()} € / mois
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(bail.createdAt)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        bail.status === "SIGNED" ? "bg-green-100 text-green-800" :
                        bail.status === "TERMINATED" ? "bg-gray-100 text-gray-800" :
                        "bg-orange-100 text-orange-800"
                      }`}>
                        {bail.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Biens récents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Biens récents</CardTitle>
                <CardDescription>Vos derniers biens</CardDescription>
              </div>
              <Link href="/client/proprietaire/biens">
                <Button variant="outline" size="sm">
                  Voir tout
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {biensRecents.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun bien pour le moment
              </p>
            ) : (
              <div className="space-y-4">
                {biensRecents.map((bien) => (
                  <div key={bien.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <Link href={`/client/proprietaire/biens/${bien.id}`}>
                            <span className="font-medium hover:underline">
                              {bien.label || bien.fullAddress}
                            </span>
                          </Link>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {bien.bails.length} bail{bien.bails.length > 1 ? "x" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {bien.status === "LOUER" ? "Loué" : "Disponible"}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        bien.status === "LOUER" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {bien.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







