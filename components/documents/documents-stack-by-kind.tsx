"use client";

import { useMemo } from "react";
import { DocumentStackList } from "@/components/documents/document-stack-list";
import { documentKindLabels as defaultLabels } from "@/lib/utils/document-labels";

export interface DocumentForStack {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  size?: number | null;
  createdAt?: Date | string | null;
  person?: { id: string; firstName: string | null; lastName: string | null; isPrimary?: boolean } | null;
  entreprise?: { id: string; legalName: string | null; name: string | null } | null;
}

interface DocumentsStackByKindProps {
  documents: DocumentForStack[];
  documentKindLabels?: Record<string, string>;
  onDelete?: (documentId: string) => void | Promise<void>;
  deletingId?: string | null;
  /** Label constant affiché pour tous les documents (sérialisable depuis Server Components) */
  ownerLabel?: string | null;
  /** @deprecated Utiliser ownerLabel (string) à la place — les fonctions ne peuvent pas être passées depuis Server Components */
  getOwnerLabel?: (doc: DocumentForStack) => string | null;
  className?: string;
}

/**
 * Affiche les documents groupés par type (kind), avec le même rendu stack que les intakes.
 * Utilisé côté notaire (interface) pour avoir le même look que les formulaires intake.
 */
export function DocumentsStackByKind({
  documents,
  documentKindLabels = defaultLabels,
  onDelete,
  deletingId,
  ownerLabel,
  getOwnerLabel,
  className,
}: DocumentsStackByKindProps) {
  const labels = useMemo(() => ({ ...defaultLabels, ...documentKindLabels }), [documentKindLabels]);

  const byKind = useMemo(() => {
    const map = new Map<string, DocumentForStack[]>();
    for (const doc of documents) {
      const kind = doc.kind || "OTHER";
      if (!map.has(kind)) map.set(kind, []);
      map.get(kind)!.push(doc);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }
    return map;
  }, [documents]);

  const kinds = useMemo(() => Array.from(byKind.keys()).sort(), [byKind]);

  if (kinds.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun document</p>;
  }

  return (
    <div className={className ?? "space-y-6"}>
      {kinds.map((kind) => {
        const list = byKind.get(kind)!;
        const stackDocuments = list.map((doc) => ({
          ...doc,
          ownerLabel: ownerLabel ?? (getOwnerLabel ? getOwnerLabel(doc) : null),
        }));
        const kindLabel = labels[kind] || kind;
        return (
          <div key={kind} className="min-w-0 w-full overflow-visible space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{kindLabel}</p>
            <DocumentStackList
              documents={stackDocuments}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          </div>
        );
      })}
    </div>
  );
}
