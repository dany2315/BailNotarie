"use server";

import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const tokenSchema = z.string().min(10).max(200);

/**
 * Note l'ouverture d'un formulaire par son destinataire.
 *
 * Appelée depuis le navigateur une fois le formulaire affiché, et non au rendu
 * serveur : les robots qui pré-chargent les liens des e-mails n'exécutent pas
 * le JavaScript et ne faussent donc pas le suivi. Un administrateur ou un
 * notaire qui consulte le formulaire n'est pas compté.
 */
export async function markIntakeOpened(token: string): Promise<void> {
  const parsed = tokenSchema.safeParse(token);
  if (!parsed.success) return;

  try {
    const user = await getCurrentUser();
    if (user && user.role !== Role.UTILISATEUR) return;

    const now = new Date();
    const link = await prisma.intakeLink.findUnique({
      where: { token: parsed.data },
      select: { id: true, status: true, firstOpenedAt: true },
    });
    if (!link || link.status !== "PENDING") return;

    await prisma.intakeLink.update({
      where: { id: link.id },
      data: {
        lastOpenedAt: now,
        ...(link.firstOpenedAt ? {} : { firstOpenedAt: now }),
      },
    });
  } catch (error) {
    console.error("[markIntakeOpened] Ouverture non enregistrée:", error);
  }
}
