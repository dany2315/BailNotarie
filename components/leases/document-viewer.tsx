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
  /** Lien d'intake (formulaire sans compte), exigé pour obtenir l'URL du fichier. */
  token?: string;
  /** Classe du déclencheur (par défaut en ligne) : « flex w-full min-w-0 » pour une ligne qui prend toute la largeur. */
  triggerClassName?: string;
}

export function DocumentViewer({
  document,
  documentKindLabels,
  children,
  token,
  triggerClassName,
}: DocumentViewerProps) {
  const [open, setOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  // Adresse qui n'a pas pu s'afficher : l'erreur ne vaut que pour elle, jamais pour une ouverture suivante.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

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
        body: JSON.stringify({ fileKey, ...(token && { token }) }),
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

  // Une URL signée neuve à chaque ouverture. Rien ne s'affiche tant qu'elle n'est pas là : avant, l'image
  // partait sur l'adresse publique (bucket privé), échouait, et l'erreur restait pour l'ouverture suivante.
  useEffect(() => {
    if (!open || !document.fileKey) return;
    let cancelled = false;
    getSignedUrlForDocument(document.fileKey).then((url) => {
      if (!cancelled) setSignedUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, document.fileKey]);

  const openViewer = () => {
    setSignedUrl(null);
    setFailedUrl(null);
    setOpen(true);
  };

  // À la fermeture, l'aperçu reste tel quel pendant l'animation ; tout repart de zéro à la prochaine ouverture.
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (newOpen) openViewer();
    else setOpen(false);
  };

  const isLoadingSignedUrl = open && !signedUrl;
  const loadFailed = !!signedUrl && failedUrl === signedUrl;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          e.nativeEvent.stopImmediatePropagation();
          openViewer();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            openViewer();
          }
        }}
        className={`cursor-pointer ${triggerClassName ?? "inline-flex"}`}
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
              ) : signedUrl && fileType === "image" && !loadFailed ? (
                <div className="w-full h-full flex items-center justify-center">
                  <img
                    key={signedUrl}
                    src={signedUrl}
                    alt={documentName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    onError={() => setFailedUrl(signedUrl)}
                  />
                </div>
              ) : signedUrl && fileType === "pdf" && !loadFailed ? (
                <div className="w-full h-full">
                  <iframe
                    key={signedUrl}
                    src={getPdfPreviewUrl(signedUrl)}
                    className="w-full h-[70vh] rounded-lg border"
                    title={documentName}
                    onError={() => setFailedUrl(signedUrl)}
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
                    href={signedUrl}
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

