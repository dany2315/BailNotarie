"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { FileText, Home, User, Calendar, Euro, RotateCcw, MessageSquare, Mail, ArrowUpDown, MoveUpRight } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProfilType, BailStatus, BailType, BailFamille } from "@prisma/client";
import { BailChatSheet } from "./bail-chat-sheet";
import { BailDocumentPreview } from "./bail-document-preview";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { Loader2 } from "lucide-react";

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

interface BailDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bailId: string;
  onPropertyClick?: (propertyId: string) => void;
}

export function BailDetailDrawer({
  open,
  onOpenChange,
  bailId,
  onPropertyClick,
}: BailDetailDrawerProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [bail, setBail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (open && bailId) {
      setLoading(true);
      // Utiliser une action serveur pour récupérer les données
      import("@/lib/actions/client-space").then(({ getClientBailDetails }) => {
        // Pour obtenir le clientId, on peut le passer en prop ou le récupérer depuis la session
        // Pour l'instant, on va créer une route API simple
        fetch(`/api/client/bails/${bailId}`)
          .then((res) => res.json())
          .then((data) => {
            setBail(data);
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      });
    }
  }, [open, bailId]);

  if (!bail && !loading) {
    return null;
  }

  const locataire = bail?.parties?.find((p: any) => p.profilType === ProfilType.LOCATAIRE);
  const locataireName = locataire?.entreprise 
    ? locataire.entreprise.legalName || locataire.entreprise.name
    : locataire?.persons?.[0] 
      ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim()
      : "Non défini";

  const locataireEmail = locataire?.entreprise 
    ? locataire.entreprise.email
    : locataire?.persons?.[0]?.email || null;

  const notaire = bail?.dossierAssignments?.[0]?.notaire;
  const calculatedEndDate = bail ? calculateBailEndDate(bail.effectiveDate, bail.bailType) : null;
  const totalMonthly = bail ? bail.rentAmount + bail.monthlyCharges : 0;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerContent className={isMobile ? "max-h-[95vh]" : "sm:max-w-2xl h-full"}>
        <DrawerHeader>
          <div className="space-y-3">
            <div className="min-w-0">
              <DrawerTitle className="text-xl">Détail du bail</DrawerTitle>
              {bail && (
                <>
                  {bail.property && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <p className="text-sm text-muted-foreground flex items-center gap-2 min-w-0">
                        <Home className="h-4 w-4 shrink-0" />
                        <span className="truncate">{bail.property.label || bail.property.fullAddress}</span>
                      </p>
                      {onPropertyClick && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => onPropertyClick(bail.property.id)}
                          title="Voir le bien"
                        >
                          <MoveUpRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <Badge className={statusColors[bail.status as BailStatus]} variant="outline">
                      {statusLabels[bail.status as BailStatus]}
                    </Badge>
                  </div>
                </>
              )}
            </div>

            {bail && (
              <ButtonGroup className="w-full justify-end gap-2 sm:w-auto">
                {bail.status === BailStatus.TERMINATED && (
                  <Link href={`/client/proprietaire/baux/${bailId}/renouveler`}>
                    <Button variant="default" size="sm">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Renouveler
                    </Button>
                  </Link>
                )}
                {notaire && (
                  <BailChatSheet
                    bailId={bailId}
                    trigger={
                      <Button variant="outline" size="sm" className="w-full">
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Discuter avec le notaire
                      </Button>
                    }
                  />
                )}
              </ButtonGroup>
            )}
          </div>
        </DrawerHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : bail ? (
            <div className="space-y-4">
              {/* Informations du bail */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4" />
                    Informations du bail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Catégorie de bail</p>
                      <p className="text-sm font-medium">{bailFamilyLabels[bail.bailFamily as BailFamille]}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Type de bail</p>
                      <p className="text-sm font-medium">{bailTypeLabels[bail.bailType as BailType]}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date de début</p>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {formatDate(bail.effectiveDate)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Date de fin</p>
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {calculatedEndDate ? formatDate(calculatedEndDate) : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                      <p className="text-base font-bold">{formatCurrency(bail.rentAmount)}</p>
                    </div>
                    {bail.monthlyCharges > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Charges mensuelles</p>
                        <p className="text-base font-bold">{formatCurrency(bail.monthlyCharges)}</p>
                      </div>
                    )}
                    {bail.securityDeposit > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Dépôt de garantie</p>
                        <p className="text-base font-bold">{formatCurrency(bail.securityDeposit)}</p>
                      </div>
                    )}
                    {bail.monthlyCharges > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total mensuel</p>
                        <p className="text-base font-bold text-primary">{formatCurrency(totalMonthly)}</p>
                      </div>
                    )}
                  </div>
                  {bail.paymentDay && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground">
                        Paiement le <span className="font-medium text-foreground">{bail.paymentDay}</span> de chaque mois
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Locataire */}
              {locataire && (
                <>
                  <div className="flex items-center justify-center relative">
                    <span className="flex items-center gap-2 rounded-full self-center p-2 border border-primary w-fit bg-background z-10">
                      <ArrowUpDown className="h-3 w-3 text-primary" />
                    </span>
                    <Separator className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-primary" />
                  </div>
                  <Card className="gap-0 py-4">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-center gap-2 text-base">
                        <User className="h-4 w-4" />
                        Locataire
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="flex flex-col items-center justify-center">
                        <p className="font-semibold text-sm">{locataireName}</p>
                        {locataireEmail && (
                          <div className="flex flex-row items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <a href={`mailto:${locataireEmail}`} className="hover:underline">
                              {locataireEmail}
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Documents */}
              {bail.documents && bail.documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FileText className="h-4 w-4" />
                      Pièces liées au bail
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bail.documents.length} pièce{bail.documents.length > 1 ? "s" : ""}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {bail.documents.map((doc: any) => (
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
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

