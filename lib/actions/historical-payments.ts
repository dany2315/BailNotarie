"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { HistoricalPaymentStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { getActorName } from "@/lib/actions/bail-audit-log";

/**
 * Paiements historiques : anciens dossiers avancés sans paiement enregistré.
 *
 * Périmètre fermé : seuls les dossiers listés une fois, à la bascule, dans HistoricalPaymentReview peuvent
 * être confirmés ici (aucune action n'ajoute un dossier à cette liste). Chaque dossier est vérifié à la
 * main par un administrateur, avec la preuve du rapprochement. Rien n'est confirmé automatiquement, et la
 * date du paiement n'est jamais inventée : elle reste vide si elle n'est pas connue.
 */

type Result = { success: true } | { success: false; error: string };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide");

const confirmSchema = z.object({
  bailId: z.string().min(1),
  // Preuve du rapprochement : référence Stripe, virement, facture, relevé…
  proofReference: z.string().trim().min(3, "Indiquez la preuve du paiement (référence Stripe, virement, facture…)").max(500),
  note: z.string().trim().max(2000).optional(),
  // Date réelle du paiement, seulement si elle est connue.
  paymentDate: z.union([isoDate, z.literal("")]).optional(),
});

/** Confirme, après vérification individuelle, qu'un ancien dossier de la liste a bien été payé. */
export async function confirmHistoricalPayment(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = confirmSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, proofReference, note, paymentDate } = parsed.data;

  const date = paymentDate ? new Date(`${paymentDate}T00:00:00Z`) : null;
  if (date && date.getTime() > Date.now()) return { success: false, error: "La date du paiement ne peut pas être dans le futur" };

  const outcome = await prisma.$transaction(async (tx): Promise<Result> => {
    const review = await tx.historicalPaymentReview.findUnique({
      where: { bailId },
      select: { id: true, status: true, bail: { select: { paidAt: true, createdAt: true } } },
    });
    // Hors de la liste établie à la bascule : ce mécanisme ne s'applique pas (nouveaux dossiers compris).
    if (!review) return { success: false, error: "Ce dossier ne fait pas partie des anciens paiements à vérifier" };
    if (review.bail.paidAt) return { success: false, error: "Ce dossier a déjà un paiement enregistré" };
    if (review.status === HistoricalPaymentStatus.CONFIRMED) return { success: true };
    if (date && date.getTime() > review.bail.createdAt.getTime() + 366 * 24 * 3600 * 1000) {
      return { success: false, error: "Date du paiement incohérente avec la date du dossier" };
    }
    // La décision n'est écrite que si personne ne l'a prise entre-temps.
    const updated = await tx.historicalPaymentReview.updateMany({
      where: { id: review.id, status: { not: HistoricalPaymentStatus.CONFIRMED } },
      data: {
        status: HistoricalPaymentStatus.CONFIRMED,
        verifiedById: user.id,
        verifiedByName: getActorName(user),
        verifiedAt: new Date(),
        proofReference,
        note: note || null,
        paymentDate: date,
      },
    });
    return updated.count === 1 ? { success: true } : { success: false, error: "Ce dossier vient d'être traité par quelqu'un d'autre" };
  });

  if (outcome.success) revalidateBail(bailId);
  return outcome;
}

const rejectSchema = z.object({
  bailId: z.string().min(1),
  note: z.string().trim().min(3, "Indiquez ce qui a été vérifié").max(2000),
});

/** Vérifié : aucun paiement retrouvé. Le dossier reste « non payé ». */
export async function rejectHistoricalPayment(data: unknown): Promise<Result> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = rejectSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, note } = parsed.data;

  const updated = await prisma.historicalPaymentReview.updateMany({
    where: { bailId, status: HistoricalPaymentStatus.PENDING },
    data: {
      status: HistoricalPaymentStatus.REJECTED,
      verifiedById: user.id,
      verifiedByName: getActorName(user),
      verifiedAt: new Date(),
      note,
    },
  });
  if (updated.count === 0) return { success: false, error: "Ce dossier n'est pas en attente de vérification" };
  revalidateBail(bailId);
  return { success: true };
}

function revalidateBail(bailId: string) {
  revalidatePath(`/interface/baux/${bailId}`);
  revalidatePath("/interface/baux");
  revalidatePath("/interface");
}
