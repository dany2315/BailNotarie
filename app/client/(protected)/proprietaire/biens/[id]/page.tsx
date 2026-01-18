import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { canAccessProperty } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProprietaireBienDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, client } = await requireProprietaireAuth();
  const resolvedParams = await params;
  const propertyId = resolvedParams.id;

  // Vérifier que le client peut accéder à ce bien
  const hasAccess = await canAccessProperty(user.id, propertyId);
  if (!hasAccess) {
    notFound();
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: {
      owner: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      bails: {
        include: {
          parties: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!property) {
    notFound();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/client/proprietaire/biens">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Détail du bien</h1>
            <p className="text-muted-foreground">{property.label || property.fullAddress}</p>
          </div>
        </div>
        <Link href={`/client/proprietaire/baux/new?propertyId=${propertyId}`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Créer un bail pour ce bien
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations du bien */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du bien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Adresse</span>
              <p className="text-sm font-medium mt-1">{property.fullAddress}</p>
            </div>
            {property.label && (
              <div>
                <span className="text-sm text-muted-foreground">Label</span>
                <p className="text-sm font-medium mt-1">{property.label}</p>
              </div>
            )}
            {property.surfaceM2 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Surface</span>
                <span className="text-sm font-medium">{property.surfaceM2.toString()} m²</span>
              </div>
            )}
            {property.type && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">{property.type}</span>
              </div>
            )}
            {property.legalStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut juridique</span>
                <span className="text-sm font-medium">{property.legalStatus}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge variant={property.status === "LOUER" ? "default" : "secondary"}>
                {property.status === "LOUER" ? "Loué" : "Disponible"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Nombre de baux</span>
              <span className="text-sm font-medium">{property.bails.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Baux actifs</span>
              <span className="text-sm font-medium">
                {property.bails.filter(b => b.status === "SIGNED").length}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Baux terminés</span>
              <span className="text-sm font-medium">
                {property.bails.filter(b => b.status === "TERMINATED").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des baux */}
      {property.bails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Baux associés</CardTitle>
            <CardDescription>{property.bails.length} bail{property.bails.length > 1 ? "x" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {property.bails.map((bail) => {
                const locataire = bail.parties.find(p => p.profilType === "LOCATAIRE");
                const locataireName = locataire?.entreprise 
                  ? locataire.entreprise.legalName || locataire.entreprise.name
                  : locataire?.persons?.[0] 
                    ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
                    : "Non défini";

                return (
                  <Link key={bail.id} href={`/client/proprietaire/baux/${bail.id}`}>
                    <div className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Bail du {formatDate(bail.effectiveDate)}</span>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>Locataire : {locataireName}</p>
                            <p>{bail.rentAmount.toLocaleString()} € / mois</p>
                          </div>
                        </div>
                        <Badge variant={
                          bail.status === "SIGNED" ? "default" :
                          bail.status === "TERMINATED" ? "secondary" :
                          "outline"
                        }>
                          {bail.status}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}







