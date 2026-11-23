// Accès aux fichiers des pièces du dossier notaire, partagé par le zip, le PDF complet et
// l'enregistrement dans un dossier. Toujours appelé après le contrôle d'accès de loadNotaireDossier.

import { extractS3KeyFromUrl, generateSignedDownloadUrl } from "@/lib/utils/s3-client";
import type { DossierDocument, NotaireDossierView } from "@/lib/notaire/dossier-view";

/** URL de lecture d'une pièce : URL signée S3, ou l'URL d'origine pour les anciens fichiers Vercel Blob. */
export async function documentReadUrl(doc: Pick<DossierDocument, "fileKey">, expiresIn = 600): Promise<string> {
  if (doc.fileKey.startsWith("http") && !doc.fileKey.includes("amazonaws.com")) return doc.fileKey;
  return generateSignedDownloadUrl(extractS3KeyFromUrl(doc.fileKey) || doc.fileKey, expiresIn);
}

/** Nom du dossier racine sur l'ordinateur du notaire. */
export function dossierRootName(view: Pick<NotaireDossierView, "address">): string {
  return `Dossier - ${view.address}`.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

/** Toutes les pièces avec leur chemin relatif (« 1 - Propriétaire - … / Pièce d'identité.pdf »). */
export function dossierFiles(view: Pick<NotaireDossierView, "documents">) {
  return view.documents.flatMap((group) =>
    group.documents.map((doc) => ({ group, doc, path: `${group.folder}/${doc.zipName}` })),
  );
}
