import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientProperties } from "@/lib/actions/client-space";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home, FileText } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireBiensPage() {
  const { client } = await requireProprietaireAuth();
  
  const biens = await getClientProperties(client.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes biens</h1>
          <p className="text-muted-foreground">Gérez tous vos biens immobiliers</p>
        </div>
        <Link href="/client/proprietaire/biens/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un nouveau bien
          </Button>
        </Link>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{biens.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Loués</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {biens.filter(b => b.status === "LOUER").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {biens.filter(b => b.status === "NON_LOUER").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des biens */}
      <Card>
        <CardHeader>
          <CardTitle>Tous vos biens</CardTitle>
          <CardDescription>
            {biens.length} bien{biens.length > 1 ? "s" : ""} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {biens.length === 0 ? (
            <div className="text-center py-12">
              <Home className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun bien</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de biens. Créez-en un pour commencer.
              </p>
              <Link href="/client/proprietaire/biens/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un bien
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {biens.map((bien) => (
                <Link key={bien.id} href={`/client/proprietaire/biens/${bien.id}`}>
                  <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Home className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {bien.label || bien.fullAddress}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{bien.fullAddress}</p>
                          {bien.surfaceM2 && (
                            <p>{bien.surfaceM2.toString()} m²</p>
                          )}
                          <p>{bien.bails.length} bail{bien.bails.length > 1 ? "x" : ""}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={bien.status === "LOUER" ? "default" : "secondary"}>
                          {bien.status === "LOUER" ? "Loué" : "Disponible"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(bien.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}







