import { NextRequest, NextResponse } from "next/server";
import { getDossierAnnexDocuments } from "@/lib/actions/notaires";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const dossierId = resolvedParams.id;

    const documents = await getDossierAnnexDocuments(dossierId);

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des documents annexes:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des documents annexes" },
      { status: 500 }
    );
  }
}








