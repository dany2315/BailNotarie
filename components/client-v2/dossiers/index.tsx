"use client";

import * as React from "react";
import { Building2, CheckCircle2, Home, Loader2, Plus, Search } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BailDetailDrawer } from "@/components/client/bail-detail-drawer";
import { DrawerBoundary } from "../drawer-boundary";
import { PropertyDetailDrawer } from "@/components/client/property-detail-drawer";
import { CreatePropertyForm, CreatePropertyFormRef } from "@/components/client/create-property-form";
import {
  EmptyState,
  MicroLabel,
  OwnerCanvas,
  PrimaryAction,
  QuietAction,
  Surface,
} from "../owner-ui";
import { useDossiersController } from "./controller";
import type { Locataire, PropertyWithBails } from "./model";
import {
  VariantEtapes,
  VariantFiches,
  VariantListe,
  VariantRegistre,
  type DossiersVariant,
} from "./variants";

export { VARIANTS, type DossiersVariant } from "./variants";

export interface OwnerDossiersProps {
  biens: PropertyWithBails[];
  locataires: Locataire[];
  ownerId: string;
  /** La composition à rendre. La maquette les fait toutes essayer. */
  variant?: DossiersVariant;
}

const LAYOUTS = {
  registre: VariantRegistre,
  fiches: VariantFiches,
  etapes: VariantEtapes,
  liste: VariantListe,
} as const;

export function OwnerDossiers({ biens, ownerId, variant = "fiches" }: OwnerDossiersProps) {
  const controller = useDossiersController(biens);
  const propertyFormRef = React.useRef<CreatePropertyFormRef>(null);
  const Layout = LAYOUTS[variant];
  const { propertyDialog, bailDrawer, propertyDrawer, demo } = controller;
  const busy = propertyDialog.loading || propertyDialog.uploading;

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-6 sm:px-6 sm:pt-8 lg:pb-14">
        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <MicroLabel>Espace propriétaire</MicroLabel>
            <h1 className="lp-title mt-1.5 text-[26px] font-bold text-slate-900 sm:text-[32px]">
              Mes dossiers
            </h1>
            <p className="mt-1 text-[13.5px] text-slate-500">
              {controller.biens.length === 0
                ? "Commencez par ajouter un bien"
                : `${controller.biens.length} bien${controller.biens.length > 1 ? "s" : ""} · ${
                    controller.totalBaux
                  } ${controller.totalBaux > 1 ? "baux" : "bail"}`}
            </p>
          </div>
          {/* L'ajout d'un bien vit à côté du titre, à sa place d'action de
              page — et nulle part ailleurs. */}
          <QuietAction className="py-2.5 max-sm:w-full" onClick={controller.openPropertyDialog}>
            <Plus className="h-4 w-4" />
            Ajouter un bien
          </QuietAction>
        </header>

        {controller.showSearch && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={controller.query}
              onChange={(event) => controller.setQuery(event.target.value)}
              placeholder="Rechercher un bien"
              className="w-full bg-transparent text-[13.5px] text-slate-700 outline-none placeholder:text-slate-400"
            />
            {controller.query && (
              <button
                type="button"
                onClick={() => controller.setQuery("")}
                className="shrink-0 text-[12px] font-semibold text-slate-400 hover:text-slate-600"
              >
                Effacer
              </button>
            )}
          </div>
        )}

        {controller.biens.length === 0 ? (
          <Surface tone="raised">
            <EmptyState
              icon={Home}
              title="Ajoutez votre premier bien"
              description="Un bien, c'est l'adresse que vous louez. Vous pourrez ensuite lancer un bail dessus."
              action={
                <PrimaryAction className="mt-1 py-3" onClick={controller.openPropertyDialog}>
                  <Plus className="h-4 w-4" />
                  Ajouter un bien
                </PrimaryAction>
              }
            />
          </Surface>
        ) : controller.visibleBiens.length === 0 ? (
          <p className="py-10 text-center text-[13.5px] text-slate-400">
            Aucun bien ne correspond à « {controller.query} ».
          </p>
        ) : (
          <Layout controller={controller} />
        )}

      </div>

      {/* ── Création d'un bien ────────────────────────────────────────────── */}
      <Dialog
        open={propertyDialog.open}
        onOpenChange={(open) => {
          if (!busy) propertyDialog.onOpenChange(open);
        }}
      >
        <DialogContent
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton={!busy}
        >
          {busy && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-white/90">
              <Loader2 className="h-7 w-7 animate-spin text-[#3563e9]" />
              <p className="text-[13px] font-medium text-slate-500">
                {propertyDialog.uploading ? "Envoi des fichiers…" : "Création du bien…"}
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
                onPropertyCreated={propertyDialog.onCreated}
                hideActions
                onLoadingChange={propertyDialog.setLoading}
                onUploadingChange={propertyDialog.setUploading}
              />
            )}
          </div>
          <DialogFooter className="shrink-0 flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-col">
            <PrimaryAction
              className="w-full py-3"
              disabled={busy}
              onClick={() => propertyFormRef.current?.submit()}
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {propertyDialog.uploading ? "Envoi en cours…" : "Création…"}
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
              disabled={busy}
              onClick={() => propertyDialog.onOpenChange(false)}
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
            open={bailDrawer.open}
            onClose={() => bailDrawer.setOpen(false)}
            title="Détail du dossier"
            body="Aperçu — le tiroir de détail du bail existant s'ouvre ici, avec son suivi, ses documents et sa messagerie."
          />
          <PreviewDrawer
            open={propertyDrawer.open}
            onClose={() => propertyDrawer.setOpen(false)}
            title="Fiche du bien"
            body="Aperçu — la fiche du bien existante s'ouvre ici."
          />
        </>
      ) : (
        <>
          {bailDrawer.bailId && (
            <DrawerBoundary
              key={bailDrawer.bailId}
              onClose={() => {
                bailDrawer.clearChat();
                bailDrawer.setOpen(false);
              }}
            >
              <BailDetailDrawer
                open={bailDrawer.open}
                onOpenChange={(open) => {
                  if (!open) bailDrawer.clearChat();
                  bailDrawer.setOpen(open);
                }}
                bailId={bailDrawer.bailId}
                defaultOpenChat={bailDrawer.chatFor === bailDrawer.bailId}
                onPropertyClick={bailDrawer.onPropertyClick}
              />
            </DrawerBoundary>
          )}
          {propertyDrawer.propertyId && (
            <DrawerBoundary
              key={propertyDrawer.propertyId}
              onClose={() => propertyDrawer.setOpen(false)}
            >
              <PropertyDetailDrawer
                open={propertyDrawer.open}
                onOpenChange={propertyDrawer.setOpen}
                propertyId={propertyDrawer.propertyId}
              />
            </DrawerBoundary>
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
          </QuietAction>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
