"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  AlertTriangle, 
  FileX, 
  User, 
  Building2, 
  Users, 
  FileText, 
  Home,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react";
import { getDocumentLabel } from "@/lib/utils/document-labels";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { BailCompleteMissingData } from "@/lib/actions/leases";

// Labels pour les champs en français
const fieldLabels: Record<string, string> = {
  // Champs personne
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
  // Champs entreprise
  legalName: "Raison sociale",
  registration: "Numéro SIRET/SIREN",
  name: "Nom commercial",
  // Champs bien
  surfaceM2: "Surface",
  type: "Type de bien",
  legalStatus: "Statut juridique",
  label: "Libellé",
  // Champs bail
  rentAmount: "Montant du loyer",
  effectiveDate: "Date de prise d'effet",
  paymentDay: "Jour de paiement",
  securityDeposit: "Dépôt de garantie",
  tenant: "Locataire",
  owner: "Propriétaire",
  property: "Bien immobilier",
};

// Labels pour les statuts de complétion
const completionStatusLabels: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "Non commencé", color: "text-slate-500" },
  PARTIAL: { label: "Partiel", color: "text-amber-600" },
  PENDING_CHECK: { label: "En attente de vérification", color: "text-blue-600" },
  COMPLETED: { label: "Complet", color: "text-green-600" },
};

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  completionStatus?: string;
  totalMissing: number;
  totalFields?: number;
  linkHref?: string;
}

