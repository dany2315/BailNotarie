import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bailId: string }> }
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
    const bailId = resolvedParams.bailId;

    // Récupérer le clientId de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { clientId: true },
    });

    if (!user?.clientId) {
      return NextResponse.json(
        { error: "Client introuvable" },
        { status: 404 }
      );
    }

    return NextResponse.json({ clientId: user.clientId });
  } catch (error: any) {
    console.error("Erreur lors de la récupération du clientId:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du clientId" },
      { status: 500 }
    );
  }
}








