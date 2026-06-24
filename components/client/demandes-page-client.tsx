"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Home, FileText, Building2, Eye, Loader2, CheckCircle2, Lock } from "lucide-react";
import Link from "next/link";
import { DemandesTabs } from "./demandes-tabs";
import { CompletionStatus, BailType, ProfilType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BailDetailDrawer } from "./bail-detail-drawer";
import { PropertyDetailDrawer } from "./property-detail-drawer";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { CreatePropertyForm, CreatePropertyFormRef } from "./create-property-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { OwnerBailCard } from "./owner-bail-card";
import { OwnerProgressCard } from "./owner-progress-card";

type PropertyWithBails = {
  id: string;
  label: string | null;
  fullAddress: string | null;
  status: string;
  completionStatus: CompletionStatus | string;
  surfaceM2: number | null;
  type?: string | null;
  createdAt: string;
  updatedAt: string;
  bails: Array<{
    id: string;
    status: string;
    effectiveDate: string | null;
    endDate: string | null;
    rentAmount?: number | null;
    bailType?: string | null;
    bailFamily?: string | null;
    paidAt?: string | null;
    parties?: Array<{
      id: string;
      profilType: string;
      persons?: Array<{
        firstName: string | null;
        lastName: string | null;
        email: string | null;
      }>;
      entreprise?: {
        legalName: string | null;
        name: string | null;
      } | null;
    }>;
    dossierAssignments?: Array<{
      id: string;
      notaire: {
        id: string;
        name: string | null;
        email: string | null;
      } | null;
    }>;
    intakes?: Array<{
      id: string;
      token: string;
      status: string;
    }>;
  }>;
};

interface DemandesPageClientProps {
  biens: PropertyWithBails[];
  locataires: Array<{
    id: string;
    persons: Array<{
      firstName: string | null;
      lastName: string | null;
      email: string | null;
    }>;
    entreprise: {
      legalName: string;
      name: string;
      email: string | null;
    } | null;
  }>;
  ownerId: string;
}

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

const bailTypeLabels: Record<BailType, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const TERMINAL_STATUSES = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"];

