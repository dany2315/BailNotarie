"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Plus, Home, FileText, MapPin, Ruler, Building2, User, Calendar, Euro, Eye } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/utils/formatters";
import { DemandesTabs } from "./demandes-tabs";
import { CompletionStatus, BailStatus, BailType, BailFamille, ProfilType } from "@prisma/client";
import { cn } from "@/lib/utils";
import { CreatePropertyDrawer } from "./create-property-drawer";
import { CreateBailDrawer } from "./create-bail-drawer";
import { BailDetailDrawer } from "./bail-detail-drawer";
import { PropertyDetailDrawer } from "./property-detail-drawer";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";

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

const statusLabels: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING_VALIDATION: "En validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
  PENDING_VALIDATION: "bg-orange-100 text-orange-800 border-orange-200",
  READY_FOR_NOTARY: "bg-blue-100 text-blue-800 border-blue-200",
  CLIENT_CONTACTED: "bg-purple-100 text-purple-800 border-purple-200",
  SIGNED: "bg-green-100 text-green-800 border-green-200",
  TERMINATED: "bg-gray-100 text-gray-800 border-gray-200",
};

const bailTypeLabels: Record<BailType, string> = {
  BAIL_NU_3_ANS: "Bail nue 3 ans",
  BAIL_NU_6_ANS: "Bail nue 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const bailFamilyLabels: Record<BailFamille, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
};

