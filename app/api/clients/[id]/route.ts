import { NextRequest, NextResponse } from "next/server";
import { getClient } from "@/lib/actions/clients";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const client = await getClient(resolvedParams.id);
    
    if (!client) {
      return NextResponse.json(
        { error: "Client introuvable" },
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

    // Sérialiser le client pour convertir les Decimal en nombres
    const serializedClient = JSON.parse(JSON.stringify(client, (key, value) => serializeDecimal(value)));

    return NextResponse.json(serializedClient);
  } catch (error: any) {
    console.error("Erreur lors de la récupération du client:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération du client" },
      { status: 500 }
    );
  }
}

















