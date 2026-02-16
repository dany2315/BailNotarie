import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSignedUploadUrl, generateS3FileKey } from "@/lib/utils/s3-client";

/**
 * Route API pour générer une URL signée S3 pour upload direct côté client
 * Permet des uploads rapides directement vers S3 sans passer par le serveur
 * 
 * PAS D'AUTHENTIFICATION REQUISE - Tous les fichiers sont stockés dans "documents"
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

    // Validation : vérifier que l'entité existe avant de générer l'URL signée
    // Cas 1: Upload pour intake (avec token)
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
    }
    // Cas 2: Upload pour documents clients/propriétés
    else {
      // Déterminer le contexte et valider l'entité
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
      } else {
        return NextResponse.json(
          { error: "Token, clientId, personId, entrepriseId, propertyId ou bailId requis" },
          { status: 400 }
        );
      }
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

