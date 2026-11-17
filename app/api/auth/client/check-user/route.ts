import { NextRequest, NextResponse } from "next/server";

/**
 * Ancienne vérification d'adresse avant l'envoi du code. Elle disait si une
 * adresse était celle d'un client, d'un notaire ou de l'équipe : n'importe qui
 * pouvait s'en servir d'annuaire. Elle répond désormais la même chose pour
 * toute adresse ; l'écran de connexion ne s'en sert plus (m41).
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }
  return NextResponse.json({ success: true });
}
