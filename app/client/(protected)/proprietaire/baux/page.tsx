import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientBails } from "@/lib/actions/client-space";
import { ProfilType, BailStatus } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Search } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
};

const statusColors: Record<BailStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800",
  SIGNED: "bg-green-100 text-green-800",
  TERMINATED: "bg-gray-100 text-gray-800",
};

export default async function ProprietaireBauxPage() {
  const { client } = await requireProprietaireAuth();
  
  const baux = await getClientBails(client.id, ProfilType.PROPRIETAIRE);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mes baux</h1>
          <p className="text-muted-foreground">Gérez tous vos baux</p>
        </div>
        <Link href="/client/proprietaire/baux/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un nouveau bail
          </Button>
        </Link>
      </div>

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{baux.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Signés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {baux.filter(b => b.status === BailStatus.SIGNED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {baux.filter(b => 
                b.status === BailStatus.DRAFT || 
                b.status === BailStatus.PENDING_VALIDATION || 
                b.status === BailStatus.READY_FOR_NOTARY
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Terminés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {baux.filter(b => b.status === BailStatus.TERMINATED).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avec notaire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {baux.filter(b => b.dossierAssignments.length > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des baux */}
      <Card>
        <CardHeader>
          <CardTitle>Tous vos baux</CardTitle>
          <CardDescription>
            {baux.length} bail{baux.length > 1 ? "x" : ""} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {baux.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez pas encore de baux. Créez-en un pour commencer.
              </p>
              <Link href="/client/proprietaire/baux/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un bail
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {baux.map((bail) => {
                const locataire = bail.parties.find(p => p.profilType === ProfilType.LOCATAIRE);
                const locataireName = locataire?.entreprise 
                  ? locataire.entreprise.legalName || locataire.entreprise.name
                  : locataire?.persons?.[0] 
                    ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
                    : "Non défini";

                return (
                  <Link key={bail.id} href={`/client/proprietaire/baux/${bail.id}`}>
                    <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {bail.property.label || bail.property.fullAddress}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Locataire : {locataireName}</p>
                            <p>{bail.rentAmount.toLocaleString()} € / mois</p>
                            <p>
                              Du {formatDateTime(bail.effectiveDate)} 
                              {bail.endDate && ` au ${formatDateTime(bail.endDate)}`}
                            </p>
                            {bail.dossierAssignments.length > 0 && (
                              <p className="text-blue-600">
                                Notaire assigné : {bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={statusColors[bail.status]}>
                            {statusLabels[bail.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(bail.createdAt)}
                          </span>
                        </div>
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







