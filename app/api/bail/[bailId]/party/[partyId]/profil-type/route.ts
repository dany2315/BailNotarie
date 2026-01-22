import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bailId: string; partyId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { bailId, partyId } = resolvedParams;

    // Vérifier l'accès au bail
    if (user.role === Role.UTILISATEUR) {
      // Pour un client, vérifier qu'il a accès à ce bail
      const userWithClientId = await prisma.user.findUnique({
        where: { id: user.id },
        select: { clientId: true },
      });

      if (userWithClientId?.clientId !== partyId) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 403 }
        );
      }
    } else if (user.role === Role.NOTAIRE) {
      // Pour un notaire, vérifier qu'il est assigné à ce bail
      const assignment = await prisma.dossierNotaireAssignment.findFirst({
        where: {
          bailId,
          notaireId: user.id,
        },
      });

      if (!assignment) {
        return NextResponse.json(
          { error: "Non autorisé" },
          { status: 403 }
        );
      }
    }

    // Récupérer le profilType de la partie
    const party = await prisma.client.findUnique({
      where: { id: partyId },
      select: { profilType: true },
    });

    if (!party) {
      return NextResponse.json(
        { error: "Partie introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profilType: party.profilType });
  } catch (error: any) {
    console.error("Erreur lors de la récupération du profilType:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du profilType" },
      { status: 500 }
    );
  }
}



