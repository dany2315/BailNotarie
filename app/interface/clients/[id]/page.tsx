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
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { formatDate, formatCurrency, formatSurface, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientType, ProfilType, BailStatus, PropertyStatus, Property } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DocumentsList } from "@/components/leases/documents-list";
import { PropertyBailsViewer } from "@/components/clients/property-bails-viewer";
import { ButtonGroup } from "@/components/ui/button-group";
import { SendIntakeButton } from "@/components/clients/send-intake-button";
import { ClientActionsDropdown } from "@/components/clients/client-actions-dropdown";
import { CommentsDrawer } from "@/components/comments/comments-drawer";

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
  // Cela convertit automatiquement tous les Decimal en nombres et les Dates en strings
  const serializedBails = client.bails ? JSON.parse(JSON.stringify(client.bails, (key, value) => serializeDecimal(value))) as typeof client.bails : [];
  const serializedProperties = client.ownedProperties ? JSON.parse(JSON.stringify(client.ownedProperties, (key, value) => serializeDecimal(value))) as typeof client.ownedProperties : [];
  const serializedIntakeLinks = client.intakeLinks ? client.intakeLinks.map(link => ({
    id: link.id,
    token: link.token,
    target: link.target,
    status: link.status,
    createdAt: link.createdAt.toISOString(),
  })) as Array<{ id: string; token: string; target: string; status: string; createdAt: string }> : [];

  // Statistiques selon le type de profil
  const stats = {
    properties: serializedProperties.length,
    bails: serializedBails.length,
    activeBails: serializedBails.filter((b: any) => b.status === BailStatus.SIGNED).length,
    totalRent: serializedBails.reduce((sum: number, bail: any) => {
      return sum + (Number(bail.rentAmount) || 0);
    }, 0),
    // Pour locataire : loyer mensuel du bail actif
    monthlyRent: serializedBails
      .filter((b: any) => b.status === BailStatus.SIGNED)
      .reduce((sum: number, bail: any) => sum + (Number(bail.rentAmount) || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link href="/interface/clients">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{clientName || "Client"}</h1>
                <p className="text-muted-foreground mt-1 text-sm sm:text-base">
                  Détails complets du client
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={client.type} />
                <StatusBadge status={client.profilType} />
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end justify-end sm:w-auto">
          <ButtonGroup className="w-auto sm:w-auto justify-end">
            <CompletionStatusSelect
              type="client"
              id={client.id}
              currentStatus={client.completionStatus}
              viewLabel={false}
              asChild
            />
            
            <Button asChild className="w-auto sm:w-auto " variant="outline">
              <Link href={`/interface/clients/${client.id}/edit`}>
                <Edit className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Modifier</span>
              </Link>
            </Button>
            <CommentsDrawer target="CLIENT" targetId={client.id} />
            <ClientActionsDropdown
              clientId={client.id}
              hasEmail={!!client.email}
              profilType={client.profilType}
              intakeLinks={serializedIntakeLinks}
            />
          </ButtonGroup>
        </div>
      </div>

      {/* Statistiques selon le type de profil */}
      {client.profilType === ProfilType.PROPRIETAIRE && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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
              <div className="text-2xl font-bold">{client.documents?.length || 0}</div>
              <p className="text-xs text-muted-foreground">Pièce{client.documents && client.documents.length > 1 ? "s" : ""} jointe{client.documents && client.documents.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {client.profilType === ProfilType.LOCATAIRE && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Baux actifs</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeBails}</div>
              <p className="text-xs text-muted-foreground">
                {stats.bails} au total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loyer mensuel</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRent)}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeBails > 0 ? "Total des baux actifs" : "Aucun bail actif"}
              </p>
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
      )}

      {client.profilType === ProfilType.LEAD && (
        <div className="grid gap-4 md:grid-cols-1">
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
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Informations du client - Order 1 sur mobile */}
        <Card className="order-1 lg:col-span-2">
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
          </CardContent>
        </Card>

        {/* Documents - Order 2 sur mobile */}
        {client.documents && client.documents.length > 0 && (
          <Card className="order-2 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents ({client.documents.length})
              </CardTitle>
              <CardDescription>Pièces jointes du client</CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsList
                documents={client.documents.map((doc: any) => ({
                  id: doc.id,
                  kind: doc.kind,
                  fileKey: doc.fileKey,
                  mimeType: doc.mimeType,
                  label: doc.label,
                  createdAt: doc.createdAt,
                }))}
                documentKindLabels={{
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
                }}
              />
            </CardContent>
          </Card>
        )}

        {/* Biens et Baux - Order 3 sur mobile */}
        {stats.properties > 0 && (
          <div className="order-3 lg:col-span-2">
            <PropertyBailsViewer properties={serializedProperties as any[]} />
          </div>
        )}

        {/* Actions rapides - Order 4 sur mobile */}
        <Card className="order-4 lg:order-2">
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
            <SendIntakeButton 
              clientId={client.id}
              hasEmail={!!client.email}
              profilType={client.profilType}
            />
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

        {/* Informations système - Order 5 sur mobile */}
        <Card className="order-5 lg:order-2">
          <CardHeader>
            <CardTitle className="text-base">Informations système</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <label className="text-xs text-muted-foreground">Créé le</label>
              <p className="mt-0.5 break-words">{formatDateTime(client.createdAt)}</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Modifié le</label>
              <p className="mt-0.5 break-words">{formatDateTime(client.updatedAt)}</p>
            </div>
            {client.createdBy && (
              <div>
                <label className="text-xs text-muted-foreground">Créé par</label>
                <p className="mt-0.5 break-words">{client.createdBy.name || client.createdBy.email}</p>
              </div>
            )}
            {client.updatedBy && (
              <div>
                <label className="text-xs text-muted-foreground">Modifié par</label>
                <p className="mt-0.5 break-words">{client.updatedBy.name || client.updatedBy.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
