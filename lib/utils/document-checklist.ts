import type { ReactNode } from "react";

/** Pièce telle qu'affichée dans une liste de pièces (sérialisable). */
export interface ChecklistDocument {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  size?: number | null;
  createdAt?: Date | string | null;
}

/** Où rattacher une pièce envoyée depuis la fiche (une seule cible). */
export interface DocumentTargetLike {
  personId?: string;
  entrepriseId?: string;
  clientId?: string;
  propertyId?: string;
  bailId?: string;
}

export interface ChecklistRow {
  key: string;
  kind: string;
  label?: string;
  required: boolean;
  documents: ChecklistDocument[];
  extra?: ReactNode;
  /** Cible pour « Ajouter » / « Remplacer » depuis la fiche. */
  upload?: DocumentTargetLike;
}

/**
 * Construit les lignes d'une liste de pièces : d'abord chaque pièce attendue
 * (même absente), puis les autres pièces déposées, regroupées par type.
 * Utilisable côté serveur comme côté client.
 */
export function buildChecklistRows(
  requiredKinds: string[],
  documents: ChecklistDocument[],
  options: {
    keyPrefix: string;
    labels?: Partial<Record<string, string>>;
    extras?: Partial<Record<string, ReactNode>>;
    /** Cible des envois depuis la fiche (personne, société, client, bien ou bail). */
    target?: DocumentTargetLike;
  },
): ChecklistRow[] {
  const byKind = new Map<string, ChecklistDocument[]>();
  for (const doc of documents) {
    const list = byKind.get(doc.kind) || [];
    list.push(doc);
    byKind.set(doc.kind, list);
  }
  const rows: ChecklistRow[] = requiredKinds.map((kind) => ({
    key: `${options.keyPrefix}-${kind}`,
    kind,
    label: options.labels?.[kind],
    required: true,
    documents: byKind.get(kind) || [],
    extra: options.extras?.[kind],
    upload: options.target,
  }));
  for (const [kind, docs] of byKind) {
    if (requiredKinds.includes(kind)) continue;
    rows.push({
      key: `${options.keyPrefix}-${kind}`,
      kind,
      label: options.labels?.[kind],
      required: false,
      documents: docs,
      extra: options.extras?.[kind],
      upload: options.target,
    });
  }
  return rows;
}

/** Ne garde que les champs utiles d'une pièce Prisma (dates en ISO). */
export function toChecklistDocument(doc: {
  id: string;
  kind: string;
  fileKey: string;
  mimeType?: string | null;
  label?: string | null;
  size?: number | null;
  createdAt?: Date | string | null;
}): ChecklistDocument {
  return {
    id: doc.id,
    kind: doc.kind,
    fileKey: doc.fileKey,
    mimeType: doc.mimeType ?? null,
    label: doc.label ?? null,
    size: doc.size ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}
