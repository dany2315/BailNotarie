"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { FileText, User, Building2, Home, Euro, Calendar, MapPin, MessageSquare, Check, X, Copy } from "lucide-react";
import { DocumentsList } from "@/components/leases/documents-list";
import { NotaireRequests } from "@/components/notaire/notaire-requests";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { getBailTypeLabel } from "@/lib/utils/bails-labels";
import { PropertyLegalStatusBadge } from "../shared/status-badge";
import { getPropertyLegalStatusLabel } from "@/lib/utils/legaleStatus-label";
import { BienLegalStatus } from "@prisma/client";
import { copyToClipboard } from "@/lib/utils/copy";
import { useState } from "react";

interface Dossier {
  id: string;
  client: {
    id: string;
    type: string;
    profilType: string;
    persons?: Array<{
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      fullAddress?: string | null;
      nationality?: string | null;
      familyStatus?: string | null;
      matrimonialRegime?: string | null;
      birthPlace?: string | null;
      birthDate?: Date | null;
      isPrimary: boolean;
    }>;
    entreprise?: {
      id: string;
      legalName: string;
      name: string;
      email: string;
      phone?: string | null;
      fullAddress?: string | null;
      registration: string;
    } | null;
    documents?: Array<{
      id: string;
      kind: string;
      label?: string | null;
      fileKey: string;
      mimeType?: string | null;
      size?: number | null;
      createdAt: Date;
    }>;
  };
  property?: {
    id: string;
    label?: string | null;
    fullAddress: string;
    surfaceM2?: number | null;
    type?: string | null;
    legalStatus?: string | null;
    status: string;
    hasLiterie?: boolean;
    hasRideaux?: boolean;
    hasPlaquesCuisson?: boolean;
    hasFour?: boolean;
    hasRefrigerateur?: boolean;
    hasCongelateur?: boolean;
    hasVaisselle?: boolean;
    hasUstensilesCuisine?: boolean;
    hasTable?: boolean;
    hasSieges?: boolean;
    hasEtageresRangement?: boolean;
    hasLuminaires?: boolean;
    hasMaterielEntretien?: boolean;
    documents?: Array<{
      id: string;
      kind: string;
      label?: string | null;
      fileKey: string;
      mimeType?: string | null;
      size?: number | null;
      createdAt: Date;
    }>;
  } | null;
  bail?: {
    id: string;
    bailType: string;
    bailFamily: string;
    status: string;
    rentAmount: number;
    monthlyCharges: number;
    securityDeposit: number;
    effectiveDate: Date;
    endDate?: Date | null;
    paymentDay?: number | null;
    property?: {
      id: string;
      fullAddress: string;
    };
    documents?: Array<{
      id: string;
      kind: string;
      label?: string | null;
      fileKey: string;
      mimeType?: string | null;
      size?: number | null;
      createdAt: Date;
    }>;
    parties?: Array<{
      id: string;
      type: string;
      profilType: string;
      persons?: Array<{
        id: string;
        firstName?: string | null;
        lastName?: string | null;
        email?: string | null;
        phone?: string | null;
        fullAddress?: string | null;
        nationality?: string | null;
        familyStatus?: string | null;
        matrimonialRegime?: string | null;
        birthPlace?: string | null;
        birthDate?: Date | null;
        isPrimary: boolean;
        documents?: Array<{
          id: string;
          kind: string;
          label?: string | null;
          fileKey: string;
          mimeType?: string | null;
          size?: number | null;
          createdAt: Date;
        }>;
      }>;
      entreprise?: {
        id: string;
        legalName: string;
        name: string;
        email: string;
        phone?: string | null;
        fullAddress?: string | null;
        registration: string;
        documents?: Array<{
          id: string;
          kind: string;
          label?: string | null;
          fileKey: string;
          mimeType?: string | null;
          size?: number | null;
          createdAt: Date;
        }>;
      } | null;
      documents?: Array<{
        id: string;
        kind: string;
        label?: string | null;
        fileKey: string;
        mimeType?: string | null;
        size?: number | null;
        createdAt: Date;
      }>;
    }>;
  } | null;
  assignedAt: Date;
  notes?: string | null;
  requests?: Array<{
    id: string;
    type: "DOCUMENT" | "DATA";
    title: string;
    content: string;
    targetProprietaire: boolean;
    targetLocataire: boolean;
    status: "PENDING" | "COMPLETED" | "CANCELLED";
    createdAt: Date;
    createdBy: {
      id: string;
      email: string;
      name?: string | null;
    };
  }>;
}

