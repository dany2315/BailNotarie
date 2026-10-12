"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EnergyClass, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";

const schema = z.object({
  propertyId: z.string().min(1),
  dpeClass: z.nativeEnum(EnergyClass),
  gesClass: z.nativeEnum(EnergyClass).nullable(),
  // « yyyy-MM-dd », ni dans le futur ni avant 2006 (création du DPE).
  dpeDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
    .refine((value) => {
      const d = new Date(`${value}T00:00:00Z`);
      return !Number.isNaN(d.getTime()) && d <= new Date() && d >= new Date("2006-01-01T00:00:00Z");
    }, "Date du DPE invalide"),
  /** Page de l'interface à rafraîchir (celle d'où vient la saisie). */
  revalidate: z
    .string()
    .max(300)
    .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), "Page invalide")
    .optional(),
});

/** Saisie manuelle du DPE d'un bien par l'équipe (classe énergie, GES, date). */
export async function updatePropertyDpeAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { propertyId, dpeClass, gesClass, dpeDate, revalidate } = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
  if (!property) return { success: false, error: "Bien introuvable" };

  await prisma.property.update({
    where: { id: propertyId },
    data: { dpeClass, gesClass, dpeDate: new Date(`${dpeDate}T00:00:00Z`), updatedById: user.id },
  });

  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/properties/${propertyId}`);
  return { success: true };
}
