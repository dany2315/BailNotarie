"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  ChevronRight,
  FileText,
  Home,
  MapPin,
  Plus,
  Ruler,
} from "lucide-react";

import { formatDate } from "@/lib/utils/formatters";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import {
  EmptyState,
  FieldGrid,
  IconTile,
  MicroLabel,
  OwnerCanvas,
  PageNav,
  Pill,
  PrimaryAction,
  ReadField,
  Surface,
} from "./owner-ui";
import { STATUS_VIEW } from "./owner-bail-card";

/* =========================================================================
   La page d'un bien, côté propriétaire.

   Elle remplace le tiroir : une adresse propre, un retour clair, et la place
   d'afficher les baux du bien plutôt que de renvoyer l'utilisateur chercher
   ailleurs. La route garde l'authentification et la requête ; ce composant
   ne fait que rendre.
   ========================================================================= */

const COMPLETION_VIEW: Record<string, { label: string; tone: "slate" | "amber" | "blue" | "emerald" }> = {
  NOT_STARTED: { label: "À compléter", tone: "slate" },
  PARTIAL: { label: "Infos à compléter", tone: "amber" },
  PENDING_CHECK: { label: "En vérification", tone: "blue" },
  COMPLETED: { label: "Complété", tone: "emerald" },
};

export type PropertyPageData = {
  id: string;
  label: string | null;
  fullAddress: string | null;
  surfaceM2: { toString(): string } | null;
  type: string | null;
  completionStatus: string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  documents: Array<{
    id: string;
    kind: string;
    label: string | null;
    fileKey: string;
    mimeType: string | null;
    createdAt: Date | string;
  }>;
  bails: Array<{
    id: string;
    status: string;
    rentAmount: number | null;
    effectiveDate: Date | string | null;
  }>;
};

export function PropertyPage({ property }: { property: PropertyPageData }) {
  const title = property.label || property.fullAddress || "Mon bien";
  const completion = property.completionStatus
    ? COMPLETION_VIEW[property.completionStatus]
    : null;

  return (
    <OwnerCanvas>
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
        <PageNav
          backHref="/client/proprietaire/demandes"
          backLabel="Retour"
          trail={[
            { label: "Mes dossiers", href: "/client/proprietaire/demandes" },
            { label: title },
          ]}
        />

        {/* ── Identité du bien ──────────────────────────────────────────── */}
        <header className="mb-6 mt-5">
          <MicroLabel>Le bien</MicroLabel>
          <div className="mt-2 flex items-start gap-3.5">
            <IconTile icon={Home} tone="blue" size="lg" />
            <div className="min-w-0 flex-1">
              <h1 className="lp-title truncate text-[24px] font-bold text-slate-900 sm:text-[28px]">
                {title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {completion && <Pill tone={completion.tone}>{completion.label}</Pill>}
                {property.label && property.fullAddress && (
                  <span className="truncate text-[12.5px] text-slate-500">
                    {property.fullAddress}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-4">
          {/* ── Le bien ─────────────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <IconTile icon={MapPin} tone="blue" size="sm" />
              <MicroLabel>Informations</MicroLabel>
            </div>
            <FieldGrid>
              <ReadField label="Adresse" value={property.fullAddress} wide />
              {property.label && <ReadField label="Label" value={property.label} />}
              {property.surfaceM2 && (
                <ReadField label="Surface" value={`${property.surfaceM2.toString()} m²`} />
              )}
              {property.type && <ReadField label="Type" value={property.type} />}
              {property.createdAt && (
                <ReadField label="Créé le" value={formatDate(property.createdAt)} />
              )}
              {property.updatedAt && (
                <ReadField label="Modifié le" value={formatDate(property.updatedAt)} />
              )}
            </FieldGrid>
          </Surface>

          {/* ── Les baux du bien ────────────────────────────────────────── */}
          <Surface tone="raised" className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <IconTile icon={FileText} tone="blue" size="sm" />
                <MicroLabel>
                  Baux{property.bails.length > 0 ? ` · ${property.bails.length}` : ""}
                </MicroLabel>
              </div>
              <Link href={`/client/proprietaire/baux/new?propertyId=${property.id}`}>
                <PrimaryAction className="px-3 py-1.5 text-[12px]">
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau bail
                </PrimaryAction>
              </Link>
            </div>

            {property.bails.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Aucun bail sur ce bien"
                description="Créez le premier bail pour lancer la procédure."
              />
            ) : (
              <ul className="space-y-2">
                {property.bails.map((bail) => {
                  const view = STATUS_VIEW[bail.status];
                  return (
                    <li key={bail.id}>
                      <Link
                        href={`/client/proprietaire/baux/${bail.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 transition-colors hover:border-[#4373f5]/40 hover:bg-[#4373f5]/[0.03]"
                      >
                        <span
                          aria-hidden
                          className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#4373f5]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-semibold text-slate-900">
                            {view?.title ?? bail.status}
                          </span>
                          <span className="block truncate text-[11.5px] text-slate-500">
                            {bail.effectiveDate
                              ? `À partir du ${formatDate(bail.effectiveDate)}`
                              : "Date de début à définir"}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Surface>

          {/* ── Pièces ──────────────────────────────────────────────────── */}
          {property.documents.length > 0 && (
            <Surface tone="raised" className="p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <IconTile icon={Building2} tone="blue" size="sm" />
                <MicroLabel>Pièces du bien · {property.documents.length}</MicroLabel>
              </div>
              <div className="space-y-2">
                {property.documents.map((document) => (
                  <BailDocumentPreview
                    key={document.id}
                    document={{
                      id: document.id,
                      label: document.label,
                      kind: document.kind,
                      fileKey: document.fileKey,
                      mimeType: document.mimeType,
                      createdAt: document.createdAt,
                    }}
                  />
                ))}
              </div>
            </Surface>
          )}
        </div>
      </div>
    </OwnerCanvas>
  );
}
