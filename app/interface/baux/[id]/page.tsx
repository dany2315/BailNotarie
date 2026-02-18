import { getLease, getBailMissingData } from "@/lib/actions/leases";
import { getDocuments } from "@/lib/actions/documents";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText, Mail, Phone, MapPin, Calendar, Euro, Home, User, Building2, Download, ExternalLink, ArrowRight, UserPlus } from "lucide-react";
import { 
  StatusBadge, 
  PropertyTypeBadge, 
  PropertyLegalStatusBadge,
  FamilyStatusBadge,
  MatrimonialRegimeBadge
} from "@/components/shared/status-badge";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { formatDate, formatCurrency, formatSurface, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { DocumentsList } from "@/components/leases/documents-list";
import { DocumentsListWithOwner } from "@/components/leases/documents-list-with-owner";
import { CommentsDrawer } from "@/components/comments/comments-drawer";
import { ButtonGroup } from "@/components/ui/button-group";
import { TenantCreateButton } from "@/components/leases/tenant-create-button";
import { DeleteLeaseButton } from "@/components/leases/delete-lease-button";
import { AssignBailButton } from "@/components/leases/assign-bail-button";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { LeaseMissingDataCard } from "@/components/leases/lease-missing-data-card";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const lease = await getLease(resolvedParams.id);

  if (!lease) {
    notFound();
  }

  // Trouver le locataire et le propriétaire dans les parties
  const tenant = lease.parties?.find((p: any) => p.profilType === "LOCATAIRE");
  const owner = lease.parties?.find((p: any) => p.profilType === "PROPRIETAIRE") || lease.property?.owner;

  // Récupérer les documents et les données manquantes
  // Pour les documents du client, récupérer aussi ceux des personnes et de l'entreprise
  const [tenantClientDocs, ownerClientDocs, propertyDocuments, bailDocuments, missingData] = await Promise.all([
    tenant ? getDocuments({ clientId: tenant.id }) : Promise.resolve([]),
    owner ? getDocuments({ clientId: owner.id }) : Promise.resolve([]),
    lease.property ? getDocuments({ propertyId: lease.property.id }) : Promise.resolve([]),
    getDocuments({ bailId: lease.id }),
    getBailMissingData(lease.id),
  ]);

  // Séparer les documents du locataire par personne et documents communs
  const tenantPersonDocuments: Map<string, any[]> = new Map();
  const tenantCommonDocuments: any[] = [];
  
  if (tenant) {
    // Documents communs (documents du client sans personId)
    tenantCommonDocuments.push(...tenantClientDocs.filter((doc: any) => !doc.personId));
    
    // Documents par personne
    if (tenant.persons) {
      for (const person of tenant.persons) {
        const personDocs = (person as any).documents || [];
        const docsWithPerson = personDocs.map((doc: any) => ({
          ...doc,
          person: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            isPrimary: person.isPrimary,
          },
        }));
        tenantPersonDocuments.set(person.id, docsWithPerson);
      }
    }
    
    // Documents de l'entreprise
    const tenantEntreprise = tenant.entreprise;
    if (tenantEntreprise) {
      const entrepriseDocs = (tenantEntreprise as any).documents || [];
      tenantCommonDocuments.push(...entrepriseDocs.map((doc: any) => ({
        ...doc,
        entreprise: {
          id: tenantEntreprise.id,
          legalName: tenantEntreprise.legalName,
          name: tenantEntreprise.name,
        },
      })));
    }
  }

  // Séparer les documents du propriétaire par personne et documents communs
  const ownerPersonDocuments: Map<string, any[]> = new Map();
  const ownerCommonDocuments: any[] = [];
  
  if (owner) {
    // Documents communs (documents du client sans personId)
    ownerCommonDocuments.push(...ownerClientDocs.filter((doc: any) => !doc.personId));
    
    // Documents par personne
    if (owner.persons) {
      for (const person of owner.persons) {
        const personDocs = (person as any).documents || [];
        const docsWithPerson = personDocs.map((doc: any) => ({
          ...doc,
          person: {
            id: person.id,
            firstName: person.firstName,
            lastName: person.lastName,
            isPrimary: person.isPrimary,
          },
        }));
        ownerPersonDocuments.set(person.id, docsWithPerson);
      }
    }
    
    // Documents de l'entreprise
    const ownerEntreprise = owner.entreprise;
    if (ownerEntreprise) {
      const entrepriseDocs = (ownerEntreprise as any).documents || [];
      ownerCommonDocuments.push(...entrepriseDocs.map((doc: any) => ({
        ...doc,
        entreprise: {
          id: ownerEntreprise.id,
          legalName: ownerEntreprise.legalName,
          name: ownerEntreprise.name,
        },
      })));
    }
  }

  // Formater les noms en utilisant les personnes principales ou l'entreprise
  const tenantPrimaryPerson = tenant?.persons?.find((p: any) => p.isPrimary) || tenant?.persons?.[0];
  const ownerPrimaryPerson = owner?.persons?.find((p: any) => p.isPrimary) || owner?.persons?.[0];
  
  const tenantName = tenant
    ? tenant.type === "PERSONNE_PHYSIQUE"
      ? tenantPrimaryPerson
        ? `${tenantPrimaryPerson.firstName || ""} ${tenantPrimaryPerson.lastName || ""}`.trim() || tenantPrimaryPerson.email || ""
        : ""
      : tenant.entreprise?.legalName || tenant.entreprise?.name || ""
    : "";

  const ownerName = owner
    ? owner.type === "PERSONNE_PHYSIQUE"
      ? ownerPrimaryPerson
        ? `${ownerPrimaryPerson.firstName || ""} ${ownerPrimaryPerson.lastName || ""}`.trim() || ownerPrimaryPerson.email || ""
        : ""
      : owner.entreprise?.legalName || owner.entreprise?.name || ""
    : "";

  const bailFamilyLabels: Record<string, string> = {
    HABITATION: "Habitation",
    MEUBLE: "Meublé",
    COMMERCIAL: "Commercial",
    PROFESSIONNEL: "Professionnel",
    SAISONNIER: "Saisonnier",
    OTHER: "Autre",
  };

  const bailTypeLabels: Record<string, string> = {
    BAIL_NU_3_ANS: "Bail nue 3 ans",
    BAIL_NU_6_ANS: "Bail nue 6 ans",
    BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
    BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
  };


  return (
    <div className="space-y-6 sm:space-y-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link href="/interface/baux">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Bail #{lease.id.slice(-8).toUpperCase()}</h1>
              <StatusBadge status={lease.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Détails complets du bail notarié
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <ButtonGroup className="w-full sm:w-auto justify-end">
              <Button asChild className=" sm:w-auto" variant="outline">
                <Link href={`/interface/baux/${lease.id}/edit`} className=" sm:flex-initial">
                    <Edit className="size-4 sm:mr-2" />
                    <span className="">Modifier</span>
                  </Link>
              </Button>
              <AssignBailButton 
                bailId={lease.id}
              />
              <CommentsDrawer target="BAIL" targetId={lease.id} />
              <DeleteLeaseButton leaseId={lease.id} />
            </ButtonGroup>
            
          </div>
        </div>
      </div>

      {/* Section des données manquantes */}
      {missingData && (
        <LeaseMissingDataCard 
          missingData={missingData} 
          bailId={lease.id}
        />
      )}

      {/* Informations du bail */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <CardTitle>Informations du bail</CardTitle>
          </div>
          <CardDescription>Détails du contrat de bail</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Type et Statut */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type de bail</p>
              <p className="text-base font-semibold">{bailTypeLabels[lease.bailType] || lease.bailType}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Famille</p>
              <p className="text-base font-semibold">{bailFamilyLabels[lease.bailFamily] || lease.bailFamily}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</p>
              <StatusBadge status={lease.status} />
            </div>
          </div>

          <Separator />

          {/* Section Dates */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date de prise d'effet</p>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <p className="text-base font-medium">{formatDate(lease.effectiveDate)}</p>
              </div>
            </div>
            {lease.endDate && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date de fin</p>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <p className="text-base font-medium">{formatDate(lease.endDate)}</p>
                </div>
              </div>
            )}
            {lease.paymentDay && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jour de paiement</p>
                <p className="text-base font-medium">Le {lease.paymentDay} de chaque mois</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Section Financière - Mise en évidence */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">Informations financières</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Euro className="size-4" />
                  <p className="text-xs font-medium uppercase tracking-wide">Loyer mensuel</p>
                </div>
                <p className="text-2xl font-bold">{formatCurrency(Number(lease.rentAmount))}</p>
              </div>
              {lease.monthlyCharges > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Euro className="size-4" />
                    <p className="text-xs font-medium uppercase tracking-wide">Charges mensuelles</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(Number(lease.monthlyCharges))}</p>
                </div>
              )}
              {lease.securityDeposit > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Euro className="size-4" />
                    <p className="text-xs font-medium uppercase tracking-wide">Dépôt de garantie</p>
                  </div>
                  <p className="text-2xl font-bold">{formatCurrency(Number(lease.securityDeposit))}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parties du bail */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        
        {/* Propriétaire */}
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-muted-foreground" />
                  <CardTitle>Propriétaire</CardTitle>
                </div>
                <CardDescription>Informations du propriétaire</CardDescription>
              </div>
              {owner && (
                <CompletionStatusSelect
                  type="client"
                  id={owner.id}
                  currentStatus={owner.completionStatus}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {owner ? (
              <>
                {/* Section Identité générale */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</p>
                    <Link href={`/interface/clients/${owner.id}`} className="flex items-center gap-2 font-semibold hover:underline group">
                      {ownerName || "-"}
                      <ArrowRight className="size-3 -rotate-45 group-hover:text-foreground text-muted-foreground transition-colors" />
                    </Link>
                    <StatusBadge status={owner.type} />
                  </div>
                </div>

                {/* Affichage par personne - Personne Physique */}
                {owner.type === "PERSONNE_PHYSIQUE" && owner.persons && owner.persons.length > 0 && (
                  <>
                    {owner.persons.map((person: any, personIndex: number) => {
                      const personDocs = ownerPersonDocuments.get(person.id) || [];
                      const personName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Sans nom";
                      
                      return (
                        <div key={person.id}>
                          {personIndex > 0 && <Separator className="my-6" />}
                          
                          {/* En-tête de la personne */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={person.isPrimary ? "default" : "outline"}>
                                {person.isPrimary ? "Personne principale" : `Personne ${personIndex + 1}`}
                              </Badge>
                              <p className="text-sm font-semibold">{personName}</p>
                            </div>

                            {/* Contact */}
                            {(person.email || person.phone || person.fullAddress) && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                                <div className="space-y-2">
                                  {person.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="size-4 text-muted-foreground shrink-0" />
                                      <a href={`mailto:${person.email}`} className="text-sm hover:underline">
                                        {person.email}
                                      </a>
                                    </div>
                                  )}
                                  {person.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="size-4 text-muted-foreground shrink-0" />
                                      <a href={`tel:${person.phone}`} className="text-sm hover:underline">
                                        {person.phone}
                                      </a>
                                    </div>
                                  )}
                                  {person.fullAddress && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <p className="text-sm">{person.fullAddress}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Détails personnels */}
                            {(person.birthDate || person.birthPlace || person.nationality || person.profession || person.familyStatus) && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Informations personnelles</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {person.birthDate && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Date de naissance</p>
                                      <p className="text-sm">{formatDate(person.birthDate)}</p>
                                    </div>
                                  )}
                                  {person.birthPlace && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Lieu de naissance</p>
                                      <p className="text-sm">{person.birthPlace}</p>
                                    </div>
                                  )}
                                  {person.nationality && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Nationalité</p>
                                      <p className="text-sm">{person.nationality}</p>
                                    </div>
                                  )}
                                  {person.profession && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Profession</p>
                                      <p className="text-sm">{person.profession}</p>
                                    </div>
                                  )}
                                  {person.familyStatus && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Statut familial</p>
                                      <FamilyStatusBadge status={person.familyStatus} />
                                    </div>
                                  )}
                                  {person.familyStatus === "MARIE" && person.matrimonialRegime && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Régime matrimonial</p>
                                      <MatrimonialRegimeBadge regime={person.matrimonialRegime} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Documents de la personne */}
                            {personDocs.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Documents de {personName} ({personDocs.length})
                                </p>
                                <DocumentsListWithOwner
                                  documents={personDocs}
                                  documentKindLabels={documentKindLabels}
                                  ownerLabel={personName}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Personne Morale */}
                {owner.type === "PERSONNE_MORALE" && owner.entreprise && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {/* Contact entreprise */}
                      {(owner.entreprise.email || owner.entreprise.phone || owner.entreprise.fullAddress) && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                          <div className="space-y-2">
                            {owner.entreprise.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="size-4 text-muted-foreground shrink-0" />
                                <a href={`mailto:${owner.entreprise.email}`} className="text-sm hover:underline">
                                  {owner.entreprise.email}
                                </a>
                              </div>
                            )}
                            {owner.entreprise.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 text-muted-foreground shrink-0" />
                                <a href={`tel:${owner.entreprise.phone}`} className="text-sm hover:underline">
                                  {owner.entreprise.phone}
                                </a>
                              </div>
                            )}
                            {owner.entreprise.fullAddress && (
                              <div className="flex items-start gap-2">
                                <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-sm">{owner.entreprise.fullAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Numéro d'immatriculation */}
                      {owner.entreprise.registration && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Numéro d'immatriculation</p>
                          <p className="text-sm font-mono">{owner.entreprise.registration}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Documents communs */}
                {ownerCommonDocuments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Documents communs ({ownerCommonDocuments.length})
                      </p>
                      <DocumentsListWithOwner
                        documents={ownerCommonDocuments}
                        documentKindLabels={documentKindLabels}
                        ownerLabel="Propriétaire"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun propriétaire assigné</p>
            )}
          </CardContent>
        </Card>
        {/* Locataire */}
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="size-5 text-muted-foreground" />
                  <CardTitle>Locataire</CardTitle>
                </div>
                <CardDescription>Informations du locataire</CardDescription>
              </div>
              {tenant && (
                <CompletionStatusSelect
                  type="client"
                  id={tenant.id}
                  currentStatus={tenant.completionStatus ?? "NOT_STARTED"}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {tenant ? (
              <>
                {/* Section Identité générale */}
                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</p>
                    <Link href={`/interface/clients/${tenant.id}`} className="flex items-center gap-2 font-semibold hover:underline group">
                      {tenantName || "-"}
                      <ArrowRight className="size-3 -rotate-45 group-hover:text-foreground text-muted-foreground transition-colors" />
                    </Link>
                    <StatusBadge status={tenant.type} />
                  </div>
                </div>

                {/* Affichage par personne - Personne Physique */}
                {tenant.type === "PERSONNE_PHYSIQUE" && tenant.persons && tenant.persons.length > 0 && (
                  <>
                    {tenant.persons.map((person: any, personIndex: number) => {
                      const personDocs = tenantPersonDocuments.get(person.id) || [];
                      const personName = [person.firstName, person.lastName].filter(Boolean).join(" ") || "Sans nom";
                      
                      return (
                        <div key={person.id}>
                          {personIndex > 0 && <Separator className="my-6" />}
                          
                          {/* En-tête de la personne */}
                          <div className="space-y-4">
                            <div className="flex items-center gap-2">
                              <Badge variant={person.isPrimary ? "default" : "outline"}>
                                {person.isPrimary ? "Personne principale" : `Personne ${personIndex + 1}`}
                              </Badge>
                              <p className="text-sm font-semibold">{personName}</p>
                            </div>

                            {/* Contact */}
                            {(person.email || person.phone || person.fullAddress) && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                                <div className="space-y-2">
                                  {person.email && (
                                    <div className="flex items-center gap-2">
                                      <Mail className="size-4 text-muted-foreground shrink-0" />
                                      <a href={`mailto:${person.email}`} className="text-sm hover:underline">
                                        {person.email}
                                      </a>
                                    </div>
                                  )}
                                  {person.phone && (
                                    <div className="flex items-center gap-2">
                                      <Phone className="size-4 text-muted-foreground shrink-0" />
                                      <a href={`tel:${person.phone}`} className="text-sm hover:underline">
                                        {person.phone}
                                      </a>
                                    </div>
                                  )}
                                  {person.fullAddress && (
                                    <div className="flex items-start gap-2">
                                      <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                      <p className="text-sm">{person.fullAddress}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Détails personnels */}
                            {(person.birthDate || person.birthPlace || person.nationality || person.profession || person.familyStatus) && (
                              <div className="space-y-3">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Informations personnelles</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {person.birthDate && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Date de naissance</p>
                                      <p className="text-sm">{formatDate(person.birthDate)}</p>
                                    </div>
                                  )}
                                  {person.birthPlace && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Lieu de naissance</p>
                                      <p className="text-sm">{person.birthPlace}</p>
                                    </div>
                                  )}
                                  {person.nationality && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Nationalité</p>
                                      <p className="text-sm">{person.nationality}</p>
                                    </div>
                                  )}
                                  {person.profession && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Profession</p>
                                      <p className="text-sm">{person.profession}</p>
                                    </div>
                                  )}
                                  {person.familyStatus && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Statut familial</p>
                                      <FamilyStatusBadge status={person.familyStatus} />
                                    </div>
                                  )}
                                  {person.familyStatus === "MARIE" && person.matrimonialRegime && (
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">Régime matrimonial</p>
                                      <MatrimonialRegimeBadge regime={person.matrimonialRegime} />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Documents de la personne */}
                            {personDocs.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Documents de {personName} ({personDocs.length})
                                </p>
                                <DocumentsListWithOwner
                                  documents={personDocs}
                                  documentKindLabels={documentKindLabels}
                                  ownerLabel={personName}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Personne Morale */}
                {tenant.type === "PERSONNE_MORALE" && tenant.entreprise && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      {/* Contact entreprise */}
                      {(tenant.entreprise.email || tenant.entreprise.phone || tenant.entreprise.fullAddress) && (
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                          <div className="space-y-2">
                            {tenant.entreprise.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="size-4 text-muted-foreground shrink-0" />
                                <a href={`mailto:${tenant.entreprise.email}`} className="text-sm hover:underline">
                                  {tenant.entreprise.email}
                                </a>
                              </div>
                            )}
                            {tenant.entreprise.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="size-4 text-muted-foreground shrink-0" />
                                <a href={`tel:${tenant.entreprise.phone}`} className="text-sm hover:underline">
                                  {tenant.entreprise.phone}
                                </a>
                              </div>
                            )}
                            {tenant.entreprise.fullAddress && (
                              <div className="flex items-start gap-2">
                                <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                                <p className="text-sm">{tenant.entreprise.fullAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Numéro d'immatriculation */}
                      {tenant.entreprise.registration && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Numéro d'immatriculation</p>
                          <p className="text-sm font-mono">{tenant.entreprise.registration}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Documents communs */}
                {tenantCommonDocuments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Documents communs ({tenantCommonDocuments.length})
                      </p>
                      <DocumentsListWithOwner
                        documents={tenantCommonDocuments}
                        documentKindLabels={documentKindLabels}
                        ownerLabel="Locataire"
                      />
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Aucun locataire assigné</p>
                <TenantCreateButton bailId={lease.id} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bien */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex flex-col items-start justify-between">
            <div className="flex items-center gap-2">
              <Home className="size-5 text-muted-foreground" />
              <CardTitle>Bien immobilier</CardTitle>
            </div>
          <CardDescription>Informations du bien loué</CardDescription>
         </div>
          <div className="flex items-center gap-2">
            <CompletionStatusSelect
              type="property"
              id={lease.property.id}
              currentStatus={lease.property.completionStatus}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {lease.property ? (
            <>
              {/* Section Informations principales */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide"> Adresse</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <Link href={`/interface/properties/${lease.property.id}`} className="flex items-center gap-2 font-semibold hover:underline group">
                    {lease.property.fullAddress || "-"}
                      <ArrowRight className="size-3 -rotate-45 group-hover:text-foreground text-muted-foreground transition-colors" />
                    </Link>
                  </div>
                </div>

                {lease.property.label && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Libellé</p>
                    <p className="text-sm">{lease.property.label}</p>
                  </div>
                )}

                {lease.property.surfaceM2 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Surface</p>
                    <p className="text-sm font-medium">{formatSurface(Number(lease.property.surfaceM2))}</p>
                  </div>
                )}

                {lease.property.type && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
                    <PropertyTypeBadge type={lease.property.type} />
                  </div>
                )}

                {lease.property.legalStatus && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut légal</p>
                    <PropertyLegalStatusBadge status={lease.property.legalStatus} />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</p>
                  <StatusBadge status={lease.property.status} />
                </div>
              </div>

              <Separator />

              {/* Section Documents */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents du bien ({propertyDocuments.length})</p>
                <DocumentsList
                  documents={propertyDocuments}
                  documentKindLabels={documentKindLabels}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Aucun bien assigné</p>
          )}
        </CardContent>
      </Card>

      {/* Documents du bail */}
      {bailDocuments.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <CardTitle>Documents du bail</CardTitle>
            </div>
            <CardDescription>Documents associés au bail ({bailDocuments.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentsList
              documents={bailDocuments}
              documentKindLabels={documentKindLabels}
            />
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métadonnées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Créé le</p>
              <p className="font-medium">{formatDateTime(lease.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modifié le</p>
              <p className="font-medium">{formatDateTime(lease.updatedAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Créé par</p>
              <p className="font-medium">
                {lease.createdBy ? (lease.createdBy.name || lease.createdBy.email) : "via formulaire"}
              </p>
            </div>
            {lease.updatedBy && (
              <div>
                <p className="text-muted-foreground">Modifié par</p>
                <p className="font-medium">{lease.updatedBy.name || lease.updatedBy.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
