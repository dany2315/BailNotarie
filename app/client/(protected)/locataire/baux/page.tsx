import { requireLocataireAuth } from "@/lib/auth-helpers";
import { getClientBails } from "@/lib/actions/client-space";
import { ProfilType, BailStatus } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertCircle } from "lucide-react";
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
  SIGNED: "Actif",
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

export default async function LocataireBauxPage() {
  const { client } = await requireLocataireAuth();
  
  const baux = await getClientBails(client.id, ProfilType.LOCATAIRE);
  const bauxActifs = baux.filter(b => b.status === BailStatus.SIGNED);
  const demandesEnAttente = baux.filter(b => 
    b.dossierAssignments.length > 0 && 
    b.dossierAssignments[0]?.requests &&
    b.dossierAssignments[0].requests.length > 0
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mes baux</h1>
        <p className="text-muted-foreground">Consultez vos baux et répondez aux demandes</p>
      </div>

      {/* Alertes pour demandes en attente */}
      {demandesEnAttente.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5" />
              {demandesEnAttente.length} demande{demandesEnAttente.length > 1 ? "s" : ""} en attente
            </CardTitle>
            <CardDescription>
              Le notaire a besoin de votre réponse. Cliquez sur un bail pour répondre.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Statistiques rapides */}
      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-sm font-medium">Actifs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {bauxActifs.length}
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
      </div>

      {/* Liste des baux */}
      <Card>
        <CardHeader>
          <CardTitle>Vos baux</CardTitle>
          <CardDescription>
            {baux.length} bail{baux.length > 1 ? "x" : ""} au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          {baux.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
              <p className="text-muted-foreground">
                Vous n'avez pas encore de baux.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {baux.map((bail) => {
                const hasPendingRequests = bail.dossierAssignments.length > 0 && 
                  bail.dossierAssignments[0]?.requests &&
                  bail.dossierAssignments[0].requests.length > 0;

                return (
                  <Link key={bail.id} href={`/client/locataire/baux/${bail.id}`}>
                    <div className={`border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer ${
                      hasPendingRequests ? "border-orange-200 bg-orange-50" : ""
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {bail.property.label || bail.property.fullAddress}
                            </span>
                            {hasPendingRequests && (
                              <Badge variant="outline" className="border-orange-300 text-orange-700">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Action requise
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>{bail.rentAmount.toLocaleString()} € / mois</p>
                            <p>
                              Du {formatDateTime(bail.effectiveDate)} 
                              {bail.endDate && ` au ${formatDateTime(bail.endDate)}`}
                            </p>
                            {bail.dossierAssignments.length > 0 && (
                              <p className="text-blue-600">
                                Notaire : {bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}
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







