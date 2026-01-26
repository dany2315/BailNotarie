import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFileToS3, generateS3FileKey } from "@/lib/utils/s3-client";

/**
 * @deprecated Cet endpoint est obsolète. Utilisez l'upload direct via /api/blob/generate-upload-token
 * et /api/documents/create pour un meilleur performance (upload direct client → S3).
 * 
 * Conservé pour compatibilité avec d'éventuels anciens clients.
 */

// Configuration pour accepter les fichiers volumineux
export const maxDuration = 300; // 5 minutes pour les uploads volumineux (multipart)
export const runtime = 'nodejs'; // Utiliser Node.js runtime pour les uploads

// Fonction helper pour retry avec backoff exponentiel
async function retryUpload<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (i < maxRetries - 1) {
        // Attendre avant de réessayer avec backoff exponentiel
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError!;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Le client SDK envoie le fichier via FormData
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "Fichier manquant" },
        { status: 400 }
      );
    }

    // Récupérer les paramètres depuis les query params
    const token = request.nextUrl.searchParams.get("token");
    const clientId = request.nextUrl.searchParams.get("clientId");
    const propertyId = request.nextUrl.searchParams.get("propertyId");
    const documentKind = request.nextUrl.searchParams.get("documentKind");
    const personIndex = request.nextUrl.searchParams.get("personIndex")
      ? parseInt(request.nextUrl.searchParams.get("personIndex")!, 10)
      : undefined;

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe et est valide
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      select: { 
        id: true,
        clientId: true,
        propertyId: true,
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

    // Utiliser les IDs de l'intakeLink si non fournis
    const finalClientId = clientId || intakeLink.clientId;
    const finalPropertyId = propertyId || intakeLink.propertyId;

    // Valider le type MIME
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Type de fichier non autorisé: ${file.type}` },
        { status: 400 }
      );
    }

    // Générer la clé S3 pour le fichier
    const fileKey = generateS3FileKey("intakes", file.name, token);

    // Uploader le fichier vers S3 avec retry logic
    const s3Result = await retryUpload(async () => {
      return await uploadFileToS3(
        file,
        fileKey,
        file.type || "application/octet-stream"
      );
    });

    // Créer le document dans la base de données
    try {
      const intakeToken = token;
      const docClientId = finalClientId;
      const docPropertyId = finalPropertyId;
      const kind = documentKind;
      const pIndex = personIndex;

      if (!kind) {
        console.warn("[blob/upload] documentKind manquant");
        return NextResponse.json(
          { error: "documentKind manquant" },
          { status: 400 }
        );
      }

      // Récupérer le client avec ses personnes et entreprise
      const client = docClientId ? await prisma.client.findUnique({
        where: { id: docClientId },
        include: {
          persons: {
            orderBy: { isPrimary: 'desc' },
          },
          entreprise: true,
        },
      }) : null;

      // Déterminer où attacher le document
      let targetPersonId: string | null = null;
      let targetEntrepriseId: string | null = null;
      let targetClientId: string | null = null;

      // Documents par personne (ID_IDENTITY)
      if (kind === "ID_IDENTITY") {
        const personIdx = pIndex !== undefined ? pIndex : 0;
        if (client && client.persons && client.persons.length > personIdx) {
          targetPersonId = client.persons[personIdx].id;
        } else if (client && client.persons && client.persons.length > 0) {
          targetPersonId = client.persons[0].id;
        }
      }
      // Documents entreprise (KBIS et STATUTES)
      else if (kind === "KBIS" || kind === "STATUTES") {
        if (client && client.entreprise) {
          targetEntrepriseId = client.entreprise.id;
        }
      }
      // Documents bien (PROPERTY) - diagnostics, titre de propriété, etc.
      // Documents INSURANCE et RIB : attachés au Property pour les propriétaires, au Client pour les locataires
      else if (kind === "INSURANCE" || kind === "RIB") {
        // Vérifier le profilType du client pour déterminer si c'est un propriétaire
        if (client && client.profilType === "PROPRIETAIRE") {
          // Sera géré dans targetPropertyId ci-dessous
        } else {
          // Pour les locataires, attacher au Client
          targetClientId = docClientId;
        }
      }
      // Documents client (livret de famille, PACS)
      else {
        targetClientId = docClientId;
      }

      // Déterminer targetPropertyId pour les documents de bien
      let targetPropertyId: string | null = null;
      if (["DIAGNOSTICS", "TITLE_DEED", "REGLEMENT_COPROPRIETE", "CAHIER_DE_CHARGE_LOTISSEMENT", "STATUT_DE_LASSOCIATION_SYNDICALE"].includes(kind)) {
        targetPropertyId = docPropertyId || null;
      } else if ((kind === "INSURANCE" || kind === "RIB") && client && client.profilType === "PROPRIETAIRE") {
        // Pour les propriétaires, INSURANCE et RIB sont attachés au Property
        targetPropertyId = docPropertyId || null;
      }

      // Vérifier si le document existe déjà
      const whereCondition: any = {
        fileKey: s3Result.url,
        kind: kind as any,
      };

      if (targetPersonId) {
        whereCondition.personId = targetPersonId;
      }
      if (targetEntrepriseId) {
        whereCondition.entrepriseId = targetEntrepriseId;
      }
      if (targetClientId) {
        whereCondition.clientId = targetClientId;
        if (!targetPersonId && !targetEntrepriseId) {
          whereCondition.personId = null;
          whereCondition.entrepriseId = null;
        }
      }
      if (targetPropertyId) {
        whereCondition.propertyId = targetPropertyId;
      }

      const existingDoc = await prisma.document.findFirst({
        where: whereCondition,
      });

      if (!existingDoc) {
        // Créer le document dans la base de données
        const documentData: any = {
          kind: kind as any,
          label: file.name,
          fileKey: s3Result.url, // URL publique S3
          mimeType: file.type,
          size: file.size,
          uploadedById: null, // Sera mis à jour lors du savePartialIntake
        };

        if (targetPersonId) {
          documentData.personId = targetPersonId;
        }
        if (targetEntrepriseId) {
          documentData.entrepriseId = targetEntrepriseId;
        }
        if (targetClientId) {
          documentData.clientId = targetClientId;
        }
        if (targetPropertyId) {
          documentData.propertyId = targetPropertyId;
        }

        await prisma.document.create({
          data: documentData,
        });

        console.log(`[blob/upload] Document créé: ${kind} pour ${intakeToken}`);
      } else {
        console.log(`[blob/upload] Document existe déjà: ${kind} pour ${intakeToken}`);
      }
    } catch (error) {
      console.error("[blob/upload] Erreur lors de la création du document:", error);
      // Ne pas faire échouer l'upload si la création du document échoue
      // Le document sera créé lors du savePartialIntake
    }

    // Retourner la réponse avec les informations S3
    return NextResponse.json({
      url: s3Result.url,
      fileKey: s3Result.fileKey,
      size: file.size,
    });
  } catch (error: any) {
    console.error("[blob/upload] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération du token d'upload" },
      { status: 500 }
    );
  }
}

