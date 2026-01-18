import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bailId: string; partyId: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const { bailId, partyId } = resolvedParams;

    // Vérifier que l'utilisateur est un notaire
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== Role.NOTAIRE) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Vérifier que le notaire est assigné à ce bail
    const assignment = await prisma.dossierNotaireAssignment.findFirst({
      where: {
        bailId,
        notaireId: session.user.id,
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer les IDs des utilisateurs de cette partie
    const party = await prisma.client.findUnique({
      where: { id: partyId },
      select: { users: { select: { id: true } } },
    });

    const userIds = party?.users.map(u => u.id) || [];

    return NextResponse.json({ userIds });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des IDs utilisateurs:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des IDs utilisateurs" },
      { status: 500 }
    );
  }
}







