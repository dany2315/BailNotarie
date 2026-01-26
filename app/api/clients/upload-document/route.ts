import { NextRequest, NextResponse } from "next/server";
import { DocumentKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { 
  updateClientCompletionStatus as calculateAndUpdateClientStatus 
} from "@/lib/utils/completion-status";
import { revalidatePath } from "next/cache";
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

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const file = formData.get("file") as File | null;
    const kind = formData.get("kind") as string | null;
    const personId = formData.get("personId") as string | null;
    const entrepriseId = formData.get("entrepriseId") as string | null;
    const clientIdParam = formData.get("clientId") as string | null;

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: "Aucun fichier fourni" },
        { status: 400 }
      );
    }

    if (!kind || !Object.values(DocumentKind).includes(kind as DocumentKind)) {
      return NextResponse.json(
        { error: "Type de document invalide" },
        { status: 400 }
      );
    }

    if (!personId && !entrepriseId && !clientIdParam) {
      return NextResponse.json(
        { error: "ID personne, entreprise ou client manquant" },
        { status: 400 }
      );
    }

    // Récupérer le clientId depuis Person, Entreprise ou directement depuis le paramètre
    let clientId: string | null = null;
    
    if (clientIdParam) {
      // Vérifier que le client existe
      const client = await prisma.client.findUnique({
        where: { id: clientIdParam },
        select: { id: true },
      });
      if (!client) {
        return NextResponse.json(
          { error: "Client introuvable" },
          { status: 404 }
        );
      }
      clientId = clientIdParam;
    } else if (personId) {
      const person = await prisma.person.findUnique({
        where: { id: personId },
        select: { clientId: true },
      });
      if (!person) {
        return NextResponse.json(
          { error: "Personne introuvable" },
          { status: 404 }
        );
      }
      clientId = person.clientId;
    } else if (entrepriseId) {
      const entreprise = await prisma.entreprise.findUnique({
        where: { id: entrepriseId },
        select: { clientId: true },
      });
      if (!entreprise) {
        return NextResponse.json(
          { error: "Entreprise introuvable" },
          { status: 404 }
        );
      }
      clientId = entreprise.clientId;
    }

    if (!clientId) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    // Générer un nom de fichier unique pour S3
    const fileKey = generateS3FileKey("documents", file.name, clientId);

    // Uploader le fichier vers S3
    const s3Result = await uploadFileToS3(
      file,
      fileKey,
      file.type || "application/octet-stream"
    );

    // Créer le document dans la base de données
    const document = await prisma.document.create({
      data: {
        kind: kind as DocumentKind,
        label: file.name,
        fileKey: s3Result.url, // URL publique S3
        mimeType: file.type,
        size: file.size,
        ...(personId && { personId }),
        ...(entrepriseId && { entrepriseId }),
        ...(clientIdParam && { clientId: clientIdParam }),
      },
    });

    // Mettre à jour le statut de complétion
    await calculateAndUpdateClientStatus(clientId);

    revalidatePath(`/interface/clients/${clientId}`);
    revalidatePath(`/interface/clients/${clientId}/edit`);

    return NextResponse.json({ 
      success: true, 
      document: {
        id: document.id,
        kind: document.kind,
        label: document.label,
        fileKey: document.fileKey,
        mimeType: document.mimeType,
      }
    });
  } catch (error: any) {
    console.error("Erreur lors de l'upload du document:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'upload du document" },
      { status: 500 }
    );
  }
}

