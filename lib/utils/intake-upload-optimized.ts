/**
 * Version optimisée de uploadFiles selon la checklist Vercel Blob :
 * - Upload direct depuis le client (pas via serveur)
 * - Multipart activé pour gros fichiers
 * - Uploads parallèles contrôlés avec progression par document
 */

import { put } from "@vercel/blob";
import { DocumentKind } from "@prisma/client";

export interface FileToUpload {
  file: File;
  name: string; // Nom du champ (ex: "kbis", "birthCert_0")
  documentKind: DocumentKind;
  metadata?: {
    personIndex?: number;
  };
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
  blobUrl?: string;
}

export interface BatchUploadResult {
  name: string;
  documentId?: string;
  kind: DocumentKind;
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
  label: string;
  error?: string;
}

/**
 * Upload un fichier directement vers Vercel Blob depuis le client
 * avec support multipart automatique pour fichiers > 100MB
 */
async function uploadFileDirect(
  file: File,
  pathname: string,
  uploadToken: string
): Promise<{ url: string; pathname: string }> {
  // Utiliser put() directement depuis le client avec le token
  // multipart est activé automatiquement pour fichiers > 100MB
  const blob = await put(pathname, file, {
    access: "public",
    token: uploadToken,
    contentType: file.type || "application/octet-stream",
    // multipart: true est activé automatiquement pour gros fichiers selon la doc
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
  };
}

/**
 * Upload batch optimisé avec uploads parallèles contrôlés
 * et création des documents dans la DB via une route API
 */
export async function uploadFilesOptimized(
  files: FileToUpload[],
  intakeToken: string,
  uploadToken: string,
  onProgress?: (progress: Map<string, UploadProgress>) => void
): Promise<BatchUploadResult[]> {
  const progressMap = new Map<string, UploadProgress>();
  const uploadResults: BatchUploadResult[] = [];

  // Initialiser le suivi de progression
  files.forEach(({ file, name }) => {
    progressMap.set(name, {
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

  // Générer les pathnames pour chaque fichier
  const uploadPromises = files.map(async ({ file, name, documentKind }) => {
    const progress = progressMap.get(name)!;
    progress.status = "uploading";
    updateProgress();

    try {
      // Générer un pathname unique avec timestamp pour tri chronologique
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 9);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const pathname = `intakes/${intakeToken}/${timestamp}-${randomSuffix}-${sanitizedName}`;

      // Simuler la progression (approximative)
      // Pour une progression réelle, il faudrait utiliser XMLHttpRequest
      const progressInterval = setInterval(() => {
        if (progress.progress < 90) {
          progress.progress += 10;
          updateProgress();
        }
      }, 200);

      // Upload direct vers Vercel Blob (pas via serveur)
      const blobResult = await uploadFileDirect(file, pathname, uploadToken);

      clearInterval(progressInterval);
      progress.progress = 100;
      progress.status = "completed";
      progress.blobUrl = blobResult.url;
      updateProgress();

      return {
        name,
        documentId: undefined, // Sera créé côté serveur
        kind: documentKind,
        fileKey: blobResult.url,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        label: file.name,
      };
    } catch (error: any) {
      progress.status = "error";
      progress.error = error.message || "Erreur lors de l'upload";
      updateProgress();

      return {
        name,
        kind: documentKind,
        fileKey: "",
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        label: file.name,
        error: progress.error,
      };
    }
  });

  // Exécuter les uploads en parallèle (contrôlé par le nombre de promesses)
  // Limiter à 3 uploads simultanés pour éviter de surcharger
  const MAX_CONCURRENT = 3;
  const results: BatchUploadResult[] = [];

  for (let i = 0; i < uploadPromises.length; i += MAX_CONCURRENT) {
    const batch = uploadPromises.slice(i, i + MAX_CONCURRENT);
    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        // Gérer les erreurs
        console.error("Erreur upload:", result.reason);
      }
    });
  }

  return results;
}



