import { NextRequest, NextResponse } from "next/server";
import { checkTightZone } from "@/lib/services/zone-tendue";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const inseeCode = searchParams.get("inseeCode");
    const propertyId = searchParams.get("propertyId");

    // Si on a un propertyId, récupérer son inseeCode d'abord
    if (propertyId) {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { inseeCode: true },
      });

      if (property?.inseeCode) {
        const result = await checkTightZone(property.inseeCode);
        return NextResponse.json({
          isTightZone: result.isTightZone,
          zoneTendue: result.zoneTendue,
        });
      } else {
        return NextResponse.json(
          { error: "Bien introuvable ou code INSEE manquant", isTightZone: false, zoneTendue: null },
          { status: 404 }
        );
      }
    }

    // Sinon, utiliser directement le code INSEE
    if (!inseeCode) {
      return NextResponse.json(
        { error: "Code INSEE ou propertyId requis", isTightZone: false, zoneTendue: null },
        { status: 400 }
      );
    }

    const result = await checkTightZone(inseeCode);

    return NextResponse.json({
      isTightZone: result.isTightZone,
      zoneTendue: result.zoneTendue,
    });
  } catch (error: any) {
    console.error("Erreur lors de la vérification de la zone tendue:", error);
    return NextResponse.json(
      { error: "Erreur lors de la vérification", isTightZone: false, zoneTendue: null },
      { status: 500 }
    );
  }
}

