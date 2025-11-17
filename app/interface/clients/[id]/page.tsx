import { getClient } from "@/lib/actions/clients";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Building2, FileText, Mail, Phone, MapPin, Calendar, Euro, Users, Home } from "lucide-react";
import { 
  StatusBadge, 
  FamilyStatusBadge, 
  MatrimonialRegimeBadge 
} from "@/components/shared/status-badge";
import { formatDate, formatCurrency, formatSurface, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientType, ProfilType, BailStatus, PropertyStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const client = await getClient(resolvedParams.id);

  if (!client) {
    notFound();
  }

  const clientName = client.type === ClientType.PERSONNE_PHYSIQUE
    ? `${client.firstName || ""} ${client.lastName || ""}`.trim()
    : client.legalName || "";

  // Fonction helper pour sérialiser les Decimal
  const serializeDecimal = (value: any): any => {
    if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
      return Number(value);
    }
    return value;
  };

  // Sérialiser les données pour convertir les Decimal en nombres
  // Utilisation de JSON.parse(JSON.stringify()) pour sérialiser complètement
  // Cela convertit automatiquement tous les Decimal en nombres
  const serializedBails = client.bails ? JSON.parse(JSON.stringify(client.bails, (key, value) => serializeDecimal(value))) as typeof client.bails : [];
  const serializedProperties = client.ownedProperties ? JSON.parse(JSON.stringify(client.ownedProperties, (key, value) => serializeDecimal(value))) as typeof client.ownedProperties : [];

  // Statistiques
  const stats = {
    properties: serializedProperties.length,
    bails: serializedBails.length,
    activeBails: serializedBails.filter((b: any) => b.status === BailStatus.ACTIVE).length,
    totalRent: serializedBails.reduce((sum: number, bail: any) => {
      return sum + (Number(bail.rentAmount) || 0);
    }, 0),
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/interface/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{clientName || "Client"}</h1>
              <StatusBadge status={client.type} />
              <StatusBadge status={client.profilType} />
            </div>
            <p className="text-muted-foreground mt-1">
              Détails complets du client
            </p>
          </div>
        </div>
        <Link href={`/interface/clients/${client.id}/edit`}>
          <Button>
            <Edit className="size-4 mr-2" />
            Modifier
          </Button>
        </Link>
      </div>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Propriétés</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.properties}</div>
            <p className="text-xs text-muted-foreground">
              Bien{stats.properties > 1 ? "s" : ""} possédé{stats.properties > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
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
            <CardTitle className="text-sm font-medium">Loyers totaux</CardTitle>
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
            <div className="text-2xl font-bold">{client.documents?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Pièce{client.documents && client.documents.length > 1 ? "s" : ""} jointe{client.documents && client.documents.length > 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations du client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informations du client
              </CardTitle>
              <CardDescription>Détails personnels et de contact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {client.type === ClientType.PERSONNE_PHYSIQUE ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {client.firstName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Prénom</label>
                      <p className="mt-1 text-sm font-medium">{client.firstName}</p>
                    </div>
                  )}
                  {client.lastName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nom</label>
                      <p className="mt-1 text-sm font-medium">{client.lastName}</p>
                    </div>
                  )}
                  {client.profession && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Profession</label>
                      <p className="mt-1 text-sm">{client.profession}</p>
                    </div>
                  )}
                  {client.familyStatus && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Statut familial</label>
                      <div className="mt-1">
                        <FamilyStatusBadge status={client.familyStatus} />
                      </div>
                    </div>
                  )}
                  {client.matrimonialRegime && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Régime matrimonial</label>
                      <div className="mt-1">
                        <MatrimonialRegimeBadge regime={client.matrimonialRegime} />
                      </div>
                    </div>
                  )}
                  {client.birthPlace && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Lieu de naissance</label>
                      <p className="mt-1 text-sm">{client.birthPlace}</p>
                    </div>
                  )}
                  {client.birthDate && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Date de naissance</label>
                      <p className="mt-1 text-sm">{formatDate(client.birthDate)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {client.legalName && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Raison sociale</label>
                      <p className="mt-1 text-sm font-medium">{client.legalName}</p>
                    </div>
                  )}
                  {client.registration && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">SIREN/SIRET</label>
                      <p className="mt-1 text-sm">{client.registration}</p>
                    </div>
                  )}
                </div>
              )}

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                {client.email && (
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="mt-1 text-sm">{client.email}</p>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                      <p className="mt-1 text-sm">{client.phone}</p>
                    </div>
                  </div>
                )}
                {client.fullAddress && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <label className="text-sm font-medium text-muted-foreground">Adresse</label>
                      <p className="mt-1 text-sm whitespace-pre-line">{client.fullAddress}</p>
                    </div>
                  </div>
                )}
                {client.nationality && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nationalité</label>
                    <p className="mt-1 text-sm">{client.nationality}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Statut de complétion</label>
                <div className="mt-1">
                  <StatusBadge status={client.completionStatus} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Propriétés */}
          {stats.properties > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Propriétés ({stats.properties})
                </CardTitle>
                <CardDescription>Biens immobiliers possédés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {serializedProperties.map((property: any) => (
                  <div key={property.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{property.label || "Sans libellé"}</h3>
                          <StatusBadge status={property.status} />
                        </div>
                        <p className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5" />
                          {property.fullAddress}
                        </p>
                      </div>
                      <Link href={`/interface/properties/${property.id}`}>
                        <Button variant="ghost" size="sm">Voir</Button>
                      </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3 text-sm">
                      {property.type && (
                        <div>
                          <label className="text-xs text-muted-foreground">Type</label>
                          <p className="mt-0.5">{property.type.replace(/_/g, " ")}</p>
                        </div>
                      )}
                      {property.surfaceM2 && (
                        <div>
                          <label className="text-xs text-muted-foreground">Surface</label>
                          <p className="mt-0.5">{formatSurface(property.surfaceM2)}</p>
                        </div>
                      )}
                      {property.legalStatus && (
                        <div>
                          <label className="text-xs text-muted-foreground">Statut légal</label>
                          <p className="mt-0.5">{property.legalStatus.replace(/_/g, " ")}</p>
                        </div>
                      )}
                    </div>
                    {property.bails && property.bails.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          {property.bails.length} bail{property.bails.length > 1 ? "x" : ""} associé{property.bails.length > 1 ? "s" : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Baux */}
          {stats.bails > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Baux ({stats.bails})
                </CardTitle>
                <CardDescription>Contrats de location</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {serializedBails.map((bail: any) => {
                  const owner = bail.parties?.find((p: any) => p.profilType === ProfilType.PROPRIETAIRE);
                  const tenant = bail.parties?.find((p: any) => p.profilType === ProfilType.LOCATAIRE);
                  const ownerName = owner?.type === ClientType.PERSONNE_PHYSIQUE
                    ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
                    : owner?.legalName || "";
                  const tenantName = tenant?.type === ClientType.PERSONNE_PHYSIQUE
                    ? `${tenant.firstName || ""} ${tenant.lastName || ""}`.trim()
                    : tenant?.legalName || "";

                  return (
                    <div key={bail.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">
                              {bail.bailType?.replace(/_/g, " ")} - {bail.bailFamily?.replace(/_/g, " ")}
                            </h3>
                            <StatusBadge status={bail.status} />
                          </div>
                          {bail.property && (
                            <p className="text-sm text-muted-foreground flex items-start gap-1">
                              <Home className="h-3 w-3 mt-0.5" />
                              {bail.property.fullAddress}
                            </p>
                          )}
                        </div>
                        <Link href={`/interface/leases/${bail.id}`}>
                          <Button variant="ghost" size="sm">Voir</Button>
                        </Link>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 text-sm">
                        <div>
                          <label className="text-xs text-muted-foreground">Loyer</label>
                          <p className="mt-0.5 font-medium">{formatCurrency(bail.rentAmount)}</p>
                        </div>
                        {bail.monthlyCharges && bail.monthlyCharges > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground">Charges</label>
                            <p className="mt-0.5">{formatCurrency(bail.monthlyCharges)}</p>
                          </div>
                        )}
                        {bail.securityDeposit && bail.securityDeposit > 0 && (
                          <div>
                            <label className="text-xs text-muted-foreground">Dépôt de garantie</label>
                            <p className="mt-0.5">{formatCurrency(bail.securityDeposit)}</p>
                          </div>
                        )}
                        {bail.paymentDay && (
                          <div>
                            <label className="text-xs text-muted-foreground">Jour de paiement</label>
                            <p className="mt-0.5">Le {bail.paymentDay}</p>
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Date d'effet
                          </label>
                          <p className="mt-0.5">{formatDate(bail.effectiveDate)}</p>
                        </div>
                        {bail.endDate && (
                          <div>
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Date de fin
                            </label>
                            <p className="mt-0.5">{formatDate(bail.endDate)}</p>
                          </div>
                        )}
                      </div>
                      {bail.parties && bail.parties.length > 0 && (
                        <div className="pt-2 border-t space-y-2">
                          <p className="text-xs text-muted-foreground">Parties :</p>
                          <div className="flex flex-wrap gap-2">
                            {owner && (
                              <Badge variant="outline">
                                Propriétaire: {ownerName || owner.email || "N/A"}
                              </Badge>
                            )}
                            {tenant && (
                              <Badge variant="outline">
                                Locataire: {tenantName || tenant.email || "N/A"}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Informations système */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations système</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-muted-foreground">Créé le</label>
                <p className="mt-0.5">{formatDateTime(client.createdAt)}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Modifié le</label>
                <p className="mt-0.5">{formatDateTime(client.updatedAt)}</p>
              </div>
              {client.createdBy && (
                <div>
                  <label className="text-xs text-muted-foreground">Créé par</label>
                  <p className="mt-0.5">{client.createdBy.name || client.createdBy.email}</p>
                </div>
              )}
              {client.updatedBy && (
                <div>
                  <label className="text-xs text-muted-foreground">Modifié par</label>
                  <p className="mt-0.5">{client.updatedBy.name || client.updatedBy.email}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href={`/interface/clients/${client.id}/edit`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier le client
                </Button>
              </Link>
              {client.email && (
                <a href={`mailto:${client.email}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un email
                  </Button>
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
