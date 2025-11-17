import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { DocumentKind } from "@prisma/client";

// Configuration pour accepter les fichiers volumineux
// Les API routes dans Next.js App Router gèrent automatiquement les FormData
// Pas besoin de bodyParser: false car Next.js le gère automatiquement
export const maxDuration = 60; // 60 secondes pour les uploads volumineux
export const runtime = 'nodejs'; // Utiliser Node.js runtime pour les uploads

// Mapping des noms de fichiers aux types de documents
const FILE_TO_DOCUMENT_KIND: Record<string, DocumentKind> = {
  kbis: DocumentKind.KBIS,
  statutes: DocumentKind.STATUTES,
  birthCert: DocumentKind.BIRTH_CERT,
  idIdentity: DocumentKind.ID_IDENTITY,
  livretDeFamille: DocumentKind.LIVRET_DE_FAMILLE,
  contratDePacs: DocumentKind.CONTRAT_DE_PACS,
  diagnostics: DocumentKind.DIAGNOSTICS,
  titleDeed: DocumentKind.TITLE_DEED,
  reglementCopropriete: DocumentKind.REGLEMENT_COPROPRIETE,
  cahierChargeLotissement: DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT,
  statutAssociationSyndicale: DocumentKind.STATUT_DE_LASSOCIATION_SYNDICALE,
  insuranceOwner: DocumentKind.INSURANCE,
  ribOwner: DocumentKind.RIB,
  insuranceTenant: DocumentKind.INSURANCE,
  ribTenant: DocumentKind.RIB,
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Récupérer les paramètres depuis les query params ou le formData
    const token = formData.get("token") as string;
    const clientId = formData.get("clientId") as string | null;
    const propertyId = formData.get("propertyId") as string | null;
    const bailId = formData.get("bailId") as string | null;

    if (!token) {
      return NextResponse.json(
        { error: "Token manquant" },
        { status: 400 }
      );
    }

    // Vérifier que l'intakeLink existe
    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      include: {
        client: true,
        property: true,
        bail: true,
      },
    });

    if (!intakeLink) {
      return NextResponse.json(
        { error: "Lien d'intake introuvable" },
        { status: 404 }
      );
    }

    // Utiliser les IDs de l'intakeLink si non fournis
    const finalClientId = clientId || intakeLink.clientId;
    const finalPropertyId = propertyId || intakeLink.propertyId;
    const finalBailId = bailId || intakeLink.bailId;

    const uploadedDocuments: { name: string; documentId: string }[] = [];

    // Parcourir tous les fichiers dans le FormData
    for (const [name, value] of formData.entries()) {
      // Ignorer les champs qui ne sont pas des fichiers
      if (name === "token" || name === "clientId" || name === "propertyId" || name === "bailId") {
        continue;
      }

      const file = value as File;
      if (!file || file.size === 0) {
        continue;
      }

      const documentKind = FILE_TO_DOCUMENT_KIND[name];
      if (!documentKind) {
        console.warn(`Type de document inconnu pour: ${name}`);
        continue;
      }

      try {
        // Générer un nom de fichier unique
        const timestamp = Date.now();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileName = `intakes/${token}/${timestamp}-${sanitizedName}`;

        // Uploader le fichier vers Vercel Blob
        const blob = await put(fileName, file, {
          access: "public",
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        // Déterminer où attacher le document
        let targetClientId: string | null = null;
        let targetPropertyId: string | null = null;
        let targetBailId: string | null = null;

        // Documents client
        if (["kbis", "statutes", "birthCert", "idIdentity", "livretDeFamille", "contratDePacs","insuranceOwner", "ribOwner", "insuranceTenant", "ribTenant"].includes(name)) {
          targetClientId = finalClientId;
        }
        // Documents bien
        else if (["diagnostics", "titleDeed", "reglementCopropriete", "cahierChargeLotissement", "statutAssociationSyndicale"].includes(name)) {
          targetPropertyId = finalPropertyId;
        }

        // Créer le document dans la base de données
        const document = await prisma.document.create({
          data: {
            kind: documentKind,
            label: file.name,
            fileKey: blob.url,
            mimeType: file.type,
            size: file.size,
            clientId: targetClientId,
            propertyId: targetPropertyId,
            bailId: targetBailId,
          },
        });

        uploadedDocuments.push({
          name,
          documentId: document.id,
        });
      } catch (error) {
        console.error(`Erreur lors de l'upload du fichier ${name}:`, error);
        // Continuer avec les autres fichiers même si un échoue
      }
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
    });
  } catch (error: any) {
    console.error("Erreur lors de l'upload des fichiers:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload des fichiers" },
      { status: 500 }
    );
  }
}




