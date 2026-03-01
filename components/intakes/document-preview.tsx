"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { File, Eye, Download, Image, ImageDown, ImageIcon, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getIntakeDocuments } from "@/lib/actions/intakes";
import { getDocumentLabel } from "@/lib/utils/document-labels";
import { getS3PublicUrl } from "@/hooks/use-s3-public-url";
import { getPdfPreviewUrl } from "@/lib/utils/pdf-preview";

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
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
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
    // Réinitialiser l'URL signée quand le dialog se ferme
    if (!isViewerOpen) {
      setSignedUrl(null);
    }
  }, [isViewerOpen]);

  // Fonction pour obtenir une URL signée pour la lecture
  const getSignedUrlForDocument = async (fileKey: string): Promise<string> => {
    try {
      const response = await fetch("/api/blob/get-signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileKey }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors de la génération de l'URL signée");
      }

      const { signedUrl } = await response.json();
      return signedUrl;
    } catch (error) {
      console.error("[DocumentPreview] Erreur lors de la génération de l'URL signée:", error);
      // Fallback : générer l'URL publique depuis la clé S3
      return getS3PublicUrl(fileKey) || fileKey;
    }
  };

  const handleViewDocument = async (doc: any) => {
    setSelectedDocument(doc);
    setIsViewerOpen(true);
    setIsLoadingSignedUrl(true);
    
    // Générer une URL signée pour la lecture
    try {
      const url = await getSignedUrlForDocument(doc.fileKey);
      setSignedUrl(url);
    } catch (error) {
      console.error("[DocumentPreview] Erreur:", error);
      // Fallback : générer l'URL publique depuis la clé S3
      setSignedUrl(getS3PublicUrl(doc.fileKey) || doc.fileKey);
    } finally {
      setIsLoadingSignedUrl(false);
    }
  };

  const handleDownloadDocument = async (doc: any) => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      // Obtenir une URL signée pour le téléchargement (fonctionne avec clé S3 ou URL complète)
      let downloadUrl = doc.fileKey;
      
      try {
        downloadUrl = await getSignedUrlForDocument(doc.fileKey);
      } catch (error) {
        // Si c'est une URL complète (ancien format), utiliser directement
        if (doc.fileKey?.startsWith("http")) {
          downloadUrl = doc.fileKey;
        } else {
          // Sinon, générer l'URL publique depuis la clé S3
          downloadUrl = getS3PublicUrl(doc.fileKey) || doc.fileKey;
        }
        console.warn("[DocumentPreview] Impossible d'obtenir une URL signée, utilisation de l'URL publique");
      }
      
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Erreur lors du téléchargement du fichier");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = doc.label || `document-${doc.id}`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("[DocumentPreview] Erreur lors du téléchargement:", error);
    }
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
                        {doc.label || getDocumentLabel(doc.kind)}
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
                {isLoadingSignedUrl ? (
                  <div className="flex items-center justify-center h-[70vh]">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Chargement du document...</span>
                  </div>
                ) : selectedDocument.mimeType?.includes("image") ? (
                  <img
                    src={signedUrl || getS3PublicUrl(selectedDocument.fileKey) || selectedDocument.fileKey}
                    alt={selectedDocument.label || "Document"}
                    className="max-w-full max-h-[70vh] mx-auto object-contain"
                    onError={(e) => {
                      console.error("[DocumentPreview] Erreur de chargement de l'image:", e);
                    }}
                  />
                ) : selectedDocument.mimeType?.includes("pdf") ? (
                  <iframe
                    src={getPdfPreviewUrl(
                      signedUrl || getS3PublicUrl(selectedDocument.fileKey) || selectedDocument.fileKey
                    )}
                    className="w-full h-[70vh] border rounded"
                    title={selectedDocument.label || "Document PDF"}
                    onError={() => {
                      console.error("[DocumentPreview] Erreur de chargement du PDF");
                    }}
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
