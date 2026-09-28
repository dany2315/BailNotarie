"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, ChevronRight, FileText, Home, Plus } from "lucide-react";

import { formatDate } from "@/lib/utils/formatters";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import { EmptyState, PrimaryAction } from "./owner-ui";
import type { DetailModel } from "./detail-model";
import { DetailVariant } from "./detail-variants";
import { STATUS_VIEW } from "./owner-bail-card";

/* =========================================================================
   La page d'un bien, côté propriétaire.

   Mise en page « Feuille » : une fiche blanche posée sur le canevas de
   l'espace, qu'on voit dépasser autour — la page est courte, elle gagne à
   rester sobre. La route garde l'authentification et la requête ; ce
   composant ne fait que rendre.
   ========================================================================= */

const COMPLETION_VIEW: Record<
  string,
  { label: string; tone: "slate" | "amber" | "blue" | "emerald" }
> = {
  NOT_STARTED: { label: "À compléter", tone: "slate" },
  PARTIAL: { label: "Infos à compléter", tone: "amber" },
  PENDING_CHECK: { label: "En vérification", tone: "blue" },
  COMPLETED: { label: "Complété", tone: "emerald" },
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APPARTEMENT: "Appartement",
  MAISON: "Maison",
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
  const typeLabel = property.type
    ? PROPERTY_TYPE_LABELS[property.type] ?? property.type
    : null;

  const model: DetailModel = {
    kind: "bien",
    eyebrow: "Le bien",
    title,
    subtitle: property.label ? property.fullAddress : null,
    status: completion ? { label: completion.label, tone: completion.tone } : undefined,
    icon: Home,
    backHref: "/client/proprietaire/demandes",
    trail: [
      { label: "Mes dossiers", href: "/client/proprietaire/demandes" },
      { label: title },
    ],
    stats: [
      property.surfaceM2
        ? { label: "Surface", value: `${property.surfaceM2.toString()} m²` }
        : null,
      typeLabel ? { label: "Type", value: typeLabel } : null,
      { label: "Baux", value: String(property.bails.length) },
      property.documents.length > 0
        ? { label: "Pièces", value: String(property.documents.length) }
        : null,
    ].filter(Boolean) as DetailModel["stats"],
    actions: (
      <Link href={`/client/proprietaire/baux/new?propertyId=${property.id}`}>
        <PrimaryAction className="py-2.5">
          <Plus className="h-4 w-4" />
          Nouveau bail
        </PrimaryAction>
      </Link>
    ),
    sections: [
      {
        id: "infos",
        title: "Informations",
        icon: Building2,
        fields: [
          { label: "Adresse", value: property.fullAddress, wide: true },
          { label: "Label", value: property.label },
          { label: "Type de logement", value: typeLabel },
          {
            label: "Surface",
            value: property.surfaceM2 ? `${property.surfaceM2.toString()} m²` : null,
          },
          { label: "Créé le", value: property.createdAt ? formatDate(property.createdAt) : null },
          {
            label: "Modifié le",
            value: property.updatedAt ? formatDate(property.updatedAt) : null,
          },
        ],
      },
      {
        id: "baux",
        title: `Baux${property.bails.length > 0 ? ` · ${property.bails.length}` : ""}`,
        icon: FileText,
        node:
          property.bails.length === 0 ? (
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
          ),
      },
      ...(property.documents.length > 0
        ? [
            {
              id: "pieces",
              title: `Pièces du bien · ${property.documents.length}`,
              icon: FileText,
              node: (
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
              ),
            },
          ]
        : []),
    ],
  };

  return <DetailVariant variant="feuille" model={model} />;
}