export function DemandesPageClient({ biens, locataires, ownerId }: DemandesPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    searchParams.get("selected") || (biens.length > 0 ? biens[0].id : null)
  );
  const [activeTab, setActiveTab] = useState("baux");
  const [isPropertyDrawerOpen, setIsPropertyDrawerOpen] = useState(false);
  const [isBailDrawerOpen, setIsBailDrawerOpen] = useState(false);
  const [isBailDetailDrawerOpen, setIsBailDetailDrawerOpen] = useState(false);
  const [selectedBailId, setSelectedBailId] = useState<string | null>(null);
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
    } else if (open === "bail-new" && !isBailDrawerOpen) {
      lastProcessedOpenParam.current = open;
      setIsBailDrawerOpen(true);
    } else if (open?.startsWith("bail-")) {
      const bailId = open.replace("bail-", "");
      if (selectedBailId !== bailId) {
        lastProcessedOpenParam.current = open;
        setSelectedBailId(bailId);
        setIsBailDetailDrawerOpen(true);
      }
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

  const handleBailCreated = useCallback((bail: any) => {
    // Rafraîchir les biens pour mettre à jour les baux
    router.refresh();
    setIsBailDrawerOpen(false);
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
    <div className="h-full flex flex-col">
      <div className="p-4 sm:p-6 border-b">
        <h1 className="text-2xl sm:text-3xl font-bold">Demandes</h1>
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
              <span className="text-xs font-medium text-center">Ajouter</span>
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
                    <button
                      onClick={(e) => handleViewProperty(e, bien.id)}
                      className="absolute top-2 right-2 p-1 rounded-full hover:bg-background transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    </button>
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
                      <Badge
                        variant={completionStatusVariants[completionStatus as CompletionStatus]}
                        className={cn("text-[10px] px-1.5 py-0", completionStatusColors[completionStatus as CompletionStatus])}
                      >
                        {completionStatusLabels[completionStatus as CompletionStatus]}
                      </Badge>
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
                          <Badge
                            variant={completionStatusVariants[completionStatus as CompletionStatus]}
                            className={cn("text-xs", completionStatusColors[completionStatus as CompletionStatus])}
                          >
                            {completionStatusLabels[completionStatus as CompletionStatus]}
                          </Badge>
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
                    <Card 
                      onClick={() => setIsBailDrawerOpen(true)}
                      className="border-2 border-dashed hover:border-primary hover:bg-primary/5 transition-all cursor-pointer group"
                    >
                      <CardContent className="flex flex-col items-center justify-center px-0">
                        <div className="flex flex-row items-center gap-10 text-center">
                          <div className="rounded-full bg-primary/10 p-3 group-hover:bg-primary/20 transition-colors">
                            <Plus className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base mb-1">Créer un bail pour ce bien</h3>
                            <p className="text-xs text-muted-foreground">
                              Créez un nouveau bail pour ce bien
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Liste des baux */}
                    {(selectedProperty.bails?.length || 0) > 0 ? (
                      <Accordion type="single" collapsible className="space-y-3">
                        {(selectedProperty.bails || []).map((bail) => {
                          // Trouver le locataire
                          const locataire = bail.parties?.find(
                            (p) => p.profilType === ProfilType.LOCATAIRE
                          );
                          const locataireName = locataire?.entreprise
                            ? locataire.entreprise.legalName || locataire.entreprise.name || "Entreprise"
                            : locataire?.persons?.[0]
                            ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim() || locataire.persons[0].email || "Non défini"
                            : "Non défini";

                          return (
                            <AccordionItem
                              key={bail.id}
                              value={bail.id}
                              className="border rounded-lg overflow-hidden shadow-md transition-all"
                            >
                              <AccordionTrigger
                                className="px-4 py-3 hover:no-underline  "
                                onClick={(e) => {
                                  // Empêcher l'ouverture du drawer quand on clique sur le trigger
                                  e.stopPropagation();
                                }}
                              >
                                <div className="flex items-center justify-between w-full pr-4">
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 min-w-0 space-y-1">
                                      {/* Locataire - toujours visible */}
                                      {locataire && (
                                        <div className="flex items-center gap-2">
                                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <p className="text-sm font-medium truncate">{locataireName}</p>
                                        </div>
                                      )}
                                      {/* Période - toujours visible */}
                                      {bail.effectiveDate && (
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-muted-foreground">
                                              Du {formatDate(bail.effectiveDate)}
                                            </p>
                                            {bail.endDate ? (
                                              <p className="text-xs text-muted-foreground">
                                                Au {formatDate(bail.endDate)}
                                              </p>
                                            ) : bail.bailType ? (
                                              <p className="text-xs text-muted-foreground">
                                                Au {formatDate(calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType))}
                                              </p>
                                            ) : null}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <Badge
                                    className={cn(
                                      "text-xs shrink-0",
                                      statusColors[bail.status] || "bg-gray-100 text-gray-800"
                                    )}
                                  >
                                    {statusLabels[bail.status] || bail.status}
                                  </Badge>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4">
                                <div className="space-y-3 pt-2 border-t">
                                  {/* Montant du loyer */}
                                  {bail.rentAmount && (
                                    <div className="flex items-center gap-2">
                                      <Euro className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground">Loyer mensuel</p>
                                        <p className="text-sm font-medium">
                                          {bail.rentAmount.toLocaleString()} € / mois
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Type et famille de bail */}
                                  {(bail.bailType || bail.bailFamily) && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground mb-1.5">Type de bail</p>
                                        <div className="flex flex-wrap gap-2">
                                          {bail.bailFamily && (
                                            <Badge variant="outline" className="text-xs">
                                              {bailFamilyLabels[bail.bailFamily as BailFamille] || bail.bailFamily}
                                            </Badge>
                                          )}
                                          {bail.bailType && (
                                            <Badge variant="outline" className="text-xs">
                                              {bailTypeLabels[bail.bailType as BailType] || bail.bailType}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Bouton pour voir les détails */}
                                  <div className="pt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenBailDetail(bail.id);
                                      }}
                                    >
                                      <FileText className="h-4 w-4 mr-2" />
                                      Voir les détails complets
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    ) : (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
                          <p className="text-muted-foreground mb-4">
                            Ce bien n'a pas encore de bail associé
                          </p>
                          <Button onClick={() => setIsBailDrawerOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Créer un bail
                          </Button>
                        </CardContent>
                      </Card>
                    )}
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

      {/* Drawers */}
      <CreatePropertyDrawer
        open={isPropertyDrawerOpen}
        onOpenChange={handlePropertyDrawerOpenChange}
        ownerId={ownerId}
        onPropertyCreated={handlePropertyCreated}
      />
      <CreateBailDrawer
        open={isBailDrawerOpen}
        onOpenChange={setIsBailDrawerOpen}
        biens={localBiens.map(b => ({ id: b.id, label: b.label, fullAddress: b.fullAddress || '' }))}
        locataires={locataires}
        ownerId={ownerId}
        initialPropertyId={selectedPropertyId || undefined}
        onBailCreated={handleBailCreated}
      />
      {selectedBailId && (
        <BailDetailDrawer
          open={isBailDetailDrawerOpen}
          onOpenChange={setIsBailDetailDrawerOpen}
          bailId={selectedBailId}
          onPropertyClick={(propertyId) => {
            setIsBailDetailDrawerOpen(false);
            setSelectedPropertyId(propertyId);
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

