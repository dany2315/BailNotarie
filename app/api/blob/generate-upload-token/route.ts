import { NextRequest, NextResponse } from "next/server";
import { generateSignedUploadUrl, generateS3FileKey } from "@/lib/utils/s3-client";
import { authorizeUploadTarget } from "@/lib/upload-access";

/**
 * Route API pour générer une URL signée S3 pour upload direct côté client
 * Permet des uploads rapides directement vers S3 sans passer par le serveur
 * 
 * Accès contrôlé par authorizeUploadTarget (lien d'intake en cours ou session autorisée sur la
 * cible). Tous les fichiers sont stockés dans "documents".
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      token: intakeToken, // Pour les intakes
      fileName,
      contentType = "application/octet-stream",
      documentKind,
      // Pour les documents clients/propriétés
      clientId,
      personId,
      entrepriseId,
      propertyId,
      bailId,
    } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: "Nom de fichier manquant" },
        { status: 400 }
      );
    }

    // Accès : lien d'intake en cours (identifiants limités à ce lien) ou utilisateur connecté
    // autorisé sur la cible (équipe, notaire attribué, client propriétaire de ses données).
    const access = await authorizeUploadTarget({ token: intakeToken, clientId, personId, entrepriseId, propertyId, bailId });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Générer la clé S3 pour le fichier (toujours dans "documents")
    const fileKey = generateS3FileKey(fileName);

    // Générer l'URL signée pour upload (valide 1 heure)
    // URL signée simple PUT sans Content-Type ni checksum
    const signedUrl = await generateSignedUploadUrl(fileKey, undefined, 3600);

    return NextResponse.json({
      signedUrl, // URL signée pour upload direct
      fileKey, // Clé S3 du fichier (à stocker dans la DB)
      expiresIn: 3600, // Durée de validité en secondes
    });
  } catch (error: any) {
    console.error("[generate-upload-token] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération de l'URL signée" },
      { status: 500 }
    );
  }
}

