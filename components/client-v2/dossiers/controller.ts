"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useOwnerRuntime } from "../owner-runtime";
import type { PropertyWithBails } from "./model";

/* =========================================================================
   Le cerveau de « Mes dossiers », commun aux quatre compositions.

   Tout ce que faisait `DemandesPageClient` vit ici et nulle part ailleurs :
   la sélection synchronisée avec `?selected=`, l'ouverture des tiroirs par
   `?open=bail-… | bien-… | bien-new | bail-new` (+ `chat=1`), la création
   d'un bien, le lancement d'un nouveau bail, la recherche.

   Une mise en page ne décide donc que de ce qu'elle montre : changer d'option
   ne peut pas faire perdre une fonctionnalité en route.
   ========================================================================= */

export function useDossiersController(biens: PropertyWithBails[]) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { demo } = useOwnerRuntime();

  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string | null>(
    searchParams.get("selected") || (biens.length > 0 ? biens[0].id : null),
  );
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = React.useState(false);
  const [isPropertyFormLoading, setIsPropertyFormLoading] = React.useState(false);
  const [isPropertyFormUploading, setIsPropertyFormUploading] = React.useState(false);
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

  // Les biens venus du serveur restent la source : un re-rendu les réaligne.
  React.useEffect(() => setLocalBiens(biens), [biens]);

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

  /* Aucune composition n'a de panneau de droite : désigner un bien le fait
     remonter sous les yeux. Jamais au premier affichage, sinon tout arrivant
     serait poussé vers le bas. */
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

  const openPropertyDialog = React.useCallback(() => {
    isManuallyOpeningDialog.current = true;
    setIsPropertyDialogOpen(true);
  }, []);

  const openPropertyDetail = React.useCallback((propertyId: string) => {
    setSelectedPropertyId(propertyId);
    setSelectedPropertyDetailId(propertyId);
    setIsPropertyDetailOpen(true);
  }, []);

  const openBailDetail = React.useCallback((bailId: string) => {
    setSelectedBailId(bailId);
    setIsBailDetailOpen(true);
  }, []);

  const startNewBail = React.useCallback(
    (propertyId: string) => {
      setSelectedPropertyId(propertyId);
      router.push(`/client/proprietaire/baux/new?propertyId=${propertyId}`);
    },
    [router],
  );

  // ── Recherche : rien n'est masqué tant qu'on ne cherche pas ───────────────
  const showSearch = localBiens.length > 6;
  const visibleBiens = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return localBiens;
    return localBiens.filter((bien) =>
      `${bien.label ?? ""} ${bien.fullAddress ?? ""}`.toLowerCase().includes(needle),
    );
  }, [localBiens, query]);

  const totalBaux = localBiens.reduce(
    (total, bien) =>
      total + bien.bails.filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt)).length,
    0,
  );

  return {
    demo,
    biens: localBiens,
    visibleBiens,
    totalBaux,
    query,
    setQuery,
    showSearch,
    sectionRefs,
    selectedPropertyId,

    openPropertyDialog,
    openPropertyDetail,
    openBailDetail,
    startNewBail,

    propertyDialog: {
      open: isPropertyDialogOpen,
      onOpenChange: handlePropertyDialogOpenChange,
      loading: isPropertyFormLoading,
      uploading: isPropertyFormUploading,
      setLoading: setIsPropertyFormLoading,
      setUploading: setIsPropertyFormUploading,
      onCreated: handlePropertyCreated,
    },

    bailDrawer: {
      open: isBailDetailOpen,
      setOpen: setIsBailDetailOpen,
      bailId: selectedBailId,
      chatFor: openChatWithBailId,
      clearChat: () => setOpenChatWithBailId(null),
      onPropertyClick: (propertyId: string) => {
        setIsBailDetailOpen(false);
        setSelectedPropertyId(propertyId);
        setSelectedPropertyDetailId(propertyId);
        setIsPropertyDetailOpen(true);
      },
    },

    propertyDrawer: {
      open: isPropertyDetailOpen,
      setOpen: setIsPropertyDetailOpen,
      propertyId: selectedPropertyDetailId,
    },
  };
}

export type DossiersController = ReturnType<typeof useDossiersController>;
