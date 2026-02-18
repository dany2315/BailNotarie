import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { getClientBails } from "@/lib/actions/client-space";
import { ProfilType, BailStatus, BailType, BailFamille } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Search, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type BailWithRelations = {
  id: string;
  bailType: BailType;
  bailFamily: BailFamille | string;
  status: BailStatus;
  rentAmount: number;
  effectiveDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  propertyId: string;
  property: {
    id: string;
    label: string | null;
    fullAddress: string;
    status: string;
    completionStatus: string;
  };
  parties: Array<{
    id: string;
    profilType: ProfilType;
    persons?: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise?: {
      legalName: string | null;
      name: string | null;
      email: string | null;
    } | null;
  }>;
  dossierAssignments: Array<{
    id: string;
    notaire: {
      id: string;
      name: string | null;
      email: string;
    };
    requests?: Array<{
      id: string;
      status: string;
      title: string;
    }>;
  }>;
};

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

const bailTypeLabels: Record<BailType, string> = {
  BAIL_NU_3_ANS: "Bail nue",
  BAIL_NU_6_ANS: "Bail nue",
  BAIL_MEUBLE_1_ANS: "Bail meublé",
  BAIL_MEUBLE_9_MOIS: "Bail meublé",
};

const bailFamilyLabels: Record<string, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
  PROFESSIONNEL: "Bail professionnel",
  SAISONNIER: "Bail saisonnier",
};

export default async function ProprietaireBauxPage() {
  const { client } = await requireProprietaireAuth();
  
  const baux = await getClientBails(client.id, ProfilType.PROPRIETAIRE) as BailWithRelations[];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-row items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Mes baux</h1>
            <Badge variant="secondary" className="text-xs sm:text-sm">
              {baux.length}
            </Badge>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez tous vos baux</p>
        </div>
        <Link href="/client/proprietaire/baux/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau bail
          </Button>
        </Link>
      </div>

      {/* Liste des baux */}
      <div>
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
            <div className="space-y-3 sm:space-y-4">
              {baux.map((bail) => {
                const bailStatus: BailStatus = bail.status as BailStatus;
                const bailType: BailType = bail.bailType as BailType;
                const locataire = bail.parties.find((p: BailWithRelations['parties'][0]) => p.profilType === ProfilType.LOCATAIRE);
                const locataireName = locataire?.entreprise 
                  ? locataire.entreprise.legalName || locataire.entreprise.name || "Non défini"
                  : locataire?.persons && locataire.persons.length > 0
                    ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim() || `${locataire.persons[0].email || ""}` || "Non défini"
                    : "Non défini";

                const endDate = bail.endDate 
                  ? new Date(bail.endDate) 
                  : calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType);

                const bailTypeLabel = bailTypeLabels[bailType] || bail.bailType;
                const bailFamilyLabel = bailFamilyLabels[bail.bailFamily] || bail.bailFamily || "Habitation";

                return (
                  <Link key={bail.id} href={`/client/proprietaire/baux/${bail.id}`}>
                    <div className="border rounded-lg p-3 sm:p-4 bg-accent hover:bg-accent/80 transition-colors cursor-pointer">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium text-black truncate">
                              {bail.property.label || bail.property.fullAddress}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <Badge variant="default" className="text-xs">
                              {bailTypeLabel}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {bailFamilyLabel}
                            </Badge>
                          </div>
                          <div className="space-y-1.5 sm:space-y-1 text-xs sm:text-sm text-muted-foreground">
                            <p className="break-all">
                              Locataire : <span className="font-medium text-black">{locataireName}</span>
                            </p>
                            <p>
                              Loyer : <span className="font-medium text-black">{bail.rentAmount.toLocaleString()} €</span> / mois
                            </p>
                            <p className="flex flex-wrap items-center gap-1">
                              Du <span className="font-medium text-black">{formatDate(bail.effectiveDate)}</span> 
                              au <span className="font-medium text-black">{formatDate(endDate)}</span>
                            </p>
                            {bail.dossierAssignments.length > 0 && (
                              <p className="text-blue-600 break-all">
                                Notaire assigné : <span className="font-medium">{bail.dossierAssignments[0].notaire.name || bail.dossierAssignments[0].notaire.email}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col sm:justify-between sm:items-end gap-3 sm:gap-4 sm:h-full w-full sm:w-auto">
                          <div className="flex flex-col items-start sm:items-end gap-2">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDateTime(bail.updatedAt)}
                            </span>
                          </div>

                          <div className="flex flex-row items-center gap-2 hover:scale-95 transition-transform ml-auto sm:ml-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                              Voir le bail
                            </span>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
    </div>
  );
}







