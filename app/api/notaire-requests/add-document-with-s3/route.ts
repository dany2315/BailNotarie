import { NextRequest, NextResponse } from "next/server";
import { addDocumentToNotaireRequestWithS3Urls } from "@/lib/actions/bail-messages";

/**
 * Route API pour ajouter des documents à une demande avec fichiers uploadés directement vers S3
 * Accepte les URLs publiques S3 au lieu de FormData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      requestId,
      files, // Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }>
    } = body;

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId est requis" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Au moins un fichier est requis" },
        { status: 400 }
      );
    }

    const document = await addDocumentToNotaireRequestWithS3Urls(
      requestId,
      files
    );

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        label: document.label,
        fileKey: document.fileKey,
      },
    });
  } catch (error: any) {
    console.error("[notaire-requests/add-document-with-s3] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'ajout du document" },
      { status: 500 }
    );
  }
}








