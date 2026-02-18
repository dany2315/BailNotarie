import { z } from "zod";
import { BienType, BienLegalStatus, PropertyStatus } from "@prisma/client";

// Schéma pour les champs de mobilier
const furnitureFieldsSchema = {
  hasLiterie: z.boolean().default(false),           // Literie avec couette ou couverture
  hasRideaux: z.boolean().default(false),           // Volets ou rideaux dans les chambres
  hasPlaquesCuisson: z.boolean().default(false),    // Plaques de cuisson
  hasFour: z.boolean().default(false),              // Four ou four à micro-onde
  hasRefrigerateur: z.boolean().default(false),     // Réfrigérateur
  hasCongelateur: z.boolean().default(false),       // Congélateur ou compartiment à congélation
  hasVaisselle: z.boolean().default(false),         // Vaisselle en nombre suffisant
  hasUstensilesCuisine: z.boolean().default(false), // Ustensiles de cuisine
  hasTable: z.boolean().default(false),             // Table
  hasSieges: z.boolean().default(false),            // Sièges
  hasEtageresRangement: z.boolean().default(false), // Étagères de rangement
  hasLuminaires: z.boolean().default(false),        // Luminaires
  hasMaterielEntretien: z.boolean().default(false), // Matériel d'entretien ménager
};

export const createPropertySchema = z.object({
  label: z.string().max(200, "Le libellé est trop long").trim().optional(),
  fullAddress: z.string().min(1, "L'adresse est requise").max(500, "L'adresse est trop longue").trim(),
  surfaceM2: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) => {
    if (!val || val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num) || num < 0) return null;
    return num;
  }),
  type: z.nativeEnum(BienType, { message: "Le type de bien est requis" }),
  legalStatus: z.nativeEnum(BienLegalStatus, { message: "Le statut juridique est requis" }),
  status: z.enum(["PROSPECT", "IN_PROGRESS", "ACTIVE", "ARCHIVED"]).default("PROSPECT"),
  ownerId: z.string().cuid("ID propriétaire invalide").min(1, "Le propriétaire est requis"),
  // Données géographiques enrichies (optionnelles)
  housenumber: z.string().max(20).trim().optional(),
  street: z.string().max(200).trim().optional(),
  city: z.string().max(200).trim().optional(),
  postalCode: z.string().max(10).trim().optional(),
  district: z.string().max(100).trim().optional(),
  inseeCode: z.string().max(10).trim().optional(),
  department: z.string().max(100).trim().optional(),
  region: z.string().max(100).trim().optional(),
  latitude: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) => {
    if (!val || val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return null;
    return num;
  }),
  longitude: z.union([z.string(), z.number(), z.null(), z.undefined()]).optional().transform((val) => {
    if (!val || val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(num)) return null;
    return num;
  }),
  isTightZone: z.boolean().optional(),
  hasRentControl: z.boolean().optional(),
  // Mobilier obligatoire pour location meublée
  ...furnitureFieldsSchema,
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
  // Données géographiques enrichies (optionnelles)
  housenumber: z.string().max(20).trim().optional(),
  street: z.string().max(200).trim().optional(),
  city: z.string().max(200).trim().optional(),
  postalCode: z.string().max(10).trim().optional(),
  district: z.string().max(100).trim().optional(),
  inseeCode: z.string().max(10).trim().optional(),
  department: z.string().max(100).trim().optional(),
  region: z.string().max(100).trim().optional(),
  latitude: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    return num;
  }),
  longitude: z.string().optional().transform((val) => {
    if (!val) return null;
    const num = parseFloat(val);
    if (isNaN(num)) return null;
    return num;
  }),
  isTightZone: z.boolean().optional(),
  hasRentControl: z.boolean().optional(),
  // Mobilier obligatoire pour location meublée (tous optionnels pour mise à jour)
  hasLiterie: z.boolean().optional(),
  hasRideaux: z.boolean().optional(),
  hasPlaquesCuisson: z.boolean().optional(),
  hasFour: z.boolean().optional(),
  hasRefrigerateur: z.boolean().optional(),
  hasCongelateur: z.boolean().optional(),
  hasVaisselle: z.boolean().optional(),
  hasUstensilesCuisine: z.boolean().optional(),
  hasTable: z.boolean().optional(),
  hasSieges: z.boolean().optional(),
  hasEtageresRangement: z.boolean().optional(),
  hasLuminaires: z.boolean().optional(),
  hasMaterielEntretien: z.boolean().optional(),
});

// Liste des champs de mobilier pour vérification
export const FURNITURE_FIELDS = [
  'hasLiterie',
  'hasRideaux',
  'hasPlaquesCuisson',
  'hasFour',
  'hasRefrigerateur',
  'hasCongelateur',
  'hasVaisselle',
  'hasUstensilesCuisine',
  'hasTable',
  'hasSieges',
  'hasEtageresRangement',
  'hasLuminaires',
  'hasMaterielEntretien',
] as const;

// Fonction utilitaire pour vérifier si tout le mobilier est présent
export const hasAllFurniture = (property: Record<string, unknown>): boolean => {
  return FURNITURE_FIELDS.every((field) => property[field] === true);
};

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;


