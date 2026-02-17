"use client";

import { useMemo } from "react";

/**
 * Hook pour obtenir l'URL publique S3 depuis une clé S3
 * Gère aussi les anciennes URLs complètes pour compatibilité
 */
export function useS3PublicUrl(fileKey: string | null | undefined): string | null {
  return useMemo(() => {
    if (!fileKey) return null;
    
    // Si c'est déjà une URL complète (ancien format), la retourner telle quelle
    if (fileKey.startsWith("http")) {
      return fileKey;
    }
    
    // Sinon, générer l'URL publique depuis la clé S3
    const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "";
    const region = process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-3";
    
    if (!bucket) {
      console.warn("[useS3PublicUrl] NEXT_PUBLIC_AWS_S3_BUCKET_NAME non défini");
      return fileKey; // Fallback : retourner la clé telle quelle
    }
    
    return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
  }, [fileKey]);
}

/**
 * Fonction utilitaire pour obtenir l'URL publique S3 depuis une clé S3
 * Peut être utilisée côté serveur ou client
 */
export function getS3PublicUrl(fileKey: string | null | undefined): string | null {
  if (!fileKey) return null;
  
  // Si c'est déjà une URL complète (ancien format), la retourner telle quelle
  if (fileKey.startsWith("http")) {
    return fileKey;
  }
  
  // Sinon, générer l'URL publique depuis la clé S3
  const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME || "";
  const region = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || "eu-west-3";
  
  if (!bucket) {
    console.warn("[getS3PublicUrl] AWS_S3_BUCKET_NAME non défini");
    return fileKey; // Fallback : retourner la clé telle quelle
  }
  
  return `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
}




