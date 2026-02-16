import { S3Client, ListObjectsV2Command, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeS3Key(fileKey: string | null | undefined): string | null {
  if (!fileKey) return null;

  // Cas 1: déjà une clé S3 du style "documents/xxx.pdf"
  if (!fileKey.startsWith("http://") && !fileKey.startsWith("https://")) {
    return fileKey.replace(/^\/+/, "");
  }

  // Cas 2: URL S3 ou CloudFront => on récupère le pathname
  try {
    const u = new URL(fileKey);
    return u.pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }
}

async function listAllS3Keys(params: {
  bucket: string;
  prefix?: string;
}): Promise<Set<string>> {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  const keys = new Set<string>();

  let ContinuationToken: string | undefined = undefined;

  while (true) {
    const res: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: params.bucket,
        Prefix: params.prefix,
        ContinuationToken,
        MaxKeys: 1000,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.add(obj.Key);
    }

    if (!res.IsTruncated) break;
    ContinuationToken = res.NextContinuationToken;
  }

  return keys;
}

async function main() {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  if (!bucket) throw new Error("Missing AWS_S3_BUCKET");

  // ➜ Mets ici les prefixes que tu veux auditer.
  // Si tu veux tout le bucket: mets prefix undefined.
  const prefixes = ["documents/", "intakes/"]; // adapte si besoin

  // 1) DB -> set de keys
  const dbDocs = await prisma.document.findMany({
    select: { id: true, fileKey: true },
  });

  const dbKeySet = new Set<string>();
  const dbByKey = new Map<string, string[]>(); // key -> [docId...]

  for (const d of dbDocs) {
    const key = normalizeS3Key(d.fileKey);
    if (!key) continue;
    dbKeySet.add(key);
    const arr = dbByKey.get(key) ?? [];
    arr.push(d.id);
    dbByKey.set(key, arr);
  }

  // 2) S3 -> set de keys
  const s3KeySet = new Set<string>();
  for (const prefix of prefixes) {
    const part = await listAllS3Keys({ bucket, prefix });
    for (const k of part) s3KeySet.add(k);
  }

  // 3) Diff
  const s3Orphans: string[] = [];
  for (const k of s3KeySet) {
    if (!dbKeySet.has(k)) s3Orphans.push(k);
  }

  const dbBroken: { id: string; fileKey: string }[] = [];
  for (const d of dbDocs) {
    const key = normalizeS3Key(d.fileKey);
    if (!key) continue;
    if (!s3KeySet.has(key)) dbBroken.push({ id: d.id, fileKey: d.fileKey! });
  }

  // 4) Affichage
  console.log("S3 OBJECTS (scanned):", s3KeySet.size);
  console.log("DB DOCUMENTS (scanned keys):", dbKeySet.size);

  console.log("\nS3 ORPHELINS (present S3, absent DB):", s3Orphans.length);
  console.log(JSON.stringify(s3Orphans, null, 2));

  console.log("\nDB CASSÉS (present DB, absent S3):", dbBroken.length);
  console.log(JSON.stringify(dbBroken, null, 2));

  // 5) (Optionnel) Détecter les doublons DB qui pointent vers la même key
  const dup = [...dbByKey.entries()].filter(([, ids]) => ids.length > 1);
  if (dup.length) {
    console.log("\nDOUBLONS DB (plusieurs rows pointent sur la même key):", dup.length);
    console.log(
      JSON.stringify(
        dup.map(([key, ids]) => ({ key, ids })),
        null,
        2
      )
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
