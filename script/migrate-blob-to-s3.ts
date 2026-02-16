import "dotenv/config";

import { list } from "@vercel/blob";
import type { ListBlobResult } from "@vercel/blob";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { appendFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const s3 = new S3Client({ region: process.env.AWS_REGION });
const prisma = new PrismaClient();

const LOG_FILE = "migration.log.jsonl";
const DUP_FILE = "migration.duplicates.jsonl";
const DB_UPDATE_FILE = "migration.db-updates.jsonl";

function log(step: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    step,
    ...data,
  });
  console.log(line);
  appendFileSync(LOG_FILE, line + "\n");
}

function logDup(data: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    type: "DUPLICATE_ON_S3",
    ...data,
  });
  appendFileSync(DUP_FILE, line + "\n");
}

function logDbUpdate(data: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    type: "DB_UPDATE",
    ...data,
  });
  appendFileSync(DB_UPDATE_FILE, line + "\n");
}

function guessContentType(blob: { contentType?: string; pathname: string }) {
  if (blob.contentType) return blob.contentType;
  if (blob.pathname.endsWith(".pdf")) return "application/pdf";
  if (blob.pathname.endsWith(".png")) return "image/png";
  if (blob.pathname.endsWith(".jpg") || blob.pathname.endsWith(".jpeg")) return "image/jpeg";
  if (blob.pathname.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}

/**
 * Génère un nouveau fileKey S3 avec la nomenclature uniforme
 * Pattern: documents/{timestamp}-{randomSuffix}-{sanitizedName}
 * 
 * Extrait le nom de fichier depuis le pathname Vercel Blob et génère un nouveau nom
 * avec la nomenclature standardisée.
 */
function generateNewS3FileKey(blob: { pathname: string }): string {
  // Extraire le nom de fichier depuis le pathname Vercel Blob
  // Exemples de pathnames Vercel Blob:
  // - "/intakes/token123/1704123456789-abc1234-document.pdf"
  // - "/documents/1704123456789-document.pdf"
  // - "/documents/lease.pdf"
  const pathname = blob.pathname.replace(/^\/+/, "");
  const fileName = pathname.split("/").pop() || "file";
  
  // Si le nom de fichier contient déjà un timestamp (format: timestamp-random-filename)
  // on extrait juste le nom de fichier final pour éviter la duplication
  const parts = fileName.split("-");
  let finalFileName = fileName;
  if (parts.length >= 3) {
    const timestampPart = parts[0];
    const randomPart = parts[1];
    // Vérifier si c'est un timestamp (nombre) et random (alphanumérique court)
    if (/^\d+$/.test(timestampPart) && /^[a-z0-9]{7}$/i.test(randomPart)) {
      // C'est déjà au format timestamp-random-filename, extraire juste le filename
      finalFileName = parts.slice(2).join("-");
    }
  }
  
  // Générer le nouveau fileKey avec la nomenclature uniforme
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const sanitizedName = finalFileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  
  return `documents/${timestamp}-${randomSuffix}-${sanitizedName}`;
}

// Note: On stocke maintenant uniquement la clé S3 dans la DB, pas l'URL complète
// L'URL publique peut être générée avec generateS3PublicUrl() de s3-client.ts si nécessaire

async function s3Exists(bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function uploadToS3FromUrl(downloadUrl: string, bucket: string, key: string, contentType: string) {
  log("DOWNLOAD_START", { key });

  const res = await fetch(downloadUrl);
  if (!res.ok || !res.body) {
    log("DOWNLOAD_FAILED", { key, status: res.status, downloadUrl });
    throw new Error(`Download failed ${res.status} for ${downloadUrl}`);
  }

  log("UPLOAD_START", { key, contentType });

  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: res.body as any, // stream web -> ok via lib-storage
      ContentType: contentType,
    },
  });

  await uploader.done();

  log("UPLOAD_DONE", { key });
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  if (!process.env.AWS_S3_BUCKET_NAME) throw new Error("Missing AWS_S3_BUCKET_NAME");
  if (!process.env.AWS_REGION) throw new Error("Missing AWS_REGION");

  const bucket = process.env.AWS_S3_BUCKET_NAME;

  const startedAt = Date.now();
  let cursor: string | undefined = undefined;

  let total = 0;
  let uploaded = 0;
  let skippedDup = 0;
  let failed = 0;

  log("MIGRATION_START", {
    bucket,
    region: process.env.AWS_REGION,
    dotenvPath: process.env.DOTENV_CONFIG_PATH ?? ".env (default)",
  });

  do {
    log("LIST_PAGE_START", { cursor: cursor ?? null });

    const page: ListBlobResult = await list({ cursor, limit: 1000 });
    cursor = page.cursor ?? undefined;

    log("LIST_PAGE_DONE", { count: page.blobs.length, nextCursor: cursor ?? null });

    for (const blob of page.blobs) {
      total++;

      const contentType = guessContentType(blob);
      
      // Générer le nouveau fileKey avec la nomenclature uniforme
      const newS3Key = generateNewS3FileKey(blob);
      // Note: On stocke maintenant uniquement la clé S3 dans la DB, pas l'URL complète

      if (!newS3Key) {
        failed++;
        log("INVALID_KEY", { index: total, blobPathname: blob.pathname, blobUrl: blob.url });
        continue;
      }

      // Ancien format pour référence dans les logs
      const oldS3Key = blob.pathname.replace(/^\/+/, "");

      log("FILE_START", {
        index: total,
        blobPathname: blob.pathname,
        blobUrl: blob.url,
        oldS3Key, // Ancien format (pour référence)
        newS3Key, // Nouveau format avec nomenclature uniforme
        size: blob.size ?? null,
        uploadedAt: (blob as any).uploadedAt ?? null,
      });

      // ✅ évite d'écraser (skip si existe déjà)
      const exists = await s3Exists(bucket, newS3Key);
      if (exists) {
        skippedDup++;
        log("SKIP_DUPLICATE", { 
          index: total, 
          newS3Key, 
          blobPathname: blob.pathname, 
          blobUrl: blob.url 
        });
        logDup({ 
          index: total, 
          newS3Key, 
          blobPathname: blob.pathname, 
          blobUrl: blob.url 
        });
        continue;
      }

      try {
        await uploadToS3FromUrl(blob.downloadUrl, bucket, newS3Key, contentType);
        uploaded++;
        log("FILE_DONE", { index: total, newS3Key, blobUrl: blob.url });

        // Mettre à jour la DB : trouver tous les documents avec l'ancien fileKey
        // Le fileKey dans la DB peut être soit blob.url (URL Vercel Blob) soit blob.pathname
      const updateResult = await prisma.document.updateMany({
        where: {
          OR: [
            { fileKey: blob.url }, // URL Vercel Blob complète
            { fileKey: blob.pathname }, // Pathname Vercel Blob
            { fileKey: { contains: blob.pathname } }, // Contient le pathname (pour les cas où c'est une URL complète)
          ],
        },
        data: {
          fileKey: newS3Key, // Clé S3 (pas l'URL complète)
          mimeType: contentType,
          ...(blob.size && { size: blob.size }),
        },
      });

        if (updateResult.count > 0) {
          log("DB_UPDATE_SUCCESS", {
            index: total,
            newS3Key,
            oldFileKey: blob.url,
            documentsUpdated: updateResult.count,
          });
          logDbUpdate({
            index: total,
            newS3Key,
            oldFileKey: blob.url,
            oldPathname: blob.pathname,
            documentsUpdated: updateResult.count,
          });
        } else {
          log("DB_UPDATE_NO_MATCH", {
            index: total,
            newS3Key,
            oldFileKey: blob.url,
            oldPathname: blob.pathname,
            message: "Aucun document trouvé avec cet ancien fileKey",
          });
        }
      } catch (err: any) {
        failed++;
        log("FILE_ERROR", {
          index: total,
          newS3Key,
          message: err?.message ?? String(err),
        });
        // ➜ continue pour ne pas bloquer toute la migration
        continue;
      }
    }
  } while (cursor);

  const durationMs = Date.now() - startedAt;

  log("MIGRATION_DONE", {
    total,
    uploaded,
    skippedDup,
    failed,
    durationMs,
  });

  // Fermer la connexion Prisma
  await prisma.$disconnect();
}

main().catch((e: any) => {
  log("MIGRATION_FATAL", { message: e?.message ?? String(e), stack: e?.stack ?? null });
  console.error(e);
  process.exit(1);
});