function SectionHeader({ 
  title, 
  icon, 
  isExpanded, 
  onToggle, 
  completionStatus,
  totalMissing,
  linkHref
}: SectionHeaderProps) {
  const statusInfo = completionStatus ? completionStatusLabels[completionStatus] : null;
  const isComplete = totalMissing === 0;
  
  return (
    <div 
      className="flex items-center justify-between cursor-pointer py-3"
      onClick={onToggle}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          isComplete ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        )}>
          {icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{title}</span>
            {linkHref && (
              <Link href={linkHref} onClick={(e) => e.stopPropagation()}>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground transition-colors" />
              </Link>
            )}
          </div>
          {statusInfo && (
            <span className={cn("text-xs", statusInfo.color)}>
              {statusInfo.label}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isComplete ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Complet
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
            {totalMissing} manquant{totalMissing > 1 ? "s" : ""}
          </Badge>
        )}
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

interface MissingFieldsListProps {
  fields: string[];
  documents: string[];
  label?: string;
}

function MissingFieldsList({ fields, documents, label }: MissingFieldsListProps) {
  if (fields.length === 0 && documents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 ml-4 pl-4 border-l-2 border-amber-200 dark:border-amber-800">
      {label && (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
      {fields.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <FileX className="h-3 w-3" />
            Informations manquantes :
          </div>
          <div className="flex flex-wrap gap-1.5">
            {fields.map((field) => (
              <Badge
                key={field}
                variant="outline"
                className="text-xs border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              >
                {fieldLabels[field] || field}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {documents.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <FileText className="h-3 w-3" />
            Documents manquants :
          </div>
          <div className="flex flex-wrap gap-1.5">
            {documents.map((doc) => (
              <Badge
                key={doc}
                variant="outline"
                className="text-xs border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
              >
                {getDocumentLabel(doc)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface LeaseMissingDataCardProps {
  missingData: BailCompleteMissingData;
  bailId: string;
  className?: string;
}

export function LeaseMissingDataCard({
  missingData,
  bailId,
  className,
}: LeaseMissingDataCardProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    bail: !missingData.isComplete,
    owner: false,
    tenant: false,
    property: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Calculer le pourcentage de complétion
  // On estime un nombre approximatif de champs requis pour chaque entité
  const estimatedTotalFields = 50; // Estimation du nombre total de champs/docs requis
  const completionPercentage = Math.max(0, Math.min(100, 
    Math.round(((estimatedTotalFields - missingData.totalMissing) / estimatedTotalFields) * 100)
  ));

  // Si tout est complet, afficher un message de succès
  if (missingData.isComplete) {
    return (
      <Card className={cn("border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            Dossier complet
          </CardTitle>
          <CardDescription className="text-green-600 dark:text-green-500">
            Toutes les informations nécessaires sont présentes pour ce bail.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={cn("border-amber-200 bg-amber-50/30 dark:border-amber-800 dark:bg-amber-950/10", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-5 w-5" />
          Éléments manquants pour finaliser le bail
        </CardTitle>
        <CardDescription className="text-amber-600 dark:text-amber-500">
          {missingData.totalMissing} élément{missingData.totalMissing > 1 ? "s" : ""} manquant{missingData.totalMissing > 1 ? "s" : ""} au total
        </CardDescription>
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Progression</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        
        {/* Section Bail */}
        {missingData.bail.totalMissing > 0 && (
          <>
            <SectionHeader
              title="Informations du bail"
              icon={<FileText className="h-4 w-4" />}
              isExpanded={expandedSections.bail}
              onToggle={() => toggleSection("bail")}
              totalMissing={missingData.bail.totalMissing}
              linkHref={`/interface/baux/${bailId}/edit`}
            />
            {expandedSections.bail && (
              <MissingFieldsList
                fields={missingData.bail.missingFields}
                documents={[]}
              />
            )}
            <Separator className="my-2" />
          </>
        )}

        {/* Section Propriétaire */}
        {missingData.owner && (
          <>
            <SectionHeader
              title={`Propriétaire - ${missingData.owner.clientName}`}
              icon={<Building2 className="h-4 w-4" />}
              isExpanded={expandedSections.owner}
              onToggle={() => toggleSection("owner")}
              completionStatus={missingData.owner.completionStatus}
              totalMissing={missingData.owner.totalMissingFields + missingData.owner.totalMissingDocuments}
              linkHref={`/interface/clients/${missingData.owner.clientId}`}
            />
            {expandedSections.owner && (
              <div className="space-y-3 pb-2">
                {/* Personnes */}
                {missingData.owner.persons.map((person) => (
                  <div key={person.personId} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm ml-4">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{person.personName}</span>
                      {person.isPrimary && (
                        <Badge variant="outline" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    <MissingFieldsList
                      fields={person.missingFields}
                      documents={person.missingDocuments}
                    />
                  </div>
                ))}
                
                {/* Entreprise */}
                {missingData.owner.entreprise && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm ml-4">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">Entreprise</span>
                    </div>
                    <MissingFieldsList
                      fields={missingData.owner.entreprise.missingFields}
                      documents={missingData.owner.entreprise.missingDocuments}
                    />
                  </div>
                )}
                
                {/* Documents du foyer */}
                {missingData.owner.clientDocuments.length > 0 && (
                  <MissingFieldsList
                    fields={[]}
                    documents={missingData.owner.clientDocuments}
                    label="Documents du foyer"
                  />
                )}
                
                {/* Documents généraux */}
                {missingData.owner.generalDocuments.length > 0 && (
                  <MissingFieldsList
                    fields={[]}
                    documents={missingData.owner.generalDocuments}
                    label="Documents généraux"
                  />
                )}
              </div>
            )}
            <Separator className="my-2" />
          </>
        )}

        {/* Section Locataire */}
        {missingData.tenant ? (
          <>
            <SectionHeader
              title={`Locataire - ${missingData.tenant.clientName}`}
              icon={<Users className="h-4 w-4" />}
              isExpanded={expandedSections.tenant}
              onToggle={() => toggleSection("tenant")}
              completionStatus={missingData.tenant.completionStatus}
              totalMissing={missingData.tenant.totalMissingFields + missingData.tenant.totalMissingDocuments}
              linkHref={`/interface/clients/${missingData.tenant.clientId}`}
            />
            {expandedSections.tenant && (
              <div className="space-y-3 pb-2">
                {/* Personnes */}
                {missingData.tenant.persons.map((person) => (
                  <div key={person.personId} className="space-y-2">
                    <div className="flex items-center gap-2 text-sm ml-4">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">{person.personName}</span>
                      {person.isPrimary && (
                        <Badge variant="outline" className="text-xs">Principal</Badge>
                      )}
                    </div>
                    <MissingFieldsList
                      fields={person.missingFields}
                      documents={person.missingDocuments}
                    />
                  </div>
                ))}
                
                {/* Entreprise */}
                {missingData.tenant.entreprise && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm ml-4">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">Entreprise</span>
                    </div>
                    <MissingFieldsList
                      fields={missingData.tenant.entreprise.missingFields}
                      documents={missingData.tenant.entreprise.missingDocuments}
                    />
                  </div>
                )}
                
                {/* Documents du foyer */}
                {missingData.tenant.clientDocuments.length > 0 && (
                  <MissingFieldsList
                    fields={[]}
                    documents={missingData.tenant.clientDocuments}
                    label="Documents du foyer"
                  />
                )}
                
                {/* Documents généraux */}
                {missingData.tenant.generalDocuments.length > 0 && (
                  <MissingFieldsList
                    fields={[]}
                    documents={missingData.tenant.generalDocuments}
                    label="Documents généraux"
                  />
                )}
              </div>
            )}
            <Separator className="my-2" />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-medium">Locataire</span>
                  <p className="text-xs text-red-600 dark:text-red-400">Aucun locataire assigné</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
                Requis
              </Badge>
            </div>
            <Separator className="my-2" />
          </>
        )}

        {/* Section Bien */}
        {missingData.property && (
          <>
            <SectionHeader
              title={`Bien - ${missingData.property.propertyLabel || missingData.property.propertyAddress}`}
              icon={<Home className="h-4 w-4" />}
              isExpanded={expandedSections.property}
              onToggle={() => toggleSection("property")}
              completionStatus={missingData.property.completionStatus}
              totalMissing={missingData.property.missingFields.length + missingData.property.missingDocuments.length}
              linkHref={`/interface/properties/${missingData.property.propertyId}`}
            />
            {expandedSections.property && (
              <MissingFieldsList
                fields={missingData.property.missingFields}
                documents={missingData.property.missingDocuments}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}








