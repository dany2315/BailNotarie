import { getClient, getClientMissingData } from "@/lib/actions/clients";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Building2, FileText, Mail, Phone, Euro } from "lucide-react";
import { 
  StatusBadge
} from "@/components/shared/status-badge";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClientType, ProfilType, BailStatus } from "@prisma/client";
import { PropertyBailsViewer } from "@/components/clients/property-bails-viewer";
import { ButtonGroup } from "@/components/ui/button-group";
import { SendIntakeButton } from "@/components/clients/send-intake-button";
import { ClientActionsDropdown } from "@/components/clients/client-actions-dropdown";
import { CommentsDrawer } from "@/components/comments/comments-drawer";
import { DeleteClientButton } from "@/components/clients/delete-client-button";
import { ClientPersonsTabs } from "@/components/clients/client-persons-tabs";
import { MissingDataCard } from "@/components/clients/missing-data-card";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const [client, missingData] = await Promise.all([
    getClient(resolvedParams.id),
    getClientMissingData(resolvedParams.id),
  ]);

  if (!client) {
    notFound();
  }

  // Obtenir les données principales depuis Person (personne primaire) ou Entreprise
  const primaryPerson = client.persons?.find((p: any) => p.isPrimary) || client.persons?.[0];
  const entreprise = client.entreprise;

  // Obtenir le nom du client
  const clientName = client.type === ClientType.PERSONNE_PHYSIQUE
    ? primaryPerson
      ? `${primaryPerson.firstName || ""} ${primaryPerson.lastName || ""}`.trim()
      : "Client"
    : entreprise?.legalName || entreprise?.name || "Client";

  // Obtenir l'email et le téléphone
  const clientEmail = client.type === ClientType.PERSONNE_PHYSIQUE
    ? primaryPerson?.email
    : entreprise?.email;
  
  const clientPhone = client.type === ClientType.PERSONNE_PHYSIQUE
    ? primaryPerson?.phone
    : entreprise?.phone;

  // Collecter tous les documents depuis persons, entreprise et client
  const allDocuments = [
    ...(client.persons?.flatMap((p: any) => p.documents || []) || []),
    ...(client.entreprise?.documents || []),
    ...(client.documents || []), // Documents client (livret de famille, PACS)
  ];

  // Fonction helper récursive pour sérialiser les Decimal de Prisma
  const serializeDecimal = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    // Détecter et convertir les Decimal de Prisma
    if (obj && typeof obj === 'object') {
      // Vérifier si c'est un Decimal de Prisma
      const isDecimal = 
        obj.constructor?.name === 'Decimal' ||
        (typeof obj.toNumber === 'function' && 
         typeof obj.toString === 'function' && 
         !Array.isArray(obj) && 
         !(obj instanceof Date) &&
         obj.constructor !== Object &&
         obj.constructor !== RegExp);
      
      if (isDecimal) {
        try {
          if (typeof obj.toNumber === 'function') {
            const num = obj.toNumber();
            return isNaN(num) ? null : num;
          }
          const num = Number(obj);
          return isNaN(num) ? null : num;
        } catch {
          try {
            return parseFloat(obj.toString()) || null;
          } catch {
            return null;
          }
        }
      }
      
      // Gérer les Date
      if (obj instanceof Date) {
        return obj.toISOString();
      }
      
      // Gérer les tableaux
      if (Array.isArray(obj)) {
        return obj.map(serializeDecimal);
      }
      
      // Gérer les objets (récursivement)
      const serialized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          serialized[key] = serializeDecimal(obj[key]);
        }
      }
      return serialized;
    }
    
    return obj;
  };

  // Sérialiser les données pour convertir les Decimal en nombres
  // Parcourir récursivement tous les objets pour convertir tous les Decimal
  // Cela évite l'erreur "Only plain objects can be passed to Client Components"
  const serializedBails = client.bails ? serializeDecimal(client.bails) : [];
  const serializedProperties = client.ownedProperties ? serializeDecimal(client.ownedProperties) : [];
  // Les intakeLinks sont déjà sérialisés par getClient, createdAt est déjà une string ISO
  const serializedIntakeLinks = client.intakeLinks || [];
  
  // Sérialiser les données pour ClientPersonsTabs (composant client)
  const serializedPersons = client.persons ? serializeDecimal(client.persons) : [];
  const serializedEntreprise = client.entreprise ? serializeDecimal(client.entreprise) : null;
  const serializedClientDocuments = client.documents ? serializeDecimal(client.documents) : [];

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
              hasEmail={!!clientEmail}
              profilType={client.profilType}
              intakeLinks={serializedIntakeLinks}
            />
            <DeleteClientButton 
              clientId={client.id} 
              clientName={clientName || "Client"}
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
              <div className="text-2xl font-bold">{allDocuments.length}</div>
              <p className="text-xs text-muted-foreground">Pièce{allDocuments.length > 1 ? "s" : ""} jointe{allDocuments.length > 1 ? "s" : ""}</p>
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
              <div className="text-2xl font-bold">{allDocuments.length}</div>
              <p className="text-xs text-muted-foreground">Pièce{allDocuments.length > 1 ? "s" : ""} jointe{allDocuments.length > 1 ? "s" : ""}</p>
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
              <div className="text-2xl font-bold">{allDocuments.length}</div>
              <p className="text-xs text-muted-foreground">Pièce{allDocuments.length > 1 ? "s" : ""} jointe{allDocuments.length > 1 ? "s" : ""}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section principale avec grille asymétrique pour desktop */}
      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Informations personnelles avec onglets */}
        <div className="flex flex-col gap-6 order-1 lg:col-span-2">
          {/* Informations du client avec onglets pour sélectionner la personne */}
          <ClientPersonsTabs
            clientType={client.type}
            persons={serializedPersons}
            entreprise={serializedEntreprise}
            clientDocuments={serializedClientDocuments}
          />
        </div>

        {/* Colonne droite - Données manquantes, Actions rapides et Informations système */}
        <div className="flex flex-col gap-6 order-4 lg:col-span-1">
          {/* Données manquantes - Affiché uniquement si données manquantes */}
          {missingData && (missingData.totalMissingFields > 0 || missingData.totalMissingDocuments > 0) && (
            <MissingDataCard
              clientId={client.id}
              missingData={missingData}
            />
          )}

          {/* Actions rapides - Order 4 sur mobile */}
          <Card className="order-4">
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
                hasEmail={!!clientEmail}
                profilType={client.profilType}
              />
              {clientEmail && (
                <a href={`mailto:${clientEmail}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer un email
                  </Button>
                </a>
              )}
              {clientPhone && (
                <a href={`tel:${clientPhone}`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>

          {/* Informations système - Order 5 sur mobile */}
          <Card className="order-5">
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
              <div>
                <label className="text-xs text-muted-foreground">Créé par</label>
                <p className="mt-0.5 break-words">
                  {client.createdBy ? (client.createdBy.name || client.createdBy.email) : "via formulaire"}
                </p>
              </div>
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

      {/* Biens et Baux - Order 3 sur mobile, pleine largeur sur desktop */}
      {stats.properties > 0 && (
        <div className="order-3">
          <PropertyBailsViewer properties={serializedProperties as any[]} />
        </div>
      )}
    </div>
  );
}
