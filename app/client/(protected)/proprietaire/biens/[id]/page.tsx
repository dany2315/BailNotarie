import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { canAccessProperty } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, FileText, Plus, MapPin, Ruler, Building2, Calendar, User, Euro } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CompletionStatus } from "@prisma/client";

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

  const bauxActifs = property.bails.filter(b => b.status === "SIGNED");
  const bauxTermines = property.bails.filter(b => b.status === "TERMINATED");

  const typeLabels: Record<string, string> = {
    APPARTEMENT: "Appartement",
    MAISON: "Maison",
  };

  const legalStatusLabels: Record<string, string> = {
    PLEIN_PROPRIETE: "Plein propriété",
    CO_PROPRIETE: "Copropriété",
    LOTISSEMENT: "Lotissement",
  };

  const completionStatusLabels: Record<CompletionStatus, string> = {
    NOT_STARTED: "Non commencé",
    PARTIAL: "Partiel",
    PENDING_CHECK: "En vérification",
    COMPLETED: "Complété",
  };

  const completionStatusVariants: Record<CompletionStatus, "default" | "secondary" | "outline" | "destructive"> = {
    NOT_STARTED: "secondary",
    PARTIAL: "outline",
    PENDING_CHECK: "default",
    COMPLETED: "default",
  };

  const completionStatusColors: Record<CompletionStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-800 border-gray-200",
    PARTIAL: "bg-orange-100 text-orange-800 border-orange-200",
    PENDING_CHECK: "bg-blue-100 text-blue-800 border-blue-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header avec retour et titre */}
      <div className="flex items-center gap-4">
        <Link href="/client/proprietaire/biens">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{property.label || "Bien immobilier"}</h1>
          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <p className="text-sm">{property.fullAddress}</p>
          </div>
        </div>
        <Badge 
          variant={completionStatusVariants[property.completionStatus]} 
          className={`text-sm px-3 py-1 ${completionStatusColors[property.completionStatus]}`}
        >
          {completionStatusLabels[property.completionStatus]}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informations détaillées */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Informations du bien
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Badges compacts intégrés */}
            <div className="flex flex-wrap items-center gap-3 pb-4 border-b">
              {property.surfaceM2 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/20">
                  <Ruler className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Surface</p>
                    <p className="text-xs font-semibold">{property.surfaceM2.toString()} m²</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Baux</p>
                  <p className="text-xs font-semibold">{property.bails.length}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg border border-green-100">
                <Calendar className="h-3.5 w-3.5 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Baux actifs</p>
                  <p className="text-xs font-semibold">{bauxActifs.length}</p>
                </div>
              </div>
              {property.type && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                  <Building2 className="h-3.5 w-3.5 text-gray-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-xs font-semibold">{typeLabels[property.type] || property.type}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {property.label && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Label</p>
                  <p className="text-sm font-medium">{property.label}</p>
                </div>
              )}
              {property.legalStatus && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Statut juridique</p>
                  <p className="text-sm font-medium">{legalStatusLabels[property.legalStatus] || property.legalStatus}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Statut de completion</p>
                <Badge 
                  variant={completionStatusVariants[property.completionStatus]}
                  className={completionStatusColors[property.completionStatus]}
                >
                  {completionStatusLabels[property.completionStatus]}
                </Badge>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Adresse complète</p>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm">{property.fullAddress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Liste des baux */}

          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Baux associés
              </CardTitle>
              <CardDescription className="mt-1">
                {property.bails.length} bail{property.bails.length > 1 ? "x" : ""} au total
                {bauxActifs.length > 0 && ` • ${bauxActifs.length} actif${bauxActifs.length > 1 ? "s" : ""}`}
              </CardDescription>
            </div>
          </div>

          {property.bails.length === 0 ? (
            <Card>
              <CardContent>
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
              <p className="text-muted-foreground mb-4">
                Ce bien n'a pas encore de bail associé
              </p>
              <Link href={`/client/proprietaire/baux/new?propertyId=${propertyId}`}>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Créer un bail
                </Button>
              </Link>
            </div>
            </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {property.bails.map((bail) => {
                const locataire = bail.parties.find(p => p.profilType === "LOCATAIRE");
                const locataireName = locataire?.entreprise 
                  ? locataire.entreprise.legalName || locataire.entreprise.name
                  : locataire?.persons?.[0] 
                    ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
                    : "Non défini";

                const statusColors = {
                  SIGNED: "bg-green-100 text-green-800 border-green-200",
                  TERMINATED: "bg-gray-100 text-gray-800 border-gray-200",
                  DRAFT: "bg-orange-100 text-orange-800 border-orange-200",
                  PENDING_VALIDATION: "bg-blue-100 text-blue-800 border-blue-200",
                  READY_FOR_NOTARY: "bg-purple-100 text-purple-800 border-purple-200",
                };

                const statusLabels: Record<string, string> = {
                  SIGNED: "Signé",
                  TERMINATED: "Terminé",
                  DRAFT: "Brouillon",
                  PENDING_VALIDATION: "En validation",
                  READY_FOR_NOTARY: "Prêt pour notaire",
                };

                return (
                  <Link key={bail.id} href={`/client/proprietaire/baux/${bail.id}`}>
                    <Card className="h-full hover:shadow-md transition-all cursor-pointer p-0">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-primary/10 p-2">
                              <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Bail</h3>
                              <p className="text-xs text-muted-foreground">
                                Du {formatDate(bail.effectiveDate)}
                              </p>
                            </div>
                          </div>
                          <Badge className={statusColors[bail.status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
                            {statusLabels[bail.status] || bail.status}
                          </Badge>
                        </div>
                        <Separator className="my-4" />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Locataire</p>
                              <p className="text-sm font-medium">{locataireName}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Loyer</p>
                              <p className="text-sm font-medium">{bail.rentAmount.toLocaleString()} € / mois</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
    </div>
  );
}








