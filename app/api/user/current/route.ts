import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ProfilType } from "@prisma/client";

/**
 * API route pour récupérer l'utilisateur actuel avec ses informations client
 * Utilise getCurrentUser pour la vérification de session
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ user: null, isAuthenticated: false }, { status: 200 });
    }

    // Récupérer le clientId et profilType si l'utilisateur est un UTILISATEUR
    let clientId: string | null = null;
    let profilType: ProfilType | null = null;
    if (user.role === "UTILISATEUR") {
      try {
        const userWithClient = await prisma.user.findUnique({
          where: { id: user.id },
          select: { 
            clientId: true,
            client: {
              select: {
                profilType: true,
              },
            },
          },
        });
        clientId = userWithClient?.clientId || null;
        profilType = userWithClient?.client?.profilType || null;
      } catch (clientError) {
        console.error("Error getting client info:", clientError);
        // Continuer sans clientId/profilType plutôt que de faire échouer la requête
        clientId = null;
        profilType = null;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
        clientId,
        profilType,
      },
      isAuthenticated: true,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    return NextResponse.json(
      { user: null, isAuthenticated: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


