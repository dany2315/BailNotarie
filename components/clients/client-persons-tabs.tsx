"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentsList } from "@/components/leases/documents-list";
import { DocumentsListWithOwner } from "@/components/leases/documents-list-with-owner";
import { Mail, Phone, MapPin, FileText, Users } from "lucide-react";
import { FamilyStatusBadge, MatrimonialRegimeBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils/formatters";
import { ClientType } from "@prisma/client";
import { documentKindLabels } from "@/lib/utils/document-labels";

interface Person {
  id: string;
  firstName: string | null;
  lastName: string | null;
  profession: string | null;
  familyStatus: string | null;
  matrimonialRegime: string | null;
  birthPlace: string | null;
  birthDate: Date | string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  nationality: string | null;
  isPrimary: boolean;
  documents: Array<{
    id: string;
    kind: string;
    fileKey: string;
    mimeType: string | null;
    label: string | null;
    createdAt: Date | string;
  }>;
}

interface Entreprise {
  id: string;
  legalName: string | null;
  name: string | null;
  registration: string | null;
  email: string | null;
  phone: string | null;
  fullAddress: string | null;
  documents: Array<{
    id: string;
    kind: string;
    fileKey: string;
    mimeType: string | null;
    label: string | null;
    createdAt: Date | string;
  }>;
}

interface ClientPersonsTabsProps {
  clientType: ClientType;
  persons?: Person[];
  entreprise?: Entreprise | null;
  clientDocuments?: Array<{
    id: string;
    kind: string;
    fileKey: string;
    mimeType: string | null;
    label: string | null;
    createdAt: Date | string;
  }>;
}

export function ClientPersonsTabs({ 
  clientType, 
  persons = [], 
  entreprise,
  clientDocuments = []
}: ClientPersonsTabsProps) {
  if (clientType === ClientType.PERSONNE_PHYSIQUE) {
    // Si une seule personne, pas besoin d'onglets
    if (persons.length === 1) {
      const person = persons[0];
      const personDocuments = person.documents || [];
      // Séparer les documents de la personne et les documents du client
      const personOnlyDocuments = personDocuments;
      const clientOnlyDocuments = clientDocuments;
      
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Informations du client
            </CardTitle>
            <CardDescription>Détails personnels et de contact</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {person.firstName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                  <p className="mt-1 text-sm font-medium">{person.firstName}</p>
                </div>
              )}
              {person.lastName && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nom</label>
                  <p className="mt-1 text-sm font-medium">{person.lastName}</p>
                </div>
              )}
              {person.profession && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profession</label>
                  <p className="mt-1 text-sm">{person.profession}</p>
                </div>
              )}
              {person.familyStatus && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Statut familial</label>
                  <div className="mt-1">
                    <FamilyStatusBadge status={person.familyStatus} />
                  </div>
                </div>
              )}
              {person.matrimonialRegime && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Régime matrimonial</label>
                  <div className="mt-1">
                    <MatrimonialRegimeBadge regime={person.matrimonialRegime} />
                  </div>
                </div>
              )}
              {person.birthPlace && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                  <p className="mt-1 text-sm">{person.birthPlace}</p>
                </div>
              )}
              {person.birthDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                  <p className="mt-1 text-sm">{formatDate(person.birthDate)}</p>
                </div>
              )}
              {person.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="mt-1 text-sm">{person.email}</p>
                  </div>
                </div>
              )}
              {person.phone && (
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                    <p className="mt-1 text-sm">{person.phone}</p>
                  </div>
                </div>
              )}
              {person.fullAddress && (
                <div className="flex items-start gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                    <p className="mt-1 text-sm whitespace-pre-line">{person.fullAddress}</p>
                  </div>
                </div>
              )}
              {person.nationality && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nationalité</label>
                  <p className="mt-1 text-sm">{person.nationality}</p>
                </div>
              )}
            </div>
            
            {/* Documents de la personne */}
            {personOnlyDocuments.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Documents de {[person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne"} ({personOnlyDocuments.length})</h3>
                  </div>
                  <DocumentsListWithOwner
                    documents={personOnlyDocuments.map((doc) => ({
                      id: doc.id,
                      kind: doc.kind,
                      fileKey: doc.fileKey,
                      mimeType: doc.mimeType,
                      label: doc.label,
                      createdAt: doc.createdAt,
                      person: {
                        id: person.id,
                        firstName: person.firstName,
                        lastName: person.lastName,
                        isPrimary: person.isPrimary,
                      },
                    }))}
                    documentKindLabels={documentKindLabels}
                  />
                </div>
              </>
            )}

            {/* Documents du client (commun à toutes les personnes) */}
            {clientOnlyDocuments.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-5 w-5" />
                    <h3 className="text-lg font-semibold">Documents du client ({clientOnlyDocuments.length})</h3>
                  </div>
                  <DocumentsListWithOwner
                    documents={clientOnlyDocuments.map((doc) => ({
                      id: doc.id,
                      kind: doc.kind,
                      fileKey: doc.fileKey,
                      mimeType: doc.mimeType,
                      label: doc.label,
                      createdAt: doc.createdAt,
                    }))}
                    documentKindLabels={documentKindLabels}
                    ownerLabel="Client"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      );
    }

    // Plusieurs personnes : utiliser les onglets
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informations du client
          </CardTitle>
          <CardDescription>Détails personnels et de contact</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={persons[0]?.id || ""} className="w-full">
            <TabsList className="mb-6">
              {persons.map((person, index) => (
                <TabsTrigger key={person.id} value={person.id}>
                  {person.isPrimary ? "Personne principale" : `Personne ${index + 1}`}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {persons.map((person, index) => {
              const personDocuments = person.documents || [];
              // Séparer les documents de la personne et les documents du client
              const personOnlyDocuments = personDocuments;
              const clientOnlyDocuments = clientDocuments;
              
              return (
                <TabsContent key={person.id} value={person.id} className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant={person.isPrimary ? "default" : "outline"}>
                      {person.isPrimary ? "Personne principale" : `Personne ${index + 1}`}
                    </Badge>
                    <p className="text-sm font-medium">
                      {[person.firstName, person.lastName].filter(Boolean).join(" ") || "Sans nom"}
                    </p>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {person.firstName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                        <p className="mt-1 text-sm font-medium">{person.firstName}</p>
                      </div>
                    )}
                    {person.lastName && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nom</label>
                        <p className="mt-1 text-sm font-medium">{person.lastName}</p>
                      </div>
                    )}
                    {person.profession && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Profession</label>
                        <p className="mt-1 text-sm">{person.profession}</p>
                      </div>
                    )}
                    {person.familyStatus && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Statut familial</label>
                        <div className="mt-1">
                          <FamilyStatusBadge status={person.familyStatus} />
                        </div>
                      </div>
                    )}
                    {person.matrimonialRegime && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Régime matrimonial</label>
                        <div className="mt-1">
                          <MatrimonialRegimeBadge regime={person.matrimonialRegime} />
                        </div>
                      </div>
                    )}
                    {person.birthPlace && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                        <p className="mt-1 text-sm">{person.birthPlace}</p>
                      </div>
                    )}
                    {person.birthDate && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                        <p className="mt-1 text-sm">{formatDate(person.birthDate)}</p>
                      </div>
                    )}
                    {person.email && (
                      <div className="flex items-start gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <p className="mt-1 text-sm">{person.email}</p>
                        </div>
                      </div>
                    )}
                    {person.phone && (
                      <div className="flex items-start gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                          <p className="mt-1 text-sm">{person.phone}</p>
                        </div>
                      </div>
                    )}
                    {person.fullAddress && (
                      <div className="flex items-start gap-2 md:col-span-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                          <p className="mt-1 text-sm whitespace-pre-line">{person.fullAddress}</p>
                        </div>
                      </div>
                    )}
                    {person.nationality && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nationalité</label>
                        <p className="mt-1 text-sm">{person.nationality}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Documents de la personne */}
                  {personOnlyDocuments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">Documents de {[person.firstName, person.lastName].filter(Boolean).join(" ") || "cette personne"} ({personOnlyDocuments.length})</h3>
                        </div>
                        <DocumentsListWithOwner
                          documents={personOnlyDocuments.map((doc) => ({
                            id: doc.id,
                            kind: doc.kind,
                            fileKey: doc.fileKey,
                            mimeType: doc.mimeType,
                            label: doc.label,
                            createdAt: doc.createdAt,
                            person: {
                              id: person.id,
                              firstName: person.firstName,
                              lastName: person.lastName,
                              isPrimary: person.isPrimary,
                            },
                          }))}
                          documentKindLabels={documentKindLabels}
                        />
                      </div>
                    </>
                  )}

                  {/* Documents du client (commun à toutes les personnes) */}
                  {clientOnlyDocuments.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <FileText className="h-5 w-5" />
                          <h3 className="text-lg font-semibold">Documents du client ({clientOnlyDocuments.length})</h3>
                        </div>
                        <DocumentsListWithOwner
                          documents={clientOnlyDocuments.map((doc) => ({
                            id: doc.id,
                            kind: doc.kind,
                            fileKey: doc.fileKey,
                            mimeType: doc.mimeType,
                            label: doc.label,
                            createdAt: doc.createdAt,
                          }))}
                          documentKindLabels={documentKindLabels}
                          ownerLabel="Client"
                        />
                      </div>
                    </>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Client entreprise
  if (entreprise) {
    const entrepriseDocuments = entreprise.documents || [];
    const allEntrepriseDocuments = [...entrepriseDocuments, ...clientDocuments];
    
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Informations du client
          </CardTitle>
          <CardDescription>Détails personnels et de contact</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {entreprise.legalName && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Raison sociale</label>
                <p className="mt-1 text-sm font-medium">{entreprise.legalName}</p>
              </div>
            )}
            {entreprise.name && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nom commercial</label>
                <p className="mt-1 text-sm font-medium">{entreprise.name}</p>
              </div>
            )}
            {entreprise.registration && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">SIREN/SIRET</label>
                <p className="mt-1 text-sm">{entreprise.registration}</p>
              </div>
            )}
            <Separator className="md:col-span-2" />
            {entreprise.email && (
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="mt-1 text-sm">{entreprise.email}</p>
                </div>
              </div>
            )}
            {entreprise.phone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                  <p className="mt-1 text-sm">{entreprise.phone}</p>
                </div>
              </div>
            )}
            {entreprise.fullAddress && (
              <div className="flex items-start gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                  <p className="mt-1 text-sm whitespace-pre-line">{entreprise.fullAddress}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Documents de l'entreprise directement en dessous */}
          {allEntrepriseDocuments.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">Documents ({allEntrepriseDocuments.length})</h3>
                </div>
                <DocumentsList
                  documents={allEntrepriseDocuments.map((doc) => ({
                    id: doc.id,
                    kind: doc.kind,
                    fileKey: doc.fileKey,
                    mimeType: doc.mimeType,
                    label: doc.label,
                    createdAt: doc.createdAt,
                  }))}
                  documentKindLabels={documentKindLabels}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}

