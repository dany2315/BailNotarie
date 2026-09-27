"use client";

import * as React from "react";
import { Eye, FileText, Home, Lock, Plus, Store } from "lucide-react";
import { ProfilType } from "@prisma/client";

import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/formatters";
import { BAIL_TYPE_LABELS } from "../owner-bail-card";
import { IconTile, MicroLabel, Pill, PrimaryAction, QuietAction, Surface } from "../owner-ui";
import { BailLine, DraftLine } from "./bail-line";
import type { DossiersController } from "./controller";
import {
  COMPLETION_VIEW,
  draftHref,
  findDraft,
  newBailAvailability,
  propertyTitle,
  STAGE_VIEW,
  stageOf,
  visibleBails,
  type BailOfProperty,
  type PropertyWithBails,
  type StageKey,
} from "./model";

/* =========================================================================
   Quatre façons de composer « Mes dossiers ».

   Même contrôleur, mêmes lignes, mêmes règles : seule la composition change.
   • A — Registre       : intertitre posé sur la page, lignes dans une carte.
   • B — Fiches         : une carte par bien, tout à l'intérieur.
   • C — Par étape      : les dossiers regroupés par avancement, biens en pied.
   • D — Liste continue : aucun carton, intertitres collants au défilement.
   ========================================================================= */

export type DossiersVariant = "registre" | "fiches" | "etapes" | "liste";

export const VARIANTS: Array<{ key: DossiersVariant; label: string; hint: string }> = [
  { key: "registre", label: "Registre", hint: "Intertitre + lignes en carte" },
  { key: "fiches", label: "Fiches", hint: "Une carte par bien" },
  { key: "etapes", label: "Par étape", hint: "Groupé par avancement" },
  { key: "liste", label: "Liste continue", hint: "Sans carton, titres collants" },
];

/* ---------- Briques communes ---------------------------------------------- */

function propertyIcon(bien: PropertyWithBails) {
  return bien.bails.some((bail) => bail.bailFamily === "COMMERCIAL") ? Store : Home;
}

function draftTenantName(draft: BailOfProperty) {
  const tenant = draft.parties?.find((party) => party.profilType === ProfilType.LOCATAIRE);
  if (!tenant) return null;
  return (
    tenant.entreprise?.legalName ||
    tenant.entreprise?.name ||
    `${tenant.persons?.[0]?.firstName || ""} ${tenant.persons?.[0]?.lastName || ""}`.trim() ||
    tenant.persons?.[0]?.email ||
    null
  );
}

