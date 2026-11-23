import { NextRequest, NextResponse } from "next/server";
import { handleStripeWebhook } from "@/lib/payments/webhook";

// Le corps brut est nécessaire pour vérifier la signature : pas de cache, pas d'exécution en périphérie.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Point d'entrée des événements Stripe (à déclarer dans le tableau de bord Stripe avec les événements
 * payment_intent.succeeded, payment_intent.processing, payment_intent.payment_failed et
 * payment_intent.canceled ; le secret de signature va dans STRIPE_WEBHOOK_SECRET).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  try {
    const result = await handleStripeWebhook(rawBody, req.headers.get("stripe-signature"));
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: any) {
    // Erreur de notre côté : réponse 500 pour que Stripe renvoie l'événement plus tard (il sera repris).
    console.error("[Stripe] Erreur webhook:", error?.message);
    return NextResponse.json({ error: "Erreur de traitement" }, { status: 500 });
  }
}
