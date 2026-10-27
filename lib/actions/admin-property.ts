"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BienLegalStatus, BienType, EnergyClass, Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { updatePropertyZoneStatus } from "@/lib/services/zone-tendue";
import { updatePropertyCompletionStatus } from "@/lib/utils/completion-status";
import { OUTSIDE_PERIMETER, periodForTerritory } from "@/lib/utils/rent-cap";

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
      orderBy: { validFrom: "desc" }, // arrêté le plus récent
      select: { periods: true, partialInseeCodes: true, zones: { select: { code: true } } },
    });
    if (territory) {
      if (constructionPeriod && !periodForTerritory(constructionPeriod, territory.periods)) {
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

/* ------------------------------------------------------------------ */
/* Adresse, description et équipements du bien                         */
/* ------------------------------------------------------------------ */

const revalidateField = z
  .string()
  .max(300)
  .refine((path) => /^\/interface(\/[\w-]+)*$/.test(path), "Page invalide")
  .optional();

const addressSchema = z.object({
  fullAddress: z.string().trim().min(5, "Adresse invalide").max(500),
  housenumber: z.string().max(20).optional(),
  street: z.string().max(200).optional(),
  postalCode: z.string().max(10).optional(),
  city: z.string().max(200).optional(),
  district: z.string().max(100).optional(),
  // Adresse choisie dans les suggestions : le bien reste localisé (zone tendue, encadrement).
  inseeCode: z.string().regex(/^\w{5}$/, "Choisissez l'adresse dans la liste proposée"),
  department: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const detailsSchema = z.object({
  propertyId: z.string().min(1),
  values: z
    .object({
      label: z.string().trim().max(200).nullable(),
      address: addressSchema,
      type: z.nativeEnum(BienType),
      surfaceM2: z.number().positive("Surface invalide").max(10000, "Surface invalide"),
      legalStatus: z.nativeEnum(BienLegalStatus),
    })
    .partial(),
  revalidate: revalidateField,
});

/** Pages à rafraîchir après une modification du bien : sa fiche et chacun de ses dossiers. */
async function revalidateProperty(propertyId: string, revalidate?: string) {
  const bails = await prisma.bail.findMany({ where: { propertyId }, select: { id: true } });
  if (revalidate) revalidatePath(revalidate);
  revalidatePath(`/interface/properties/${propertyId}`);
  for (const bail of bails) revalidatePath(`/interface/baux/${bail.id}`);
}

/**
 * Modification par l'équipe de l'adresse et de la description du bien (libellé, type,
 * surface, régime juridique). Seuls les champs envoyés changent.
 */
export async function updatePropertyDetailsAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = detailsSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { propertyId, values, revalidate } = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, inseeCode: true, type: true } });
  if (!property) return { success: false, error: "Bien introuvable" };

  const update: Prisma.PropertyUpdateInput = { updatedBy: { connect: { id: user.id } } };
  if (values.label !== undefined) update.label = values.label || null;
  if (values.type) update.type = values.type;
  if (values.surfaceM2 !== undefined) update.surfaceM2 = new Prisma.Decimal(values.surfaceM2);
  if (values.legalStatus) update.legalStatus = values.legalStatus;
  if (values.address) {
    const a = values.address;
    Object.assign(update, {
      fullAddress: a.fullAddress,
      housenumber: a.housenumber || null,
      street: a.street || null,
      postalCode: a.postalCode || null,
      city: a.city || null,
      district: a.district || null,
      inseeCode: a.inseeCode,
      department: a.department || null,
      region: a.region || null,
      latitude: new Prisma.Decimal(a.latitude),
      longitude: new Prisma.Decimal(a.longitude),
    });
    // Autre commune : la zone d'encadrement choisie à la main ne vaut plus.
    if (a.inseeCode !== property.inseeCode) update.rentCapZone = null;
  }
  await prisma.property.update({ where: { id: propertyId }, data: update });

  // Zone tendue et complétude suivent l'adresse et le type, comme à la création du bien.
  const inseeCode = values.address?.inseeCode ?? property.inseeCode;
  const type = values.type ?? property.type;
  if ((values.address || values.type) && inseeCode && type) await updatePropertyZoneStatus(propertyId, inseeCode, type);
  await updatePropertyCompletionStatus(propertyId);

  await revalidateProperty(propertyId, revalidate);
  return { success: true };
}

const FURNITURE_KEYS = [
  "hasLiterie",
  "hasRideaux",
  "hasPlaquesCuisson",
  "hasFour",
  "hasRefrigerateur",
  "hasCongelateur",
  "hasVaisselle",
  "hasUstensilesCuisine",
  "hasTable",
  "hasSieges",
  "hasEtageresRangement",
  "hasLuminaires",
  "hasMaterielEntretien",
] as const;

const furnitureSchema = z.object({
  propertyId: z.string().min(1),
  values: z.object(Object.fromEntries(FURNITURE_KEYS.map((key) => [key, z.boolean()])) as Record<(typeof FURNITURE_KEYS)[number], z.ZodBoolean>).partial(),
  revalidate: revalidateField,
});

/** Équipements du logement meublé (décret du 31 juillet 2015), cochés par l'équipe. */
export async function updatePropertyFurnitureAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = furnitureSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { propertyId, values, revalidate } = parsed.data;

  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true } });
  if (!property) return { success: false, error: "Bien introuvable" };

  await prisma.property.update({ where: { id: propertyId }, data: { ...values, updatedById: user.id } });
  await revalidateProperty(propertyId, revalidate);
  return { success: true };
}