/** Nom, adresse, et l'état du bien seulement s'il appelle quelque chose. */
function PropertyIdentity({
  bien,
  showLock,
  lockFrom,
  compact = false,
}: {
  bien: PropertyWithBails;
  showLock: boolean;
  lockFrom: Date | null;
  compact?: boolean;
}) {
  const completion = COMPLETION_VIEW[String(bien.completionStatus)];
  return (
    <div className="min-w-0 flex-1">
      {/* Le nom garde sa ligne entière : à 360 px, une pastille posée à côté
          le réduisait à deux mots. */}
      <h2
        className={cn(
          "truncate font-bold tracking-tight text-slate-900",
          compact ? "text-[14px]" : "text-[15.5px]",
        )}
      >
        {propertyTitle(bien)}
      </h2>
      <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
        {bien.fullAddress || "Adresse non renseignée"}
        {bien.surfaceM2 != null && ` · ${bien.surfaceM2} m²`}
      </p>
      {(completion || showLock) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {completion && <Pill tone={completion.tone}>{completion.label}</Pill>}
          {showLock && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
              <Lock className="h-3 w-3 shrink-0" />
              {lockFrom
                ? `Nouveau bail dès le ${formatDate(lockFrom)}`
                : "Un bail est déjà actif sur ce bien"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FicheButton({ onClick, compact = false }: { onClick: () => void; compact?: boolean }) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        title="Fiche du bien"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-800 sm:hidden"
      >
        <Eye className="h-4 w-4" />
        <span className="sr-only">Fiche du bien</span>
      </button>
      <QuietAction className={cn("hidden sm:inline-flex", compact && "py-1.5")} onClick={onClick}>
        <Eye className="h-3.5 w-3.5" />
        Fiche
      </QuietAction>
    </>
  );
}

/** Le contenu d'un bien : son brouillon éventuel, puis ses baux. */
function PropertyLines({
  bien,
  controller,
  allowed,
  divide = true,
  lineClassName,
}: {
  bien: PropertyWithBails;
  controller: DossiersController;
  allowed: boolean;
  divide?: boolean;
  lineClassName?: string;
}) {
  const draft = findDraft(bien.bails);
  const bails = visibleBails(bien.bails);

  if (!draft && bails.length === 0) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-4">
        <FileText className="h-4 w-4 shrink-0 text-slate-300" />
        <p className="text-[12.5px] text-slate-400">
          Aucun bail sur ce bien.{" "}
          {allowed && (
            <button
              type="button"
              onClick={() => controller.startNewBail(bien.id)}
              className="font-semibold text-[#3563e9] hover:underline"
            >
              Démarrer un dossier
            </button>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className={cn(divide && "divide-y divide-slate-200/60")}>
      {draft && (
        <DraftLine
          propertyLabel={propertyTitle(bien)}
          tenantName={draftTenantName(draft)}
          bailTypeLabel={draft.bailType ? BAIL_TYPE_LABELS[draft.bailType] || draft.bailType : null}
          href={draftHref(draft)}
          className={lineClassName}
        />
      )}
      {bails.map((bail) => (
        <BailLine
          key={bail.id}
          bail={{ ...bail, property: bien } as any}
          onOpenDetail={() => controller.openBailDetail(bail.id)}
          className={lineClassName}
        />
      ))}
    </div>
  );
}

/* ---------- A — Registre --------------------------------------------------- */

export function VariantRegistre({ controller }: { controller: DossiersController }) {
  return (
    <div className="space-y-9">
      {controller.visibleBiens.map((bien) => {
        const { allowed, from } = newBailAvailability(bien.bails);
        const draft = findDraft(bien.bails);
        return (
          <section
            key={bien.id}
            ref={(node) => {
              controller.sectionRefs.current[bien.id] = node;
            }}
            className="scroll-mt-28"
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2.5 px-1">
              <IconTile icon={propertyIcon(bien)} tone="blue" />
              <PropertyIdentity bien={bien} showLock={!draft && !allowed} lockFrom={from} />
              <FicheButton onClick={() => controller.openPropertyDetail(bien.id)} />
              {!draft && allowed && (
                <>
                  <PrimaryAction
                    className="hidden sm:inline-flex"
                    onClick={() => controller.startNewBail(bien.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau bail
                  </PrimaryAction>
                  <PrimaryAction
                    className="w-full py-3 sm:hidden"
                    onClick={() => controller.startNewBail(bien.id)}
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau bail
                  </PrimaryAction>
                </>
              )}
            </div>
            <Surface tone="raised" className="overflow-hidden">
              <PropertyLines bien={bien} controller={controller} allowed={allowed} />
            </Surface>
          </section>
        );
      })}
    </div>
  );
}

/* ---------- B — Fiches ----------------------------------------------------- */

export function VariantFiches({ controller }: { controller: DossiersController }) {
  return (
    <div className="space-y-5">
      {controller.visibleBiens.map((bien) => {
        const { allowed, from } = newBailAvailability(bien.bails);
        const draft = findDraft(bien.bails);
        const count = visibleBails(bien.bails).length + (draft ? 1 : 0);
        return (
          <Surface key={bien.id} tone="raised" className="overflow-hidden">
            <section
              ref={(node) => {
                controller.sectionRefs.current[bien.id] = node;
              }}
              className="scroll-mt-28"
            >
              {/* L'en-tête est le bien : fond blanc, nom en gras, la seule
                  tuile colorée de la carte. */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3.5">
                <IconTile icon={propertyIcon(bien)} tone="blue" />
                <PropertyIdentity bien={bien} showLock={!draft && !allowed} lockFrom={from} />
                <FicheButton onClick={() => controller.openPropertyDetail(bien.id)} compact />
              </div>

              {/* Les baux sont en dessous et en retrait : fond creusé, filets
                  plus fins, aucune tuile — juste un point d'état. On voit du
                  premier coup d'œil qu'ils appartiennent au bien. */}
              <div className="border-t border-slate-200/70 bg-[#f6f7fc]">
                {count > 0 && (
                  <div className="flex items-baseline gap-1.5 px-4 pb-1 pt-3">
                    <MicroLabel>{count > 1 ? "Baux" : "Bail"}</MicroLabel>
                    {count > 1 && (
                      <span className="text-[11px] font-semibold tabular-nums text-slate-400">
                        · {count}
                      </span>
                    )}
                  </div>
                )}

                <PropertyLines
                  bien={bien}
                  controller={controller}
                  allowed={allowed}
                  lineClassName="pl-1.5"
                />

                {!draft && allowed && (
                  <button
                    type="button"
                    onClick={() => controller.startNewBail(bien.id)}
                    className="flex w-full items-center justify-center gap-2 border-t border-slate-200/60 px-4 py-3 text-[12.5px] font-semibold text-slate-600 transition-colors hover:bg-white hover:text-[#3563e9]"
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau bail sur ce bien
                  </button>
                )}
              </div>
            </section>
          </Surface>
        );
      })}
    </div>
  );
}

/* ---------- C — Par étape -------------------------------------------------- */

export function VariantEtapes({ controller }: { controller: DossiersController }) {
  type Entry = { bien: PropertyWithBails; bail?: BailOfProperty; draft?: BailOfProperty };

  const groups: Record<StageKey, Entry[]> = { todo: [], running: [], done: [] };

  for (const bien of controller.visibleBiens) {
    const draft = findDraft(bien.bails);
    if (draft) groups.todo.push({ bien, draft });
    for (const bail of visibleBails(bien.bails)) {
      groups[stageOf(bail.status)].push({ bien, bail });
    }
  }

  const order: StageKey[] = ["todo", "running", "done"];

  return (
    <div className="space-y-8">
      {order.map((key) => {
        const entries = groups[key];
        if (entries.length === 0) return null;
        return (
          <section key={key}>
            <div className="mb-2.5 flex items-baseline gap-2.5 px-1">
              <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">
                {STAGE_VIEW[key].title}
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
                {entries.length}
              </span>
              <span className="truncate text-[11.5px] text-slate-400">{STAGE_VIEW[key].hint}</span>
            </div>
            <Surface tone="raised" className="divide-y divide-slate-100 overflow-hidden">
              {entries.map((entry) =>
                entry.draft ? (
                  <DraftLine
                    key={`draft-${entry.draft.id}`}
                    propertyLabel={propertyTitle(entry.bien)}
                    tenantName={draftTenantName(entry.draft)}
                    bailTypeLabel={
                      entry.draft.bailType
                        ? BAIL_TYPE_LABELS[entry.draft.bailType] || entry.draft.bailType
                        : null
                    }
                    href={draftHref(entry.draft)}
                    showProperty
                  />
                ) : (
                  <BailLine
                    key={entry.bail!.id}
                    bail={{ ...entry.bail!, property: entry.bien } as any}
                    showProperty
                    onOpenDetail={() => controller.openBailDetail(entry.bail!.id)}
                  />
                ),
              )}
            </Surface>
          </section>
        );
      })}

      {/* Les biens gardent leur place : c'est d'ici qu'on ouvre un dossier. */}
      <section>
        <div className="mb-2.5 flex items-baseline gap-2.5 px-1">
          <h2 className="text-[13px] font-semibold tracking-tight text-slate-900">Vos biens</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500">
            {controller.visibleBiens.length}
          </span>
        </div>
        <Surface tone="raised" className="divide-y divide-slate-100 overflow-hidden">
          {controller.visibleBiens.map((bien) => {
            const { allowed, from } = newBailAvailability(bien.bails);
            const draft = findDraft(bien.bails);
            return (
              <div
                key={bien.id}
                ref={(node) => {
                  controller.sectionRefs.current[bien.id] = node;
                }}
                className="flex flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3.5 scroll-mt-28"
              >
                <IconTile icon={propertyIcon(bien)} tone="slate" />
                <PropertyIdentity bien={bien} showLock={!draft && !allowed} lockFrom={from} compact />
                <div className="flex items-center gap-2 max-sm:w-full">
                  <FicheButton onClick={() => controller.openPropertyDetail(bien.id)} compact />
                  {!draft && allowed && (
                    <PrimaryAction
                      className="max-sm:flex-1"
                      onClick={() => controller.startNewBail(bien.id)}
                    >
                      <Plus className="h-4 w-4" />
                      Nouveau bail
                    </PrimaryAction>
                  )}
                </div>
              </div>
            );
          })}
        </Surface>
      </section>
    </div>
  );
}

/* ---------- D — Liste continue --------------------------------------------- */

export function VariantListe({ controller }: { controller: DossiersController }) {
  return (
    <div className="-mx-4 sm:mx-0">
      {controller.visibleBiens.map((bien) => {
        const { allowed, from } = newBailAvailability(bien.bails);
        const draft = findDraft(bien.bails);
        return (
          <section
            key={bien.id}
            ref={(node) => {
              controller.sectionRefs.current[bien.id] = node;
            }}
            className="scroll-mt-28"
          >
            {/* L'intertitre reste accroché en haut pendant qu'on parcourt ses
                baux : on sait toujours de quel bien on lit la liste. Aucun
                carton ici — un filet et un fond translucide suffisent. */}
            <div className="sticky top-[72px] z-10 border-b border-slate-200/70 bg-[#eef1fb]/90 px-4 py-2.5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <MicroLabel className="sr-only">Bien</MicroLabel>
                <IconTile icon={propertyIcon(bien)} tone="blue" size="sm" />
                <PropertyIdentity bien={bien} showLock={!draft && !allowed} lockFrom={from} compact />
                <div className="flex items-center gap-2">
                  <FicheButton onClick={() => controller.openPropertyDetail(bien.id)} compact />
                  {!draft && allowed && (
                    <PrimaryAction className="py-1.5" onClick={() => controller.startNewBail(bien.id)}>
                      <Plus className="h-3.5 w-3.5" />
                      Nouveau bail
                    </PrimaryAction>
                  )}
                </div>
              </div>
            </div>

            <div className="[&_[data-line]]:px-4">
              <PropertyLines bien={bien} controller={controller} allowed={allowed} />
            </div>
          </section>
        );
      })}
    </div>
  );
}
