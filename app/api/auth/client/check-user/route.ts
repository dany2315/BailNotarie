import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis", exists: false, isClient: false },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier si un User existe avec cet email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, role: true },
    });

    if (user && user.role === Role.UTILISATEUR) {
      return NextResponse.json({
        exists: true,
        isClient: true,
      });
    }

    // Si pas de User, chercher dans Person.email
    const person = await prisma.person.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, clientId: true },
    });

    if (person) {
      return NextResponse.json({
        exists: true,
        isClient: true,
      });
    }

    // Chercher dans Entreprise.email
    const entreprise = await prisma.entreprise.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, clientId: true },
    });

    if (entreprise) {
      return NextResponse.json({
        exists: true,
        isClient: true,
      });
    }

    return NextResponse.json(
      { exists: false, isClient: false },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erreur lors de la vérification de l'utilisateur:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", exists: false, isClient: false },
      { status: 500 }
    );
  }
}








