import { NextRequest, NextResponse } from "next/server";
import { getProperty } from "@/lib/actions/properties";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const property = await getProperty(resolvedParams.id);
    
    if (!property) {
      return NextResponse.json(
        { error: "Bien introuvable" },
        { status: 404 }
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


