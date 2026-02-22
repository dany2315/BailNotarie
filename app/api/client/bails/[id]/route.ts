import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getClientBailDetails } from "@/lib/actions/client-space";
import { getClientFromUser } from "@/lib/auth-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const resolvedParams = await params;
    const bailId = resolvedParams.id;

    const client = await getClientFromUser(user.id);
    if (!client) {
      return NextResponse.json({ error: "Client non trouvé" }, { status: 404 });
    }

    const bail = await getClientBailDetails(bailId, client.id);
    if (!bail) {
      return NextResponse.json({ error: "Bail non trouvé" }, { status: 404 });
    }

    return NextResponse.json(bail);
  } catch (error) {
    console.error("Erreur lors de la récupération du bail:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}


