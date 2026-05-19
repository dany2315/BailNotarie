import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        stripePaymentIntentId: true,
        client: {
          select: {
            persons: { select: { email: true, firstName: true, lastName: true }, take: 1 },
          },
        },
      },
    });

    if (!intakeLink) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (intakeLink.status !== "PENDING") {
      return NextResponse.json(
        { error: "Ce dossier a déjà été soumis" },
        { status: 400 }
      );
    }

    const firstPerson = intakeLink.client?.persons?.[0];
    const clientEmail = firstPerson?.email ?? undefined;
    const clientName = firstPerson
      ? `${firstPerson.firstName ?? ""} ${firstPerson.lastName ?? ""}`.trim()
      : undefined;

    // Réutiliser un PaymentIntent existant non finalisé
    if (intakeLink.stripePaymentIntentId) {
      try {
        const existing = await stripe.paymentIntents.retrieve(
          intakeLink.stripePaymentIntentId
        );
        if (
          existing.status !== "succeeded" &&
          existing.status !== "canceled"
        ) {
          // Mettre à jour le receipt_email s'il manque
          if (clientEmail && !existing.receipt_email) {
            await stripe.paymentIntents.update(intakeLink.stripePaymentIntentId, {
              receipt_email: clientEmail,
            });
          }
          return NextResponse.json({ clientSecret: existing.client_secret });
        }
      } catch {
        // Si le PI est introuvable chez Stripe, on en crée un nouveau
      }
    }

    // Créer un nouveau PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 3990, // 39,90€ en centimes
      currency: "eur",
      payment_method_types: ["card", "klarna", "link"],
      receipt_email: clientEmail,
      metadata: {
        intakeLinkId: intakeLink.id,
        token,
        clientName: clientName ?? "",
      },
      description:
        "Frais de dossier BailNotarie — Constitution, vérification et transmission",
    });

    // Stocker l'ID du PaymentIntent sur l'IntakeLink
    await prisma.intakeLink.update({
      where: { token },
      data: { stripePaymentIntentId: paymentIntent.id },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("[Stripe] Erreur création PaymentIntent:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'initialisation du paiement" },
      { status: 500 }
    );
  }
}
