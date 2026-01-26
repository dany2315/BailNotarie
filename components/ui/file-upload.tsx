"use client";

import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  // Props pour l'upload direct vers S3
  // Pour les intakes
  uploadToken?: string; // Token d'intake
  // Pour les documents clients/propriétés
  documentClientId?: string;
  documentPersonId?: string;
  documentEntrepriseId?: string;
  documentPropertyId?: string;
  documentBailId?: string;
  // Commun
  documentKind?: string;
  personIndex?: number; // Pour les documents de personne (ID_IDENTITY)
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
  documentClientId,
  documentPersonId,
  documentEntrepriseId,
  documentPropertyId,
  documentBailId,
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

  // Fonction pour uploader directement vers S3 avec URL signée
  const uploadFileToS3 = useCallback(async (
    file: File,
    signedUrl: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Suivi de progression réel avec XMLHttpRequest
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
          if (onUploadProgress) {
            onUploadProgress(percentComplete);
          }
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          if (onUploadProgress) {
            onUploadProgress(100);
          }
          resolve();
        } else {
          // Logger plus de détails pour le débogage
          console.error("[S3 Upload] Erreur détaillée:", {
            status: xhr.status,
            statusText: xhr.statusText,
            responseText: xhr.responseText,
          });
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText || xhr.responseText || 'Unknown error'}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed due to network error"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was aborted"));
      });

      // Upload PUT vers l'URL signée S3 (simple PUT sans Content-Type)
      // Ne pas définir Content-Type car il n'est pas signé dans l'URL
      xhr.open("PUT", signedUrl, true);
      
      // Ne pas définir de headers pour éviter les problèmes de correspondance
      // L'URL signée est une simple PUT sans contraintes
      xhr.send(file);
    });
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

    // Si documentKind est fourni, faire l'upload direct vers S3 avec URL signée
    if (documentKind) {
      setUploadingFile(file); // Stocker le fichier en cours d'upload
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStateChange?.(true);
      
      try {
        // 1. Récupérer l'URL signée S3 depuis le serveur
        const tokenResponse = await fetch("/api/blob/generate-upload-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            // Pour les intakes
            ...(uploadToken && { token: uploadToken }),
            // Pour les documents clients/propriétés
            ...(documentClientId && { clientId: documentClientId }),
            ...(documentPersonId && { personId: documentPersonId }),
            ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
            ...(documentPropertyId && { propertyId: documentPropertyId }),
            ...(documentBailId && { bailId: documentBailId }),
            // Commun
            fileName: file.name,
            contentType: file.type || "application/octet-stream",
            documentKind: documentKind,
          }),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          throw new Error(error.error || "Erreur lors de la récupération de l'URL signée");
        }

        const { signedUrl, fileKey, publicUrl } = await tokenResponse.json();

        // 2. Uploader directement vers S3 avec l'URL signée (progression réelle)
        // Ne pas envoyer Content-Type car il n'est pas signé dans l'URL
        await uploadFileToS3(file, signedUrl);

        // 3. Créer le document dans la DB via l'API générique
        const createDocResponse = await fetch("/api/documents/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Pour les intakes
            ...(uploadToken && { token: uploadToken }),
            // Pour les documents clients/propriétés
            ...(documentClientId && { clientId: documentClientId }),
            ...(documentPersonId && { personId: documentPersonId }),
            ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
            ...(documentPropertyId && { propertyId: documentPropertyId }),
            ...(documentBailId && { bailId: documentBailId }),
            // Données du document
            fileKey: publicUrl, // URL publique S3
            kind: documentKind,
            fileName: file.name,
            mimeType: file.type,
            size: file.size,
            label: file.name,
            ...(personIndex !== undefined && { personIndex }),
          }),
        });

        if (!createDocResponse.ok) {
          const error = await createDocResponse.json();
          console.warn("[FileUpload] Erreur lors de la création du document:", error);
          // Ne pas faire échouer l'upload si la création du document échoue
          // Le document sera créé lors du savePartialIntake pour les intakes
        } else {
          toast.success("Fichier uploadé avec succès");
        }
        
        if (onUploadComplete) {
          onUploadComplete(publicUrl);
        }

        // Déclencher l'événement pour recharger les documents
        if (uploadToken) {
          window.dispatchEvent(new CustomEvent(`document-uploaded-${uploadToken}`));
        }
        if (documentClientId) {
          window.dispatchEvent(new CustomEvent(`document-uploaded-client-${documentClientId}`));
        }
        if (documentPropertyId) {
          window.dispatchEvent(new CustomEvent(`document-uploaded-property-${documentPropertyId}`));
        }

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
      // Utiliser la même logique que handleFileChange
      if (documentKind) {
        setUploadingFile(file); // Stocker le fichier en cours d'upload
        setIsUploading(true);
        setUploadProgress(0);
        onUploadStateChange?.(true);
        
        try {
          // 1. Récupérer l'URL signée S3
          const tokenResponse = await fetch("/api/blob/generate-upload-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              // Pour les intakes
              ...(uploadToken && { token: uploadToken }),
              // Pour les documents clients/propriétés
              ...(documentClientId && { clientId: documentClientId }),
              ...(documentPersonId && { personId: documentPersonId }),
              ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
              ...(documentPropertyId && { propertyId: documentPropertyId }),
              ...(documentBailId && { bailId: documentBailId }),
              // Commun
              fileName: file.name,
              contentType: file.type || "application/octet-stream",
              documentKind: documentKind,
            }),
          });

          if (!tokenResponse.ok) {
            const error = await tokenResponse.json();
            throw new Error(error.error || "Erreur lors de la récupération de l'URL signée");
          }

          const { signedUrl, fileKey, publicUrl } = await tokenResponse.json();

          // 2. Uploader directement vers S3 avec l'URL signée
          // Ne pas envoyer Content-Type car il n'est pas signé dans l'URL
          await uploadFileToS3(file, signedUrl);

          // 3. Créer le document dans la DB
          const createDocResponse = await fetch("/api/documents/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // Pour les intakes
              ...(uploadToken && { token: uploadToken }),
              // Pour les documents clients/propriétés
              ...(documentClientId && { clientId: documentClientId }),
              ...(documentPersonId && { personId: documentPersonId }),
              ...(documentEntrepriseId && { entrepriseId: documentEntrepriseId }),
              ...(documentPropertyId && { propertyId: documentPropertyId }),
              ...(documentBailId && { bailId: documentBailId }),
              // Données du document
              fileKey: publicUrl,
              kind: documentKind,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
              label: file.name,
              ...(personIndex !== undefined && { personIndex }),
            }),
          });

          if (!createDocResponse.ok) {
            const error = await createDocResponse.json();
            console.warn("[FileUpload] Erreur lors de la création du document:", error);
          } else {
            toast.success("Fichier uploadé avec succès");
          }
          
          if (onUploadComplete) {
            onUploadComplete(publicUrl);
          }

          // Déclencher l'événement pour recharger les documents
          if (uploadToken) {
            window.dispatchEvent(new CustomEvent(`document-uploaded-${uploadToken}`));
          }
          if (documentClientId) {
            window.dispatchEvent(new CustomEvent(`document-uploaded-client-${documentClientId}`));
          }
          if (documentPropertyId) {
            window.dispatchEvent(new CustomEvent(`document-uploaded-property-${documentPropertyId}`));
          }

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
                  Veuillez ne pas quitter la page. Si une erreur se confronte a vous,{" "}
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
                  PDF, DOC, DOCX, JPG, PNG
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
                  PDF, DOC, JPG, PNG
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





















