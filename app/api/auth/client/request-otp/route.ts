import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailClientOTP from "@/emails/mail-client-otp";
import { Role } from "@prisma/client";

// Rate limiting simple : 3 demandes par heure par email
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): boolean {
  const now = Date.now();
  const key = email.toLowerCase();
  const limit = rateLimitMap.get(key);

  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60 * 60 * 1000 }); // 1 heure
    return true;
  }

  if (limit.count >= 3) {
    return false;
  }

  limit.count++;
  return true;
}

async function getClientName(clientId: string): Promise<string | null> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      persons: { where: { isPrimary: true }, take: 1 },
      entreprise: true,
    },
  });

  if (!client) return null;

  if (client.entreprise) {
    return client.entreprise.legalName || client.entreprise.name || null;
  }

  if (client.persons.length > 0) {
    const person = client.persons[0];
    return `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email requis" },
        { status: 400 }
      );
    }

    // Vérifier le rate limiting
    if (!checkRateLimit(email)) {
      return NextResponse.json(
        { message: "Trop de demandes. Veuillez réessayer dans une heure." },
        { status: 429 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Vérifier si un User existe déjà avec cet email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, role: true, name: true, clientId: true },
    });

    let clientName: string | null = null;

    // Si l'utilisateur existe et est UTILISATEUR
    if (user && user.role === Role.UTILISATEUR) {
      if (user.clientId) {
        clientName = await getClientName(user.clientId);
      }
    } else if (!user) {
      // Si aucun User n'existe, chercher un Client correspondant
      // Chercher dans Person.email
      const person = await prisma.person.findUnique({
        where: { email: normalizedEmail },
        include: { client: true },
      });

      if (person && person.client) {
        // Créer un User pour ce Client
        clientName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            role: Role.UTILISATEUR,
            name: clientName,
            clientId: person.client.id,
            emailVerified: false,
          },
        });
      } else {
        // Chercher dans Entreprise.email
        const entreprise = await prisma.entreprise.findUnique({
          where: { email: normalizedEmail },
          include: { client: true },
        });

        if (entreprise && entreprise.client) {
          // Créer un User pour ce Client
          clientName = entreprise.legalName || entreprise.name || null;
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              role: Role.UTILISATEUR,
              name: clientName,
              clientId: entreprise.client.id,
              emailVerified: false,
            },
          });
        }
      }
    }

    // Si aucun client trouvé, ne pas révéler l'information (sécurité)
    if (!user || user.role !== Role.UTILISATEUR) {
      return NextResponse.json({
        success: true,
        message: "Si cet email est enregistré, un code OTP a été envoyé.",
      });
    }

    // Générer un code OTP à 6 chiffres
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Marquer tous les codes précédents comme utilisés
    await prisma.oTPCode.updateMany({
      where: {
        email: normalizedEmail,
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Créer le nouveau code OTP
    await prisma.oTPCode.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt,
        used: false,
      },
    });

    // Envoyer l'email via Resend
    try {
      await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: normalizedEmail,
        subject: "Code de connexion - BailNotarie",
        react: MailClientOTP({
          userName: clientName || user.name || "Client",
          code,
        }),
      });
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email OTP:", emailError);
      // Ne pas révéler l'erreur à l'utilisateur
    }

    return NextResponse.json({
      success: true,
      message: "Si cet email est enregistré, un code OTP a été envoyé.",
    });
  } catch (error) {
    console.error("Erreur lors de la demande d'OTP:", error);
    return NextResponse.json(
      { message: "Erreur lors de la demande d'OTP" },
      { status: 500 }
    );
  }
}







