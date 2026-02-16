"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

/**
 * Hook pour télécharger des fichiers depuis S3 avec URLs signées
 * Utilise des URLs signées pour la sécurité et la cohérence avec le système de preview
 * Supporte le suivi individuel par fileKey pour éviter que tous les boutons ne passent en loading
 */
export function useDownloadFile() {
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);

  // Rétrocompatibilité : true si un téléchargement est en cours (peu importe lequel)
  const isDownloading = downloadingKey !== null;

  // Vérifier si un fichier spécifique est en cours de téléchargement
  const isFileDownloading = useCallback(
    (fileKey: string) => downloadingKey === fileKey,
    [downloadingKey]
  );

  const downloadFile = async (fileKey: string, fileName: string) => {
    if (typeof window === "undefined") {
      toast.error("Téléchargement non disponible");
      return;
    }

    setDownloadingKey(fileKey);
    try {
      // Toujours essayer d'obtenir une URL signée (fonctionne avec clé S3 ou URL complète)
      let downloadUrl = fileKey;
      
      try {
        const response = await fetch("/api/blob/get-signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileKey }),
        });

        if (response.ok) {
          const { signedUrl } = await response.json();
          downloadUrl = signedUrl;
        }
      } catch (error) {
        // Fallback : si c'est une URL complète (ancien format), utiliser directement
        if (fileKey?.startsWith("http")) {
          downloadUrl = fileKey;
        } else {
          // Sinon, générer l'URL publique depuis la clé S3
          const { getS3PublicUrl } = await import("./use-s3-public-url");
          downloadUrl = getS3PublicUrl(fileKey) || fileKey;
        }
        console.warn("[useDownloadFile] Impossible d'obtenir une URL signée, utilisation de l'URL publique");
      }
      
      // Télécharger le fichier
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
      console.error("[useDownloadFile] Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement du document");
    } finally {
      setDownloadingKey(null);
    }
  };

  return { downloadFile, isDownloading, isFileDownloading };
}

