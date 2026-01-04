/**
 * Utilitaire pour les uploads directs côté client vers Vercel Blob
 * Optimisé selon la checklist Vercel Blob :
 * - Upload direct depuis le client (pas via serveur)
 * - Multipart activé pour gros fichiers
 * - Uploads parallèles contrôlés avec progression par document
 */

import { put } from "@vercel/blob";

export interface UploadFile {
  file: File;
  pathname: string;
  metadata?: {
    documentKind?: string;
    clientId?: string;
    personIndex?: number;
    propertyId?: string;
  };
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  blobUrl?: string;
}

export interface BatchUploadOptions {
  files: UploadFile[];
  uploadToken: string; // Token d'upload généré côté serveur
  onProgress?: (progress: Map<string, UploadProgress>) => void;
  maxConcurrent?: number; // Nombre d'uploads parallèles (défaut: 3)
}

/**
 * Upload un fichier directement vers Vercel Blob depuis le client
 * avec support multipart automatique pour fichiers > 100MB
 */
export async function uploadFileDirect(
  file: File,
  pathname: string,
  uploadToken: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; pathname: string }> {
  // Utiliser put() directement depuis le client avec le token
  // multipart est activé automatiquement pour fichiers > 100MB
  const blob = await put(pathname, file, {
    access: "public",
    token: uploadToken,
    contentType: file.type || "application/octet-stream",
    // multipart: true est activé automatiquement pour gros fichiers
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

/**
 * Upload batch de fichiers en parallèle contrôlé
 * avec progression par document
 */
export async function batchUploadFiles(
  options: BatchUploadOptions
): Promise<Map<string, { url: string; pathname: string; error?: string }>> {
  const { files, uploadToken, onProgress, maxConcurrent = 3 } = options;
  
  const progressMap = new Map<string, UploadProgress>();
  const results = new Map<string, { url: string; pathname: string; error?: string }>();

  // Initialiser le suivi de progression
  files.forEach(({ file, pathname }) => {
    progressMap.set(pathname, {
      fileName: file.name,
      progress: 0,
      status: "pending",
    });
  });

  // Fonction pour mettre à jour la progression
  const updateProgress = () => {
    if (onProgress) {
      onProgress(new Map(progressMap));
    }
  };

  // Uploader les fichiers en parallèle contrôlé
  const uploadQueue: Promise<void>[] = [];
  let currentIndex = 0;

  const uploadNext = async (): Promise<void> => {
    while (currentIndex < files.length) {
      const index = currentIndex++;
      const { file, pathname } = files[index];
      
      const progress = progressMap.get(pathname)!;
      progress.status = "uploading";
      updateProgress();

      try {
        // Simuler la progression (approximative car put() ne fournit pas de callback de progression)
        // Pour une progression réelle, il faudrait utiliser XMLHttpRequest avec le token
        const progressInterval = setInterval(() => {
          if (progress.progress < 90) {
            progress.progress += 10;
            updateProgress();
          }
        }, 200);

        const result = await uploadFileDirect(file, pathname, uploadToken);
        
        clearInterval(progressInterval);
        progress.progress = 100;
        progress.status = "completed";
        progress.blobUrl = result.url;
        results.set(pathname, result);
        updateProgress();
      } catch (error: any) {
        progress.status = "error";
        progress.error = error.message || "Erreur lors de l'upload";
        results.set(pathname, { url: "", pathname, error: progress.error });
        updateProgress();
      }

      // Continuer avec le prochain fichier
      await uploadNext();
    }
  };

  // Lancer les uploads parallèles contrôlés
  for (let i = 0; i < Math.min(maxConcurrent, files.length); i++) {
    uploadQueue.push(uploadNext());
  }

  await Promise.allSettled(uploadQueue);

  return results;
}
















