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
  Search,
  Store,
} from "lucide-react";
import { BailType, CompletionStatus, ProfilType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { formatDate } from "@/lib/utils/formatters";
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
  Surface,
  Tone,
} from "./owner-ui";

/* =========================================================================
   « Mes dossiers ».

   Le premier essai reprenait la structure d'origine — choisir un bien à
   gauche, lire ses baux à droite — en la redessinant. C'était le problème :
   la page s'appelle « Mes dossiers » mais obligeait d'abord à naviguer dans
   des biens, et empilait quatre surfaces blanches (rail, fiche du bien, zone
   d'action, cartes) avant le premier contenu utile.

   Ici : une seule liste, du haut vers le bas, groupée par bien. Un bien
   n'est plus une destination mais un intertitre — une ligne, sur le fond de
   la page, qui porte son nom, son état et ses deux actions. Dessous, ses
   baux. Tout est visible sans rien sélectionner, et la seule surface blanche
   reste la carte d'un dossier.

   Toute la logique de `DemandesPageClient` est conservée : `?selected=`
   (qui fait maintenant défiler jusqu'au bien au lieu de le sélectionner),
   `?open=bail-… | bien-… | bien-new | bail-new`, la règle d'un seul bail
   actif par bien, le brouillon non payé, la création d'un bien et les deux
   tiroirs de détail.
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

/**
 * Un bien n'accepte un nouveau bail que si aucun bail actif ne court encore,
 * ou si tous arrivent à échéance dans moins d'un mois. Règle inchangée ; on
 * renvoie en plus la date à partir de laquelle ce sera possible, pour la dire
 * au propriétaire au lieu de le laisser deviner.
 */