function canCreateNewBail(bails: PropertyWithBails["bails"]): boolean {
  const activeBails = bails.filter((b) => !TERMINAL_STATUSES.includes(b.status));
  if (activeBails.length === 0) return true;

  return activeBails.every((b) => {
    const endDate = b.endDate
      ? new Date(b.endDate)
      : b.effectiveDate && b.bailType
      ? calculateBailEndDate(new Date(b.effectiveDate), b.bailType as BailType)
      : null;
    if (!endDate) return false;
    const oneMonthBefore = new Date(endDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    return new Date() >= oneMonthBefore;
  });
}

export function DemandesPageClient({ biens, locataires, ownerId }: DemandesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    searchParams.get("selected") || (biens.length > 0 ? biens[0].id : null)
  );
  const [activeTab, setActiveTab] = useState("baux");
  const [isPropertyDrawerOpen, setIsPropertyDrawerOpen] = useState(false);
  const [isPropertyFormLoading, setIsPropertyFormLoading] = useState(false);
  const [isPropertyFormUploading, setIsPropertyFormUploading] = useState(false);
  const propertyFormRef = useRef<CreatePropertyFormRef>(null);
  const [isBailDetailDrawerOpen, setIsBailDetailDrawerOpen] = useState(false);
  const [selectedBailId, setSelectedBailId] = useState<string | null>(null);
  /** Quand défini, le chat du drawer bail s'ouvre à l'affichage (lien "Répondre" depuis le dashboard) */
  const [openChatWithBailId, setOpenChatWithBailId] = useState<string | null>(null);
  const [isPropertyDetailDrawerOpen, setIsPropertyDetailDrawerOpen] = useState(false);
  const [selectedPropertyDetailId, setSelectedPropertyDetailId] = useState<string | null>(null);
  const [localBiens, setLocalBiens] = useState(biens);
  const lastSyncedPropertyId = useRef<string | null>(null);
  const lastProcessedOpenParam = useRef<string | null>(null);
  const isManuallyOpeningDrawer = useRef(false);

  const selectedProperty = localBiens.find((b) => b.id === selectedPropertyId);

  useEffect(() => {
    // Éviter la boucle infinie en vérifiant si on a déjà synchronisé cette valeur
    if (selectedPropertyId && lastSyncedPropertyId.current !== selectedPropertyId) {
      const currentSelected = searchParams.get("selected");
      // Ne mettre à jour que si la valeur dans l'URL est différente
      if (currentSelected !== selectedPropertyId) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("selected", selectedPropertyId);
        lastSyncedPropertyId.current = selectedPropertyId;
        router.replace(`?${params.toString()}`, { scroll: false });
      } else {
        // Même si l'URL est déjà à jour, on marque comme synchronisé
        lastSyncedPropertyId.current = selectedPropertyId;
      }
    }
    // Ne pas inclure searchParams dans les dépendances pour éviter la boucle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, router]);

  // Gérer les query params pour ouvrir les drawers
  useEffect(() => {
    // Ignorer si on ouvre manuellement le drawer
    if (isManuallyOpeningDrawer.current) {
      isManuallyOpeningDrawer.current = false;
      return;
    }

    const open = searchParams.get("open");
    
    // Éviter de traiter le même paramètre plusieurs fois
    if (open === lastProcessedOpenParam.current) {
      return;
    }
    
    if (open === "bien-new" && !isPropertyDrawerOpen) {
      lastProcessedOpenParam.current = open;
      setIsPropertyDrawerOpen(true);
    } else if (open === "bail-new") {
      router.push("/client/proprietaire/baux/new");
    } else if (open?.startsWith("bail-")) {
      const bailId = open.replace("bail-", "");
      const wantChat = searchParams.get("chat") === "1";
      if (selectedBailId !== bailId) {
        lastProcessedOpenParam.current = open;
        setSelectedBailId(bailId);
        setOpenChatWithBailId(wantChat ? bailId : null);
        setIsBailDetailDrawerOpen(true);
      }
    } else if (open?.startsWith("bien-")) {
      const propertyId = open.replace("bien-", "");
      lastProcessedOpenParam.current = open;
      setSelectedPropertyId(propertyId);
      setSelectedPropertyDetailId(propertyId);
      setIsPropertyDetailDrawerOpen(true);
    } else if (!open) {
      // Si le paramètre "open" n'existe plus, réinitialiser la ref
      lastProcessedOpenParam.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handlePropertyCreated = useCallback((property: any) => {
    setLocalBiens((prev) => [...prev, { ...property, bails: property.bails || [] }]);
    setSelectedPropertyId(property.id);
    // Ne pas fermer le drawer ici, il sera fermé par le drawer lui-même
    // Réinitialiser la ref pour permettre de rouvrir le drawer si nécessaire
    lastProcessedOpenParam.current = null;
    // Nettoyer les query params
    router.replace("/client/proprietaire/demandes", { scroll: false });
  }, [router]);

  const handlePropertyDrawerOpenChange = useCallback((open: boolean) => {
    setIsPropertyDrawerOpen(open);
    if (!open) {
      // Réinitialiser les refs quand le drawer se ferme
      lastProcessedOpenParam.current = null;
      isManuallyOpeningDrawer.current = false;
    }
  }, []);

  const handleOpenBailDetail = (bailId: string) => {
    setSelectedBailId(bailId);
    setIsBailDetailDrawerOpen(true);
  };

  const handlePropertySelect = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setActiveTab("baux"); // Reset to baux tab when selecting a new property
  };

  const handleViewProperty = (e: React.MouseEvent, propertyId: string) => {
    e.stopPropagation();
    setSelectedPropertyDetailId(propertyId);
    setIsPropertyDetailDrawerOpen(true);
  };

  const tabs = [
    {
      id: "baux",
      label: "Baux",
      count: selectedProperty?.bails?.length || 0,
      icon: <FileText className="h-4 w-4" />,
    },
  ];

  return (
    <div className="h-full flex flex-col lg:max-w-5xl lg:mx-auto lg:w-full">
      <div className="p-4 sm:p-6 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold">Mes dossiers</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Gérez vos biens et leurs baux
        </p>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Mobile: Scroll horizontal des biens comme tabs */}
        <div className="md:hidden border-b bg-background">
          <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
            {/* Bouton ajouter bien */}
            <button
              onClick={() => {
                isManuallyOpeningDrawer.current = true;
                setIsPropertyDrawerOpen(true);
              }}
              className="shrink-0 flex flex-col items-center justify-center gap-2 px-4 py-3 min-w-[120px] border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-all"
            >
              <div className="rounded-full bg-primary/10 p-2">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-center">Ajouter un <br /> bien</span>
            </button>

            {/* Liste des biens en scroll horizontal */}
            {localBiens.map((bien) => {
              const isSelected = selectedPropertyId === bien.id;
              const completionStatus = bien.completionStatus;
              
              return (
                <div
                  key={bien.id}
                  className="shrink-0 flex flex-col gap-2"
                >
                  <button
                    onClick={() => handlePropertySelect(bien.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 px-4 py-3 min-w-[140px] border rounded-lg transition-all relative",
                      isSelected 
                        ? "border-primary bg-primary/10 shadow-md" 
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleViewProperty(e, bien.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setSelectedPropertyDetailId(bien.id); setIsPropertyDetailDrawerOpen(true); } }}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-background transition-colors cursor-pointer"
                      title="Voir les détails"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </div>
                    <div className={cn(
                      "rounded-full p-2",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    )}>
                      <Home className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-center gap-1 w-full">
                      <span className={cn(
                        "text-xs font-semibold truncate w-full text-center",
                        isSelected && "text-primary"
                      )}>
                        {bien.label || (bien.fullAddress ? bien.fullAddress.split(',')[0] : 'Sans adresse')}
                      </span>

                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {(bien.bails?.length || 0)} bail{(bien.bails?.length || 0) > 1 ? "x" : ""}
                      </Badge>
                    </div>
                  </button>
                </div>
              );
            })}

            {localBiens.length === 0 && (
              <div className="flex items-center justify-center min-w-full py-8 text-center">
                <div>
                  <Home className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Aucun bien</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Colonne gauche Desktop : Liste des biens */}
        <div className="hidden md:block w-full md:w-80 lg:w-96 border-r overflow-y-auto bg-muted/30">
          <div className="p-4 space-y-3">
            {/* Carte d'ajout de bien */}
            <Card 
              onClick={() => {
                isManuallyOpeningDrawer.current = true;
                setIsPropertyDrawerOpen(true);
              }}
              className="border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
            >
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1">Ajouter un bien</h3>
                    <p className="text-xs text-muted-foreground">
                      Créez un nouveau bien immobilier
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des biens */}
            {localBiens.map((bien) => {
              const isSelected = selectedPropertyId === bien.id;
              const completionStatus = bien.completionStatus;
              
              return (
                <Card
                  key={bien.id}
                  onClick={() => handlePropertySelect(bien.id)}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md relative",
                    isSelected && "ring-2 ring-primary shadow-md"
                  )}
                >
                  <CardContent className="p-4">
                    <button
                      onClick={(e) => handleViewProperty(e, bien.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                    <div className="flex items-start gap-3 pr-8">
                      <div className={cn(
                        "rounded-full p-2 shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      )}>
                        <Home className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={cn(
                          "font-semibold truncate mb-1",
                          isSelected && "text-primary"
                        )}>
                          {bien.label || bien.fullAddress || 'Sans adresse'}
                        </h3>
                        {bien.fullAddress && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                            {bien.fullAddress}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                        
                          <Badge variant="secondary" className="text-xs">
                            {(bien.bails?.length || 0)} bail{(bien.bails?.length || 0) > 1 ? "x" : ""}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {localBiens.length === 0 && (
              <Card>
                <CardContent className="py-8 text-center">
                  <Home className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-1">Aucun bien</h3>
                  <p className="text-sm text-muted-foreground">
                    Commencez par ajouter votre premier bien immobilier
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Colonne droite : Contenu avec baux */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProperty ? (
            <>
              {/* Tabs Navigation Desktop seulement */}
              <div className="hidden md:block border-b bg-background">
                <DemandesTabs
                  tabs={tabs}
                  activeTab="baux"
                  onTabChange={() => {}}
                />
              </div>

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6">
                <div className="space-y-4">
                    {(() => {
                      const allowed = canCreateNewBail(selectedProperty.bails || []);
                      const draftBail = (selectedProperty.bails || []).find(
                        (b) => b.status === "DRAFT" && !b.paidAt
                      );
                      const intakeLink = draftBail?.intakes?.[0];

                      if (draftBail) {
                        const locataire = draftBail.parties?.find((p) => p.profilType === ProfilType.LOCATAIRE);
                        const locataireName = locataire?.entreprise
                          ? locataire.entreprise.legalName || locataire.entreprise.name
                          : locataire?.persons?.[0]
                          ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim() || locataire.persons[0].email
                          : null;
                        const href = intakeLink
                          ? `/intakes/${intakeLink.token}`
                          : `/client/proprietaire/baux/new?draftId=${draftBail.id}`;

                        return (
                          <OwnerProgressCard
                            propertyLabel={
                              selectedProperty.label ||
                              selectedProperty.fullAddress ||
                              "Bien sélectionné"
                            }
                            tenantName={locataireName}
                            bailTypeLabel={
                              draftBail.bailType
                                ? bailTypeLabels[draftBail.bailType as BailType] ||
                                  draftBail.bailType
                                : null
                            }
                            message="Ce dossier n'est pas encore finalisé. Reprenez là où vous en étiez."
                            continueHref={href}
                          />
                        );
                      }

                      if (!allowed) {
                        return (
                          <Card className="border-2 border-dashed border-muted-foreground/20 opacity-60">
                            <CardContent className="flex flex-col items-center justify-center px-0">
                              <div className="flex flex-row items-center gap-10 text-center">
                                <div className="rounded-full bg-muted p-3">
                                  <Lock className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-base mb-1 text-muted-foreground">Un bail est déjà actif sur ce bien</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Nouveau bail possible 1 mois avant la fin du bail en cours.
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }

                      return (
                        <Card
                          onClick={() => router.push(`/client/proprietaire/baux/new${selectedPropertyId ? `?propertyId=${selectedPropertyId}` : ""}`)}
                          className="border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                        >
                          <CardContent className="flex flex-col items-center justify-center px-0">
                            <div className="flex flex-row items-center gap-10 text-center">
                              <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                                <Plus className="h-6 w-6 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-base mb-1">Démarrer un dossier pour</h3>
                                <p className="text-sm text-muted-foreground">
                                  {selectedProperty?.label || selectedProperty?.fullAddress || "Bien sélectionné"}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Liste des baux (exclure les DRAFT non payés, déjà affichés au-dessus) */}
                    {(selectedProperty.bails?.filter((b) => !(b.status === "DRAFT" && !b.paidAt))?.length || 0) > 0 ? (
                      <div className="space-y-3">
                        {(selectedProperty.bails || [])
                          .filter((b) => !(b.status === "DRAFT" && !b.paidAt))
                          .map((bail) => (
                            <OwnerBailCard
                              key={bail.id}
                              bail={{ ...bail, property: selectedProperty }}
                              context="dossiers"
                              onViewDetail={() => handleOpenBailDetail(bail.id)}
                            />
                          ))}
                      </div>
                    ) : !(selectedProperty.bails || []).some((b) => b.status === "DRAFT" && !b.paidAt) ? (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
                          <p className="text-muted-foreground mb-4">
                            Ce bien n'a pas encore de bail associé
                          </p>
                        </CardContent>
                      </Card>
                    ) : null}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <Home className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">Sélectionnez un bien</h3>
                <p className="text-muted-foreground">
                  Choisissez un bien dans la liste pour voir ses baux et informations
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialog : créer un bien */}
      <Dialog open={isPropertyDrawerOpen} onOpenChange={(open) => { if (!isPropertyFormLoading && !isPropertyFormUploading) handlePropertyDrawerOpenChange(open); }}>
        <DialogContent className="max-h-[90vh] flex flex-col gap-0 p-0 sm:max-w-lg overflow-hidden" showCloseButton={!isPropertyFormLoading && !isPropertyFormUploading}>
          {(isPropertyFormLoading || isPropertyFormUploading) && (
            <div className="absolute inset-0 z-10 bg-background/90 flex flex-col items-center justify-center gap-3 rounded-lg">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium text-muted-foreground">
                {isPropertyFormUploading ? "Upload des fichiers en cours..." : "Création du bien en cours..."}
              </p>
            </div>
          )}
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Créer un nouveau bien
            </DialogTitle>
            <DialogDescription>
              Remplissez les informations du bien immobilier
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
            <CreatePropertyForm
              ref={propertyFormRef}
              ownerId={ownerId}
              onPropertyCreated={handlePropertyCreated}
              hideActions={true}
              onLoadingChange={setIsPropertyFormLoading}
              onUploadingChange={setIsPropertyFormUploading}
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t shrink-0 flex-col sm:flex-col gap-2">
            <Button
              onClick={() => propertyFormRef.current?.submit()}
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              className="w-full"
            >
              {isPropertyFormUploading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Upload en cours...</>
              ) : isPropertyFormLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
              ) : (
                <><CheckCircle2 className="mr-2 h-4 w-4" />Créer le bien</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => handlePropertyDrawerOpenChange(false)}
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              className="w-full"
            >
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedBailId && (
        <BailDetailDrawer
          open={isBailDetailDrawerOpen}
          onOpenChange={(open) => {
            if (!open) setOpenChatWithBailId(null);
            setIsBailDetailDrawerOpen(open);
          }}
          bailId={selectedBailId}
          defaultOpenChat={openChatWithBailId === selectedBailId}
          onPropertyClick={(propertyId) => {
            setIsBailDetailDrawerOpen(false);
            setSelectedPropertyId(propertyId);
            setSelectedPropertyDetailId(propertyId);
            setIsPropertyDetailDrawerOpen(true);
          }}
        />
      )}
      {selectedPropertyDetailId && (
        <PropertyDetailDrawer
          open={isPropertyDetailDrawerOpen}
          onOpenChange={setIsPropertyDetailDrawerOpen}
          propertyId={selectedPropertyDetailId}
        />
      )}
    </div>
  );
}

