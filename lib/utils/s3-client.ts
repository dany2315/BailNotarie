/**
 * Utilitaire pour les uploads vers AWS S3 avec URLs signées
 * Permet des uploads directs et rapides depuis le client
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuration du client S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-west-3",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";

export interface S3UploadOptions {
  fileName: string;
  contentType?: string;
  expiresIn?: number; // Durée de validité de l'URL signée en secondes (défaut: 1 heure)
}

export interface S3UploadResult {
  url: string; // URL publique du fichier uploadé
  fileKey: string; // Clé S3 du fichier
  signedUrl?: string; // URL signée pour upload (si générée)
}

/**
 * Génère une URL signée pour upload direct vers S3 (simple PUT sans checksum)
 * Le client peut utiliser cette URL pour uploader directement sans passer par le serveur
 * Note: Content-Type n'est pas inclus dans la signature pour éviter les problèmes de correspondance
 */
export async function generateSignedUploadUrl(
  fileKey: string,
  contentType?: string, // Optionnel, non utilisé dans la signature
  expiresIn: number = 3600 // 1 heure par défaut
): Promise<string> {
  // URL signée simple PUT sans Content-Type ni autres contraintes
  // Cela évite les problèmes de correspondance exacte du Content-Type côté client
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    // Ne pas inclure Content-Type dans la commande pour une URL signée simple
    // Le Content-Type peut être défini côté client si nécessaire, mais n'est pas requis
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error: any) {
    console.error("[S3] Erreur lors de la génération de l'URL signée:", error);
    throw new Error(`Erreur lors de la génération de l'URL signée: ${error.message}`);
  }
}

/**
 * Upload un fichier vers S3 depuis le serveur
 * Utilisé pour les uploads via serveur (fallback)
 */
export async function uploadFileToS3(
  file: File | Buffer,
  fileKey: string,
  contentType?: string
): Promise<S3UploadResult> {
  let body: Buffer;
  if (file instanceof File) {
    const arrayBuffer = await file.arrayBuffer();
    body = Buffer.from(arrayBuffer);
  } else {
    body = file;
  }
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: body,
    ContentType: contentType || "application/octet-stream",
    // ACL: "public-read", // Si vous voulez que les fichiers soient publics
  });

  await s3Client.send(command);

  // Générer l'URL publique du fichier S3
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "eu-west-3"}.amazonaws.com/${fileKey}`;

  return {
    url,
    fileKey,
  };
}

/**
 * Génère une URL signée pour téléchargement (lecture)
 */
export async function generateSignedDownloadUrl(
  fileKey: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
}

/**
 * Upload un fichier directement depuis le client vers S3 en utilisant une URL signée
 * Cette fonction est appelée côté client après avoir obtenu l'URL signée
 */
export async function uploadFileDirectToS3(
  file: File,
  signedUrl: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Suivi de progression
    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Upload failed due to network error"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload was aborted"));
    });

    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.send(file);
  });
}

/**
 * Génère un nom de fichier unique pour S3
 */
export function generateS3FileKey(
  prefix: string,
  fileName: string,
  token?: string
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  if (token) {
    return `${prefix}/${token}/${timestamp}-${randomSuffix}-${sanitizedName}`;
  }
  return `${prefix}/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

/**
 * Supprime un fichier de S3
 */
export async function deleteFileFromS3(fileKey: string): Promise<void> {
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
  });

  await s3Client.send(command);
}

/**
 * Extrait la clé S3 depuis une URL publique S3
 */
export function extractS3KeyFromUrl(url: string): string | null {
  try {
    if (!url) return null;
    
    // Si c'est déjà une clé (pas une URL complète)
    if (!url.startsWith("http")) {
      return url;
    }
    
    // Pattern pour les URLs S3 : https://bucket-name.s3.region.amazonaws.com/key
    // ou https://s3.region.amazonaws.com/bucket-name/key
    const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "eu-west-3";
    
    // Pattern 1: https://bucket.s3.region.amazonaws.com/key
    const pattern1 = new RegExp(`https://${bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.s3\\.${region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.amazonaws\\.com/(.+)`);
    let match = url.match(pattern1);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    
    // Pattern 2: https://s3.region.amazonaws.com/bucket/key
    const pattern2 = new RegExp(`https://s3\\.${region.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.amazonaws\\.com/${bucketName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/(.+)`);
    match = url.match(pattern2);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    
    // Pattern 3: Essayer d'extraire après le dernier slash après amazonaws.com
    const amazonawsIndex = url.indexOf('amazonaws.com/');
    if (amazonawsIndex !== -1) {
      const keyPart = url.substring(amazonawsIndex + 'amazonaws.com/'.length);
      // Enlever le bucket name si présent au début
      const key = keyPart.startsWith(bucketName + '/') 
        ? keyPart.substring(bucketName.length + 1)
        : keyPart;
      return decodeURIComponent(key);
    }
    
    return null;
  } catch (error) {
    console.error("[extractS3KeyFromUrl] Erreur:", error);
    return null;
  }
}

/**
 * Vérifie que la configuration S3 est valide
 */
export function validateS3Config(): boolean {
  return !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET_NAME &&
    process.env.AWS_REGION
  );
}

