import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

    // Trouver le code OTP valide
    const otpCode = await prisma.oTPCode.findFirst({
      where: {
        email: email.toLowerCase(),
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

    // Vérifier que l'utilisateur existe et est un notaire
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, role: true },
    });

    if (!user || user.role !== "NOTAIRE") {
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

    // Créer une session Better Auth en utilisant l'API interne
    // Better Auth nécessite un Account pour créer une session
    // Vérifier si l'utilisateur a un compte, sinon en créer un
    let account = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "credential",
      },
    });

    // Si pas de compte, en créer un (sans mot de passe pour les notaires OTP)
    if (!account) {
      account = await prisma.account.create({
        data: {
          userId: user.id,
          providerId: "credential",
          accountId: user.email,
          // Pas de mot de passe pour les notaires OTP
        },
      });
    }

    // Utiliser l'API Better Auth pour créer une session
    // On va créer une session via l'endpoint Better Auth
    // Pour cela, on doit appeler l'API Better Auth avec les bons headers
    const requestHeaders = new Headers(request.headers);
    
    // Créer une session via l'API Better Auth
    // Better Auth utilise son propre système de création de session
    // On va créer la session manuellement mais utiliser l'API Better Auth pour définir le cookie
    try {
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

      // Utiliser l'API Better Auth pour définir le cookie correctement
      // On crée une réponse et on utilise l'API Better Auth pour gérer les cookies
      const response = NextResponse.json({
        success: true,
        message: "Connexion réussie",
      });

      // Better Auth utilise ce format de cookie (vérifié dans la doc)
      // Le nom du cookie est défini par Better Auth
      response.cookies.set("better-auth.session_token", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
      });

      console.log("Session créée pour l'utilisateur:", user.id, "Token:", sessionToken.substring(0, 8) + "...");

      return response;
    } catch (error) {
      console.error("Erreur lors de la création de session:", error);
      throw error;
    }
  } catch (error) {
    console.error("Erreur lors de la vérification de l'OTP:", error);
    return NextResponse.json(
      { message: "Erreur lors de la vérification du code" },
      { status: 500 }
    );
  }
}

