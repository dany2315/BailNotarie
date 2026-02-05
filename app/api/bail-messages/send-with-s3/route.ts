import { NextRequest, NextResponse } from "next/server";
import { sendBailMessageWithS3Urls } from "@/lib/actions/bail-messages";

/**
 * Route API pour envoyer un message avec fichiers uploadés directement vers S3
 * Accepte les URLs publiques S3 au lieu de FormData
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      bailId,
      files, // Array<{ publicUrl: string; fileName: string; mimeType: string; size: number }>
      content,
      recipientPartyId,
    } = body;

    if (!bailId) {
      return NextResponse.json(
        { error: "bailId est requis" },
        { status: 400 }
      );
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "Au moins un fichier est requis" },
        { status: 400 }
      );
    }

    const message = await sendBailMessageWithS3Urls(
      bailId,
      files,
      content || "",
      recipientPartyId
    );

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
        document: message.document,
      },
    });
  } catch (error: any) {
    console.error("[bail-messages/send-with-s3] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}








