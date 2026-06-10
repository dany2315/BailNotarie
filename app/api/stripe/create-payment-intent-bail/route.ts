import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Récupérer les infos du client pour pré-remplir la facture Stripe
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        email: true,
        client: {
          select: {
            persons: {
              select: { firstName: true, lastName: true },
              take: 1,
            },
          },
        },
      },
    });

    const clientEmail = user?.email ?? undefined;
    const firstPerson = user?.client?.persons?.[0];
    const clientName = firstPerson
      ? `${firstPerson.firstName ?? ""} ${firstPerson.lastName ?? ""}`.trim()
      : undefined;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3990, // 39,90€ en centimes
      currency: "eur",
      payment_method_types: ["card", "klarna", "link"],
      receipt_email: clientEmail,
      metadata: {
        userId: session.user.id,
        clientName: clientName ?? "",
        source: "client_bail_creation",
      },
      description:
        "Frais de dossier BailNotarie — Constitution, vérification et transmission",
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("[Stripe] Erreur création PaymentIntent bail:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initialisation du paiement" },
      { status: 500 }
    );
  }
}
