"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Home, FileText, Building2, User, Calendar, Euro, Eye, Loader2, CheckCircle2, MessageSquare, MoreHorizontal, ExternalLink, ArrowRight, Clock, Scale, Store } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import { DemandesTabs } from "./demandes-tabs";
import { CompletionStatus, BailType, BailFamille, ProfilType } from "@prisma/client";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BailChatSheet } from "./bail-chat-sheet";

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
    dossierAssignments?: Array<{
      id: string;
      notaire: {
        id: string;
        name: string | null;
        email: string | null;
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

const bailTypeLabels: Record<BailType, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const bailFamilyLabels: Record<BailFamille, string> = {
  HABITATION: "Bail d'habitation",
  COMMERCIAL: "Bail commercial",
};

const BAIL_STEPS = [
  { key: "verification", shortLabel: "Vérification" },
  { key: "notaire", shortLabel: "Notaire" },
  { key: "signe", shortLabel: "Signé" },
];

const BAIL_STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  AWAITING_TENANT: 0,
  AWAITING_TENANT_FORM: 0,
  PENDING_VALIDATION: 0,
  READY_FOR_NOTARY: 1,
  CLIENT_CONTACTED: 1,
  SIGNED: 2,
  TERMINATED: 2,
};

const BAIL_STATUS_CONFIG: Record<string, { badgeBg: string; label: string; icon: React.ElementType }> = {
  DRAFT: { badgeBg: "bg-blue-50 text-blue-700 border-blue-200", label: "En vérification", icon: Clock },
  AWAITING_TENANT: { badgeBg: "bg-orange-50 text-orange-700 border-orange-200", label: "Locataire manquant", icon: User },
  AWAITING_TENANT_FORM: { badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200", label: "Formulaire locataire en attente", icon: Clock },
  PENDING_VALIDATION: { badgeBg: "bg-blue-50 text-blue-700 border-blue-200", label: "En vérification", icon: Clock },
  READY_FOR_NOTARY: { badgeBg: "bg-violet-50 text-violet-700 border-violet-200", label: "Chez le notaire", icon: Scale },
  CLIENT_CONTACTED: { badgeBg: "bg-violet-50 text-violet-700 border-violet-200", label: "Chez le notaire", icon: Scale },
  SIGNED: { badgeBg: "bg-green-50 text-green-700 border-green-200", label: "Signé", icon: CheckCircle2 },
  TERMINATED: { badgeBg: "bg-gray-100 text-gray-500 border-gray-200", label: "Terminé", icon: FileText },
};

function BailStatusTimeline({ status }: { status: string }) {
  const stepIdx = BAIL_STEP_INDEX[status] ?? 0;
  const isTerminated = ["TERMINATED"].includes(status);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <div className="absolute inset-x-0 top-[5px] h-px bg-border" />
        <div className="flex justify-between">
          {BAIL_STEPS.map((step, i) => {
            const done = isTerminated || stepIdx > i;
            const active = !isTerminated && stepIdx === i;
            return (
              <div
                key={step.key}
                className={cn(
                  "relative z-10 w-2.5 h-2.5 rounded-full transition-all",
                  done ? "bg-primary" : active ? "bg-primary ring-[3px] ring-primary/20" : "bg-border"
                )}
              />
            );
          })}
        </div>
      </div>
      <div className="relative flex justify-between">
        {BAIL_STEPS.map((step, i) => {
          const done = isTerminated || stepIdx > i;
          const active = !isTerminated && stepIdx === i;
          const colorCn = active
            ? "font-semibold text-primary"
            : done
            ? "text-primary/50"
            : "text-muted-foreground/50";
          if (i === 1) {
            return (
              <p key={step.key} className={cn("absolute left-1/2 -translate-x-1/2 text-[9px] text-center", colorCn)}>
                {step.shortLabel}
              </p>
            );
          }
          return (
            <p key={step.key} className={cn("text-[9px]", i === 0 ? "text-left" : "text-right", colorCn)}>
              {step.shortLabel}
            </p>
          );
        })}
      </div>
    </div>
  );
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

                    {/* Liste des baux */}
                    {(selectedProperty.bails?.length || 0) > 0 ? (
                      <div className="space-y-3">
                        {(selectedProperty.bails || []).map((bail) => {
                          const locataire = bail.parties?.find(
                            (p) => p.profilType === ProfilType.LOCATAIRE
                          );
                          const locataireName = locataire?.entreprise
                            ? locataire.entreprise.legalName || locataire.entreprise.name || "Entreprise"
                            : locataire?.persons?.[0]
                            ? `${locataire.persons[0].firstName || ""} ${locataire.persons[0].lastName || ""}`.trim() || locataire.persons[0].email || "Non défini"
                            : null;
                          const locataireInitial = locataireName ? locataireName[0].toUpperCase() : null;

                          const notaire = bail.dossierAssignments?.[0]?.notaire;
                          const notaireName = notaire
                            ? notaire.name || notaire.email || "Notaire"
                            : null;

                          const endDate = bail.endDate
                            ? bail.endDate
                            : bail.effectiveDate && bail.bailType
                            ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType).toISOString()
                            : null;

                          const chatTriggerRef = { current: null as HTMLButtonElement | null };

                          const cfg = BAIL_STATUS_CONFIG[bail.status] ?? BAIL_STATUS_CONFIG.DRAFT;
                          const StatusIcon = cfg.icon;
                          const isCommercial = bail.bailFamily === BailFamille.COMMERCIAL;

                          return (
                            <Card key={bail.id} className="border shadow-sm hover:shadow-md transition-shadow overflow-hidden pb-2 pt-0">
                              <CardContent className="p-0">
                                <div className="p-4 space-y-3.5">
                                  {/* Titre : famille du bail */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "rounded-md p-1.5",
                                        isCommercial ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                                      )}>
                                        {isCommercial ? <Store className="h-3.5 w-3.5" /> : <Home className="h-3.5 w-3.5" />}
                                      </div>
                                      <span className="text-sm font-semibold">
                                        {bail.bailFamily ? bailFamilyLabels[bail.bailFamily as BailFamille] : "Bail"}
                                      </span>
                                    </div>

                                    <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="px-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleOpenBailDetail(bail.id)}>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Voir le dossier complet
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>

                                  </div>
    
                                  {/* Chips : loyer / type / dates */}
                                  <div className="flex flex-wrap gap-1.5 items-center">
                                    {bail.rentAmount && (
                                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-1">
                                        <Euro className="h-3 w-3" />
                                        {bail.rentAmount.toLocaleString()} €/mois
                                      </span>
                                    )}
                                    {bail.bailType && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                                        <FileText className="h-3 w-3" />
                                        {bailTypeLabels[bail.bailType as BailType] || bail.bailType}
                                      </span>
                                    )}
                                    {bail.effectiveDate && (
                                      <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-full px-2.5 py-1">
                                        <Calendar className="h-3 w-3" />
                                        {formatDate(bail.effectiveDate)}
                                        {endDate && (
                                          <>
                                            <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                                            {formatDate(endDate)}
                                          </>
                                        )}
                                      </span>
                                    )}
                                  </div>

                                  {/* Locataire */}
                                  <div className="flex items-center gap-2">
                                    <div className={cn(
                                      "h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                                      locataireName ? "bg-primary/20 text-primary" : "bg-muted"
                                    )}>
                                      {locataireName ? locataireInitial : <User className="h-3 w-3 text-muted-foreground" />}
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-none mb-0.5">Locataire</span>
                                      <span className={cn("text-sm truncate", locataireName ? "text-foreground" : "text-muted-foreground italic text-xs")}>
                                        {locataireName ?? "Non renseigné"}
                                      </span>
                                    </div>
                                  </div>

 
                                  {/* timeline */}
                                  <div className="space-y-2">
                                    <BailStatusTimeline status={bail.status} />
                                  </div>
                                </div>

                                {/* Footer d'actions */}
                                <div className="border-t px-4 py-3 flex items-center gap-2 bg-muted/30">
                                  {notaire ? (
                                    <BailChatSheet
                                      bailId={bail.id}
                                      trigger={
                                        <Button size="sm" className="flex-1 gap-1.5">
                                          <MessageSquare className="h-3.5 w-3.5" />
                                          Contacter le notaire
                                        </Button>
                                      }
                                    />
                                  ) : (
                                    <div className="flex-1 flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                                      <Clock className="h-3.5 w-3.5 shrink-0" />
                                      Assignation au notaire en cours…
                                    </div>
                                  )}

                                  
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <Card>
                        <CardContent className="py-12 text-center">
                          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Aucun bail</h3>
                          <p className="text-muted-foreground mb-4">
                            Ce bien n'a pas encore de bail associé
                          </p>
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

