import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dossierFeeCents } from "@/lib/utils/dossier-fee";
import { FEE_CURRENCY, feeIdempotencyKey, lookupIntent, recordIntent } from "@/lib/payments/dossier-payment";

const PENDING_VERIFICATION =
  "Votre paiement est en cours de vérification. Ne payez pas une seconde fois : cette page se mettra à jour dès qu'il sera confirmé.";

/**
 * Prépare le paiement des frais de dossier d'un bail créé depuis l'espace client.
 *
 * Tant qu'un paiement de ce compte n'est pas rattaché à un bail, c'est lui qui est repris : rouvrir
 * l'écran, cliquer deux fois ou revenir après une coupure ne crée pas un second ordre de paiement, et un
 * paiement déjà réglé dont l'enregistrement du bail a échoué est réutilisé sans repayer.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const userId = session.user.id;

    // Espace client : bail d'habitation (le commercial passe par le formulaire propriétaire)
    const amount = dossierFeeCents("HABITATION");

    // Paiement de ce compte pas encore rattaché à un bail (le plus récent d'abord).
    const open = await prisma.dossierPayment.findMany({
      where: { userId, bailId: null, intakeLinkId: null, status: { in: ["PENDING", "PROCESSING", "UNKNOWN", "FAILED", "SUCCEEDED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    let previousId: string | null = null;
    for (const payment of open) {
      const lookup = await lookupIntent(payment.stripePaymentIntentId);
      if (lookup.kind === "unknown") {
        await prisma.dossierPayment.updateMany({
          where: { id: payment.id, status: { not: "SUCCEEDED" } },
          data: { status: "UNKNOWN", lastError: lookup.message.slice(0, 500) },
        });
        return NextResponse.json({ state: "unknown", error: PENDING_VERIFICATION }, { status: 503 });
      }
      if (lookup.kind === "missing") {
        await prisma.dossierPayment.update({ where: { id: payment.id }, data: { status: "CANCELED", lastError: "Référence inconnue de Stripe" } });
        continue;
      }
      const existing = lookup.intent;
      await recordIntent(prisma, existing, { userId });
      if (existing.metadata?.userId !== userId) continue;
      if (existing.status === "succeeded") {
        if (existing.amount !== amount) continue; // autre montant : à régulariser par l'équipe, pas réutilisé ici
        return NextResponse.json({ clientSecret: existing.client_secret, alreadyPaid: true, paymentIntentId: existing.id });
      }
      if (existing.status === "processing" || existing.status === "requires_capture") {
        return NextResponse.json({ state: "processing", paymentIntentId: existing.id, message: PENDING_VERIFICATION });
      }
      if (existing.status === "canceled") {
        previousId = previousId ?? existing.id;
        continue;
      }
      if (existing.amount !== amount) continue;
      return NextResponse.json({ clientSecret: existing.client_secret });
    }

    // Récupérer les infos du client pour pré-remplir la facture Stripe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        client: { select: { persons: { select: { firstName: true, lastName: true }, take: 1 } } },
      },
    });

    const clientEmail = user?.email ?? undefined;
    const firstPerson = user?.client?.persons?.[0];
    const clientName = firstPerson ? `${firstPerson.firstName ?? ""} ${firstPerson.lastName ?? ""}`.trim() : undefined;

    const params = {
      amount,
      currency: FEE_CURRENCY,
      payment_method_types: ["card", "klarna", "link"],
      receipt_email: clientEmail,
      metadata: { userId, clientName: clientName ?? "", source: "client_bail_creation" },
      description: "Frais de dossier BailNotarie — Constitution, vérification et transmission",
    };
    // Nombre de paiements déjà rattachés : chaque nouveau bail a sa propre tentative, mais deux requêtes
    // pour le même bail reçoivent le même ordre de paiement.
    const attached = await prisma.dossierPayment.count({ where: { userId, bailId: { not: null } } });
    const paymentIntent = await stripe.paymentIntents.create(params, {
      idempotencyKey: feeIdempotencyKey(`user:${userId}:${attached}`, previousId, params),
    });
    await recordIntent(prisma, paymentIntent, { userId });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("[Stripe] Erreur création PaymentIntent bail:", error);
    return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement" }, { status: 500 });
  }
}
