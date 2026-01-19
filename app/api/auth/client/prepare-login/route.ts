import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Route API pour préparer la connexion d'un client
 * Crée le User si nécessaire AVANT que Better Auth ne vérifie son existence
 * 
 * Cette route doit être appelée avant authClient.emailOtp.sendVerificationOtp()
 * pour s'assurer que le User existe même si le Client n'a pas encore de compte User
 */
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

    // 1. Vérifier si un User existe déjà avec cet email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { 
        id: true, 
        email: true, 
        role: true,
        clientId: true
      },
    });

    // 2. Si User existe déjà et est UTILISATEUR → OK, continuer
    if (user && user.role === Role.UTILISATEUR) {
      return NextResponse.json({
        success: true,
        message: "User existe déjà",
        userCreated: false,
      });
    }

    // 3. Si User existe mais n'est pas UTILISATEUR → Erreur
    if (user && user.role !== Role.UTILISATEUR) {
      return NextResponse.json(
        { 
          error: "Cet email n'est pas associé à un compte client",
          success: false 
        },
        { status: 403 }
      );
    }

    // 4. Si aucun User n'existe, chercher un Client correspondant
    // 4a. Chercher dans Person.email
    const person = await prisma.person.findUnique({
      where: { email: normalizedEmail ,isPrimary: true },
      include: { client: true },
    });


    if (person && person.client) {
      // Créer un User pour ce Client
      const clientName = `${person.firstName || ""} ${person.lastName || ""}`.trim() || null;
      
      try {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            role: Role.UTILISATEUR,
            name: clientName,
            clientId: person.client.id,
            emailVerified: false,
          },
        });

        return NextResponse.json({
          success: true,
          message: "User créé avec succès",
          userCreated: true,
        });
      } catch (error: any) {
        // Si le User existe déjà (race condition), c'est OK
        if (error.code === "P2002") {
          return NextResponse.json({
            success: true,
            message: "User existe déjà (créé entre-temps)",
            userCreated: false,
          });
        }
        throw error;
      }
    }

    // 4b. Chercher dans Entreprise.email
    const entreprise = await prisma.entreprise.findUnique({
      where: { email: normalizedEmail },
      include: { client: true },
    });

    if (entreprise && entreprise.client) {
      // Créer un User pour ce Client
      const clientName = entreprise.legalName || entreprise.name || null;
      
      try {
        user = await prisma.user.create({
          data: {
            email: normalizedEmail,
            role: Role.UTILISATEUR,
            name: clientName,
            clientId: entreprise.client.id,
            emailVerified: false,
          },
        });

        return NextResponse.json({
          success: true,
          message: "User créé avec succès",
          userCreated: true,
        });
      } catch (error: any) {
        // Si le User existe déjà (race condition), c'est OK
        if (error.code === "P2002") {
          return NextResponse.json({
            success: true,
            message: "User existe déjà (créé entre-temps)",
            userCreated: false,
          });
        }
        throw error;
      }
    }

    // 5. Si aucun Client trouvé → Ne pas révéler l'information (sécurité)
    // On retourne success: false mais sans révéler que l'email n'existe pas
    return NextResponse.json(
      { 
        success: false,
        error: "Aucun compte trouvé pour cet email"
      },
      { status: 404 }
    );
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








