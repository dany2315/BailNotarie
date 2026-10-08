"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const schema = z.object({
  bailId: z.string().min(1).max(100),
  pointKeys: z.array(z.string().min(1).max(400)).min(1).max(200),
  verified: z.boolean(),
});

/**
 * Valide (ou retire la validation de) un ou plusieurs points de la fiche de
 * vérification d'un dossier. Ne touche ni aux statuts de complétion ni au
 * statut du bail : ceux-ci ne changent qu'à l'envoi au notaire.
 */
export async function setVerificationPoints(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { bailId, pointKeys, verified } = parsed.data;

  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { id: true } });
  if (!bail) return { success: false, error: "Dossier introuvable" };

  if (verified) {
    await prisma.bailVerificationCheck.createMany({
      data: pointKeys.map((pointKey) => ({ bailId, pointKey, verifiedById: user.id })),
      skipDuplicates: true,
    });
  } else {
    await prisma.bailVerificationCheck.deleteMany({ where: { bailId, pointKey: { in: pointKeys } } });
  }

  revalidatePath(`/interface/baux/${bailId}`);
  return { success: true };
}
