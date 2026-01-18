import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { pusherServer } from "@/lib/pusher";
import { canAccessBail } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Pusher envoie les données en format application/x-www-form-urlencoded
    let socket_id: string;
    let channel_name: string;
    
    const contentType = request.headers.get("content-type") || "";
    
    if (contentType.includes("application/json")) {
      const body = await request.json();
      socket_id = body.socket_id;
      channel_name = body.channel_name;
    } else {
      // Format application/x-www-form-urlencoded (format par défaut de Pusher)
      const formData = await request.formData();
      socket_id = formData.get("socket_id") as string;
      channel_name = formData.get("channel_name") as string;
    }

    if (!socket_id || !channel_name) {
      return NextResponse.json(
        { error: "socket_id et channel_name sont requis" },
        { status: 400 }
      );
    }

    // Vérifier que le channel est pour un bail auquel l'utilisateur a accès
    // Formats supportés: private-bail-{bailId} ou presence-bail-{bailId}
    const privateMatch = channel_name.match(/^private-bail-(.+)$/);
    const presenceMatch = channel_name.match(/^presence-bail-(.+)$/);
    
    const bailIdMatch = privateMatch || presenceMatch;
    const isPresenceChannel = !!presenceMatch;
    
    if (!bailIdMatch) {
      return NextResponse.json(
        { error: "Channel invalide" },
        { status: 400 }
      );
    }

    const bailId = bailIdMatch[1];

    // Vérifier les permissions selon le rôle de l'utilisateur
    let hasAccess = false;
    
    if (user.role === Role.UTILISATEUR) {
      hasAccess = await canAccessBail(user.id, bailId);
    } else if (user.role === Role.NOTAIRE) {
      // Vérifier que le notaire est assigné à ce bail
      const assignment = await prisma.dossierNotaireAssignment.findFirst({
        where: {
          bailId,
          notaireId: user.id,
        },
      });
      hasAccess = !!assignment;
    } else {
      // Admin peut accéder à tout
      hasAccess = user.role === Role.ADMINISTRATEUR;
    }

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 403 }
      );
    }

    // Pour les presence channels, on utilise authorizeChannel avec user_id et user_info
    // Pusher requiert ces informations pour tracker qui est connecté
    const presenceData = {
      user_id: user.id,
      user_info: {
        name: user.name || user.email || "",
        email: user.email,
        role: user.role || "",
      },
    };

    // authorizeChannel gère automatiquement les deux types de channels
    const auth = pusherServer.authorizeChannel(socket_id, channel_name, presenceData);

    return NextResponse.json(auth);
  } catch (error: any) {
    console.error("Erreur lors de l'authentification Pusher:", error);
    return NextResponse.json(
      { error: error.message || "Erreur d'authentification" },
      { status: 500 }
    );
  }
}
