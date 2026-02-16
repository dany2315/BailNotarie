"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getDocumentLabel } from "@/lib/utils/document-labels";
import { formatDateTime } from "@/lib/utils/formatters";

interface BailDocumentPreviewProps {
  document: {
    id: string;
    label: string | null;
    kind: string;
    fileKey: string;
    mimeType: string | null;
    createdAt?: Date | string;
  };
}

async function getSignedUrlForPreview(fileKey: string): Promise<string> {
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
    console.error("[BailDocumentPreview] Erreur:", error);
    throw error;
  }
}

async function handleDownloadDocument(
  fileKey: string,
  fileName: string
): Promise<void> {
  if (typeof window === "undefined") {
    toast.error("Téléchargement non disponible");
    return;
  }

  try {
    // Toujours essayer d'obtenir une URL signée (fonctionne avec clé S3 ou URL complète)
    let downloadUrl = fileKey;
    
    try {
      downloadUrl = await getSignedUrlForPreview(fileKey);
    } catch (error) {
      // Fallback : si c'est une URL complète (ancien format), utiliser directement
      if (fileKey?.startsWith("http")) {
        downloadUrl = fileKey;
      } else {
        // Sinon, générer l'URL publique depuis la clé S3
        const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
        downloadUrl = getS3PublicUrl(fileKey) || fileKey;
      }
      console.warn("Impossible d'obtenir une URL signée, utilisation de l'URL publique");
    }
    
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error("Erreur lors du téléchargement du fichier");
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success("Téléchargement réussi");
  } catch (error) {
    console.error("Erreur lors du téléchargement:", error);
    toast.error("Erreur lors du téléchargement du document");
  }
}

export function BailDocumentPreview({ document }: BailDocumentPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePreview = async () => {
    setIsOpen(true);
    setIsLoading(true);
    
    try {
      const url = await getSignedUrlForPreview(document.fileKey);
      setSignedUrl(url);
    } catch (error) {
      console.error("Erreur lors de la prévisualisation:", error);
      // Fallback : générer l'URL publique depuis la clé S3
      const { getS3PublicUrl } = await import("@/hooks/use-s3-public-url");
      const fallbackUrl = getS3PublicUrl(document.fileKey) || document.fileKey;
      setSignedUrl(fallbackUrl);
      if (!fallbackUrl.startsWith("http")) {
        toast.error("Impossible de charger le document");
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    await handleDownloadDocument(
      document.fileKey,
      document.label || `document-${document.kind}`
    );
  };

  const isImage = document.mimeType?.startsWith("image/");
  const isPdf = document.mimeType === "application/pdf";

  return (
    <>
      <div className="w-full max-w-full flex items-center gap-2 p-3 border rounded-lg hover:bg-accent transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1 max-w-full overflow-hidden">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1 max-w-full overflow-hidden">
            <p className="font-medium text-sm truncate max-w-full">
              {getDocumentLabel(document.kind)}
            </p>
            <div className="min-w-0 max-w-full overflow-hidden">
              <p className="text-xs text-muted-foreground truncate max-w-full">
                {document.label || getDocumentLabel(document.kind)}
              </p>
              {document.createdAt && (
                <p className="text-xs text-muted-foreground truncate max-w-full">
                  Ajouté le {formatDateTime(document.createdAt)}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePreview}
            title="Prévisualiser"
            className="shrink-0"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Télécharger"
            className="shrink-0"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{document.label || getDocumentLabel(document.kind)}</DialogTitle>
            <DialogDescription>{getDocumentLabel(document.kind)}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Chargement du document...</p>
              </div>
            ) : signedUrl ? (
              <div className="w-full h-full">
                {isImage ? (
                  <img
                    src={signedUrl}
                    alt={document.label || document.kind}
                    className="max-w-full max-h-[70vh] object-contain mx-auto"
                  />
                ) : isPdf ? (
                  <iframe
                    src={signedUrl}
                    className="w-full h-[70vh] border rounded"
                    title={document.label || document.kind}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <FileText className="h-16 w-16 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Prévisualisation non disponible pour ce type de fichier
                    </p>
                    <Button onClick={handleDownload} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le document
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

