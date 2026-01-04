import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import MailNotaireOTP from "@/emails/mail-notaire-otp";

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

    // Vérifier que l'utilisateur existe et est un notaire
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, role: true, name: true },
    });

    if (!user) {
      // Ne pas révéler que l'email n'existe pas (sécurité)
      return NextResponse.json({
        success: true,
        message: "Si cet email est enregistré, un code OTP a été envoyé.",
      });
    }

    if (user.role !== "NOTAIRE") {
      // Ne pas révéler que l'email existe mais n'est pas notaire
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
        email: email.toLowerCase(),
        used: false,
      },
      data: {
        used: true,
      },
    });

    // Créer le nouveau code OTP
    await prisma.oTPCode.create({
      data: {
        email: email.toLowerCase(),
        code,
        expiresAt,
        used: false,
      },
    });

    // Envoyer l'email via Resend
    try {
      await resend.emails.send({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: email,
        subject: "Code de connexion - BailNotarie",
        react: MailNotaireOTP({
          userName: user.name || "Notaire",
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






