"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { entrepriseRegistryFields, lookupCompany } from "@/lib/services/company-registry";
import { normalizeRegistrationNumber, sirenFromRegistration, type CompanyLookupResult } from "@/lib/utils/company-registry";

/**
 * Recherche au registre des entreprises depuis l'espace de l'équipe : le même service que
 * le formulaire du client (API Recherche d'entreprises), sans lien de formulaire.
 */
export async function lookupCompanyAdmin(registration: string): Promise<CompanyLookupResult> {
  await requireRole([Role.ADMINISTRATEUR]);
  return lookupCompany(String(registration ?? "").slice(0, 40));
}

const applySchema = z.object({
  entrepriseId: z.string().min(1),
  registration: z.string().trim().min(1).max(40),
  representativeName: z.string().trim().max(200).optional().nullable(),
  representativeRole: z.string().trim().max(200).optional().nullable(),
});

/**
 * Remplace les informations d'une société par celles du registre : raison sociale, nom commercial,
 * siège, forme juridique, numéro, et le représentant choisi par l'équipe. Les données sont relues
 * ici au registre, jamais reprises telles que le navigateur les envoie.
 */
export async function applyCompanyRegistryAdmin(
  data: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { entrepriseId, registration, representativeName, representativeRole } = parsed.data;
  if (!sirenFromRegistration(registration)) return { success: false, error: "Numéro SIREN ou SIRET invalide" };

  const result = await lookupCompany(registration);
  if (!result.found) {
    return {
      success: false,
      error: result.reason === "not_found" ? "Société introuvable au registre" : "Le registre est momentanément indisponible, réessayez.",
    };
  }
  const company = result.company;
  if (company.isIndividual) return { success: false, error: "Ce numéro correspond à une entreprise individuelle, pas à une société." };

  try {
    const current = await prisma.entreprise.findUnique({ where: { id: entrepriseId }, select: { name: true, registration: true } });
    if (!current) return { success: false, error: "Société introuvable" };
    const registry = await entrepriseRegistryFields({ registration, registryConfirmed: true });
    const updated = await prisma.entreprise.update({
      where: { id: entrepriseId },
      data: {
        ...registry,
        // Choisie par l'équipe dans le registre : ce n'est plus la confirmation du client.
        registryConfirmedByClient: false,
        legalName: company.legalName,
        // Nom commercial : celui du registre ; sinon on garde le nom saisi, sauf s'il s'agit d'une autre société.
        ...(company.tradeName
          ? { name: company.tradeName }
          : !current.name || sirenFromRegistration(current.registration) !== company.siren
            ? { name: company.legalName }
            : {}),
        ...(company.headOfficeAddress ? { fullAddress: company.headOfficeAddress } : {}),
        registration: normalizeRegistrationNumber(registration),
        isRegistered: true,
        ...(representativeName ? { representativeName, representativeRole: representativeRole || null } : {}),
      },
      select: { clientId: true },
    });

    const bails = await prisma.bail.findMany({ where: { parties: { some: { id: updated.clientId } } }, select: { id: true } });
    revalidatePath(`/interface/clients/${updated.clientId}`);
    for (const bail of bails) revalidatePath(`/interface/baux/${bail.id}`);
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { success: false, error: "Société introuvable" };
    }
    console.error("[applyCompanyRegistryAdmin]", error);
    return { success: false, error: "Enregistrement impossible" };
  }
}
