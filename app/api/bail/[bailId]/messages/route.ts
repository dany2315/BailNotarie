import { NextRequest, NextResponse } from "next/server";
import { getBailMessages, sendBailMessage } from "@/lib/actions/bail-messages";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bailId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const bailId = resolvedParams.bailId;

    const messages = await getBailMessages(bailId);

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("Erreur lors de la récupération des messages:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la récupération des messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bailId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const bailId = resolvedParams.bailId;
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Le contenu du message est requis" },
        { status: 400 }
      );
    }

    const message = await sendBailMessage(bailId, content.trim());

    return NextResponse.json(message, { status: 201 });
  } catch (error: any) {
    console.error("Erreur lors de l'envoi du message:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'envoi du message" },
      { status: 500 }
    );
  }
}







