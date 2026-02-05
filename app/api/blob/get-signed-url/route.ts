import { NextRequest, NextResponse } from "next/server";
import { generateSignedDownloadUrl, extractS3KeyFromUrl } from "@/lib/utils/s3-client";

/**
 * Route API pour générer une URL signée S3 pour la lecture/téléchargement de fichiers
 * Permet d'accéder aux fichiers S3 de manière sécurisée sans rendre le bucket public
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { fileKey } = body;

    if (!fileKey) {
      return NextResponse.json(
        { error: "fileKey manquant" },
        { status: 400 }
      );
    }

    // Extraire la clé S3 depuis l'URL si c'est une URL complète
    const s3Key = extractS3KeyFromUrl(fileKey) || fileKey;

    if (!s3Key) {
      return NextResponse.json(
        { error: "Impossible d'extraire la clé S3" },
        { status: 400 }
      );
    }

    // Générer l'URL signée pour téléchargement (valide 1 heure)
    const signedUrl = await generateSignedDownloadUrl(s3Key, 3600);

    return NextResponse.json({
      signedUrl,
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








