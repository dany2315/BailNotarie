import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis", exists: false, isNotaire: false },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe et est un notaire
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return NextResponse.json(
        { exists: false, isNotaire: false },
        { status: 200 }
      );
    }

    const isNotaire = user.role === Role.NOTAIRE;

    return NextResponse.json({
      exists: true,
      isNotaire,
    });
  } catch (error: any) {
    console.error("Erreur lors de la vérification de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", exists: false, isNotaire: false },
      { status: 500 }
    );
  }
}


