"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, File, ExternalLink, Loader2 } from "lucide-react";
import { getS3PublicUrl } from "@/hooks/use-s3-public-url";

interface DocumentViewerProps {
  document: {
    id: string;
    kind: string;
    fileKey: string;
    mimeType?: string | null;
    label?: string | null;
  };
  documentKindLabels: Record<string, string>;
  children: React.ReactNode;
}

export function DocumentViewer({
  document,
  documentKindLabels,
  children,
}: DocumentViewerProps) {
  const [open, setOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoadingSignedUrl, setIsLoadingSignedUrl] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  const getFileType = (mimeType?: string | null, fileKey?: string) => {
    if (mimeType) {
      if (mimeType.startsWith("image/")) return "image";
      if (mimeType === "application/pdf") return "pdf";
      return "other";
    }
    
    // Fallback: détecter par extension
    if (fileKey) {
      const extension = fileKey.split(".").pop()?.toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(extension || "")) {
        return "image";
      }
      if (extension === "pdf") {
        return "pdf";
      }
    }
    
    return "other";
  };

  const fileType = getFileType(document.mimeType, document.fileKey);
  const documentName = documentKindLabels[document.kind] || document.kind;

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
      console.error("[DocumentViewer] Erreur lors de la génération de l'URL signée:", error);
      // Fallback : générer l'URL publique depuis la clé S3
      return getS3PublicUrl(fileKey) || fileKey;
    }
  };

  // Générer l'URL signée quand le dialog s'ouvre
  useEffect(() => {
    if (open && document.fileKey) {
      setIsLoadingSignedUrl(true);
      getSignedUrlForDocument(document.fileKey)
        .then((url) => {
          setSignedUrl(url);
        })
        .catch((error) => {
          console.error("[DocumentViewer] Erreur:", error);
          // Fallback : générer l'URL publique depuis la clé S3
          setSignedUrl(getS3PublicUrl(document.fileKey) || document.fileKey);
        })
        .finally(() => {
          setIsLoadingSignedUrl(false);
        });
    } else if (!open) {
      setSignedUrl(null);
    }
  }, [open, document.fileKey]);

  const handleDialogOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset errors when dialog closes
      setImageError(false);
      setPdfError(false);
      setSignedUrl(null);
    }
  };

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {children}
      </div>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {fileType === "image" && <ImageIcon className="size-5" />}
              {fileType === "pdf" && <FileText className="size-5" />}
              {fileType === "other" && <File className="size-5" />}
              {documentName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-muted/30 rounded-lg">
            {isLoadingSignedUrl ? (
              <div className="flex items-center justify-center h-[70vh]">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Chargement du document...</span>
              </div>
            ) : fileType === "image" && !imageError && (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                  alt={documentName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onError={() => setImageError(true)}
                />
              </div>
            )}
            
            {fileType === "image" && imageError && (
              <div className="text-center p-8 space-y-4">
                <ImageIcon className="size-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground mb-4">Impossible de charger l'image</p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey} download className="inline-flex items-center gap-2">
                        <Download className="size-4" />
                        Télécharger
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="size-4" />
                        Ouvrir dans un nouvel onglet
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {fileType === "pdf" && !pdfError && (
              <div className="w-full h-full">
                <iframe
                  src={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                  className="w-full h-[70vh] rounded-lg border"
                  title={documentName}
                  onError={() => setPdfError(true)}
                />
              </div>
            )}
            
            {fileType === "pdf" && pdfError && (
              <div className="text-center p-8 space-y-4">
                <FileText className="size-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground mb-4">Impossible de charger le PDF</p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey} download className="inline-flex items-center gap-2">
                        <Download className="size-4" />
                        Télécharger
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="size-4" />
                        Ouvrir dans un nouvel onglet
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            {fileType === "other" && (
              <div className="text-center p-8 space-y-4">
                <FileText className="size-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium mb-2">{documentName}</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ce type de fichier ne peut pas être prévisualisé
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button asChild>
                      <a
                        href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                        download
                        className="inline-flex items-center gap-2"
                      >
                        <Download className="size-4" />
                        Télécharger
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="size-4" />
                        Ouvrir dans un nouvel onglet
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

