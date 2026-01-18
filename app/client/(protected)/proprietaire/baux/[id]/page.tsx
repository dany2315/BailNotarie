import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, Home, User, Calendar, Euro, RotateCcw } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProfilType, BailStatus } from "@prisma/client";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En attente de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
};

const statusColors: Record<BailStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800",
  SIGNED: "bg-green-100 text-green-800",
  TERMINATED: "bg-gray-100 text-gray-800",
};

export default async function ProprietaireBailDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, client } = await requireProprietaireAuth();
  const resolvedParams = await params;
  const bailId = resolvedParams.id;

  // Vérifier que le client peut accéder à ce bail
  const hasAccess = await canAccessBail(user.id, bailId);
  if (!hasAccess) {
    notFound();
  }

  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: {
        include: {
          owner: {
            include: {
              persons: { where: { isPrimary: true }, take: 1 },
              entreprise: true,
            },
          },
        },
      },
      parties: {
        include: {
          persons: { where: { isPrimary: true }, take: 1 },
          entreprise: true,
        },
      },
      dossierAssignments: {
        include: {
          notaire: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 1,
      },
      documents: {
        where: {
          // Afficher uniquement les documents liés au client connecté
          // ou les documents sans client spécifique (documents généraux du bail)
          OR: [
            { clientId: client.id },
            { clientId: null },
          ],
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!bail) {
    notFound();
  }

  const locataire = bail.parties.find(p => p.profilType === ProfilType.LOCATAIRE);
  const locataireName = locataire?.entreprise 
    ? locataire.entreprise.legalName || locataire.entreprise.name
    : locataire?.persons?.[0] 
      ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
      : "Non défini";

  const notaire = bail.dossierAssignments[0]?.notaire;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/client/proprietaire/baux">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Détail du bail</h1>
            <p className="text-muted-foreground">{bail.property.label || bail.property.fullAddress}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {bail.status === BailStatus.TERMINATED && (
            <Link href={`/client/proprietaire/baux/${bailId}/renouveler`}>
              <Button>
                <RotateCcw className="mr-2 h-4 w-4" />
                Renouveler le bail
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informations du bail */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du bail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge className={statusColors[bail.status]}>
                {statusLabels[bail.status]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Type de bail</span>
              <span className="text-sm font-medium">{bail.bailType}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Loyer mensuel</span>
              <span className="text-sm font-medium">{formatCurrency(bail.rentAmount)}</span>
            </div>
            {bail.monthlyCharges > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Charges mensuelles</span>
                <span className="text-sm font-medium">{formatCurrency(bail.monthlyCharges)}</span>
              </div>
            )}
            {bail.securityDeposit > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dépôt de garantie</span>
                <span className="text-sm font-medium">{formatCurrency(bail.securityDeposit)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Date de début</span>
              <span className="text-sm font-medium">{formatDate(bail.effectiveDate)}</span>
            </div>
            {bail.endDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date de fin</span>
                <span className="text-sm font-medium">{formatDate(bail.endDate)}</span>
              </div>
            )}
            {bail.paymentDay && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Jour de paiement</span>
                <span className="text-sm font-medium">Le {bail.paymentDay} de chaque mois</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Informations du bien */}
        <Card>
          <CardHeader>
            <CardTitle>Informations du bien</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="text-sm text-muted-foreground">Adresse</span>
              <p className="text-sm font-medium mt-1">{bail.property.fullAddress}</p>
            </div>
            {bail.property.label && (
              <div>
                <span className="text-sm text-muted-foreground">Label</span>
                <p className="text-sm font-medium mt-1">{bail.property.label}</p>
              </div>
            )}
            {bail.property.surfaceM2 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Surface</span>
                <span className="text-sm font-medium">{bail.property.surfaceM2.toString()} m²</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Statut</span>
              <Badge variant={bail.property.status === "LOUER" ? "default" : "secondary"}>
                {bail.property.status === "LOUER" ? "Loué" : "Non loué"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Informations du locataire */}
        {locataire && (
          <Card>
            <CardHeader>
              <CardTitle>Locataire</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{locataireName}</p>
            </CardContent>
          </Card>
        )}

        {/* Notaire assigné */}
        {notaire && (
          <Card>
            <CardHeader>
              <CardTitle>Notaire assigné</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{notaire.name || notaire.email}</p>
              {notaire.email && (
                <p className="text-xs text-muted-foreground mt-1">{notaire.email}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chat avec le notaire */}
      {notaire && (
        <div className="flex justify-end">
          <BailChatSheet bailId={bailId} />
        </div>
      )}

      {/* Documents */}
      {bail.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documents</CardTitle>
            <CardDescription>{bail.documents.length} document{bail.documents.length > 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bail.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doc.label || doc.kind}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(doc.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

