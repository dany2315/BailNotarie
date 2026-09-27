"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  Home,
  Loader2,
  Lock,
  Plus,
  Ruler,
  Search,
} from "lucide-react";
import { BailType, CompletionStatus, ProfilType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BailDetailDrawer } from "@/components/client/bail-detail-drawer";
import { PropertyDetailDrawer } from "@/components/client/property-detail-drawer";
import { CreatePropertyForm, CreatePropertyFormRef } from "@/components/client/create-property-form";
import { OwnerBailCardV2 } from "./owner-bail-card";
import { useOwnerRuntime } from "./owner-runtime";
import { OwnerTodoCard } from "./owner-todo";
import {
  EmptyState,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  Pill,
  PrimaryAction,
  QuietAction,
  SectionHeading,
  Surface,
  Tone,
} from "./owner-ui";

/* =========================================================================
   « Mes dossiers » — refonte.

   Toute la logique de `DemandesPageClient` est conservée : sélection d'un
   bien synchronisée avec l'URL (`?selected=`), ouverture des tiroirs via
   `?open=bail-… | bien-… | bien-new | bail-new`, détection du brouillon non
   payé, règle d'un seul bail actif par bien, création d'un bien.

   Ce qui change :
   • une seule colonne de biens, vraie liste sur grand écran, rail de pastilles
     défilantes en une ligne sur mobile (au lieu des grosses tuiles à deux
     étages) ;
   • le bien sélectionné reçoit un en-tête qui dit tout de lui (adresse,
     surface, état du dossier) ;
   • l'action « démarrer un dossier » devient un bouton plein, pas une carte
     en pointillés perdue au milieu de la liste.
   ========================================================================= */

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
      persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
      entreprise?: { legalName: string | null; name: string | null } | null;
    }>;
    dossierAssignments?: Array<{
      id: string;
      notaire: { id: string; name: string | null; email: string | null } | null;
    }>;
    intakes?: Array<{ id: string; token: string; status: string }>;
  }>;
};

export interface OwnerDossiersProps {
  biens: PropertyWithBails[];
  locataires: Array<{
    id: string;
    persons: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise: { legalName: string; name: string; email: string | null } | null;
  }>;
  ownerId: string;
}

const COMPLETION_LABELS: Record<string, string> = {
  NOT_STARTED: "À compléter",
  PARTIAL: "Partiel",
  PENDING_CHECK: "En vérification",
  COMPLETED: "Complet",
};

const COMPLETION_TONES: Record<string, Tone> = {
  NOT_STARTED: "slate",
  PARTIAL: "amber",
  PENDING_CHECK: "blue",
  COMPLETED: "emerald",
};

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

const TERMINAL_STATUSES = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"];

/** Un bien n'accepte un nouveau bail que si aucun bail actif ne court encore,
    ou si tous arrivent à échéance dans moins d'un mois. Règle inchangée. */