interface DossierDetailViewProps {
  dossier: Dossier;
}

// Liste des champs de mobilier obligatoire pour location meublée
const FURNITURE_FIELDS = [
  { key: "hasLiterie", label: "Literie avec couette ou couverture" },
  { key: "hasRideaux", label: "Volets ou rideaux dans les chambres" },
  { key: "hasPlaquesCuisson", label: "Plaques de cuisson" },
  { key: "hasFour", label: "Four ou four à micro-onde" },
  { key: "hasRefrigerateur", label: "Réfrigérateur" },
  { key: "hasCongelateur", label: "Congélateur ou compartiment à congélation (-6° max)" },
  { key: "hasVaisselle", label: "Vaisselle en nombre suffisant" },
  { key: "hasUstensilesCuisine", label: "Ustensiles de cuisine" },
  { key: "hasTable", label: "Table" },
  { key: "hasSieges", label: "Sièges" },
  { key: "hasEtageresRangement", label: "Étagères de rangement" },
  { key: "hasLuminaires", label: "Luminaires" },
  { key: "hasMaterielEntretien", label: "Matériel d'entretien ménager adapté" },
] as const;

// Composant helper pour afficher une donnée avec un bouton de copie
function DataField({ label, value, className }: { label: string; value: string | number | null | undefined; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (!value) return;
    const success = await copyToClipboard(String(value));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (value === null || value === undefined) return null;

  return (
    <div className={className}>
      
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="flex items-center justify-start gap-4">
        <p className="font-medium">{value}</p>
        <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleCopy}
            title="Copier"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
    </div>
  );
}

