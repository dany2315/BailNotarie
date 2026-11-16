import { NextRequest, NextResponse } from "next/server";
import { hasIntakeSession, INTAKE_SESSION_REQUIRED } from "@/lib/intake-session";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { dossierFeeCents, formatDossierFee } from "@/lib/utils/dossier-fee";
import { FEE_CURRENCY, feeIdempotencyKey, lookupIntent, recordIntent } from "@/lib/payments/dossier-payment";

/** Le paiement existe mais son résultat n'est pas encore connu : on attend, sans rien créer. */
const PENDING_VERIFICATION =
  "Votre paiement est en cours de vérification. Ne payez pas une seconde fois : cette page se mettra à jour dès qu'il sera confirmé.";

/**
 * Prépare le paiement des frais de dossier du formulaire propriétaire.
 *
 * Un ordre de paiement déjà créé pour ce dossier est toujours repris. Un nouveau n'est créé que si le
 * dossier n'en a pas, ou si le précédent est annulé ou n'existe pas chez Stripe. Si Stripe ne répond pas,
 * ou si le paiement est en cours, la référence est conservée et rien n'est créé.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token requis" }, { status: 400 });
    }

    const intakeLink = await prisma.intakeLink.findUnique({
      where: { token },
      select: {
        id: true,
        status: true,
        clientId: true,
        stripePaymentIntentId: true,
        bailFamilyPreference: true,
        bail: { select: { bailFamily: true } },
        client: {
          select: {
            persons: { select: { email: true, firstName: true, lastName: true }, take: 1 },
            users: { select: { email: true }, take: 1 },
          },
        },
      },
    });

    if (!intakeLink) {
      return NextResponse.json({ error: "Lien invalide" }, { status: 404 });
    }

    if (intakeLink.status !== "PENDING") {
      return NextResponse.json({ error: "Ce dossier a déjà été soumis" }, { status: 400 });
    }

    if (!(await hasIntakeSession(intakeLink.clientId))) {
      return NextResponse.json({ error: INTAKE_SESSION_REQUIRED }, { status: 401 });
    }

    const firstPerson = intakeLink.client?.persons?.[0];
    const clientEmail = firstPerson?.email || intakeLink.client?.users?.[0]?.email || undefined;
    const clientName = firstPerson ? `${firstPerson.firstName ?? ""} ${firstPerson.lastName ?? ""}`.trim() : undefined;

    // Frais de dossier selon le type de bail choisi dans le formulaire (39,90 € ou 59,90 € pour un commercial).
    // Le montant vient toujours du serveur, jamais du navigateur.
    const bailFamily = intakeLink.bail?.bailFamily ?? intakeLink.bailFamilyPreference;
    const amount = dossierFeeCents(bailFamily);
    const link = { intakeLinkId: intakeLink.id };
    const previousId = intakeLink.stripePaymentIntentId;

    if (previousId) {
      const lookup = await lookupIntent(previousId);

      if (lookup.kind === "unknown") {
        // Stripe ne répond pas : impossible de savoir si ce paiement a abouti. On garde la référence.
        await prisma.dossierPayment.updateMany({
          where: { stripePaymentIntentId: previousId, status: { not: "SUCCEEDED" } },
          data: { status: "UNKNOWN", lastError: lookup.message.slice(0, 500) },
        });
        return NextResponse.json({ state: "unknown", error: PENDING_VERIFICATION }, { status: 503 });
      }

      if (lookup.kind === "found") {
        const existing = lookup.intent;
        await recordIntent(prisma, existing, link);

        if (existing.status === "succeeded") {
          if (existing.amount !== amount) {
            // Payé pour un autre type de bail : pas de second paiement automatique, l'équipe régularise.
            return NextResponse.json(
              { error: `Les frais déjà payés ne correspondent pas à ce type de bail (${formatDossierFee(bailFamily)}). Contactez-nous.` },
              { status: 409 },
            );
          }
          // Déjà payé (page fermée ou envoi du formulaire interrompu) : le client poursuit sans repayer.
          return NextResponse.json({ clientSecret: existing.client_secret, alreadyPaid: true, paymentIntentId: existing.id });
        }

        if (existing.status === "processing" || existing.status === "requires_capture") {
          // Paiement parti, résultat pas encore connu : ni modification, ni nouvelle tentative.
          return NextResponse.json({ state: "processing", paymentIntentId: existing.id, message: PENDING_VERIFICATION });
        }

        if (existing.status !== "canceled") {
          // Pas encore payé (moyen de paiement ou confirmation attendus) : on reprend le même ordre,
          // au montant du type de bail actuel (le propriétaire a pu passer d'habitation à commercial).
          const changes: { receipt_email?: string; amount?: number } = {};
          if (clientEmail && !existing.receipt_email) changes.receipt_email = clientEmail;
          if (existing.amount !== amount) changes.amount = amount;
          if (Object.keys(changes).length > 0) {
            try {
              const updated = await stripe.paymentIntents.update(previousId, changes);
              await recordIntent(prisma, updated, link);
            } catch (error: any) {
              // La mise à jour a échoué : surtout pas de second ordre de paiement. On garde celui-ci.
              console.error("[Stripe] Mise à jour de l'ordre de paiement impossible:", error?.message);
              if (changes.amount !== undefined) {
                // Le montant affiché ne serait pas le bon : on ne laisse pas payer tant que ce n'est pas réglé.
                return NextResponse.json(
                  { state: "unknown", error: "Le paiement ne peut pas être préparé pour le moment. Réessayez dans quelques instants." },
                  { status: 503 },
                );
              }
            }
          }
          return NextResponse.json({ clientSecret: existing.client_secret });
        }
        // Annulé : cet ordre ne sera jamais payé, une nouvelle tentative est légitime.
      }
      // « missing » : la référence ne correspond à aucun paiement chez Stripe, on repart d'un nouvel ordre.
    }

    // Nouvel ordre de paiement. La clé d'idempotence fait que deux requêtes identiques (double clic,
    // onglets, nouvel essai après coupure) reçoivent le même ordre au lieu d'en créer deux.
    const params = {
      amount,
      currency: FEE_CURRENCY,
      payment_method_types: ["card", "klarna", "link"],
      receipt_email: clientEmail,
      metadata: { intakeLinkId: intakeLink.id, token, clientName: clientName ?? "" },
      description: "Frais de dossier BailNotarie — Constitution, vérification et transmission",
    };
    const paymentIntent = await stripe.paymentIntents.create(params, {
      idempotencyKey: feeIdempotencyKey(`intake:${intakeLink.id}`, previousId, params),
    });

    // La référence n'est posée sur le dossier que si personne ne l'a changée entre-temps.
    const stored = await prisma.intakeLink.updateMany({
      where: { id: intakeLink.id, stripePaymentIntentId: previousId },
      data: { stripePaymentIntentId: paymentIntent.id },
    });
    if (stored.count === 0) {
      // Une autre requête a déjà posé un ordre de paiement : c'est celui-là qui compte.
      const current = await prisma.intakeLink.findUnique({ where: { id: intakeLink.id }, select: { stripePaymentIntentId: true } });
      if (current?.stripePaymentIntentId && current.stripePaymentIntentId !== paymentIntent.id) {
        // Celui que nous venons de créer ne servira pas : annulé (aucun argent n'a bougé).
        await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
        const winner = await lookupIntent(current.stripePaymentIntentId);
        if (winner.kind === "found" && winner.intent.status !== "canceled") {
          return NextResponse.json({ clientSecret: winner.intent.client_secret });
        }
        return NextResponse.json({ state: "unknown", error: PENDING_VERIFICATION }, { status: 503 });
      }
    }
    await recordIntent(prisma, paymentIntent, link);

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error: any) {
    console.error("[Stripe] Erreur création PaymentIntent:", error);
    return NextResponse.json({ error: "Erreur lors de l'initialisation du paiement" }, { status: 500 });
  }
}
