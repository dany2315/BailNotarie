import { getLease } from "@/lib/actions/leases";
import { getDocuments } from "@/lib/actions/documents";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText, Mail, Phone, MapPin, Calendar, Euro, Home, User, Building2, Download, ExternalLink } from "lucide-react";
import { 
  StatusBadge, 
  PropertyTypeBadge, 
  PropertyLegalStatusBadge,
  FamilyStatusBadge,
  MatrimonialRegimeBadge
} from "@/components/shared/status-badge";
import { formatDate, formatCurrency, formatSurface, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

  // Récupérer les documents
  const [tenantDocuments, ownerDocuments, propertyDocuments, bailDocuments] = await Promise.all([
    tenant ? getDocuments({ clientId: tenant.id }) : Promise.resolve([]),
    owner ? getDocuments({ clientId: owner.id }) : Promise.resolve([]),
    lease.property ? getDocuments({ propertyId: lease.property.id }) : Promise.resolve([]),
    getDocuments({ bailId: lease.id }),
  ]);

  // Formater les noms
  const tenantName = tenant
    ? tenant.type === "PERSONNE_PHYSIQUE"
      ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || tenant.email || ""
      : tenant.legalName || ""
    : "";

  const ownerName = owner
    ? owner.type === "PERSONNE_PHYSIQUE"
      ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim() || owner.email || ""
      : owner.legalName || ""
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
    BAIL_NU_3_ANS: "Bail nu 3 ans",
    BAIL_NU_6_ANS: "Bail nu 6 ans",
    BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
    BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
  };

  const documentKindLabels: Record<string, string> = {
    KBIS: "KBIS",
    STATUTES: "Statuts",
    INSURANCE: "Assurance",
    TITLE_DEED: "Titre de propriété",
    BIRTH_CERT: "Acte de naissance",
    ID_IDENTITY: "Pièce d'identité",
    LIVRET_DE_FAMILLE: "Livret de famille",
    CONTRAT_DE_PACS: "Contrat de PACS",
    DIAGNOSTICS: "Diagnostics",
    REGLEMENT_COPROPRIETE: "Règlement de copropriété",
    CAHIER_DE_CHARGE_LOTISSEMENT: "Cahier des charges lotissement",
    STATUT_DE_LASSOCIATION_SYNDICALE: "Statut de l'association syndicale",
    RIB: "RIB",
  };


  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interface/leases">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Bail #{lease.id.slice(-8).toUpperCase()}</h1>
              <StatusBadge status={lease.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              Détails complets du bail notarié
            </p>
          </div>
        </div>
        <Link href={`/interface/leases/${lease.id}/edit`}>
          <Button>
            <Edit className="size-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      {/* Informations du bail */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-muted-foreground" />
            <CardTitle>Informations du bail</CardTitle>
          </div>
          <CardDescription>Détails du contrat de bail</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Type de bail</p>
              <p className="text-base font-semibold">{bailTypeLabels[lease.bailType] || lease.bailType}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Famille</p>
              <p className="text-base font-semibold">{bailFamilyLabels[lease.bailFamily] || lease.bailFamily}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Statut</p>
              <div>
                <StatusBadge status={lease.status} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Date de prise d'effet</p>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <p className="text-base">{formatDate(lease.effectiveDate)}</p>
              </div>
            </div>
            {lease.endDate && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Date de fin</p>
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-muted-foreground" />
                  <p className="text-base">{formatDate(lease.endDate)}</p>
                </div>
              </div>
            )}
            {lease.paymentDay && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Jour de paiement</p>
                <p className="text-base">Le {lease.paymentDay} de chaque mois</p>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Loyer mensuel</p>
              <div className="flex items-center gap-2">
                <Euro className="size-4 text-muted-foreground" />
                <p className="text-2xl font-bold">{formatCurrency(Number(lease.rentAmount))}</p>
              </div>
            </div>
            {lease.monthlyCharges > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Charges mensuelles</p>
                <div className="flex items-center gap-2">
                  <Euro className="size-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatCurrency(Number(lease.monthlyCharges))}</p>
                </div>
              </div>
            )}
            {lease.securityDeposit > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Dépôt de garantie</p>
                <div className="flex items-center gap-2">
                  <Euro className="size-4 text-muted-foreground" />
                  <p className="text-2xl font-bold">{formatCurrency(Number(lease.securityDeposit))}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parties du bail */}
      <div className="grid gap-6 md:grid-cols-2">
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
              <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Statut de complétion</p>
                      <div className="mt-1">
                        <StatusBadge status={tenant?.completionStatus ?? "NOT_STARTED"} />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {tenant ? (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nom</p>
                    <p className="text-lg font-semibold">{tenantName || "-"}</p>
                    <div className="flex gap-2 mt-2">
                      <StatusBadge status={tenant.type} />
                    </div>
                  </div>

                  {tenant.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <a href={`mailto:${tenant.email}`} className="text-sm hover:underline">
                        {tenant.email}
                      </a>
                    </div>
                  )}

                  {tenant.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <a href={`tel:${tenant.phone}`} className="text-sm hover:underline">
                        {tenant.phone}
                      </a>
                    </div>
                  )}

                  {tenant.fullAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{tenant.fullAddress}</p>
                    </div>
                  )}

                  {tenant.type === "PERSONNE_PHYSIQUE" && (
                    <>
                      {tenant.birthDate && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Date de naissance</p>
                          <p className="text-sm">{formatDate(tenant.birthDate)}</p>
                        </div>
                      )}
                      {tenant.birthPlace && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Lieu de naissance</p>
                          <p className="text-sm">{tenant.birthPlace}</p>
                        </div>
                      )}
                      {tenant.nationality && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nationalité</p>
                          <p className="text-sm">{tenant.nationality}</p>
                        </div>
                      )}
                      {tenant.profession && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Profession</p>
                          <p className="text-sm">{tenant.profession}</p>
                        </div>
                      )}
                      {tenant.familyStatus && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Statut familial</p>
                          <div className="mt-1">
                            <FamilyStatusBadge status={tenant.familyStatus} />
                          </div>
                        </div>
                      )}
                      {tenant.familyStatus === "MARIE" && tenant.matrimonialRegime && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Régime matrimonial</p>
                          <div className="mt-1">
                            <MatrimonialRegimeBadge regime={tenant.matrimonialRegime} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {tenant.type === "PERSONNE_MORALE" && tenant.registration && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Numéro d'immatriculation</p>
                      <p className="text-sm font-mono">{tenant.registration}</p>
                    </div>
                  )}
                </div>

                

                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Documents ({tenantDocuments.length})</p>
                    <Link href={`/interface/clients/${tenant.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="size-3 mr-2" />
                        Voir le profil
                      </Button>
                    </Link>
                  </div>
                  {tenantDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {tenantDocuments.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="size-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{documentKindLabels[doc.kind] || doc.kind}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(doc.createdAt)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.fileKey} target="_blank" rel="noopener noreferrer">
                              <Download className="size-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun document</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun locataire assigné</p>
            )}
          </CardContent>
        </Card>

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
              <div>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Statut de complétion</p>
                      <div className="mt-1">
                        <StatusBadge status={owner.completionStatus} />
                      </div>
                    </div>
                  </div>
              </div>
            </div>
            
           
          </CardHeader>
          <CardContent className="space-y-6">
            {owner ? (
              <>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nom</p>
                    <p className="text-lg font-semibold">{ownerName || "-"}</p>
                    <div className="flex gap-2 mt-2">
                      <StatusBadge status={owner.type} />
                    </div>
                  </div>

                  {owner.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <a href={`mailto:${owner.email}`} className="text-sm hover:underline">
                        {owner.email}
                      </a>
                    </div>
                  )}

                  {owner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="size-4 text-muted-foreground" />
                      <a href={`tel:${owner.phone}`} className="text-sm hover:underline">
                        {owner.phone}
                      </a>
                    </div>
                  )}

                  {owner.fullAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="size-4 text-muted-foreground mt-0.5" />
                      <p className="text-sm">{owner.fullAddress}</p>
                    </div>
                  )}

                  {owner.type === "PERSONNE_PHYSIQUE" && (
                    <>
                      {owner.birthDate && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Date de naissance</p>
                          <p className="text-sm">{formatDate(owner.birthDate)}</p>
                        </div>
                      )}
                      {owner.birthPlace && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Lieu de naissance</p>
                          <p className="text-sm">{owner.birthPlace}</p>
                        </div>
                      )}
                      {owner.nationality && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Nationalité</p>
                          <p className="text-sm">{owner.nationality}</p>
                        </div>
                      )}
                      {owner.profession && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Profession</p>
                          <p className="text-sm">{owner.profession}</p>
                        </div>
                      )}
                      {owner.familyStatus && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Statut familial</p>
                          <div className="mt-1">
                            <FamilyStatusBadge status={owner.familyStatus} />
                          </div>
                        </div>
                      )}
                      {owner.familyStatus === "MARIE" && owner.matrimonialRegime && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Régime matrimonial</p>
                          <div className="mt-1">
                            <MatrimonialRegimeBadge regime={owner.matrimonialRegime} />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {owner.type === "PERSONNE_MORALE" && owner.registration && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Numéro d'immatriculation</p>
                      <p className="text-sm font-mono">{owner.registration}</p>
                    </div>
                  )}
                </div>


                <Separator />

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium">Documents ({ownerDocuments.length})</p>
                    {owner.id && (
                      <Link href={`/interface/clients/${owner.id}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="size-3 mr-2" />
                          Voir le profil
                        </Button>
                      </Link>
                    )}
                  </div>
                  {ownerDocuments.length > 0 ? (
                    <div className="space-y-2">
                      {ownerDocuments.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <FileText className="size-4 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{documentKindLabels[doc.kind] || doc.kind}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTime(doc.createdAt)}</p>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={doc.fileKey} target="_blank" rel="noopener noreferrer">
                              <Download className="size-4" />
                            </a>
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Aucun document</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Aucun propriétaire assigné</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bien */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="size-5 text-muted-foreground" />
            <CardTitle>Bien immobilier</CardTitle>
          </div>
          <CardDescription>Informations du bien loué</CardDescription>
        </CardHeader>
        <CardContent>
          {lease.property ? (
            <div className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Adresse</p>
                  <div className="flex items-start gap-2">
                    <MapPin className="size-4 text-muted-foreground mt-0.5" />
                    <p className="text-base font-semibold">{lease.property.fullAddress}</p>
                  </div>
                </div>

                {lease.property.label && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Libellé</p>
                    <p className="text-base">{lease.property.label}</p>
                  </div>
                )}

                {lease.property.surfaceM2 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Surface</p>
                    <p className="text-base">{formatSurface(Number(lease.property.surfaceM2))}</p>
                  </div>
                )}

                {lease.property.type && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Type</p>
                    <PropertyTypeBadge type={lease.property.type} />
                  </div>
                )}

                {lease.property.legalStatus && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Statut légal</p>
                    <PropertyLegalStatusBadge status={lease.property.legalStatus} />
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Statut</p>
                  <StatusBadge status={lease.property.status} />
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium">Statut de complétion</p>
                    <div className="mt-1">
                      <StatusBadge status={lease.property.completionStatus} />
                    </div>
                  </div>
                  <Link href={`/interface/properties/${lease.property.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-3 mr-2" />
                      Voir le bien
                    </Button>
                  </Link>
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium">Documents du bien ({propertyDocuments.length})</p>
                  <Link href={`/interface/properties/${lease.property.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="size-3 mr-2" />
                      Voir le bien
                    </Button>
                  </Link>
                </div>
                {propertyDocuments.length > 0 ? (
                  <div className="space-y-2">
                    {propertyDocuments.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="size-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{documentKindLabels[doc.kind] || doc.kind}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(doc.createdAt)}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={doc.fileKey} target="_blank" rel="noopener noreferrer">
                            <Download className="size-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun document</p>
                )}
              </div>
            </div>
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
            <div className="space-y-2">
              {bailDocuments.map((doc: any) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-2 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="size-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{documentKindLabels[doc.kind] || doc.kind}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(doc.createdAt)}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={doc.fileKey} target="_blank" rel="noopener noreferrer">
                      <Download className="size-4" />
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métadonnées</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Créé le</p>
              <p className="font-medium">{formatDateTime(lease.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modifié le</p>
              <p className="font-medium">{formatDateTime(lease.updatedAt)}</p>
            </div>
            {lease.createdBy && (
              <div>
                <p className="text-muted-foreground">Créé par</p>
                <p className="font-medium">{lease.createdBy.name || lease.createdBy.email}</p>
              </div>
            )}
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
