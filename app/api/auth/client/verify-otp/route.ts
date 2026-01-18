import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { message: "Email et code requis" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Trouver le code OTP valide
    const otpCode = await prisma.oTPCode.findFirst({
      where: {
        email: normalizedEmail,
        code,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpCode) {
      return NextResponse.json(
        { message: "Code invalide ou expiré" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe et est un client (UTILISATEUR)
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, role: true },
    });

    // Si pas de User, chercher un Client et créer le User
    if (!user) {
      // Chercher dans Person.email
      const person = await prisma.person.findUnique({
        where: { email: normalizedEmail },
        include: { client: true },
      });

      if (person && person.client) {
        const clientName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
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
          const clientName = entreprise.legalName || entreprise.name || null;
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

    if (!user || user.role !== Role.UTILISATEUR) {
      return NextResponse.json(
        { message: "Code invalide ou expiré" },
        { status: 400 }
      );
    }

    // Marquer le code comme utilisé
    await prisma.oTPCode.update({
      where: { id: otpCode.id },
      data: { used: true },
    });

    // Vérifier si l'utilisateur a un compte, sinon en créer un
    let account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    // Si pas de compte, en créer un (sans mot de passe pour les clients OTP)
    if (!account) {
      account = await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.email,
          // Pas de mot de passe pour les clients OTP
        },
      });
    }

    // Créer la session dans la base de données
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 jours

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      },
    });

    // Créer la réponse avec le cookie de session
    const response = NextResponse.json({
      success: true,
      message: "Connexion réussie",
    });

    // Better Auth utilise ce format de cookie
    // Le nom exact peut varier selon la version, mais généralement c'est "better-auth.session_token"
    response.cookies.set("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    });

    console.log("Session créée pour le client:", user.id, "Email:", normalizedEmail, "Token:", sessionToken.substring(0, 8) + "...");

    return response;
  } catch (error) {
    console.error("Erreur lors de la vérification de l'OTP:", error);
    return NextResponse.json(
      { message: "Erreur lors de la vérification du code" },
      { status: 500 }
    );
  }
}
