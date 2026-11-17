import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Route API pour préparer la connexion d'un client
 * Crée le User si nécessaire AVANT que Better Auth ne vérifie son existence
 *
 * Cette route doit être appelée avant authClient.emailOtp.sendVerificationOtp()
 * pour s'assurer que le User existe même si le Client n'a pas encore de compte User
 *
 * Elle répond toujours la même chose, quelle que soit l'adresse (client,
 * notaire, équipe ou inconnue) : elle ne doit pas servir d'annuaire (m41).
 * Better Auth n'envoie ensuite un code qu'à un compte existant.
 */
function sameAnswer() {
  return NextResponse.json({ success: true });
}

/** Crée le User d'un client qui n'a pas encore de compte (doublon simultané : déjà fait). */
async function createClientUser(email: string, name: string | null, clientId: string) {
  try {
    await prisma.user.create({
      data: {
        email,
        role: Role.UTILISATEUR,
        name,
        clientId,
        emailVerified: false,
      },
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email requis", success: false },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Un User existe déjà (client, notaire ou équipe) : rien à créer.
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (user) return sameAnswer();

    // 2. Pas de User : chercher un Client correspondant (personne principale)
    const person = await prisma.person.findUnique({
      where: { email: normalizedEmail, isPrimary: true },
      include: { client: true },
    });
    if (person && person.client) {
      const clientName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
      await createClientUser(normalizedEmail, clientName, person.client.id);
      return sameAnswer();
    }

    // 3. ... ou une entreprise
    const entreprise = await prisma.entreprise.findUnique({
      where: { email: normalizedEmail },
      include: { client: true },
    });
    if (entreprise && entreprise.client) {
      const clientName = entreprise.legalName || entreprise.name || null;
      await createClientUser(normalizedEmail, clientName, entreprise.client.id);
      return sameAnswer();
    }

    // 4. Adresse inconnue : même réponse.
    return sameAnswer();
  } catch (error: any) {
    console.error("Erreur lors de la préparation de la connexion:", error);
    return NextResponse.json(
      {
        error: "Erreur lors de la préparation de la connexion",
        success: false
      },
      { status: 500 }
    );
  }
}
