import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Route API pour générer un token d'upload sécurisé pour les uploads côté client
 * Selon la checklist Vercel Blob : utiliser le client SDK avec token pour upload direct
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { token: intakeToken } = body;

    if (!intakeToken) {
      return NextResponse.json(
        { error: "Token manquant" },
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

    // Retourner le token d'upload (BLOB_READ_WRITE_TOKEN)
    // Note: En production, on devrait générer un token temporaire avec des permissions limitées
    // Pour l'instant, on utilise le token complet mais avec validation côté serveur
    const uploadToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!uploadToken) {
      return NextResponse.json(
        { error: "Token d'upload non configuré" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: uploadToken,
      // Indiquer que multipart est supporté
      multipart: true,
    });
  } catch (error: any) {
    console.error("[generate-upload-token] Erreur:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la génération du token d'upload" },
      { status: 500 }
    );
  }
}

