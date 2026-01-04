"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { put } from "@vercel/blob";

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  // Props pour l'upload direct vers Vercel Blob
  uploadToken?: string;
  documentKind?: string;
  clientId?: string;
  personIndex?: number;
  onUploadComplete?: (blobUrl: string) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadStateChange?: (isUploading: boolean) => void;
}

export function FileUpload({
  label,
  value,
  onChange,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
  disabled = false,
  required = false,
  error,
  uploadToken,
  documentKind,
  clientId,
  personIndex,
  onUploadComplete,
  onUploadProgress,
  onUploadStateChange,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null); // Ajouter cet état

  // Fonction optimisée utilisant put() directement avec simulation de progression améliorée
  const uploadFileOptimized = useCallback(async (
    file: File,
    blobToken: string,
    intakeToken: string
  ): Promise<{ url: string; pathname: string }> => {
    // Générer un pathname unique avec timestamp pour tri chronologique
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `intakes/${intakeToken}/${timestamp}-${randomSuffix}-${sanitizedName}`;

    // Simuler la progression de manière plus réaliste
    // Basée sur la taille du fichier et le temps estimé
    const fileSizeMB = file.size / (1024 * 1024);
    const estimatedTimeMs = Math.max(1000, fileSizeMB * 200); // ~200ms par MB
    const updateInterval = Math.max(50, estimatedTimeMs / 100); // 100 mises à jour
    let currentProgress = 0;

    progressIntervalRef.current = setInterval(() => {
      if (currentProgress < 90) {
        // Accélération au début, ralentissement vers la fin
        const increment = currentProgress < 50 
          ? Math.random() * 15 + 5  // 5-20% par intervalle au début
          : Math.random() * 5 + 2;   // 2-7% par intervalle vers la fin
        
        currentProgress = Math.min(currentProgress + increment, 90);
        setUploadProgress(currentProgress);
        if (onUploadProgress) {
          onUploadProgress(currentProgress);
        }
      }
    }, updateInterval);

    try {
      // Upload direct vers Vercel Blob avec multipart automatique pour fichiers > 100MB
      const blob = await put(pathname, file, {
        access: "public",
        token: blobToken,
        contentType: file.type || "application/octet-stream",
        // multipart: true est activé automatiquement pour fichiers > 100MB selon la doc
      });

      // Nettoyer l'intervalle et mettre à jour à 100%
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setUploadProgress(100);
      if (onUploadProgress) {
        onUploadProgress(100);
      }

      return {
        url: blob.url,
        pathname: blob.pathname,
      };
    } catch (error) {
      // Nettoyer l'intervalle en cas d'erreur
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      throw error;
    }
  }, [onUploadProgress]);

  // Fonction helper pour vérifier si le fichier est >= 1MB
  const isLargeFile = (file: File | null | undefined): boolean => {
    if (!file) return false;
    const fileSizeMB = file.size / (1024 * 1024);
    return fileSizeMB >= 1;
  };

  // Fonction helper pour obtenir le fichier actuel (en upload ou dans value)
  const getCurrentFile = (): File | null => {
    return uploadingFile || value || null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    
    if (!file) {
      onChange(null);
      setUploadingFile(null);
      return;
    }

    // Valider la taille du fichier (max 3MB)
    const maxSizeInBytes = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSizeInBytes) {
      toast.error(`Fichier trop volumineux. Taille maximale: 4   MB (fichier: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      onChange(null);
      setUploadingFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      return;
    }

    // Si uploadToken est fourni, faire l'upload direct vers Vercel Blob (client SDK)
    if (uploadToken && documentKind) {
      setUploadingFile(file); // Stocker le fichier en cours d'upload
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStateChange?.(true);
      
      try {
        // 1. Récupérer le token d'upload depuis le serveur
        const tokenResponse = await fetch("/api/blob/generate-upload-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: uploadToken }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || "Erreur lors de la récupération du token");
        }

        const { token: blobToken } = await tokenResponse.json();

        // 2. Uploader directement vers Vercel Blob avec le client SDK
        // Utilise multipart automatiquement pour fichiers > 100MB
        const blob = await uploadFileOptimized(file, blobToken, uploadToken);

        // 3. Créer le document dans la DB via l'API
        const createDocResponse = await fetch("/api/intakes/create-documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: uploadToken,
            documents: [{
              fileKey: blob.url,
              kind: documentKind,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
              label: file.name,
              personIndex: personIndex,
            }],
            clientId: clientId,
          }),
        });

        if (!createDocResponse.ok) {
          const error = await createDocResponse.json();
          console.warn("[FileUpload] Erreur lors de la création du document:", error);
          // Ne pas faire échouer l'upload si la création du document échoue
          // Le document sera créé lors du savePartialIntake
        }

        toast.success("Fichier uploadé avec succès");
        
        if (onUploadComplete) {
          onUploadComplete(blob.url);
        }

        // Déclencher l'événement pour recharger les documents
        window.dispatchEvent(new CustomEvent(`document-uploaded-${uploadToken}`));

        // Garder le fichier dans le state pour l'affichage
        onChange(file);
      } catch (error: any) {
        console.error("[FileUpload] Erreur lors de l'upload:", error);
        toast.error(error.message || "Erreur lors de l'upload du fichier");
        onChange(null);
        setUploadingFile(null); // Nettoyer le fichier en upload en cas d'erreur
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadingFile(null); // Nettoyer après l'upload
        onUploadStateChange?.(false);
      }
    } else {
      // Comportement par défaut : juste stocker le fichier
      onChange(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      // Valider la taille du fichier (max 3MB)
      const maxSizeInBytes = 4 * 1024 * 1024; // 4MB
      if (file.size > maxSizeInBytes) {
        toast.error(`Fichier trop volumineux. Taille maximale: 4 MB (fichier: ${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        onChange(null);
        setUploadingFile(null);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        return;
      }

      // Utiliser la même logique que handleFileChange
      if (uploadToken && documentKind) {
        setUploadingFile(file); // Stocker le fichier en cours d'upload
        setIsUploading(true);
        setUploadProgress(0);
        onUploadStateChange?.(true);
        
        try {
          // 1. Récupérer le token d'upload
          const tokenResponse = await fetch("/api/blob/generate-upload-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: uploadToken }),
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(error.error || "Erreur lors de la récupération du token");
          }

          const { token: blobToken } = await tokenResponse.json();

          // 2. Uploader directement vers Vercel Blob
          const blob = await uploadFileOptimized(file, blobToken, uploadToken);

          // 3. Créer le document dans la DB
          const createDocResponse = await fetch("/api/intakes/create-documents", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token: uploadToken,
              documents: [{
                fileKey: blob.url,
                kind: documentKind,
                fileName: file.name,
                mimeType: file.type,
                size: file.size,
                label: file.name,
                personIndex: personIndex,
              }],
              clientId: clientId,
            }),
          });

          if (!createDocResponse.ok) {
            const error = await createDocResponse.json();
            console.warn("[FileUpload] Erreur lors de la création du document:", error);
          }

          toast.success("Fichier uploadé avec succès");
          
          if (onUploadComplete) {
            onUploadComplete(blob.url);
          }

          window.dispatchEvent(new CustomEvent(`document-uploaded-${uploadToken}`));

          onChange(file);
        } catch (error: any) {
          console.error("[FileUpload] Erreur lors de l'upload:", error);
          toast.error(error.message || "Erreur lors de l'upload du fichier");
          onChange(null);
          setUploadingFile(null); // Nettoyer le fichier en upload en cas d'erreur
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          setUploadingFile(null); // Nettoyer après l'upload
          onUploadStateChange?.(false);
        }
      } else {
        onChange(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = () => {
    // Annuler l'upload en cours si nécessaire
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsUploading(false);
    setUploadProgress(0);
    onUploadStateChange?.(false);
    onChange(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={label}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {isUploading ? (
        <div className="flex flex-col gap-2 p-3 border rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="flex-1 text-sm truncate">{getCurrentFile()?.name || "Upload en cours..."}</span>
            <span className="text-xs text-muted-foreground">{uploadProgress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          {/* Message d'avertissement pour fichiers >= 1MB */}
          {(() => {
            const currentFile = getCurrentFile();
            return currentFile && isLargeFile(currentFile) ? (
              <div className="mt-1 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  ⏱️ L'upload peut prendre du temps en raison de la taille du fichier ({(currentFile.size / 1024 / 1024).toFixed(2)} MB). 
                  Veuillez ne pas quitter la page. Si l'upload prend trop de temps,{" "}
                  <a href="/#contact" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                    contactez-nous
                  </a>.
                </p>
              </div>
            ) : null;
          })()}
        </div>
      ) : value ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <File className="size-4 text-muted-foreground" />
          <span className="flex-1 text-sm truncate">{value.name}</span>
          <span className="text-xs text-muted-foreground">
            {(value.size / 1024 / 1024).toFixed(2)} MB
          </span>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={removeFile}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop & Tablet */}
          <div
            className={cn(
              "hidden sm:block border-2 border-dashed rounded-md p-6 text-center transition-colors",
              isDragging && "border-primary bg-primary/5",
              (disabled || isUploading) && "opacity-50 cursor-not-allowed",
              !disabled && !isUploading && "cursor-pointer hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <Input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={disabled || isUploading}
              className="hidden"
            />
            {isUploading ? (
              <>
                <Loader2 className="size-8 mx-auto mb-2 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Upload en cours... {uploadProgress.toFixed(0)}%
                </p>
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                {/* Message d'avertissement pour fichiers >= 1MB */}
                {(() => {
                  const currentFile = getCurrentFile();
                  return currentFile && isLargeFile(currentFile) ? (
                    <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-xs text-amber-800 dark:text-amber-200 text-center">
                        ⏱️ L'upload peut prendre du temps ({(currentFile.size / 1024 / 1024).toFixed(2)} MB). 
                        Ne quittez pas la page.{" "}
                        <a href="/#contact" className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100">
                          Contactez-nous
                        </a> si trop long.
                      </p>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <Upload className="size-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Cliquez ou glissez-déposez un fichier
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, JPG, PNG (max 4MB)
                </p>
              </>
            )}
          </div>
          {/* Mobile - plus fin */}
          <div
            className={cn(
              "block sm:hidden border border-dashed rounded-md p-3 text-center transition-colors",
              isDragging && "border-primary bg-primary/5",
              (disabled || isUploading) && "opacity-50 cursor-not-allowed",
              !disabled && !isUploading && "cursor-pointer hover:border-primary/50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && inputRef.current?.click()}
          >
            <Input
              ref={inputRef}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={disabled || isUploading}
              className="hidden"
            />
            {isUploading ? (
              <>
                <Loader2 className="size-6 mx-auto mb-1 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">
                  {uploadProgress.toFixed(0)}%
                </p>
                {/* Message d'avertissement pour fichiers >= 1MB */}
                {(() => {
                  const currentFile = getCurrentFile();
                  return currentFile && isLargeFile(currentFile) ? (
                    <div className="mt-2 p-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                      <p className="text-[10px] text-amber-800 dark:text-amber-200 text-center leading-tight">
                        ⏱️ Upload peut prendre du temps ({(currentFile.size / 1024 / 1024).toFixed(2)} MB). 
                        Ne pas quitter.{" "}
                        <a href="/#contact" className="underline font-medium">
                          Contactez-nous
                        </a> si trop long.
                      </p>
                    </div>
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <Upload className="size-6 mx-auto mb-1 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Cliquez ou glissez-déposez
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  PDF, DOC, JPG, PNG (max 4MB)
                </p>
              </>
            )}
          </div>
        </>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}





















