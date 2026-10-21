"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { EnergyClass, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { OUTSIDE_PERIMETER } from "@/lib/utils/rent-cap";

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

/* ------------------------------------------------------------------ */
/* Encadrement des loyers : catégorie du logement                      */
/* ------------------------------------------------------------------ */

const rentCapSchema = z.object({
  propertyId: z.string().min(1),
  mainRooms: z.number().int().min(1).max(4).nullable(),
  constructionPeriod: z.string().max(40).nullable(),
  // Vide : zone trouvée sur la carte à partir de l'adresse.
  rentCapZone: z.string().max(20).nullable(),
  revalidate: z
    .string()
    .max(300)
    .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), "Page invalide")
    .optional(),
});

/** Pièces principales, époque de construction et zone (si la carte ne suffit pas). */
export async function updatePropertyRentCapAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = rentCapSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { propertyId, mainRooms, constructionPeriod, rentCapZone, revalidate } = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, inseeCode: true } });
  if (!property) return { success: false, error: "Bien introuvable" };

  // Époque et zone doivent exister dans l'arrêté du territoire du bien.
  if (property.inseeCode && (constructionPeriod || rentCapZone)) {
    const insee = property.inseeCode;
    const candidates = [insee, ...(/^751\d\d$/.test(insee) ? ["75056"] : []), ...(/^6938\d$/.test(insee) ? ["69123"] : [])];
    const territory = await prisma.rentCapTerritory.findFirst({
      where: { inseeCodes: { hasSome: candidates } },
      select: { periods: true, partialInseeCodes: true, zones: { select: { code: true } } },
    });
    if (territory) {
      if (constructionPeriod && !territory.periods.includes(constructionPeriod)) {
        return { success: false, error: "Époque de construction absente de l'arrêté de cette commune" };
      }
      if (rentCapZone === OUTSIDE_PERIMETER) {
        // « Hors périmètre » : seulement dans une commune encadrée en partie.
        if (!candidates.some((code) => territory.partialInseeCodes.includes(code))) {
          return { success: false, error: "Cette commune est entièrement encadrée : choisissez une zone" };
        }
      } else if (rentCapZone && !territory.zones.some((z) => z.code === rentCapZone)) {
        return { success: false, error: "Zone absente de l'arrêté de cette commune" };
      }
    }
  }

  await prisma.property.update({
    where: { id: propertyId },
    data: { mainRooms, constructionPeriod, rentCapZone, updatedById: user.id },
  });
  const bails = await prisma.bail.findMany({ where: { propertyId }, select: { id: true } });
  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/properties/${propertyId}`);
  for (const bail of bails) revalidatePath(`/interface/baux/${bail.id}`);
  return { success: true };
}
