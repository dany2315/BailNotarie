"use server";

import { prisma } from "@/lib/prisma";
import { BienType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Vérifie si une commune est en zone tendue en utilisant son code INSEE
 */
export async function checkTightZone(inseeCode: string | null | undefined): Promise<{
  isTightZone: boolean;
  zoneTendue: {
    id: string;
    city: string;
    postalCode: string;
    department: string;
    region: string;
    rentControlEnabled: boolean;
  } | null;
}> {
  if (!inseeCode) {
    return {
      isTightZone: false,
      zoneTendue: null,
    };
  }

  const zoneTendue = await prisma.zoneTendue.findUnique({
    where: {
      inseeCode,
      isActive: true,
    },
  });

  if (!zoneTendue) {
    return {
      isTightZone: false,
      zoneTendue: null,
    };
  }

  return {
    isTightZone: true,
    zoneTendue: {
      id: zoneTendue.id,
      city: zoneTendue.city,
      postalCode: zoneTendue.postalCode,
      department: zoneTendue.department,
      region: zoneTendue.region,
      rentControlEnabled: zoneTendue.rentControlEnabled,
    },
  };
}

/**
 * Récupère les limitations de loyer pour une zone tendue et un type de bien
 */
export async function getRentControl(
  zoneTendueId: string,
  propertyType: BienType
): Promise<{
  maxRentPerM2: number;
  effectiveDate: Date;
  endDate: Date | null;
} | null> {
  const now = new Date();

  const rentControl = await prisma.rentControl.findFirst({
    where: {
      zoneTendueId,
      propertyType,
      effectiveDate: {
        lte: now,
      },
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    },
    orderBy: {
      effectiveDate: "desc",
    },
  });

  if (!rentControl) {
    return null;
  }

  return {
    maxRentPerM2: Number(rentControl.maxRentPerM2),
    effectiveDate: rentControl.effectiveDate,
    endDate: rentControl.endDate,
  };
}

/**
 * Vérifie si un bien est soumis à limitation de loyer
 */
export async function isRentControlled(propertyId: string): Promise<{
  isControlled: boolean;
  maxRentPerM2: number | null;
  zoneTendue: {
    id: string;
    city: string;
    department: string;
  } | null;
}> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: {
      inseeCode: true,
      type: true,
      isTightZone: true,
      hasRentControl: true,
    },
  });

  if (!property || !property.inseeCode || !property.type) {
    return {
      isControlled: false,
      maxRentPerM2: null,
      zoneTendue: null,
    };
  }

  const { isTightZone, zoneTendue } = await checkTightZone(property.inseeCode);

  if (!isTightZone || !zoneTendue) {
    return {
      isControlled: false,
      maxRentPerM2: null,
      zoneTendue: null,
    };
  }

  if (!zoneTendue.rentControlEnabled) {
    return {
      isControlled: false,
      maxRentPerM2: null,
      zoneTendue: {
        id: zoneTendue.id,
        city: zoneTendue.city,
        department: zoneTendue.department,
      },
    };
  }

  const rentControl = await getRentControl(zoneTendue.id, property.type);

  if (!rentControl) {
    return {
      isControlled: false,
      maxRentPerM2: null,
      zoneTendue: {
        id: zoneTendue.id,
        city: zoneTendue.city,
        department: zoneTendue.department,
      },
    };
  }

  return {
    isControlled: true,
    maxRentPerM2: rentControl.maxRentPerM2,
    zoneTendue: {
      id: zoneTendue.id,
      city: zoneTendue.city,
      department: zoneTendue.department,
    },
  };
}

/**
 * Met à jour les indicateurs de zone tendue et limitation de loyer pour un bien
 */
export async function updatePropertyZoneStatus(
  propertyId: string,
  inseeCode: string | null | undefined,
  propertyType: BienType | null | undefined
): Promise<{
  isTightZone: boolean;
  hasRentControl: boolean;
}> {
  if (!inseeCode || !propertyType) {
    // Si pas de code INSEE ou type, réinitialiser les indicateurs
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        isTightZone: false,
        hasRentControl: false,
      },
    });
    return {
      isTightZone: false,
      hasRentControl: false,
    };
  }

  const { isTightZone, zoneTendue } = await checkTightZone(inseeCode);

  if (!isTightZone || !zoneTendue) {
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        isTightZone: false,
        hasRentControl: false,
      },
    });
    return {
      isTightZone: false,
      hasRentControl: false,
    };
  }

  // Vérifier si limitation de loyer activée
  const rentControl = zoneTendue.rentControlEnabled
    ? await getRentControl(zoneTendue.id, propertyType)
    : null;

  const hasRentControl = rentControl !== null;

  await prisma.property.update({
    where: { id: propertyId },
    data: {
      isTightZone: true,
      hasRentControl,
    },
  });

  return {
    isTightZone: true,
    hasRentControl,
  };
}





