import { NextRequest, NextResponse } from "next/server";
import { generateSignedDownloadUrl, extractS3KeyFromUrl } from "@/lib/utils/s3-client";
import { readableDocumentForFileKey } from "@/lib/document-access";
import { documentDownloadName } from "@/lib/document-download-name";
import { contentDisposition } from "@/lib/utils/document-filename";

/**
 * Route API pour générer une URL signée S3 pour la lecture/téléchargement de fichiers
 * Permet d'accéder aux fichiers S3 de manière sécurisée sans rendre le bucket public.
 * Le fichier doit appartenir à une pièce accessible à l'appelant (lien d'intake en cours, ou
 * session autorisée sur le dossier) : voir lib/document-access.ts.
 *
 * Renvoie aussi fileName, le nom lisible de la pièce (voir lib/document-download-name.ts), que
 * S3 propose au navigateur via Content-Disposition : `download: true` pour un téléchargement,
 * sinon un affichage dans la page. Le fichier stocké garde sa clé.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { fileKey, token, download } = body;

    if (!fileKey) {
      return NextResponse.json(
        { error: "fileKey manquant" },
        { status: 400 }
      );
    }

    // fileKey peut être soit une clé S3 (nouveau format) soit une URL complète (ancien format pour compatibilité)
    // extractS3KeyFromUrl gère les deux cas
    const s3Key = extractS3KeyFromUrl(fileKey) || fileKey;

    if (!s3Key) {
      return NextResponse.json(
        { error: "Impossible d'extraire la clé S3" },
        { status: 400 }
      );
    }

    const doc = await readableDocumentForFileKey([...new Set([fileKey, s3Key])], typeof token === "string" ? token : null);
    if (!doc) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const fileName = await documentDownloadName(doc.id);
    const disposition = fileName ? contentDisposition(fileName, download === true ? "attachment" : "inline") : undefined;

    // Générer l'URL signée pour téléchargement (valide 1 heure)
    const signedUrl = await generateSignedDownloadUrl(s3Key, 3600, disposition);

    return NextResponse.json({
      signedUrl,
      fileName,
      expiresIn: 3600,
    });
  } catch (error: any) {
    console.error("[get-signed-url] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération de l'URL signée" },
      { status: 500 }
    );
  }
}
