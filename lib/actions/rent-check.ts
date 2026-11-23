"use server";

import { z } from "zod";
import { EnergyClass, IntakeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireProprietaireAuth } from "@/lib/auth-helpers";
import { hasIntakeSession, INTAKE_SESSION_REQUIRED } from "@/lib/intake-session";
import { assessRentRules, type RentRulesAssessment } from "@/lib/rent-rules";
import { assessRentCap, requiresOccupancyDeclaration } from "@/lib/rent-cap";
import { rentRulesFromForm } from "@/lib/utils/rent-draft";

const PROPERTY_SELECT = {
  id: true,
  ownerId: true,
  inseeCode: true,
  latitude: true,
  longitude: true,
  surfaceM2: true,
  type: true,
  mainRooms: true,
  constructionPeriod: true,
  rentCapZone: true,
  dpeClass: true,
} as const;

const inputSchema = z.object({
  /** Formulaire propriétaire (lien d'intake) : le bien est celui du lien. */
  token: z.string().min(1).optional(),
  /** Espace client : bien du propriétaire connecté. */
  propertyId: z.string().min(1).optional(),
  rentAmount: z.coerce.number().int().min(0).max(1_000_000),
  bailType: z.string().min(1),
  bailFamily: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
  /** Classe DPE saisie dans le formulaire quand le bien n'en a pas encore. */
  dpeClass: z.nativeEnum(EnergyClass).optional().nullable(),
  answers: z.record(z.string(), z.any()).default({}),
});

export type RentCheckResult = { success: true; data: RentRulesAssessment } | { success: false; error: string };

/**
 * Loyer maximal en direct pour les formulaires du propriétaire : plafond de l'arrêté et
 * relocation en zone tendue, avec ses réponses (non enregistrées).
 */
export async function checkRentRules(raw: z.input<typeof inputSchema>): Promise<RentCheckResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const input = parsed.data;

  let property: Awaited<ReturnType<typeof findProperty>> = null;
  if (input.token) {
    const link = await prisma.intakeLink.findUnique({
      where: { token: input.token },
      select: { status: true, propertyId: true, clientId: true },
    });
    if (!link || link.status !== IntakeStatus.PENDING || !link.propertyId) return { success: false, error: "Formulaire introuvable" };
    if (!(await hasIntakeSession(link.clientId))) return { success: false, error: INTAKE_SESSION_REQUIRED };
    property = await findProperty(link.propertyId);
  } else if (input.propertyId) {
    const { client } = await requireProprietaireAuth();
    property = await findProperty(input.propertyId);
    if (property && property.ownerId !== client.id) property = null;
  }
  if (!property) return { success: false, error: "Bien introuvable" };

  const data = await assessRentRules({
    property: { ...property, dpeClass: property.dpeClass ?? input.dpeClass ?? null },
    bail: {
      rentAmount: input.rentAmount,
      bailType: input.bailType,
      bailFamily: input.bailFamily ?? null,
      effectiveDate: input.effectiveDate || null,
      rentCapExemption: null,
      ...rentRulesFromForm(input.answers),
    },
  });
  return { success: true, data: JSON.parse(JSON.stringify(data)) };
}

const occupancyInputSchema = z.object({
  token: z.string().min(1),
  bailType: z.string().min(1),
  bailFamily: z.string().optional().nullable(),
  effectiveDate: z.string().optional().nullable(),
});

/**
 * Formulaire propriétaire : le bien du lien est-il dans une ville à loyers encadrés ?
 * Si oui, on lui demande sa déclaration d'occupation (impots.gouv).
 */
export async function checkOccupancyDeclaration(raw: z.input<typeof occupancyInputSchema>): Promise<{ required: boolean }> {
  const parsed = occupancyInputSchema.safeParse(raw);
  if (!parsed.success) return { required: false };
  const input = parsed.data;
  const link = await prisma.intakeLink.findUnique({
    where: { token: input.token },
    select: { status: true, propertyId: true, clientId: true },
  });
  if (!link || link.status !== IntakeStatus.PENDING || !link.propertyId) return { required: false };
  if (!(await hasIntakeSession(link.clientId))) return { required: false };
  const property = await findProperty(link.propertyId);
  if (!property) return { required: false };
  const cap = await assessRentCap({
    property,
    bail: {
      rentAmount: 0,
      bailType: input.bailType,
      bailFamily: input.bailFamily ?? null,
      effectiveDate: input.effectiveDate || null,
      rentSupplementReason: null,
    },
  });
  return { required: requiresOccupancyDeclaration(cap) };
}

async function findProperty(id: string) {
  return prisma.property.findUnique({ where: { id }, select: PROPERTY_SELECT });
}