function newBailAvailability(bails: PropertyWithBails["bails"]): { allowed: boolean; from: Date | null } {
  const activeBails = bails.filter((bail) => !TERMINAL_STATUSES.includes(bail.status));
  if (activeBails.length === 0) return { allowed: true, from: null };

  let latestUnlock: Date | null = null;
  let allowed = true;

  for (const bail of activeBails) {
    const endDate = bail.endDate
      ? new Date(bail.endDate)
      : bail.effectiveDate && bail.bailType
        ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
        : null;

    if (!endDate) {
      // Sans date de fin connue, on ne peut pas ouvrir : règle d'origine.
      return { allowed: false, from: null };
    }

    const oneMonthBefore = new Date(endDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    if (new Date() < oneMonthBefore) allowed = false;
    if (!latestUnlock || oneMonthBefore > latestUnlock) latestUnlock = oneMonthBefore;
  }

  return { allowed, from: allowed ? null : latestUnlock };
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
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const lastScrolledTo = React.useRef<string | null>(null);

  // ── Synchronisation de la sélection avec l'URL (inchangée) ────────────────
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

  /* Plus de panneau de droite : désigner un bien le fait remonter sous les
     yeux. On ne défile qu'une fois par bien, et jamais pour le premier
     affichage de la page (sinon tout arrivant serait poussé vers le bas). */
  React.useEffect(() => {
    if (!selectedPropertyId) return;
    if (lastScrolledTo.current === null) {
      lastScrolledTo.current = selectedPropertyId;
      return;
    }
    if (lastScrolledTo.current === selectedPropertyId) return;
    lastScrolledTo.current = selectedPropertyId;
    sectionRefs.current[selectedPropertyId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedPropertyId]);

  // ── Ouverture des tiroirs depuis les query params (inchangée) ─────────────
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

  const openPropertyDetail = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedPropertyDetailId(propertyId);
    setIsPropertyDetailOpen(true);
  };

  const openBailDetail = (bailId: string) => {
    setSelectedBailId(bailId);
    setIsBailDetailOpen(true);
  };

  const startNewBail = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    router.push(`/client/proprietaire/baux/new?propertyId=${propertyId}`);
  };

  // ── Filtre : rien n'est masqué tant qu'on ne cherche pas ──────────────────
  const showSearch = localBiens.length > 4;
  const visibleBiens = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return localBiens;
    return localBiens.filter((bien) =>
      `${bien.label ?? ""} ${bien.fullAddress ?? ""}`.toLowerCase().includes(needle),
    );
  }, [localBiens, query]);

  const totalBaux = localBiens.reduce(
    (total, bien) => total + (bien.bails?.filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt)).length || 0),
    0,
  );

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:pb-12">
        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <MicroLabel>Espace propriétaire</MicroLabel>
            <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">Mes dossiers</h1>
            <p className="mt-1 text-[13.5px] text-slate-500">
              {localBiens.length === 0
                ? "Commencez par ajouter un bien"
                : `${localBiens.length} bien${localBiens.length > 1 ? "s" : ""} · ${totalBaux} ${
                    totalBaux > 1 ? "baux" : "bail"
                  }`}
            </p>
          </div>
          <QuietAction className="hidden py-2.5 sm:inline-flex" onClick={openPropertyDialog}>
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </QuietAction>
        </header>

        {/* ── Recherche, seulement quand la liste devient longue ──────────── */}
        {showSearch && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un bien"
              className="w-full bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-[12px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Effacer
              </button>
            )}
          </div>
        )}

        {/* ── La liste ────────────────────────────────────────────────────── */}
        {localBiens.length === 0 ? (
          <Surface tone="raised">
            <EmptyState
              icon={Home}
              title="Ajoutez votre premier bien"
              description="Un bien, c'est l'adresse que vous louez. Vous pourrez ensuite lancer un bail dessus."
              action={
                <PrimaryAction className="mt-1 py-3" onClick={openPropertyDialog}>
                  <Plus className="h-4 w-4" />
                  Ajouter un bien
                </PrimaryAction>
              }
            />
          </Surface>
        ) : visibleBiens.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-slate-400">Aucun bien ne correspond à « {query} ».</p>
        ) : (
          <div className="space-y-9">
            {visibleBiens.map((bien) => (
              <PropertySection
                key={bien.id}
                ref={(node) => {
                  sectionRefs.current[bien.id] = node;
                }}
                bien={bien}
                onOpenDetail={() => openPropertyDetail(bien.id)}
                onStartBail={() => startNewBail(bien.id)}
                onOpenBail={openBailDetail}
              />
            ))}
          </div>
        )}

        {/* ── Ajouter un bien : en fin de liste, là où l'œil arrive ───────── */}
        {localBiens.length > 0 && !query && (
          <button
            type="button"
            onClick={openPropertyDialog}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/50 py-4 text-[13.5px] font-semibold text-slate-500 transition-colors hover:border-[#4373f5]/40 hover:bg-[#4373f5]/[0.04] hover:text-[#3563e9]"
          >
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </button>
        )}
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
              <Building2 className="h-4 w-4 text-[#3563e9]" />
              Ajouter un bien
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              L&apos;adresse et la surface suffisent pour commencer.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
            {demo ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center text-[12.5px] leading-snug text-slate-500">
                Aperçu — le formulaire de création de bien existant prend place ici, inchangé.
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

/* ---------- Un bien et ses baux ------------------------------------------- */

const PropertySection = React.forwardRef<
  HTMLElement,
  {
    bien: PropertyWithBails;
    onOpenDetail: () => void;
    onStartBail: () => void;
    onOpenBail: (bailId: string) => void;
  }
>(function PropertySection({ bien, onOpenDetail, onStartBail, onOpenBail }, ref) {
  const bails = bien.bails || [];
  const draftBail = bails.find((bail) => bail.status === "DRAFT" && !bail.paidAt);
  const visibleBails = bails.filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt));
  const { allowed, from } = newBailAvailability(bails);
  const isCommercial = bails.some((bail) => bail.bailFamily === "COMMERCIAL");

  const draftHref = draftBail
    ? draftBail.intakes?.[0]
      ? `/intakes/${draftBail.intakes[0].token}`
      : `/client/proprietaire/baux/new?draftId=${draftBail.id}`
    : null;

  const draftTenant = draftBail?.parties?.find((party) => party.profilType === ProfilType.LOCATAIRE);
  const draftTenantName = draftTenant?.entreprise
    ? draftTenant.entreprise.legalName || draftTenant.entreprise.name
    : draftTenant?.persons?.[0]
      ? `${draftTenant.persons[0].firstName || ""} ${draftTenant.persons[0].lastName || ""}`.trim() ||
        draftTenant.persons[0].email
      : null;

  return (
    <section ref={ref} className="scroll-mt-28">
      {/* L'intertitre : posé sur le fond, pas dans une carte — c'est ce qui
          fait lire « section » et non « quatrième encadré ». */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-1">
        <IconTile icon={isCommercial ? Store : Home} tone={isCommercial ? "amber" : "blue"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-[15.5px] font-bold tracking-tight text-slate-900">
              {propertyTitle(bien)}
            </h2>
            <Pill tone={COMPLETION_TONES[String(bien.completionStatus)] ?? "slate"} className="shrink-0">
              {COMPLETION_LABELS[String(bien.completionStatus)] ?? String(bien.completionStatus)}
            </Pill>
          </div>
          <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
            {bien.fullAddress || "Adresse non renseignée"}
            {bien.surfaceM2 != null && ` · ${bien.surfaceM2} m²`}
          </p>
          {/* Pourquoi il n'y a pas de bouton « Nouveau bail » ici : dit en une
              ligne d'information, plutôt qu'en bouton grisé qu'on essaie de
              cliquer avant de comprendre. */}
          {!draftBail && !allowed && (
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-400">
              <Lock className="h-3 w-3 shrink-0" />
              {from
                ? `Nouveau bail dès le ${formatDate(from)}`
                : "Un bail est déjà actif sur ce bien"}
            </p>
          )}
        </div>

        {/* Sur téléphone, la fiche du bien tient dans une icône au bout du
            titre : lui donner une pleine largeur la ferait passer pour
            l'action principale, qui est d'ouvrir un bail. */}
        <button
          type="button"
          onClick={onOpenDetail}
          title="Fiche du bien"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 sm:hidden"
        >
          <Eye className="h-4 w-4" />
          <span className="sr-only">Fiche du bien</span>
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <QuietAction onClick={onOpenDetail}>
            <Eye className="h-3.5 w-3.5" />
            Fiche
          </QuietAction>
          {!draftBail && allowed && (
            <PrimaryAction onClick={onStartBail}>
              <Plus className="h-4 w-4" />
              Nouveau bail
            </PrimaryAction>
          )}
        </div>

        {!draftBail && allowed && (
          <PrimaryAction className="w-full py-3 sm:hidden" onClick={onStartBail}>
            <Plus className="h-4 w-4" />
            Nouveau bail
          </PrimaryAction>
        )}
      </div>

      <div className="space-y-3">
        {/* Un dossier commencé et pas terminé passe devant : c'est le seul
            élément de cette page qui demande quelque chose. */}
        {draftBail && draftHref && (
          <OwnerTodoCard
            heading="Dossier en cours"
            propertyLabel={null}
            tenantName={draftTenantName}
            bailTypeLabel={
              draftBail.bailType ? BAIL_TYPE_LABELS[draftBail.bailType] || draftBail.bailType : null
            }
            message="Ce dossier n'est pas encore finalisé. Reprenez là où vous en étiez."
            continueHref={draftHref}
          />
        )}

        {visibleBails.map((bail) => (
          <OwnerBailCardV2
            key={bail.id}
            bail={{ ...bail, property: bien }}
            context="dossiers"
            onViewDetail={() => onOpenBail(bail.id)}
          />
        ))}

        {visibleBails.length === 0 && !draftBail && (
          <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-slate-200 bg-white/40 px-4 py-4">
            <FileText className="h-4 w-4 shrink-0 text-slate-300" />
            <p className="text-[12.5px] text-slate-400">
              Aucun bail sur ce bien.{" "}
              {allowed && (
                <button
                  type="button"
                  onClick={onStartBail}
                  className="font-semibold text-[#3563e9] hover:underline"
                >
                  Démarrer un dossier
                </button>
              )}
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

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
