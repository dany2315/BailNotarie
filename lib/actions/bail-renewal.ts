"use server";

import { prisma } from "@/lib/prisma";
import { requireProprietaireAuth, canAccessBail } from "@/lib/auth-helpers";
import { BailStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Créer un nouveau bail basé sur un bail terminé
 */
export async function renewBail(
  bailId: string,
  newEffectiveDate: Date,
  newEndDate?: Date
) {
  const { user, client } = await requireProprietaireAuth();

  // Vérifier que l'utilisateur est propriétaire du bail
  const hasAccess = await canAccessBail(user.id, bailId);
  if (!hasAccess) {
    throw new Error("Non autorisé");
  }

  // Récupérer le bail original
  const originalBail = await prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: true,
      parties: true,
    },
  });

  if (!originalBail) {
    throw new Error("Bail introuvable");
  }

  // Vérifier que le bail est terminé
  if (originalBail.status !== BailStatus.TERMINATED) {
    throw new Error("Seuls les baux terminés peuvent être renouvelés");
  }

  // Vérifier que le client est bien propriétaire du bien
  if (originalBail.property.ownerId !== client.id) {
    throw new Error("Vous n'êtes pas propriétaire de ce bien");
  }

  // Créer le nouveau bail avec les mêmes données mais nouvelles dates
  const newBail = await prisma.bail.create({
    data: {
      bailType: originalBail.bailType,
      bailFamily: originalBail.bailFamily,
      status: BailStatus.DRAFT,
      rentAmount: originalBail.rentAmount,
      monthlyCharges: originalBail.monthlyCharges,
      securityDeposit: originalBail.securityDeposit,
      effectiveDate: newEffectiveDate,
      endDate: newEndDate || null,
      paymentDay: originalBail.paymentDay,
      propertyId: originalBail.propertyId,
      parties: {
        connect: originalBail.parties.map(party => ({ id: party.id })),
      },
      createdById: user.id,
    },
    include: {
      property: true,
      parties: true,
    },
  });

  revalidatePath(`/client/proprietaire/baux`);
  revalidatePath(`/client/proprietaire/baux/${bailId}`);

  return newBail;
}








