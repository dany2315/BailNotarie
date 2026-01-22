import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSignedUploadUrl, generateS3FileKey } from "@/lib/utils/s3-client";

/**
 * Route API pour générer une URL signée S3 pour upload direct côté client
 * Permet des uploads rapides directement vers S3 sans passer par le serveur
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      token: intakeToken,
      fileName,
      contentType = "application/octet-stream",
      documentKind,
    } = body;

    if (!intakeToken) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    if (!fileName) {
      return NextResponse.json(
        { error: "Nom de fichier manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token: intakeToken },
      select: { 
        id: true,
        status: true,
      },
    });

    if (!intakeLink) {
      return NextResponse.json(
        { error: "Lien d'intake introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le lien n'est pas révoqué
    if (intakeLink.status === "REVOKED") {
      return NextResponse.json(
        { error: "Ce lien a été révoqué" },
        { status: 403 }
      );
    }

    // Générer la clé S3 pour le fichier
    const fileKey = generateS3FileKey("intakes", fileName, intakeToken);

    // Générer l'URL signée pour upload (valide 1 heure)
    // URL signée simple PUT sans Content-Type ni checksum
    const signedUrl = await generateSignedUploadUrl(fileKey, undefined, 3600);

    // Générer l'URL publique du fichier S3 (après upload)
    const bucketName = process.env.AWS_S3_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "eu-west-3";
    const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;

    return NextResponse.json({
      signedUrl, // URL signée pour upload direct
      fileKey, // Clé S3 du fichier
      publicUrl, // URL publique S3 après upload
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

