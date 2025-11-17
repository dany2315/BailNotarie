import { z } from "zod";
import { BienType, BienLegalStatus, PropertyStatus } from "@prisma/client";

export const createPropertySchema = z.object({
  label: z.string().max(200, "Le libellé est trop long").trim().optional(),
  fullAddress: z.string().min(1, "L'adresse est requise").max(500, "L'adresse est trop longue").trim(),
  surfaceM2: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return null;
    return num;
  }),
  type: z.nativeEnum(BienType).optional(),
  legalStatus: z.nativeEnum(BienLegalStatus).optional(),
  status: z.enum(["PROSPECT", "IN_PROGRESS", "ACTIVE", "ARCHIVED"]).default("PROSPECT"),
  ownerId: z.string().cuid("ID propriétaire invalide").min(1, "Le propriétaire est requis"),
});

// Schéma de mise à jour - tous les champs sont optionnels
export const updatePropertySchema = z.object({
  id: z.string().cuid("ID invalide"),
  label: z.string().max(200, "Le libellé est trop long").trim().optional(),
  fullAddress: z.string().max(500, "L'adresse est trop longue").trim().optional(),
  surfaceM2: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return null;
    return num;
  }),
  type: z.nativeEnum(BienType).optional(),
  legalStatus: z.nativeEnum(BienLegalStatus).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  ownerId: z.string().cuid("ID propriétaire invalide").optional(),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;


