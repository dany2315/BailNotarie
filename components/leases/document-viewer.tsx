"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Image as ImageIcon, File, ExternalLink, Loader2 } from "lucide-react";
import { getS3PublicUrl } from "@/hooks/use-s3-public-url";
import { getPdfPreviewUrl } from "@/lib/utils/pdf-preview";

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
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }
        }}
        className="cursor-pointer inline-flex"
      >
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
          
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto p-4 bg-muted/30 rounded-lg min-h-[50vh]">
              {isLoadingSignedUrl ? (
                <div className="flex flex-col items-center justify-center w-full min-h-[60vh] gap-6">
                  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border bg-background/80 px-10 py-12 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Loader2 className="size-7 animate-spin text-primary" />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-foreground">Chargement du document</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[280px]" title={documentName}>
                        {documentName}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-primary/50 animate-pulse [animation-delay:300ms]" />
                  </div>
                </div>
              ) : fileType === "image" && !imageError ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    src={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                    alt={documentName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onError={() => setImageError(true)}
                  />
                </div>
              ) : fileType === "pdf" && !pdfError ? (
                <div className="w-full h-full">
                  <iframe
                    src={getPdfPreviewUrl(signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey)}
                    className="w-full h-[70vh] rounded-lg border"
                    title={documentName}
                    onError={() => setPdfError(true)}
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-4">
                  {fileType === "image" && <ImageIcon className="size-16 mx-auto text-muted-foreground" />}
                  {fileType === "pdf" && <FileText className="size-16 mx-auto text-muted-foreground" />}
                  {fileType === "other" && <File className="size-16 mx-auto text-muted-foreground" />}
                  <p className="text-muted-foreground">
                    {fileType === "other"
                      ? "Ce type de fichier ne peut pas être prévisualisé"
                      : "Impossible de charger le fichier"}
                  </p>
                </div>
              )}
            </div>
            {signedUrl && (
              <div className="flex justify-end pt-3 border-t mt-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={signedUrl || getS3PublicUrl(document.fileKey) || document.fileKey}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="size-4 mr-2" />
                    Ouvrir dans un onglet
                  </a>
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

