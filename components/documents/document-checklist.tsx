"use client";

import * as React from "react";
import { Check, Download, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { useDownloadFile } from "@/hooks/use-download-file";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { cn } from "@/lib/utils";
import type { ChecklistRow } from "@/lib/utils/document-checklist";
import { VerifyToggle } from "@/components/admin/verify-buttons";

function formatSize(size?: number | null) {
  if (!size || size <= 0) return null;
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

function formatDay(date?: Date | string | null) {
  if (!date) return null;
  return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Pièces d'un bloc (personne, société, bien, bail) : une ligne par pièce
 * attendue, présente ou manquante, avec aperçu et téléchargement.
 */
export interface ChecklistVerification {
  bailId: string;
  /** Bloc déjà validé : les boutons sont verrouillés. */
  locked: boolean;
  /** Par clé de ligne : clé du point de contrôle et état. */
  points: Record<string, { pointKey: string; verified: boolean }>;
}

export function DocumentChecklist({
  rows,
  className,
  inset = false,
  verification,
}: {
  rows: ChecklistRow[];
  className?: string;
  /** Dans un bloc de la fiche : mêmes marges que les points de contrôle. */
  inset?: boolean;
  /** Fiche dossier : chaque pièce présente se valide comme un point de contrôle. */
  verification?: ChecklistVerification;
}) {
  const { downloadFile, isFileDownloading } = useDownloadFile();

  if (rows.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", inset && "px-5 py-3.5")}>Aucune pièce attendue.</p>;
  }

  return (
    <ul className={cn("flex flex-col divide-y", className)}>
      {rows.map((row) => {
        const present = row.documents.length > 0;
        const missing = row.required && !present;
        const point = verification && present ? verification.points[row.key] : undefined;
        // Avec la vérification : coche verte seulement une fois la pièce validée.
        const checked = present && (!verification || !!point?.verified);
        return (
          <li key={row.key} className={cn("grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-2", inset ? "px-5 py-3.5" : "py-3")}>
            <span
              aria-hidden
              className={cn(
                "mt-0.5 flex size-[22px] items-center justify-center rounded-full text-xs font-bold",
                checked ? "bg-green-100 text-green-800" : missing ? "bg-red-100 text-red-800" : "border-2 border-slate-300",
              )}
            >
              {checked ? <Check className="size-3.5" strokeWidth={3} /> : missing ? "!" : ""}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn("font-semibold leading-snug", inset ? "text-[14.5px]" : "text-sm")}>
                  {row.label || documentKindLabels[row.kind] || row.kind}
                  {row.required && <span className="sr-only"> (obligatoire)</span>}
                </span>
                <span className="flex items-center gap-2">
                  {row.extra}
                  {point && verification && (
                    <VerifyToggle bailId={verification.bailId} pointKey={point.pointKey} verified={point.verified} locked={verification.locked} />
                  )}
                </span>
              </div>
              {missing && <span className="text-sm font-semibold text-red-700">Manquante</span>}
              {!present && !row.required && <span className="text-sm text-muted-foreground">Non fournie (facultative)</span>}
              {row.documents.map((doc) => {
                const meta = [doc.label, formatSize(doc.size), formatDay(doc.createdAt) && `ajoutée le ${formatDay(doc.createdAt)}`]
                  .filter(Boolean)
                  .join(" · ");
                const downloading = isFileDownloading(doc.fileKey);
                return (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-muted-foreground">{meta || "Fichier"}</span>
                    <span className="flex shrink-0 gap-2">
                      <DocumentViewer document={doc} documentKindLabels={documentKindLabels}>
                        <Button type="button" variant="outline" size="sm" className="h-9">
                          <Eye className="size-4" />
                          Voir
                        </Button>
                      </DocumentViewer>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9"
                        disabled={downloading}
                        onClick={() => downloadFile(doc.fileKey, doc.label || documentKindLabels[doc.kind] || `document-${doc.id}`)}
                      >
                        {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        Télécharger
                      </Button>
                    </span>
                  </div>
                );
              })}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
