"use server";

import { isRentControlled, getRentControl } from "@/lib/services/zone-tendue";
import { prisma } from "@/lib/prisma";
import { BienType } from "@prisma/client";

export interface RentValidationResult {
  isValid: boolean;
  maxAllowed: number | null;
  current: number;
  exceededAmount: number | null;
  rentPerM2: number | null;
  maxRentPerM2: number | null;
  message?: string;
}

/**
 * Calcule le loyer au m²
 */
export async function calculateRentPerM2(rentAmount: number, surfaceM2: number | null | undefined): Promise<number | null> {
  if (!surfaceM2 || surfaceM2 <= 0) {
    return null;
  }
  return rentAmount / surfaceM2;
}

/**
 * Récupère le loyer maximum autorisé pour un bien
 */
export async function getMaxAllowedRent(
  propertyId: string,
  surfaceM2: number | null | undefined
): Promise<number | null> {
  const rentControlInfo = await isRentControlled(propertyId);

  if (!rentControlInfo.isControlled || !rentControlInfo.maxRentPerM2) {
    return null;
  }

  if (!surfaceM2 || surfaceM2 <= 0) {
    return null;
  }

  return rentControlInfo.maxRentPerM2 * surfaceM2;
}

/**
 * Valide le loyer selon les limitations applicables
 */
export async function validateRentAmount(
  propertyId: string,
  rentAmount: number,
  surfaceM2: number | null | undefined
): Promise<RentValidationResult> {
  const rentControlInfo = await isRentControlled(propertyId);

  const rentPerM2 = await calculateRentPerM2(rentAmount, surfaceM2);

  // Si pas de limitation de loyer, le loyer est valide
  if (!rentControlInfo.isControlled || !rentControlInfo.maxRentPerM2) {
    return {
      isValid: true,
      maxAllowed: null,
      current: rentAmount,
      exceededAmount: null,
      rentPerM2,
      maxRentPerM2: null,
    };
  }

  // Calculer le loyer maximum autorisé
  const maxAllowed = surfaceM2 && surfaceM2 > 0 
    ? rentControlInfo.maxRentPerM2 * surfaceM2 
    : null;

  if (maxAllowed === null) {
    // Pas de surface, on ne peut pas valider
    return {
      isValid: true, // On considère valide si pas de surface
      maxAllowed: null,
      current: rentAmount,
      exceededAmount: null,
      rentPerM2: null,
      maxRentPerM2: rentControlInfo.maxRentPerM2,
      message: "Surface non renseignée, impossible de vérifier la conformité du loyer",
    };
  }

  const exceededAmount = rentAmount > maxAllowed ? rentAmount - maxAllowed : null;
  const isValid = exceededAmount === null;

  return {
    isValid,
    maxAllowed,
    current: rentAmount,
    exceededAmount,
    rentPerM2,
    maxRentPerM2: rentControlInfo.maxRentPerM2,
    message: isValid
      ? undefined
      : `Le loyer dépasse la limite autorisée de ${maxAllowed.toFixed(2)} € (${rentControlInfo.maxRentPerM2.toFixed(2)} €/m² × ${surfaceM2} m²)`,
  };
}

/**
 * Valide le loyer pour un bien avec ses informations complètes
 */
export async function validateRentForProperty(
  propertyId: string,
  rentAmount: number
): Promise<RentValidationResult> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      surfaceM2: true,
      type: true,
      inseeCode: true,
    },
  });

  if (!property) {
    throw new Error("Bien introuvable");
  }

  const surfaceM2 = property.surfaceM2 ? Number(property.surfaceM2) : null;

  return validateRentAmount(propertyId, rentAmount, surfaceM2);
}

