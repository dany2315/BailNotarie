"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { File, Eye, Download, Image, ImageDown, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getIntakeDocuments } from "@/lib/actions/intakes";

interface DocumentPreviewProps {
  token: string;
  documentKind?: string;
}

// Cache global pour éviter les chargements multiples du même token
const tokenDocumentsCache = new Map<string, Promise<any[]>>();
const tokenDocumentsData = new Map<string, any[]>();

export function DocumentPreview({ token, documentKind }: DocumentPreviewProps) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<any | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const isViewerOpenRef = useRef(false);
  const hasLoadedRef = useRef(false);

  // Normaliser documentKind avec useMemo
  const normalizedDocumentKind = useMemo(() => documentKind || "", [documentKind]);

  useEffect(() => {
    // Ne charger qu'une seule fois
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadDocuments = async () => {
      // Vérifier si les documents sont déjà en cache
      if (tokenDocumentsData.has(token)) {
        const allDocs = tokenDocumentsData.get(token) || [];
        const filteredDocs = normalizedDocumentKind
          ? allDocs.filter((doc) => doc.kind === normalizedDocumentKind)
          : allDocs;
        setDocuments(filteredDocs);
        setLoading(false);
        return;
      }

      // Vérifier si un chargement est déjà en cours
      const existingPromise = tokenDocumentsCache.get(token);
      if (existingPromise) {
        try {
          const allDocs = await existingPromise;
          if (allDocs) {
            const filteredDocs = normalizedDocumentKind
              ? allDocs.filter((doc) => doc.kind === normalizedDocumentKind)
              : allDocs;
            setDocuments(filteredDocs);
          }
          setLoading(false);
        } catch (error) {
          console.error("Erreur lors du chargement des documents:", error);
          setLoading(false);
        }
        return;
      }

      // Lancer le chargement et le mettre en cache
      setLoading(true);
      const loadPromise = getIntakeDocuments(token);
      tokenDocumentsCache.set(token, loadPromise);

      try {
        const allDocs = await loadPromise;
        tokenDocumentsData.set(token, allDocs);
        tokenDocumentsCache.delete(token); // Nettoyer le cache de promesses

        const filteredDocs = normalizedDocumentKind
          ? allDocs.filter((doc) => doc.kind === normalizedDocumentKind)
          : allDocs;
        setDocuments(filteredDocs);
      } catch (error) {
        console.error("Erreur lors du chargement des documents:", error);
        tokenDocumentsCache.delete(token);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, normalizedDocumentKind]);

  // Mettre à jour la ref quand isViewerOpen change
  useEffect(() => {
    isViewerOpenRef.current = isViewerOpen;
  }, [isViewerOpen]);

  const handleViewDocument = (doc: any) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
  };

  const handleDownloadDocument = (doc: any) => {
    const link = document.createElement("a");
    link.href = doc.fileKey.startsWith("http") 
      ? doc.fileKey 
      : doc.fileKey.startsWith("/") 
        ? doc.fileKey 
        : `/${doc.fileKey}`;
    link.download = doc.label || `document-${doc.id}`;
    link.target = "_blank";
    link.click();
  };

  const getDocumentIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="size-4" />;
    if (mimeType.includes("pdf")) return <File className="size-4 text-red-500" />;
    if (mimeType.includes("image")) return <ImageIcon className="size-4 text-blue-500" />;
    return <File className="size-4" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Taille inconnue";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Chargement des documents...</div>;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Documents déjà uploadés</h4>
        <div className="grid gap-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-3">
              <CardContent className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getDocumentIcon(doc.mimeType)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.label || `Document ${doc.kind}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.size)} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleViewDocument(doc)}
                      title="Voir le document"
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleDownloadDocument(doc)}
                      title="Télécharger le document"
                    >
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedDocument?.label || "Aperçu du document"}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {selectedDocument && (
              <div className="space-y-4">
                {selectedDocument.mimeType?.includes("image") ? (
                  <img
                    src={selectedDocument.fileKey.startsWith("http") 
                      ? selectedDocument.fileKey 
                      : selectedDocument.fileKey.startsWith("/") 
                        ? selectedDocument.fileKey 
                        : `/${selectedDocument.fileKey}`}
                    alt={selectedDocument.label || "Document"}
                    className="max-w-full max-h-[70vh] mx-auto object-contain"
                  />
                ) : selectedDocument.mimeType?.includes("pdf") ? (
                  <iframe
                    src={selectedDocument.fileKey.startsWith("http") 
                      ? selectedDocument.fileKey 
                      : selectedDocument.fileKey.startsWith("/") 
                        ? selectedDocument.fileKey 
                        : `/${selectedDocument.fileKey}`}
                    className="w-full h-[70vh] border rounded"
                    title={selectedDocument.label || "Document PDF"}
                  />
                ) : (
                  <div className="text-center py-8">
                    <File className="size-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Aperçu non disponible pour ce type de fichier
                    </p>
                    <Button
                      onClick={() => handleDownloadDocument(selectedDocument)}
                      className="mt-4"
                    >
                      <Download className="size-4 mr-2" />
                      Télécharger le document
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
