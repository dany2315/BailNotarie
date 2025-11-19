import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProfilType } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email manquant ou invalide" },
        { status: 400 }
      );
    }

    // Vérifier si un client avec cet email existe déjà
    const existingClient = await prisma.client.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        profilType: true,
      },
    });

    if (existingClient) {
      return NextResponse.json({
        exists: true,
        client: existingClient,
      });
    }

    return NextResponse.json({
      exists: false,
    });
  } catch (error: any) {
    console.error("Erreur lors de la vérification de l'email:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification de l'email" },
      { status: 500 }
    );
  }
}

