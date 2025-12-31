"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, FileX, User, Building2, Users, FileText } from "lucide-react";
import { getDocumentLabel } from "@/lib/utils/document-labels";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ClientMissingData } from "@/lib/actions/clients";

// Labels pour les champs en français
const fieldLabels: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  email: "Email",
  phone: "Téléphone",
  fullAddress: "Adresse complète",
  nationality: "Nationalité",
  birthDate: "Date de naissance",
  birthPlace: "Lieu de naissance",
  familyStatus: "Situation familiale",
  matrimonialRegime: "Régime matrimonial",
  profession: "Profession",
  legalName: "Raison sociale",
  registration: "Numéro SIRET/SIREN",
  name: "Nom commercial",
};

interface MissingDataCardProps {
  clientId: string;
  missingData: ClientMissingData;
  className?: string;
}

export function MissingDataCard({
  clientId,
  missingData,
  className,
}: MissingDataCardProps) {
  const hasMissingData = 
    missingData.totalMissingFields > 0 || 
    missingData.totalMissingDocuments > 0;

  if (!hasMissingData) {
    return null;
  }

  return (
    <Card className={`border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20 ${className || ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Données manquantes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Données manquantes par personne */}
        {missingData.persons.map((person) => (
          <div key={person.personId} className="space-y-2 pb-3 border-b border-amber-200 dark:border-amber-800 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <User className="h-4 w-4" />
              {person.personName}
              {person.isPrimary && (
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:border-amber-600 dark:text-amber-400">
                  Principal
                </Badge>
              )}
            </div>
            
            {/* Champs manquants de la personne */}
            {person.missingFields.length > 0 && (
              <div className="ml-6 space-y-1">
                <div className="text-xs text-amber-600 dark:text-amber-400">Informations :</div>
                <div className="flex flex-wrap gap-1.5">
                  {person.missingFields.map((field) => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    >
                      {fieldLabels[field] || field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Documents manquants de la personne */}
            {person.missingDocuments.length > 0 && (
              <div className="ml-6 space-y-1">
                <div className="text-xs text-amber-600 dark:text-amber-400">Documents :</div>
                <div className="flex flex-wrap gap-1.5">
                  {person.missingDocuments.map((doc) => (
                    <Badge
                      key={doc}
                      variant="outline"
                      className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    >
                      {getDocumentLabel(doc)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Données manquantes de l'entreprise */}
        {missingData.entreprise && (
          <div className="space-y-2 pb-3 border-b border-amber-200 dark:border-amber-800 last:border-b-0 last:pb-0">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <Building2 className="h-4 w-4" />
              Entreprise
            </div>
            
            {/* Champs manquants de l'entreprise */}
            {missingData.entreprise.missingFields.length > 0 && (
              <div className="ml-6 space-y-1">
                <div className="text-xs text-amber-600 dark:text-amber-400">Informations :</div>
                <div className="flex flex-wrap gap-1.5">
                  {missingData.entreprise.missingFields.map((field) => (
                    <Badge
                      key={field}
                      variant="outline"
                      className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    >
                      {fieldLabels[field] || field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {/* Documents manquants de l'entreprise */}
            {missingData.entreprise.missingDocuments.length > 0 && (
              <div className="ml-6 space-y-1">
                <div className="text-xs text-amber-600 dark:text-amber-400">Documents :</div>
                <div className="flex flex-wrap gap-1.5">
                  {missingData.entreprise.missingDocuments.map((doc) => (
                    <Badge
                      key={doc}
                      variant="outline"
                      className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                    >
                      {getDocumentLabel(doc)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Documents manquants au niveau client (livret de famille, PACS) */}
        {missingData.clientDocuments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <Users className="h-4 w-4" />
              Documents du foyer
            </div>
            <div className="ml-6 flex flex-wrap gap-1.5">
              {missingData.clientDocuments.map((doc) => (
                <Badge
                  key={doc}
                  variant="outline"
                  className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                >
                  {getDocumentLabel(doc)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Documents généraux manquants (assurance, RIB pour locataire) */}
        {missingData.generalDocuments.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300">
              <FileText className="h-4 w-4" />
              Documents généraux
            </div>
            <div className="ml-6 flex flex-wrap gap-1.5">
              {missingData.generalDocuments.map((doc) => (
                <Badge
                  key={doc}
                  variant="outline"
                  className="text-xs border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                >
                  {getDocumentLabel(doc)}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Bouton pour compléter */}
        <div className="pt-2">
          <Link href={`/interface/clients/${clientId}/edit`}>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/50"
            >
              Compléter les informations
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}







