import { getProperty } from "@/lib/actions/properties";
import { getDocuments } from "@/lib/actions/documents";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, FileText, Mail, Phone, MapPin, Home, Building2, Euro, Calendar, ArrowRight, User } from "lucide-react";
import { 
  PropertyLegalStatusBadge, 
  PropertyTypeBadge, 
  StatusBadge,
  FamilyStatusBadge,
  MatrimonialRegimeBadge
} from "@/components/shared/status-badge";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { formatDate, formatCurrency, formatSurface, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ClientType, BailStatus, ProfilType } from "@prisma/client";
import { CommentsDrawer } from "@/components/comments/comments-drawer";
import { DocumentsList } from "@/components/leases/documents-list";
import { ButtonGroup } from "@/components/ui/button-group";
import { DeletePropertyButton } from "@/components/properties/delete-property-button";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.id);

  if (!property) {
    notFound();
  }

  // Récupérer les documents du bien et du propriétaire
  const [propertyDocuments, ownerDocuments] = await Promise.all([
    getDocuments({ propertyId: property.id }),
    getDocuments({ clientId: property.owner.id }),
  ]);

  // Fonction helper pour sérialiser les Decimal
  const serializeDecimal = (value: any): any => {
    if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
      return Number(value);
    }
    return value;
  };

  // Sérialiser les baux pour convertir les Decimal en nombres
  const serializedBails = property.bails ? JSON.parse(JSON.stringify(property.bails, (key, value) => serializeDecimal(value))) : [];

  const ownerName = property.owner.type === ClientType.PERSONNE_PHYSIQUE
    ? `${property.owner.firstName || ""} ${property.owner.lastName || ""}`.trim()
    : property.owner.legalName || "";

  // Statistiques
  const stats = {
    bails: serializedBails.length,
    activeBails: serializedBails.filter((b: any) => b.status === BailStatus.SIGNED).length,
    totalRent: serializedBails.reduce((sum: number, bail: any) => {
      return sum + (Number(bail.rentAmount) || 0);
    }, 0),
    documents: propertyDocuments.length,
  };

  const bailTypeLabels: Record<string, string> = {
    BAIL_NU_3_ANS: "Bail nu 3 ans",
    BAIL_NU_6_ANS: "Bail nu 6 ans",
    BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
    BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
  };

  const bailFamilyLabels: Record<string, string> = {
    HABITATION: "Habitation",
    MEUBLE: "Meublé",
    COMMERCIAL: "Commercial",
    PROFESSIONNEL: "Professionnel",
    SAISONNIER: "Saisonnier",
    OTHER: "Autre",
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
    <div className="space-y-6 sm:space-y-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link href="/interface/properties">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{property.label || property.fullAddress}</h1>
              <StatusBadge status={property.status} />
            </div>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Détails complets du bien immobilier
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <ButtonGroup className="w-full sm:w-auto justify-end">
            {property.completionStatus && (
              <CompletionStatusSelect
                type="property"
                id={property.id}
                currentStatus={property.completionStatus}
                viewLabel={false}
                asChild
              />
            )}
            <Button asChild className=" sm:w-auto" variant="outline">
              <Link href={`/interface/properties/${property.id}/edit`}>
                <Edit className="size-4 sm:mr-2" />
                <span className="">Modifier</span>
              </Link>
            </Button>
            <CommentsDrawer target="PROPERTY" targetId={property.id} />
            <DeletePropertyButton 
              propertyId={property.id} 
              propertyAddress={property.fullAddress || property.label || "Bien"}
            />
          </ButtonGroup>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Baux</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bails}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeBails} actif{stats.activeBails > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus locatifs</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRent)}</div>
            <p className="text-xs text-muted-foreground">Par mois</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.documents}</div>
            <p className="text-xs text-muted-foreground">Pièce{stats.documents > 1 ? "s" : ""} jointe{stats.documents > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Surface</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.surfaceM2 ? formatSurface(Number(property.surfaceM2)) : "-"}</div>
            <p className="text-xs text-muted-foreground">Superficie</p>
          </CardContent>
        </Card>
      </div>

      {/* Informations du bien */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Home className="size-5 text-muted-foreground" />
            <CardTitle>Informations du bien</CardTitle>
          </div>
          <CardDescription>Détails du bien immobilier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Informations principales */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Adresse</p>
              <div className="flex items-start gap-2">
                <MapPin className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-base font-medium">{property.fullAddress}</p>
              </div>
            </div>

            {property.label && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Libellé</p>
                <p className="text-base font-medium">{property.label}</p>
              </div>
            )}

            {property.surfaceM2 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Surface</p>
                <p className="text-base font-medium">{formatSurface(Number(property.surfaceM2))}</p>
              </div>
            )}

            {property.type && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
                <PropertyTypeBadge type={property.type} />
              </div>
            )}

            {property.legalStatus && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut légal</p>
                <PropertyLegalStatusBadge status={property.legalStatus} />
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</p>
              <StatusBadge status={property.status} />
            </div>
          </div>

          <Separator />

          {/* Section Documents */}
          {propertyDocuments.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents du bien ({propertyDocuments.length})</p>
              <DocumentsList
                documents={propertyDocuments}
                documentKindLabels={documentKindLabels}
              />
            </div>
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
            <CompletionStatusSelect
              type="client"
              id={property.owner.id}
              currentStatus={property.owner.completionStatus ?? "NOT_STARTED"}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Section Identité */}
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom</p>
              <Link href={`/interface/clients/${property.owner.id}`} className="flex items-center gap-2 font-semibold hover:underline group">
                {ownerName || "-"}
                <ArrowRight className="size-3 -rotate-45 group-hover:text-foreground text-muted-foreground transition-colors" />
              </Link>
              <StatusBadge status={property.owner.type} />
            </div>
          </div>

          <Separator />

          {/* Section Contact */}
          {(property.owner.email || property.owner.phone || property.owner.fullAddress) && (
            <div className="space-y-3">
              {property.owner.email && (
                <div className="flex items-center gap-2">
                  <Mail className="size-4 text-muted-foreground" />
                  <a href={`mailto:${property.owner.email}`} className="text-sm hover:underline">
                    {property.owner.email}
                  </a>
                </div>
              )}
              {property.owner.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-muted-foreground" />
                  <a href={`tel:${property.owner.phone}`} className="text-sm hover:underline">
                    {property.owner.phone}
                  </a>
                </div>
              )}
              {property.owner.fullAddress && (
                <div className="flex items-start gap-2">
                  <MapPin className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{property.owner.fullAddress}</p>
                </div>
              )}
            </div>
          )}

          {/* Section Détails Personnels */}
          {property.owner.type === "PERSONNE_PHYSIQUE" && (
            <>
              {(property.owner.birthDate || property.owner.birthPlace || property.owner.nationality || property.owner.profession || property.owner.familyStatus) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Informations personnelles</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {property.owner.birthDate && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Date de naissance</p>
                          <p className="text-sm">{formatDate(property.owner.birthDate)}</p>
                        </div>
                      )}
                      {property.owner.birthPlace && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Lieu de naissance</p>
                          <p className="text-sm">{property.owner.birthPlace}</p>
                        </div>
                      )}
                      {property.owner.nationality && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Nationalité</p>
                          <p className="text-sm">{property.owner.nationality}</p>
                        </div>
                      )}
                      {property.owner.profession && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Profession</p>
                          <p className="text-sm">{property.owner.profession}</p>
                        </div>
                      )}
                      {property.owner.familyStatus && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Statut familial</p>
                          <FamilyStatusBadge status={property.owner.familyStatus} />
                        </div>
                      )}
                      {property.owner.familyStatus === "MARIE" && property.owner.matrimonialRegime && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Régime matrimonial</p>
                          <MatrimonialRegimeBadge regime={property.owner.matrimonialRegime} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {property.owner.type === "PERSONNE_MORALE" && property.owner.registration && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Numéro d'immatriculation</p>
                <p className="text-sm font-mono">{property.owner.registration}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Section Documents */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Documents du propriétaire ({ownerDocuments.length})</p>
            <DocumentsList
              documents={ownerDocuments}
              documentKindLabels={documentKindLabels}
            />
          </div>
        </CardContent>
      </Card>

      {/* Baux associés */}
      {serializedBails.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-muted-foreground" />
              <CardTitle>Baux associés</CardTitle>
            </div>
            <CardDescription>Baux liés à ce bien ({serializedBails.length})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {serializedBails.map((bail: any) => {
                const tenant = bail.parties?.find((p: any) => p.profilType === ProfilType.LOCATAIRE);
                const tenantName = tenant
                  ? tenant.type === ClientType.PERSONNE_PHYSIQUE
                    ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim() || tenant.email || ""
                    : tenant.legalName || ""
                  : "";

                return (
                  <Link
                    key={bail.id}
                    href={`/interface/baux/${bail.id}`}
                    className="block"
                  >
                    <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-semibold text-sm">
                              {bailTypeLabels[bail.bailType] || bail.bailType} - {bailFamilyLabels[bail.bailFamily] || bail.bailFamily}
                            </h3>
                            <StatusBadge status={bail.status} />
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        {tenant && (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Locataire:</span>
                            <span className="font-medium">{tenantName || "Non assigné"}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Début:</span>
                          <span className="font-medium">{formatDate(bail.effectiveDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Loyer:</span>
                          <span className="font-medium">{formatCurrency(Number(bail.rentAmount))}</span>
                        </div>
                        {bail.monthlyCharges > 0 && (
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Charges:</span>
                            <span className="font-medium">{formatCurrency(Number(bail.monthlyCharges))}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
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
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 text-sm">
            <div>
              <p className="text-muted-foreground">Créé le</p>
              <p className="font-medium">{formatDateTime(property.createdAt)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Modifié le</p>
              <p className="font-medium">{formatDateTime(property.updatedAt)}</p>
            </div>
            {property.createdBy && (
              <div>
                <p className="text-muted-foreground">Créé par</p>
                <p className="font-medium">{property.createdBy.name || property.createdBy.email}</p>
              </div>
            )}
            {property.updatedBy && (
              <div>
                <p className="text-muted-foreground">Modifié par</p>
                <p className="font-medium">{property.updatedBy.name || property.updatedBy.email}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

