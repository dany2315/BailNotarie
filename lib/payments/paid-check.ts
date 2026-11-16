import { prisma } from "@/lib/prisma";
import { HISTORICAL_PAYMENT_SELECT, isBailPaid } from "@/lib/payments/paid";

/**
 * Le dossier est-il payé (Stripe, ou ancien paiement confirmé par l'équipe) ? Lecture en base, pour les
 * automatismes qui font avancer un dossier : un dossier non payé ne passe jamais tout seul à « prêt pour
 * notaire », même si toutes ses fiches sont complétées.
 */
export async function isBailPaidById(bailId: string): Promise<boolean> {
  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    select: { paidAt: true, historicalPayment: HISTORICAL_PAYMENT_SELECT },
  });
  return !!bail && isBailPaid(bail);
}
