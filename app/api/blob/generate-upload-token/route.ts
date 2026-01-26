import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSignedUploadUrl, generateS3FileKey } from "@/lib/utils/s3-client";
import { requireAuth } from "@/lib/auth-helpers";

/**
 * Route API pour générer une URL signée S3 pour upload direct côté client
 * Permet des uploads rapides directement vers S3 sans passer par le serveur
 * 
 * Supporte plusieurs contextes :
 * - Intakes : avec token (intakeLink) - PAS D'AUTHENTIFICATION REQUISE (formulaires publics)
 * - Documents clients : avec clientId, personId, ou entrepriseId (nécessite auth - interface notaire)
 * - Documents propriétés : avec propertyId (nécessite auth - interface notaire)
 * - Documents baux : avec bailId (nécessite auth - interface notaire)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { 
      token: intakeToken, // Pour les intakes
      fileName,
      contentType = "application/octet-stream",
      documentKind,
      // Pour les documents clients/propriétés (nécessite auth)
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

    let fileKey: string;
    let prefix: string;
    let identifier: string | undefined;

    // Cas 1: Upload pour intake (avec token) - PAS D'AUTHENTIFICATION REQUISE
    // Les utilisateurs publics peuvent uploader via leur token d'intake
    if (intakeToken) {
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

      prefix = "intakes";
      identifier = intakeToken;
    }
    // Cas 2: Upload pour documents clients/propriétés (nécessite auth)
    else {
      // Vérifier l'authentification pour les uploads de documents
      await requireAuth();

      // Déterminer le contexte et l'identifiant
      if (personId) {
        // Vérifier que la personne existe
        const person = await prisma.person.findUnique({
          where: { id: personId },
          select: { id: true, clientId: true },
        });
        if (!person) {
          return NextResponse.json(
            { error: "Personne introuvable" },
            { status: 404 }
          );
        }
        prefix = "documents";
        identifier = person.clientId;
      } else if (entrepriseId) {
        // Vérifier que l'entreprise existe
        const entreprise = await prisma.entreprise.findUnique({
          where: { id: entrepriseId },
          select: { id: true, clientId: true },
        });
        if (!entreprise) {
          return NextResponse.json(
            { error: "Entreprise introuvable" },
            { status: 404 }
          );
        }
        prefix = "documents";
        identifier = entreprise.clientId;
      } else if (clientId) {
        // Vérifier que le client existe
        const client = await prisma.client.findUnique({
          where: { id: clientId },
          select: { id: true },
        });
        if (!client) {
          return NextResponse.json(
            { error: "Client introuvable" },
            { status: 404 }
          );
        }
        prefix = "documents";
        identifier = clientId;
      } else if (propertyId) {
        // Vérifier que la propriété existe
        const property = await prisma.property.findUnique({
          where: { id: propertyId },
          select: { id: true },
        });
        if (!property) {
          return NextResponse.json(
            { error: "Propriété introuvable" },
            { status: 404 }
          );
        }
        prefix = "documents";
        identifier = propertyId;
      } else if (bailId) {
        // Vérifier que le bail existe
        const bail = await prisma.bail.findUnique({
          where: { id: bailId },
          select: { id: true },
        });
        if (!bail) {
          return NextResponse.json(
            { error: "Bail introuvable" },
            { status: 404 }
          );
        }
        // Utiliser "bail-messages" pour les messages de chat, "documents" pour les documents de bail
        prefix = documentKind ? "documents" : "bail-messages";
        identifier = bailId;
      } else {
        return NextResponse.json(
          { error: "Token, clientId, personId, entrepriseId, propertyId ou bailId requis" },
          { status: 400 }
        );
      }
    }

    // Générer la clé S3 pour le fichier
    fileKey = generateS3FileKey(prefix, fileName, identifier);

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

