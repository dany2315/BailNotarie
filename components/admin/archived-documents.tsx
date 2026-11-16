"use client";

import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CheckSection, StateChip } from "@/components/admin/check-list";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { documentKindLabels } from "@/lib/utils/document-labels";

export interface ArchivedDocumentRow {
  id: string;
  kind: string;
  label: string | null;
  fileKey: string;
  mimeType: string | null;
  archivedAt: string;
  archivedByName: string | null;
  replacedByLabel: string | null;
}

const day = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Paris" });

/**
 * Pièces retirées des pièces actives du dossier (remplacées par une nouvelle). Elles ne comptent plus dans
 * le dossier et ne sont plus visibles du client ; le fichier est conservé pour l'équipe, et pour le notaire
 * quand c'est lui qui a retiré la pièce.
 */
export function ArchivedDocuments({ documents }: { documents: ArchivedDocumentRow[] }) {
  if (documents.length === 0) return null;
  return (
    <CheckSection
      id="bloc-archives"
      title="Pièces archivées"
      subtitle="Remplacées par une nouvelle pièce : conservées, hors du dossier actif"
      headerRight={<StateChip tone="neutral">{documents.length}</StateChip>}
    >
      <ul className="flex flex-col divide-y">
        {documents.map((doc) => (
          <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold">
                {documentKindLabels[doc.kind] || doc.kind}
                {doc.label ? ` — ${doc.label}` : ""}
              </span>
              <span className="text-[13px] text-muted-foreground">
                Archivée le {day(doc.archivedAt)}
                {doc.archivedByName ? ` par ${doc.archivedByName}` : ""}
                {doc.replacedByLabel ? ` · remplacée par « ${doc.replacedByLabel} »` : ""}
              </span>
            </div>
            <DocumentViewer
              document={{ id: doc.id, kind: doc.kind, fileKey: doc.fileKey, mimeType: doc.mimeType, label: doc.label } as any}
              documentKindLabels={documentKindLabels}
            >
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                <Eye className="size-4" />
                Voir
              </Button>
            </DocumentViewer>
          </li>
        ))}
      </ul>
    </CheckSection>
  );
}
