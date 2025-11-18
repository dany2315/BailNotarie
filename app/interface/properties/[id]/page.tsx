import { getProperty } from "@/lib/actions/properties";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit } from "lucide-react";
import { PropertyLegalStatusBadge, PropertyTypeBadge, StatusBadge } from "@/components/shared/status-badge";
import { CompletionStatusSelect } from "@/components/shared/completion-status-select";
import { formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/formatters";
import { ClientType } from "@prisma/client";
import { CommentsDrawer } from "@/components/comments/comments-drawer";

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

  const ownerName = property.owner.type === ClientType.PERSONNE_PHYSIQUE
    ? `${property.owner.firstName || ""} ${property.owner.lastName || ""}`.trim()
    : property.owner.legalName || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <Link href="/interface/properties">
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">{property.label || property.fullAddress}</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Détails du bien
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CommentsDrawer target="PROPERTY" targetId={property.id} />
            <Link href={`/interface/properties/${property.id}/edit`} className="flex-1 sm:flex-initial">
              <Button className="w-full sm:w-auto">
                <Edit className="size-4 sm:mr-2" />
                <span className="hidden sm:inline">Modifier</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Informations de base du bien</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Adresse complète</label>
              <p className="mt-1">{property.fullAddress}</p>
            </div>
            {property.label && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Libellé</label>
                <p className="mt-1">{property.label}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Statut</label>
              <div className="mt-1">
                <StatusBadge status={property.status} />
              </div>
            </div>
            {property.surfaceM2 && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Surface</label>
                <p className="mt-1">{property.surfaceM2.toString()} m²</p>
              </div>
            )}
            {property.type && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Type</label>
                <div className="mt-1">
                  <PropertyTypeBadge type={property.type} />
                </div>
              </div>
            )}
            {property.legalStatus && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Statut légal</label>
                <div className="mt-1">
                  <PropertyLegalStatusBadge status={property.legalStatus} />
                </div>
              </div>
            )}
            {property.completionStatus && (
              <CompletionStatusSelect
                type="property"
                id={property.id}
                currentStatus={property.completionStatus}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Propriétaire</CardTitle>
            <CardDescription>Informations du propriétaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nom</label>
              <p className="mt-1">{ownerName || "-"}</p>
            </div>
            {property.owner.email && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="mt-1">{property.owner.email}</p>
              </div>
            )}
            {property.owner.phone && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
                <p className="mt-1">{property.owner.phone}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations système</CardTitle>
            <CardDescription>Métadonnées</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Créé le</label>
              <p className="mt-1">{formatDate(property.createdAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Modifié le</label>
              <p className="mt-1">{formatDate(property.updatedAt)}</p>
            </div>
            {property.createdBy && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Créé par</label>
                <p className="mt-1">{property.createdBy.name || property.createdBy.email}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

