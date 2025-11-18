import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json(
        { message: "userId et role requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    // Mettre à jour le rôle
    await prisma.user.update({
      where: { id: userId },
      data: { role: role as any },
    });

    return NextResponse.json({
      success: true,
      message: "Rôle mis à jour avec succès",
    });
  } catch (error: any) {
    console.error("Update role error:", error);
    return NextResponse.json(
      { message: error.message || "Erreur lors de la mise à jour du rôle" },
      { status: 500 }
    );
  }
}













