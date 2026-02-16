import "dotenv/config";

import { list } from "@vercel/blob";
import type { ListBlobResult } from "@vercel/blob";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { appendFileSync } from "fs";

const s3 = new S3Client({ region: process.env.AWS_REGION });

const LOG_FILE = "dryrun.log.jsonl";
const DUP_FILE = "dryrun.duplicates.jsonl";

function log(step: string, data: Record<string, any>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    step,
    ...data,
  });
  console.log(line);
  appendFileSync(LOG_FILE, line + "\n");
}

function logDup(data: Record<string, any>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    type: "DUPLICATE_ON_S3",
    ...data,
  });
  appendFileSync(DUP_FILE, line + "\n");
}

function buildS3Key(blob: { pathname: string }) {
  // garde exactement le même chemin/nom que Vercel Blob
  // ex: "/documents/lease.pdf" -> "documents/lease.pdf"
  return blob.pathname.replace(/^\/+/, "");
}

async function s3Exists(bucket: string, key: string) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err: any) {
    // NotFound => l'objet n'existe pas
    if (err?.name === "NotFound" || err?.$metadata?.httpStatusCode === 404) {
      return false;
    }
    // autre erreur => on remonte
    throw err;
  }
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");
  }
  if (!process.env.AWS_S3_BUCKET_NAME) {
    throw new Error("Missing AWS_S3_BUCKET_NAME");
  }
  if (!process.env.AWS_REGION) {
    throw new Error("Missing AWS_REGION");
  }

  const bucket = process.env.AWS_S3_BUCKET_NAME;

  log("DRYRUN_START", {
    bucket,
    region: process.env.AWS_REGION,
    dotenvPath: process.env.DOTENV_CONFIG_PATH ?? ".env (default)",
  });

  let cursor: string | undefined = undefined;
  let total = 0;
  let collisions = 0;
  let available = 0;

  do {
    log("LIST_PAGE_START", { cursor: cursor ?? null });

    const page: ListBlobResult = await list({ cursor, limit: 1000 });
    cursor = page.cursor ?? undefined;

    log("LIST_PAGE_DONE", {
      count: page.blobs.length,
      nextCursor: cursor ?? null,
    });

    for (const blob of page.blobs) {
      total++;
      const s3Key = buildS3Key(blob);

      log("CHECK_START", {
        index: total,
        blobPathname: blob.pathname,
        s3Key,
        blobUrl: blob.url,
        size: blob.size ?? null,
        uploadedAt: blob.uploadedAt ?? null,
      });

      const exists = await s3Exists(bucket, s3Key);

      if (exists) {
        collisions++;
        log("COLLISION", {
          index: total,
          s3Key,
          blobPathname: blob.pathname,
          blobUrl: blob.url,
        });
        logDup({
          index: total,
          s3Key,
          blobPathname: blob.pathname,
          blobUrl: blob.url,
        });
      } else {
        available++;
        log("OK_FREE", { index: total, s3Key });
      }
    }
  } while (cursor);

  log("DRYRUN_DONE", { total, available, collisions });
}

main().catch((e) => {
  log("DRYRUN_ERROR", {
    message: e?.message ?? String(e),
    stack: e?.stack ?? null,
  });
  console.error(e);
  process.exit(1);
});
