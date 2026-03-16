"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { deleteDocument } from "@/lib/actions/documents";
import {
  deleteDocumentFromRawPayload,
  getIntakeDocuments,
} from "@/lib/actions/intakes";
import { DocumentStackList } from "@/components/documents/document-stack-list";
import { toast } from "sonner";

interface DocumentUploadedProps {
  token: string;
  documentKind: string;
  clientId?: string;
  personIndex?: number;
  onDelete?: (documentId: string) => void;
  children?: ReactNode;
}

const tokenDocumentsCache = new Map<string, Promise<any[]>>();
const tokenDocumentsData = new Map<string, any[]>();

export function invalidateDocumentCache(token: string) {
  tokenDocumentsCache.delete(token);
  tokenDocumentsData.delete(token);
}

export function DocumentUploaded({
  token,
  documentKind,
  clientId,
  personIndex,
  onDelete,
  children,
}: DocumentUploadedProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    hasLoadedRef.current = false;

    const filterDocuments = (allDocs: any[]) => {
      let filtered = allDocs.filter((doc) => doc.kind === documentKind);

      if (clientId) {
        filtered = filtered.filter((doc) => doc.clientId === clientId);
      }

      if (personIndex !== undefined) {
        filtered = filtered.filter((doc) => doc.personIndex === personIndex);
      }

      return filtered.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    };

    const loadDocuments = async () => {
      if (tokenDocumentsData.has(token)) {
        setDocuments(filterDocuments(tokenDocumentsData.get(token) || []));
        setLoading(false);
        return;
      }

      const existingPromise = tokenDocumentsCache.get(token);
      if (existingPromise) {
        try {
          const allDocs = await existingPromise;
          setDocuments(filterDocuments(allDocs || []));
        } catch (loadError) {
          console.error("Erreur lors du chargement des documents:", loadError);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      const loadPromise = getIntakeDocuments(token);
      tokenDocumentsCache.set(token, loadPromise);

      try {
        const allDocs = await loadPromise;
        tokenDocumentsData.set(token, allDocs);
        tokenDocumentsCache.delete(token);
        setDocuments(filterDocuments(allDocs));
      } catch (loadError) {
        console.error("Erreur lors du chargement des documents:", loadError);
        tokenDocumentsCache.delete(token);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [clientId, documentKind, personIndex, refreshKey, token]);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ documents?: Array<{ id: string; kind: string; personIndex?: number }> }>)?.detail;
      const newDocs = detail?.documents ?? [];
      // Affichage optimiste : ajouter tout de suite les documents qui correspondent à ce bloc
      if (newDocs.length > 0) {
        setDocuments((prev) => {
          const toAdd = newDocs.filter(
            (d) =>
              d.kind === documentKind &&
              (personIndex === undefined || d.personIndex === personIndex)
          );
          if (toAdd.length === 0) return prev;
          const merged = [...prev];
          for (const doc of toAdd) {
            if (!merged.some((x) => x.id === doc.id)) {
              merged.push({ ...doc, createdAt: (doc as any).createdAt ?? new Date().toISOString() });
            }
          }
          return merged.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      }
      invalidateDocumentCache(token);
      hasLoadedRef.current = false;
      setRefreshKey((previous) => previous + 1);
    };

    window.addEventListener(`document-uploaded-${token}`, handleRefresh);

    return () => {
      window.removeEventListener(`document-uploaded-${token}`, handleRefresh);
    };
  }, [documentKind, personIndex, token]);

  const handleDeleteDocument = async (document: any) => {
    setDeletingId(document.id);

    try {
      const isFromRawPayload = document.id?.startsWith("raw_");

      if (isFromRawPayload) {
        await deleteDocumentFromRawPayload({
          token,
          fileKey: document.fileKey,
          kind: document.kind,
          personIndex: document.personIndex,
        });
      } else {
        await deleteDocument(document.id);
      }

      toast.success("Document supprimé avec succès");

      if (tokenDocumentsData.has(token)) {
        const allDocs = tokenDocumentsData.get(token) || [];
        tokenDocumentsData.set(
          token,
          allDocs.filter((doc) => doc.id !== document.id)
        );
      }

      setDocuments((current) => current.filter((doc) => doc.id !== document.id));
      onDelete?.(document.id);
      invalidateDocumentCache(token);
      setRefreshKey((previous) => previous + 1);
    } catch (deleteError: any) {
      toast.error(deleteError.message || "Erreur lors de la suppression du document");
      console.error("Erreur lors de la suppression:", deleteError);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  const hasDocuments = documents.length > 0;

  return (
    <div className="min-w-0 space-y-3 overflow-visible">
      {children ? (
        <div className="space-y-2 min-w-0 overflow-visible">
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<{ compact?: boolean }>, { compact: hasDocuments })
              : child
          )}
        </div>
      ) : null}
      <div className="min-w-0 overflow-visible">
        <DocumentStackList
          documents={documents}
          deletingId={deletingId}
          onDelete={(documentId) => {
            const document = documents.find((item) => item.id === documentId);
            if (document) {
              return handleDeleteDocument(document);
            }
          }}
        />
      </div>
    </div>
  );
}
