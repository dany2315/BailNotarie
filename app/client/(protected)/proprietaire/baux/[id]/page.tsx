import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FileText, Home, User, Calendar, Euro, RotateCcw, MessageSquare, Download, MapPin, Building2, Ruler, Mail, ArrowUpDown, MoveUpRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, formatDateTime } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProfilType, BailStatus, BailType, BailFamille } from "@prisma/client";
import { BailChatSheet } from "@/components/client/bail-chat-sheet";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { BackButton } from "@/components/client/back-button";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const statusLabels: Record<BailStatus, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En cours de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
};

const statusColors: Record<BailStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200 text-xs",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800 border-orange-200 text-xs",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800 border-blue-200 text-xs",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800 border-purple-200 text-xs",
  SIGNED: "bg-green-100 text-green-800 border-green-200 text-xs",
  TERMINATED: "bg-gray-100 text-gray-800 border-gray-200 text-xs",
};

const bailTypeLabels: Record<BailType, string> = {
  BAIL_NU_3_ANS: "Bail nue 3 ans",
  BAIL_NU_6_ANS: "Bail nue 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const bailFamilyLabels: Record<BailFamille, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial"
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

  const locataireEmail = locataire?.entreprise 
    ? locataire.entreprise.email
    : locataire?.persons?.[0]?.email || null;

  const notaire = bail.dossierAssignments[0]?.notaire;
  const calculatedEndDate = calculateBailEndDate(bail.effectiveDate, bail.bailType);
  const totalMonthly = bail.rentAmount + bail.monthlyCharges;

  return (
    <div className="min-h-screen bg-linear-to-b from-background to-muted/20 w-full overflow-x-hidden">
      <div className="container mx-auto p-6 space-y-6 max-w-7xl w-full">
        {/* Header avec actions */}
        <div className="flex flex-col gap-6">
          {/* Navigation et titre */}
          <div className="flex flex-col md:flex-row items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">Détail du bail</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                <Home className="h-4 w-4" />
                {bail.property.label || bail.property.fullAddress}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={statusColors[bail.status]} variant="outline">
                  {statusLabels[bail.status]}
                </Badge>
              </div>
            </div>

            {/* Actions groupées */}
            <ButtonGroup className="shrink-0 self-end ">
              {bail.status === BailStatus.TERMINATED && (
                <Link href={`/client/proprietaire/baux/${bailId}/renouveler`}>
                  <Button variant="default">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Renouveler
                  </Button>
                </Link>
              )}
              {notaire && (
                <BailChatSheet 
                  bailId={bailId} 
                  trigger={
                    <Button variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Discuter avec le notaire
                    </Button>
                  }
                />
              )}
            </ButtonGroup>
          </div>

          {/* Bouton retour en dessous du titre */}
          <BackButton />
        </div>

        {/* Contenu principal */}
        <div className="grid gap-6 lg:grid-cols-3 w-full max-w-full overflow-hidden">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6 gap-6 w-full max-w-full min-w-0 overflow-hidden">           

            {/* Informations du bail */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Informations du bail
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Catégorie de bail</p>
                    <p className="font-medium">{bailFamilyLabels[bail.bailFamily]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Type de bail</p>
                    <p className="font-medium">{bailTypeLabels[bail.bailType]}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date de début</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(bail.effectiveDate)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date de fin</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {formatDate(calculatedEndDate)}
                    </p>
                  </div>
                  
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Loyer mensuel</p>
                      <p className="text-lg font-bold">{formatCurrency(bail.rentAmount)}</p>
                    </div>
                    {bail.monthlyCharges > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Charges mensuelles</p>
                        <p className="text-lg font-bold">{formatCurrency(bail.monthlyCharges)}</p>
                      </div>
                    )}
                    {bail.securityDeposit > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Dépôt de garantie</p>
                        <p className="text-lg font-bold">{formatCurrency(bail.securityDeposit)}</p>
                      </div>
                    )}
                    {bail.monthlyCharges > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total mensuel</p>
                        <p className="text-lg font-bold text-primary">{formatCurrency(totalMonthly)}</p>
                      </div>
                    )}                
                </div>
                {bail.paymentDay && (
                  <div className="mt-4 pt-4 pb-4 border-t border-b ">
                    <p className="text-sm text-muted-foreground">
                      Paiement le <span className="font-medium text-foreground">{bail.paymentDay}</span> de chaque mois
                    </p>
                  </div>
                )}

              </CardContent>
            </Card>
            <div className="flex items-center justify-center relative">
              <span className="flex items-center gap-2  rounded-full self-center p-2 border border-primary w-fit bg-background z-10">
                    <ArrowUpDown className="h-4 w-4 text-primary" />
              </span>
              <Separator className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-primary" />
            </div>
            {/* Locataire */}
            {locataire && (
              <Card className="">
                <CardHeader >
                  <CardTitle className="flex items-center justify-center gap-2">
                    <User className="h-5 w-5" />
                    Locataire
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 justify-center">
                  <div className="flex flex-col items-center justify-center">
                    <p className="font-semibold text-sm">{locataireName}</p>
                    {locataireEmail && (
                      <div className="flex flex-row items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${locataireEmail}`} className="hover:underline">
                          {locataireEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informations du bien */}
            <Link href={`/client/proprietaire/biens/${bail.property.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Informations du bien lié
                    </div>
                    <MoveUpRight className="h-4 w-4 text-2xl" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Adresse</p>
                      <p className="font-medium flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        {bail.property.fullAddress}
                      </p>
                    </div>
                    {bail.property.label && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Label</p>
                        <p className="font-medium">{bail.property.label}</p>
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2 pt-2 border-t">
                      {bail.property.surfaceM2 && (
                        <div className="flex items-center gap-2">
                          <Ruler className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Surface</p>
                            <p className="font-medium">{bail.property.surfaceM2.toString()} m²</p>
                          </div>
                        </div>
                      )}
                      {bail.property.type && (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Type</p>
                            <p className="font-medium">{bail.property.type}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Documents */}
            {bail.documents.length > 0 && (
              <Card id="documents" className="mt-6 w-full max-w-full overflow-hidden">
                <CardHeader className="w-full max-w-full">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                  </CardTitle>
                  <CardDescription>{bail.documents.length} document{bail.documents.length > 1 ? "s" : ""}</CardDescription>
                </CardHeader>
                <CardContent className="w-full max-w-full overflow-hidden p-6">
                  <div className="space-y-2 w-full max-w-full">
                    {bail.documents.map((doc) => (
                      <BailDocumentPreview
                        key={doc.id}
                        document={{
                          id: doc.id,
                          label: doc.label,
                          kind: doc.kind,
                          fileKey: doc.fileKey,
                          mimeType: doc.mimeType,
                          createdAt: doc.createdAt,
                        }}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">            

            {/* Informations de création */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Notaire assigné</span>
                  <span className="font-medium">{notaire?.name || notaire?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Créé le</span>
                  <span className="font-medium">{formatDate(bail.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Modifié le</span>
                  <span className="font-medium">{formatDate(bail.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