// Composant helper pour afficher une donnée dans une carte avec un bouton de copie
function DataFieldCard({ label, value, className }: { label: string; value: string | number | null | undefined; className?: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    if (!value) return;
    const success = await copyToClipboard(String(value));
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (value === null || value === undefined) return null;

  return (
    <div className={`rounded-lg border bg-background p-3 ${className || ""}`}>
     
        <p className="text-xs text-muted-foreground">{label}</p>

        <div className="flex items-center justify-start gap-4">
          <p className="text-sm font-medium wrap-break-word">{value}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0"
            onClick={handleCopy}
            title="Copier"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      
    </div>
  );
}

export function DossierDetailView({ dossier }: DossierDetailViewProps) {
  const getClientName = () => {
    if (dossier.client.entreprise) {
      return dossier.client.entreprise.legalName || dossier.client.entreprise.name;
    }
    const primaryPerson = dossier.client.persons?.find((p) => p.isPrimary) || dossier.client.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  // Séparer les parties en propriétaires et locataires
  const proprietaires = dossier.bail?.parties?.filter((p: any) => p.profilType === "PROPRIETAIRE") || [];
  console.log("proprietaires", proprietaires);
  const locataires = dossier.bail?.parties?.filter((p: any) => p.profilType === "LOCATAIRE") || [];
  console.log("locataires", locataires);

  // Calculer le nombre total de personnes dans les propriétaires
  const totalProprietairesPersons = proprietaires.reduce((total: number, party: any) => {
    if (party.entreprise) {
      return total + 1; // Une entreprise compte pour 1
    }
    return total + (party.persons?.length || 0);
  }, 0);

  // Calculer le nombre total de personnes dans les locataires
  const totalLocatairesPersons = locataires.reduce((total: number, party: any) => {
    if (party.entreprise) {
      return total + 1; // Une entreprise compte pour 1
    }
    return total + (party.persons?.length || 0);
  }, 0);

  const getPartyName = (party: any) => {
    if (party?.entreprise) {
      return party.entreprise.legalName || party.entreprise.name;
    }
    const primaryPerson = party?.persons?.find((p: any) => p.isPrimary) || party?.persons?.[0];
    if (primaryPerson) {
      return `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim() || "Client";
    }
    return "Client";
  };

  return (
    <div className="space-y-6">

      <Tabs defaultValue="parties" className="space-y-4">
        <TabsList className="p-2 h-auto gap-2">
          {(proprietaires.length > 0 || locataires.length > 0) && (
            <TabsTrigger value="parties" className="px-4 py-2">
            <User className="mr-2 h-4 w-4" />
              Parties ({proprietaires.length + locataires.length})
          </TabsTrigger>
          )}
          {dossier.property && (
            <TabsTrigger value="property" className="px-4 py-2">
              <Home className="mr-2 h-4 w-4" />
              Propriété
            </TabsTrigger>
          )}
          {dossier.bail && (
            <TabsTrigger value="bail" className="px-4 py-2">
              <FileText className="mr-2 h-4 w-4" />
              Bail
            </TabsTrigger>
          )}
         {/* <TabsTrigger value="requests" className="px-4 py-2">
            <MessageSquare className="mr-2 h-4 w-4" />
            Demandes ({dossier.requests?.length || 0})
          </TabsTrigger>
          */}
        </TabsList>

        {/* Onglet Propriété */}
        {dossier.property && (
          <TabsContent value="property">
            <Card>
              <CardHeader>
                <CardTitle>Propriété</CardTitle>
                <CardDescription>Les informations de la propriété</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {dossier.property.label && (
                  <DataField label="Label" value={dossier.property.label} />
                )}
                {dossier.property.fullAddress && (
                  <DataField label="Adresse" value={dossier.property.fullAddress} />
                )}
                {dossier.property.surfaceM2 && (
                  <DataField label="Surface selon diagnostic Loi Carrez" value={`${dossier.property.surfaceM2} m²`} />
                )}
                {dossier.property.type && (
                  <DataField label="Type de bien" value={dossier.property.type} />
                )}
                {dossier.property.legalStatus && (
                  <DataField label="Statut légal" value={getPropertyLegalStatusLabel(dossier.property.legalStatus as BienLegalStatus)} />
                )}
                {/* <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge>{dossier.property.status}</Badge>
                </div> */}
                
                {/* Mobilier présent */}
                <div className="pt-4 mt-4 border-t">
                  <p className="text-sm font-medium mb-3">Mobilier présent</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {FURNITURE_FIELDS.map((field) => {
                      const property = dossier.property;
                      if (!property) return null;
                      const hasItem = (property[field.key as keyof typeof property] as boolean) ?? false;
                      return (
                        <div key={field.key} className="flex items-center gap-2">
                          {hasItem ? (
                            <Check className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={hasItem ? "text-sm" : "text-sm text-muted-foreground"}>
                            {field.label}
                          </span>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>

                {dossier.property.documents && dossier.property.documents.length > 0 && (
                  <div className="pt-4 mt-4 border-t">
                    <p className="text-sm font-medium mb-3">Documents de la propriété ({dossier.property.documents.length})</p>
                    <DocumentsList documents={dossier.property.documents} documentKindLabels={documentKindLabels} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Onglet Bail */}
        {dossier.bail && (
          <TabsContent value="bail">
            <Card>
              <CardHeader>
                <CardTitle>Contrat de bail</CardTitle>
                <CardDescription>
                   bail d'{dossier.bail.bailFamily}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* <div>
                  <p className="text-sm text-muted-foreground">Statut</p>
                  <Badge>{dossier.bail.status}</Badge>
                </div> */}
                <Separator />
                
                {dossier.bail.bailType && (
                  <DataField label="Type de bail" value={getBailTypeLabel(dossier.bail.bailType)} />
                )}
                <DataField label="Loyer mensuel" value={formatCurrency(dossier.bail.rentAmount)} />
                <DataField label="Charges mensuelles" value={formatCurrency(dossier.bail.monthlyCharges)} />
                <DataField label="Dépôt de garantie" value={formatCurrency(dossier.bail.securityDeposit)} />
                <Separator />
                <DataField label="Date de prise d'effet du bail" value={formatDate(dossier.bail.effectiveDate)} />
                {dossier.bail.endDate && (
                  <DataField label="Date de fin du bail" value={formatDate(dossier.bail.endDate)} />
                )}
                {dossier.bail.paymentDay && (
                  <DataField label="Jour de paiement du loyer" value={`Le ${dossier.bail.paymentDay} de chaque mois`} />
                )}
                {dossier.bail.documents && dossier.bail.documents.length > 0 && (
                  <div className="pt-4 mt-4 border-t">
                    <p className="text-sm font-medium mb-3">Documents du bail ({dossier.bail.documents.length})</p>
                    <DocumentsList documents={dossier.bail.documents} documentKindLabels={documentKindLabels} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Onglet Parties (Locataires et Propriétaires) */}

      {(proprietaires.length > 0 || locataires.length > 0) && (
        <TabsContent value="parties" className="space-y-4">
          {/* Propriétaires */}
          {proprietaires.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Propriétaire{proprietaires.length > 1 ? "s" : ""}
                    </CardTitle>
                    <CardDescription>
                      {totalProprietairesPersons} propriétaire{proprietaires.length > 1 ? "s" : ""} associé
                      {proprietaires.length > 1 ? "s" : ""} au bail
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <Accordion type="multiple" className="w-full">
                  {proprietaires.map((party: any, index: number) => {
                    const isCompany = !!party.entreprise;
                    const primaryPerson =
                      party.persons?.find((p: any) => p.isPrimary) || party.persons?.[0];

                    const displayName = isCompany
                      ? party.entreprise?.legalName || party.entreprise?.name || "Entreprise"
                      : [primaryPerson?.firstName, primaryPerson?.lastName].filter(Boolean).join(" ") ||
                        "Personne";

                    const personsCount = party.persons?.length ?? 0;

                    const docsCount =
                      (party.documents?.length ?? 0) +
                      (party.entreprise?.documents?.length ?? 0) +
                      (party.persons?.reduce(
                        (acc: number, p: any) => acc + (p.documents?.length ?? 0),
                        0
                      ) ?? 0);

                    return (
                      <AccordionItem
                        key={party.id || index}
                        value={`owner-${party.id || index}`}
                        className="rounded-xl border overflow-hidden shadow-lg  bg-muted/10 px-2 data-[state=open]:bg-muted/20"
                      >
                        <AccordionTrigger className="py-3  hover:no-underline ">
                          <div className="flex w-full items-start justify-between gap-4 ">
                            <div className="min-w-0 text-left ml-2">
                              <div className="flex items-center gap-2 ml-1">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                                
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {!isCompany && personsCount > 0 && (
                                  <Badge variant="outline">
                                    {personsCount} personne{personsCount > 1 ? "s" : ""}
                                  </Badge>
                                )}
                                <Badge variant="secondary">{isCompany ? "Entreprise" : "Particulier"}</Badge>
                                {docsCount > 0 && (
                                  <Badge variant="outline">
                                    {docsCount} document{docsCount > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pb-4">
                          <div className="px-1 space-y-4">
                            {party.entreprise ? (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <DataFieldCard
                                    label="Raison sociale"
                                    value={party.entreprise.legalName || party.entreprise.name}
                                  />

                                  {party.entreprise.registration && (
                                    <DataFieldCard
                                      label="SIRET"
                                      value={party.entreprise.registration}
                                    />
                                  )}

                                  {party.entreprise.email && (
                                    <DataFieldCard
                                      label="Email"
                                      value={party.entreprise.email}
                                    />
                                  )}

                                  {party.entreprise.phone && (
                                    <DataFieldCard
                                      label="Téléphone"
                                      value={party.entreprise.phone}
                                    />
                                  )}

                                  {party.entreprise.fullAddress && (
                                    <DataFieldCard
                                      label="Adresse"
                                      value={party.entreprise.fullAddress}
                                      className="md:col-span-2"
                                    />
                                  )}
                                </div>

                                {party.entreprise.documents && party.entreprise.documents.length > 0 && (
                                  <div className="rounded-xl border bg-background p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <p className="text-xs text-muted-foreground">
                                        Documents de l’entreprise
                                      </p>
                                      <Badge variant="outline">{party.entreprise.documents.length}</Badge>
                                    </div>
                                    <DocumentsList
                                      documents={party.entreprise.documents}
                                      documentKindLabels={documentKindLabels}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3">
                                {party.persons?.map((person: any, pIndex: number) => (
                                  <div
                                    key={person.id || pIndex}
                                    className="rounded-xl border bg-background p-4"
                                  >
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-semibold">
                                        {person.firstName} {person.lastName}
                                      </h4>
                                      {person.isPrimary && <Badge variant="secondary">Principal</Badge>}
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {person.email && (
                                        <DataFieldCard
                                          label="Email"
                                          value={person.email}
                                        />
                                      )}
                                      {person.phone && (
                                        <DataFieldCard
                                          label="Téléphone"
                                          value={person.phone}
                                        />
                                      )}
                                      {person.fullAddress && (
                                        <DataFieldCard
                                          label="Adresse"
                                          value={person.fullAddress}
                                          className="md:col-span-2"
                                        />
                                      )}
                                      {person.birthDate && (
                                        <DataFieldCard
                                          label="Date de naissance"
                                          value={formatDate(person.birthDate)}
                                        />
                                      )}
                                      {person.birthPlace && (
                                        <DataFieldCard
                                          label="Lieu de naissance"
                                          value={person.birthPlace}
                                        />
                                      )}
                                      {person.nationality && (
                                        <DataFieldCard
                                          label="Nationalité"
                                          value={person.nationality}
                                        />
                                      )}
                                      {person.familyStatus && (
                                        <DataFieldCard
                                          label="Situation familiale"
                                          value={person.familyStatus}
                                        />
                                      )}
                                      {person.matrimonialRegime && (
                                        <DataFieldCard
                                          label="Régime matrimonial"
                                          value={person.matrimonialRegime}
                                        />
                                      )}
                                    </div>

                                    {person.documents && person.documents.length > 0 && (
                                      <div className="pt-4 mt-4 border-t">
                                        <div className="text-sm text-muted-foreground mb-2">
                                          Document
                                          {person.documents.length > 1 ? "s" : ""}{" "}de{" "}
                                          <span className="font-medium text-foreground mr-3">
                                            {person.firstName} {person.lastName}
                                          </span>
                                          <Badge variant="outline">{person.documents.length}</Badge>
                                        </div>
                                        <DocumentsList
                                          documents={person.documents}
                                          documentKindLabels={documentKindLabels}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {party.documents && party.documents.length > 0 && (
                              <div className="rounded-xl border bg-background p-4">
                                <div className="flex items-center justify-start mb-2 gap-3">
                                  <p className="text-sm text-muted-foreground">Document{party.documents.length > 1 ? "s" : ""} de la partie</p>
                                  <Badge variant="outline">{party.documents.length}</Badge>
                                </div>
                                <DocumentsList
                                  documents={party.documents}
                                  documentKindLabels={documentKindLabels}
                                />
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Locataires */}
          {locataires.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Locataire{locataires.length > 1 ? "s" : ""}
                    </CardTitle>
                    <CardDescription>
                      {totalLocatairesPersons} locataire{locataires.length > 1 ? "s" : ""} associé
                      {locataires.length > 1 ? "s" : ""} au bail
                    </CardDescription>
                  </div>

                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <Accordion type="multiple" className="w-full">
                  {locataires.map((party: any, index: number) => {
                    const isCompany = !!party.entreprise;
                    const primaryPerson =
                      party.persons?.find((p: any) => p.isPrimary) || party.persons?.[0];

                    const displayName = isCompany
                      ? party.entreprise?.legalName || party.entreprise?.name || "Entreprise"
                      : [primaryPerson?.firstName, primaryPerson?.lastName].filter(Boolean).join(" ") ||
                        "Personne";

                    const personsCount = party.persons?.length ?? 0;

                    const docsCount =
                      (party.documents?.length ?? 0) +
                      (party.entreprise?.documents?.length ?? 0) +
                      (party.persons?.reduce(
                        (acc: number, p: any) => acc + (p.documents?.length ?? 0),
                        0
                      ) ?? 0);

                    return (
                      <AccordionItem
                        key={party.id || index}
                        value={`tenant-${party.id || index}`}
                        className="rounded-xl border overflow-hidden shadow-lg bg-muted/10 px-2 data-[state=open]:bg-muted/20"
                      >
                        <AccordionTrigger className="py-3 hover:no-underline">
                          <div className="flex w-full items-start justify-between gap-4 pr-2">
                            <div className="min-w-0 text-left ml-2">
                              <div className="flex items-center gap-2 ml-1">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                              </div>

                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                {!isCompany && personsCount > 0 && (
                                  <Badge variant="outline">
                                    {personsCount} personne{personsCount > 1 ? "s" : ""}
                                  </Badge>
                                )}  
                                <Badge variant="secondary">{isCompany ? "Entreprise" : "Particulier"}</Badge>
                                {docsCount > 0 && (
                                  <Badge variant="outline">
                                    {docsCount} document{docsCount > 1 ? "s" : ""}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="pb-4">
                          <div className="px-1 space-y-4">
                            {party.entreprise ? (
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <DataFieldCard
                                    label="Raison sociale"
                                    value={party.entreprise.legalName || party.entreprise.name}
                                  />

                                  {party.entreprise.registration && (
                                    <DataFieldCard
                                      label="SIRET"
                                      value={party.entreprise.registration}
                                    />
                                  )}

                                  {party.entreprise.email && (
                                    <DataFieldCard
                                      label="Email"
                                      value={party.entreprise.email}
                                    />
                                  )}

                                  {party.entreprise.phone && (
                                    <DataFieldCard
                                      label="Téléphone"
                                      value={party.entreprise.phone}
                                    />
                                  )}

                                  {party.entreprise.fullAddress && (
                                    <DataFieldCard
                                      label="Adresse"
                                      value={party.entreprise.fullAddress}
                                      className="md:col-span-2"
                                    />
                                  )}
                                </div>

                                {party.entreprise.documents && party.entreprise.documents.length > 0 && (
                                  <div className="rounded-xl border bg-background p-4">
                                    <div className="flex items-center justify-start gap-3 mb-2">
                                      <p className="text-sm text-muted-foreground">
                                        Document{party.entreprise.documents.length > 1 ? "s" : ""} de l’entreprise
                                      </p>
                                      <Badge variant="outline">{party.entreprise.documents.length}</Badge>
                                    </div>
                                    <DocumentsList
                                      documents={party.entreprise.documents}
                                      documentKindLabels={documentKindLabels}
                                    />
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="space-y-3">
                                {party.persons?.map((person: any, pIndex: number) => (
                                  <div
                                    key={person.id || pIndex}
                                    className="rounded-xl border bg-background p-4"
                                  >
                                    <div className="flex items-center gap-2">
                                      <h4 className="text-sm font-semibold">
                                        {person.firstName} {person.lastName}
                                      </h4>
                                      {person.isPrimary && <Badge variant="secondary">Principal</Badge>}
                                    </div>

                                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {person.email && (
                                        <DataFieldCard
                                          label="Email"
                                          value={person.email}
                                        />
                                      )}
                                      {person.phone && (
                                        <DataFieldCard
                                          label="Téléphone"
                                          value={person.phone}
                                        />
                                      )}
                                      {person.fullAddress && (
                                        <DataFieldCard
                                          label="Adresse"
                                          value={person.fullAddress}
                                          className="md:col-span-2"
                                        />
                                      )}
                                      {person.birthDate && (
                                        <DataFieldCard
                                          label="Date de naissance"
                                          value={formatDate(person.birthDate)}
                                        />
                                      )}
                                      {person.birthPlace && (
                                        <DataFieldCard
                                          label="Lieu de naissance"
                                          value={person.birthPlace}
                                        />
                                      )}
                                      {person.nationality && (
                                        <DataFieldCard
                                          label="Nationalité"
                                          value={person.nationality}
                                        />
                                      )}
                                      {person.familyStatus && (
                                        <DataFieldCard
                                          label="Situation familiale"
                                          value={person.familyStatus}
                                        />
                                      )}
                                      {person.matrimonialRegime && (
                                        <DataFieldCard
                                          label="Régime matrimonial"
                                          value={person.matrimonialRegime}
                                        />
                                      )}
                                    </div>

                                    {person.documents && person.documents.length > 0 && (
                                      <div className="pt-4 mt-4 border-t">
                                        <div className="text-sm text-muted-foreground mb-2">
                                          Document 
                                          {person.documents.length > 1 ? "s" : ""}{" "}de{" "}
                                          <span className="font-medium text-foreground mr-3 ">
                                            {person.firstName} {person.lastName}
                                            </span>
                                          <Badge variant="outline">{person.documents.length}</Badge>
                                        </div>
                                        <DocumentsList
                                          documents={person.documents}
                                          documentKindLabels={documentKindLabels}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {party.documents && party.documents.length > 0 && (
                              <div className="rounded-xl border bg-background p-4">
                                <div className="flex items-center justify-start gap-3 mb-2">
                                  <p className="text-sm text-muted-foreground">Document{party.documents.length > 1 ? "s" : ""} de la partie</p>
                                  <Badge variant="outline">{party.documents.length}</Badge>
                                </div>
                                <DocumentsList
                                  documents={party.documents}
                                  documentKindLabels={documentKindLabels}
                                />
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      )}



        {/* Onglet Demandes */}
         {/* <TabsContent value="requests">
            <NotaireRequests
              dossierId={dossier.id}
              initialRequests={dossier.requests || []}
              bailParties={dossier.bail?.parties || []}
            />
          </TabsContent> */}
      </Tabs>

            {/* Informations générales */}
            <Card>
        <CardHeader>
          <CardTitle>Informations générales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-start gap-3">
            <p className="text-sm text-muted-foreground">Assigné le</p>
            <p className="font-medium">{formatDateTime(dossier.assignedAt)}</p>
          </div>
          {dossier.notes && 
          <div className="flex items-center justify-start gap-3">
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="font-medium">{dossier.notes}</p>
          </div>}
        </CardContent>
      </Card>

    </div>
  );
}