function canCreateNewBail(bails: PropertyWithBails["bails"]): boolean {
  const activeBails = bails.filter((bail) => !TERMINAL_STATUSES.includes(bail.status));
  if (activeBails.length === 0) return true;

  return activeBails.every((bail) => {
    const endDate = bail.endDate
      ? new Date(bail.endDate)
      : bail.effectiveDate && bail.bailType
        ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
        : null;
    if (!endDate) return false;
    const oneMonthBefore = new Date(endDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    return new Date() >= oneMonthBefore;
  });
}

function propertyTitle(bien: PropertyWithBails) {
  return bien.label || bien.fullAddress?.split(",")[0] || "Bien sans adresse";
}

export function OwnerDossiers({ biens, ownerId }: OwnerDossiersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demo } = useOwnerRuntime();

  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string | null>(
    searchParams.get("selected") || (biens.length > 0 ? biens[0].id : null),
  );
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = React.useState(false);
  const [isPropertyFormLoading, setIsPropertyFormLoading] = React.useState(false);
  const [isPropertyFormUploading, setIsPropertyFormUploading] = React.useState(false);
  const propertyFormRef = React.useRef<CreatePropertyFormRef>(null);
  const [isBailDetailOpen, setIsBailDetailOpen] = React.useState(false);
  const [selectedBailId, setSelectedBailId] = React.useState<string | null>(null);
  /** Quand défini, le chat du tiroir bail s'ouvre à l'affichage (lien « Répondre »). */
  const [openChatWithBailId, setOpenChatWithBailId] = React.useState<string | null>(null);
  const [isPropertyDetailOpen, setIsPropertyDetailOpen] = React.useState(false);
  const [selectedPropertyDetailId, setSelectedPropertyDetailId] = React.useState<string | null>(null);
  const [localBiens, setLocalBiens] = React.useState(biens);
  const [query, setQuery] = React.useState("");

  const lastSyncedPropertyId = React.useRef<string | null>(null);
  const lastProcessedOpenParam = React.useRef<string | null>(null);
  const isManuallyOpeningDialog = React.useRef(false);

  const selectedProperty = localBiens.find((bien) => bien.id === selectedPropertyId);

  // ── Synchronisation de la sélection avec l'URL ────────────────────────────
  React.useEffect(() => {
    if (selectedPropertyId && lastSyncedPropertyId.current !== selectedPropertyId) {
      const currentSelected = searchParams.get("selected");
      if (currentSelected !== selectedPropertyId) {
        const params = new URLSearchParams(searchParams.toString());
        params.set("selected", selectedPropertyId);
        lastSyncedPropertyId.current = selectedPropertyId;
        router.replace(`?${params.toString()}`, { scroll: false });
      } else {
        lastSyncedPropertyId.current = selectedPropertyId;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, router]);

  // ── Ouverture des tiroirs depuis les query params ─────────────────────────
  React.useEffect(() => {
    if (isManuallyOpeningDialog.current) {
      isManuallyOpeningDialog.current = false;
      return;
    }

    const open = searchParams.get("open");
    if (open === lastProcessedOpenParam.current) return;

    if (open === "bien-new" && !isPropertyDialogOpen) {
      lastProcessedOpenParam.current = open;
      setIsPropertyDialogOpen(true);
    } else if (open === "bail-new") {
      router.push("/client/proprietaire/baux/new");
    } else if (open?.startsWith("bail-")) {
      const bailId = open.replace("bail-", "");
      const wantChat = searchParams.get("chat") === "1";
      if (selectedBailId !== bailId) {
        lastProcessedOpenParam.current = open;
        setSelectedBailId(bailId);
        setOpenChatWithBailId(wantChat ? bailId : null);
        setIsBailDetailOpen(true);
      }
    } else if (open?.startsWith("bien-")) {
      const propertyId = open.replace("bien-", "");
      lastProcessedOpenParam.current = open;
      setSelectedPropertyId(propertyId);
      setSelectedPropertyDetailId(propertyId);
      setIsPropertyDetailOpen(true);
    } else if (!open) {
      lastProcessedOpenParam.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handlePropertyCreated = React.useCallback(
    (property: any) => {
      setLocalBiens((prev) => [...prev, { ...property, bails: property.bails || [] }]);
      setSelectedPropertyId(property.id);
      lastProcessedOpenParam.current = null;
      if (!demo) router.replace("/client/proprietaire/demandes", { scroll: false });
    },
    [router, demo],
  );

  const handlePropertyDialogOpenChange = React.useCallback((open: boolean) => {
    setIsPropertyDialogOpen(open);
    if (!open) {
      lastProcessedOpenParam.current = null;
      isManuallyOpeningDialog.current = false;
    }
  }, []);

  const openPropertyDialog = () => {
    isManuallyOpeningDialog.current = true;
    setIsPropertyDialogOpen(true);
  };

  const handlePropertySelect = (propertyId: string) => setSelectedPropertyId(propertyId);

  const openPropertyDetail = (propertyId: string) => {
    setSelectedPropertyDetailId(propertyId);
    setIsPropertyDetailOpen(true);
  };

  const openBailDetail = (bailId: string) => {
    setSelectedBailId(bailId);
    setIsBailDetailOpen(true);
  };

  // ── Rail des biens ────────────────────────────────────────────────────────
  const showSearch = localBiens.length > 6;
  const filteredBiens = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return localBiens;
    return localBiens.filter((bien) =>
      `${bien.label ?? ""} ${bien.fullAddress ?? ""}`.toLowerCase().includes(needle),
    );
  }, [localBiens, query]);

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12">
        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
          <div className="min-w-0">
            <MicroLabel>Espace propriétaire</MicroLabel>
            <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">Mes dossiers</h1>
            <p className="mt-1 text-[13.5px] text-slate-500">
              {localBiens.length === 0
                ? "Commencez par ajouter un bien"
                : `${localBiens.length} bien${localBiens.length > 1 ? "s" : ""} · les baux de chacun`}
            </p>
          </div>
          <QuietAction className="hidden py-2.5 lg:inline-flex" onClick={openPropertyDialog}>
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </QuietAction>
        </header>

        {/* ── Rail mobile : une ligne de pastilles ────────────────────────── */}
        <div className="-mx-4 mb-4 lg:hidden">
          <div className="flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {localBiens.map((bien) => {
              const isSelected = selectedPropertyId === bien.id;
              return (
                <button
                  key={bien.id}
                  type="button"
                  onClick={() => handlePropertySelect(bien.id)}
                  className={cn(
                    "flex shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] font-semibold transition-all",
                    isSelected
                      ? "border-transparent bg-slate-900 text-white shadow-[0_8px_20px_-10px_rgba(15,23,42,0.6)]"
                      : "border-slate-200 bg-white text-slate-600",
                  )}
                >
                  <Home className={cn("h-3.5 w-3.5", isSelected ? "text-white/80" : "text-slate-400")} />
                  <span className="max-w-[46vw] truncate">{propertyTitle(bien)}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10.5px] tabular-nums",
                      isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {bien.bails?.length || 0}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={openPropertyDialog}
              className="flex shrink-0 snap-start items-center gap-1.5 rounded-full border border-dashed border-slate-300 bg-white/60 px-3.5 py-2 text-[12.5px] font-semibold text-slate-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:gap-8">
          {/* ── Rail desktop ─────────────────────────────────────────────── */}
          <aside className="hidden lg:block">
            <Surface tone="raised" className="sticky top-28 overflow-hidden">
              <div className="flex items-center justify-between px-4 pb-2 pt-4">
                <MicroLabel>Vos biens</MicroLabel>
                <span className="text-[11px] font-semibold tabular-nums text-slate-400">
                  {localBiens.length}
                </span>
              </div>

              {showSearch && (
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2">
                    <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Rechercher un bien"
                      className="w-full bg-transparent text-[12.5px] text-slate-700 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              )}

              <div className="max-h-[52vh] overflow-y-auto px-2 pb-2">
                {filteredBiens.map((bien) => {
                  const isSelected = selectedPropertyId === bien.id;
                  return (
                    <div key={bien.id} className="relative">
                      <button
                        type="button"
                        onClick={() => handlePropertySelect(bien.id)}
                        className={cn(
                          "mb-1 flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 pr-9 text-left transition-colors",
                          isSelected ? "bg-[#4373f5]/[0.07]" : "hover:bg-slate-50",
                        )}
                      >
                        <IconTile icon={Home} tone={isSelected ? "blue" : "slate"} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span
                            className={cn(
                              "block truncate text-[13px] font-semibold",
                              isSelected ? "text-[#3563e9]" : "text-slate-800",
                            )}
                          >
                            {propertyTitle(bien)}
                          </span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-slate-500">
                            {bien.fullAddress || "Adresse non renseignée"}
                          </span>
                          <span className="mt-1 block text-[11px] font-medium tabular-nums text-slate-400">
                            {bien.bails?.length || 0} bail{(bien.bails?.length || 0) > 1 ? "x" : ""}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openPropertyDetail(bien.id)}
                        title="Voir la fiche du bien"
                        className="absolute right-2 top-3 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="sr-only">Voir la fiche</span>
                      </button>
                    </div>
                  );
                })}

                {filteredBiens.length === 0 && (
                  <p className="px-3 py-6 text-center text-[12.5px] text-slate-400">
                    {localBiens.length === 0 ? "Aucun bien" : "Aucun résultat"}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={openPropertyDialog}
                className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-3 text-[12.5px] font-semibold text-[#3563e9] transition-colors hover:bg-[#4373f5]/[0.05]"
              >
                <Plus className="h-4 w-4" />
                Ajouter un bien
              </button>
            </Surface>
          </aside>

          {/* ── Contenu du bien sélectionné ──────────────────────────────── */}
          <div className="min-w-0 space-y-4">
            {selectedProperty ? (
              <>
                {/* Fiche d'en-tête du bien */}
                <Surface tone="raised" className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <IconTile icon={Building2} tone="blue" size="lg" />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-[17px] font-bold tracking-tight text-slate-900">
                        {propertyTitle(selectedProperty)}
                      </h2>
                      {selectedProperty.fullAddress && (
                        <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                          {selectedProperty.fullAddress}
                        </p>
                      )}
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Pill tone={COMPLETION_TONES[String(selectedProperty.completionStatus)] ?? "slate"}>
                          {COMPLETION_LABELS[String(selectedProperty.completionStatus)] ??
                            String(selectedProperty.completionStatus)}
                        </Pill>
                        {selectedProperty.surfaceM2 != null && (
                          <Pill tone="slate" icon={Ruler}>
                            {selectedProperty.surfaceM2} m²
                          </Pill>
                        )}
                        <Pill tone="slate" icon={FileText}>
                          {selectedProperty.bails?.length || 0} bail
                          {(selectedProperty.bails?.length || 0) > 1 ? "x" : ""}
                        </Pill>
                      </div>
                    </div>
                    <QuietAction
                      className="hidden shrink-0 sm:inline-flex"
                      onClick={() => openPropertyDetail(selectedProperty.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Fiche du bien
                    </QuietAction>
                  </div>
                  <QuietAction
                    className="mt-3 w-full sm:hidden"
                    onClick={() => openPropertyDetail(selectedProperty.id)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Voir la fiche du bien
                  </QuietAction>
                </Surface>

                {/* Zone d'action : reprendre, démarrer, ou attendre */}
                {(() => {
                  const bails = selectedProperty.bails || [];
                  const allowed = canCreateNewBail(bails);
                  const draftBail = bails.find((bail) => bail.status === "DRAFT" && !bail.paidAt);
                  const intakeLink = draftBail?.intakes?.[0];

                  if (draftBail) {
                    const tenant = draftBail.parties?.find(
                      (party) => party.profilType === ProfilType.LOCATAIRE,
                    );
                    const tenantName = tenant?.entreprise
                      ? tenant.entreprise.legalName || tenant.entreprise.name
                      : tenant?.persons?.[0]
                        ? `${tenant.persons[0].firstName || ""} ${tenant.persons[0].lastName || ""}`.trim() ||
                          tenant.persons[0].email
                        : null;
                    const href = intakeLink
                      ? `/intakes/${intakeLink.token}`
                      : `/client/proprietaire/baux/new?draftId=${draftBail.id}`;

                    return (
                      <OwnerTodoCard
                        propertyLabel={propertyTitle(selectedProperty)}
                        tenantName={tenantName}
                        bailTypeLabel={
                          draftBail.bailType
                            ? BAIL_TYPE_LABELS[draftBail.bailType] || draftBail.bailType
                            : null
                        }
                        message="Ce dossier n'est pas encore finalisé. Reprenez là où vous en étiez."
                        continueHref={href}
                      />
                    );
                  }

                  if (!allowed) {
                    return (
                      <Surface tone="quiet" className="flex items-start gap-3 p-4">
                        <IconTile icon={Lock} tone="slate" />
                        <div className="min-w-0">
                          <p className="text-[13.5px] font-semibold text-slate-700">
                            Un bail est déjà actif sur ce bien
                          </p>
                          <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">
                            Vous pourrez en créer un nouveau un mois avant la fin du bail en cours.
                          </p>
                        </div>
                      </Surface>
                    );
                  }

                  return (
                    <Surface tone="accent" className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-semibold text-slate-800">
                          Démarrer un dossier pour ce bien
                        </p>
                        <p className="mt-0.5 text-[12.5px] leading-snug text-slate-600">
                          Comptez cinq minutes. Le locataire peut être ajouté plus tard.
                        </p>
                      </div>
                      <PrimaryAction
                        className="max-sm:w-full"
                        onClick={() =>
                          router.push(
                            `/client/proprietaire/baux/new${
                              selectedPropertyId ? `?propertyId=${selectedPropertyId}` : ""
                            }`,
                          )
                        }
                      >
                        <Plus className="h-4 w-4" />
                        Nouveau bail
                      </PrimaryAction>
                    </Surface>
                  );
                })()}

                {/* Baux du bien (hors brouillons non payés, déjà traités au-dessus) */}
                {(() => {
                  const bails = selectedProperty.bails || [];
                  const visibleBails = bails.filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt));
                  const hasUnpaidDraft = bails.some((bail) => bail.status === "DRAFT" && !bail.paidAt);

                  if (visibleBails.length > 0) {
                    return (
                      <section className="space-y-3 pt-1">
                        <SectionHeading title="Baux" count={visibleBails.length} />
                        <div className="space-y-3">
                          {visibleBails.map((bail) => (
                            <OwnerBailCardV2
                              key={bail.id}
                              bail={{ ...bail, property: selectedProperty }}
                              context="dossiers"
                              onViewDetail={() => openBailDetail(bail.id)}
                            />
                          ))}
                        </div>
                      </section>
                    );
                  }

                  if (hasUnpaidDraft) return null;

                  return (
                    <Surface tone="quiet">
                      <EmptyState
                        icon={FileText}
                        title="Aucun bail sur ce bien"
                        description="Dès qu'un dossier est lancé, son avancement apparaît ici."
                      />
                    </Surface>
                  );
                })()}
              </>
            ) : (
              <Surface tone="raised">
                <EmptyState
                  icon={Home}
                  title={localBiens.length === 0 ? "Ajoutez votre premier bien" : "Choisissez un bien"}
                  description={
                    localBiens.length === 0
                      ? "Un bien, c'est l'adresse que vous louez. Vous pourrez ensuite lancer un bail dessus."
                      : "Sélectionnez un bien pour voir ses baux."
                  }
                  action={
                    localBiens.length === 0 ? (
                      <PrimaryAction className="mt-1 py-3" onClick={openPropertyDialog}>
                        <Plus className="h-4 w-4" />
                        Ajouter un bien
                      </PrimaryAction>
                    ) : undefined
                  }
                />
              </Surface>
            )}
          </div>
        </div>
      </div>

      {/* ── Création d'un bien ────────────────────────────────────────────── */}
      <Dialog
        open={isPropertyDialogOpen}
        onOpenChange={(open) => {
          if (!isPropertyFormLoading && !isPropertyFormUploading) handlePropertyDialogOpenChange(open);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton={!isPropertyFormLoading && !isPropertyFormUploading}
        >
          {(isPropertyFormLoading || isPropertyFormUploading) && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/90">
              <Loader2 className="h-7 w-7 animate-spin text-[#3563e9]" />
              <p className="text-[13px] font-medium text-slate-500">
                {isPropertyFormUploading ? "Envoi des fichiers…" : "Création du bien…"}
              </p>
            </div>
          )}
          <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
            <DialogTitle className="flex items-center gap-2 text-[17px] tracking-tight">
              <Building2 className="h-4.5 w-4.5 text-[#3563e9]" />
              Ajouter un bien
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              L&apos;adresse et la surface suffisent pour commencer.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {demo ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-[12.5px] leading-snug text-slate-500">
                Aperçu — le formulaire de création de bien existant prend place ici,
                inchangé.
              </div>
            ) : (
              <CreatePropertyForm
                ref={propertyFormRef}
                ownerId={ownerId}
                onPropertyCreated={handlePropertyCreated}
                hideActions
                onLoadingChange={setIsPropertyFormLoading}
                onUploadingChange={setIsPropertyFormUploading}
              />
            )}
          </div>
          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-col">
            <PrimaryAction
              className="w-full py-3"
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              onClick={() => propertyFormRef.current?.submit()}
            >
              {isPropertyFormUploading || isPropertyFormLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isPropertyFormUploading ? "Envoi en cours…" : "Création…"}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Créer le bien
                </>
              )}
            </PrimaryAction>
            <QuietAction
              className="w-full py-3"
              disabled={isPropertyFormLoading || isPropertyFormUploading}
              onClick={() => handlePropertyDialogOpenChange(false)}
            >
              Annuler
            </QuietAction>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tiroirs de détail ─────────────────────────────────────────────── */}
      {demo ? (
        <>
          <PreviewDrawer
            open={isBailDetailOpen}
            onClose={() => setIsBailDetailOpen(false)}
            title="Détail du dossier"
            body="Aperçu — le tiroir de détail du bail existant s'ouvre ici, avec son suivi, ses documents et sa messagerie."
          />
          <PreviewDrawer
            open={isPropertyDetailOpen}
            onClose={() => setIsPropertyDetailOpen(false)}
            title="Fiche du bien"
            body="Aperçu — la fiche du bien existante s'ouvre ici."
          />
        </>
      ) : (
        <>
          {selectedBailId && (
            <BailDetailDrawer
              open={isBailDetailOpen}
              onOpenChange={(open) => {
                if (!open) setOpenChatWithBailId(null);
                setIsBailDetailOpen(open);
              }}
              bailId={selectedBailId}
              defaultOpenChat={openChatWithBailId === selectedBailId}
              onPropertyClick={(propertyId) => {
                setIsBailDetailOpen(false);
                setSelectedPropertyId(propertyId);
                setSelectedPropertyDetailId(propertyId);
                setIsPropertyDetailOpen(true);
              }}
            />
          )}
          {selectedPropertyDetailId && (
            <PropertyDetailDrawer
              open={isPropertyDetailOpen}
              onOpenChange={setIsPropertyDetailOpen}
              propertyId={selectedPropertyDetailId}
            />
          )}
        </>
      )}
    </OwnerCanvas>
  );
}

/** Substitut des tiroirs réels dans la maquette : ils chargent un dossier en
    base, ce qu'une page de démonstration ne peut pas faire. */
function PreviewDrawer({
  open,
  onClose,
  title,
  body,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  body: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[17px] tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-snug">{body}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <QuietAction className="w-full py-3" onClick={onClose}>
            Fermer
            <ArrowRight className="h-3.5 w-3.5" />
          </QuietAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
