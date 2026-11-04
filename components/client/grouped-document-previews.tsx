"use client";

import * as React from "react";
import { BailDocumentPreview } from "@/components/client/bail-document-preview";
import { FileStack } from "@/components/documents/file-stack";
import { cn } from "@/lib/utils";

export type PreviewDocument = {
  id: string;
  kind: string;
  label: string | null;
  fileKey: string;
  mimeType: string | null;
  createdAt?: Date | string | null;
};

/** Regroupe les fichiers par pièce (ordre d'apparition), les plus récents en premier. */
export function groupDocumentsByKind<T extends { kind: string; createdAt?: Date | string | null }>(documents: T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const doc of documents) {
    const list = groups.get(doc.kind) ?? [];
    list.push(doc);
    groups.set(doc.kind, list);
  }
  return [...groups.values()].map((list) =>
    [...list].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
  );
}

/**
 * Pièces de l'espace client, avec aperçu et téléchargement : plusieurs fichiers pour
 * une même pièce sont empilés, comme dans l'espace notaire.
 */
export function GroupedDocumentPreviews({
  documents,
  itemClassName,
  className,
}: {
  documents: PreviewDocument[];
  /** Habillage de chaque aperçu (ex. fond blanc arrondi de la page « Mes informations »). */
  itemClassName?: string;
  className?: string;
}) {
  const preview = (doc: PreviewDocument, inStack: boolean) => (
    // Dans une pile, la carte porte déjà le bord : on retire celui de l'aperçu.
    <div key={doc.id} className={cn(itemClassName, inStack && "[&>div]:border-0")}>
      <BailDocumentPreview
        document={{
          id: doc.id,
          label: doc.label,
          kind: doc.kind,
          fileKey: doc.fileKey,
          mimeType: doc.mimeType,
          createdAt: doc.createdAt ?? undefined,
        }}
      />
    </div>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {groupDocumentsByKind(documents).map((group) =>
        group.length > 1 ? (
          <FileStack key={group[0].kind} cardClassName="rounded-lg">
            {group.map((doc) => preview(doc, true))}
          </FileStack>
        ) : (
          preview(group[0], false)
        ),
      )}
    </div>
  );
}
