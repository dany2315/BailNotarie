import { NextRequest, NextResponse } from "next/server";
import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { client } = await requireProprietaireAuth();
    const resolvedParams = await params;
    const propertyId = resolvedParams.id;

    // Récupérer le bien avec toutes les informations nécessaires
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        documents: {
          select: {
            id: true,
            kind: true,
            label: true,
            fileKey: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!property) {
      return NextResponse.json(
        { error: "Bien introuvable" },
        { status: 404 }
      );
    }

    // Vérifier que le bien appartient au client
    if (property.ownerId !== client.id) {
      return NextResponse.json(
        { error: "Non autorisé - Ce bien ne vous appartient pas" },
        { status: 403 }
      );
    }

    // Fonction helper pour sérialiser les Decimal
    const serializeDecimal = (value: any): any => {
      if (value && typeof value === 'object' && value.constructor?.name === 'Decimal') {
        return Number(value);
      }
      return value;
    };

    // Sérialiser la propriété pour convertir les Decimal en nombres
    const serializedProperty = JSON.parse(JSON.stringify(property, (key, value) => serializeDecimal(value)));

    return NextResponse.json(serializedProperty);
  } catch (error: any) {
    console.error("Erreur lors de la récupération du bien:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du bien" },
      { status: 500 }
    );
  }
}





