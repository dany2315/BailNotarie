import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProfilType } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    // Pas d'annuaire public des e-mails : formulaire d'intake en cours ou utilisateur connecté.
    const link = typeof token === "string" && token
      ? await prisma.intakeLink.findUnique({ where: { token }, select: { status: true } })
      : null;
    if (link?.status !== "PENDING" && !(await getCurrentUser())) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email manquant ou invalide" },
        { status: 400 }
      );
    }

    const existingPerson = await prisma.person.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
      },
    });
    const existingEntreprise = await prisma.entreprise.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
      },
    });


    if (existingPerson || existingEntreprise) {
      return NextResponse.json({ exists: true });
    }

    return NextResponse.json({ exists: false });
  } catch (error: any) {
    console.error("Erreur lors de la vérification de l'email:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la vérification de l'email" },
      { status: 500 }
    );
  }
}












