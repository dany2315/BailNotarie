"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BailStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireLocataireAuth } from "@/lib/auth-helpers";
import { AGREEMENT_FIELDS, agreementChanges, readAgreementSnapshot, recordTenantAgreement, type AgreementTerms } from "@/lib/bail/tenant-agreement";

type Result = { success: true } | { success: false; error: string; changed?: boolean };

const termValue = z.union([z.string().max(40), z.number().int(), z.null()]);
const schema = z.object({
  bailId: z.string().min(1),
  // Conditions affichées au locataire au moment où il clique : le serveur vérifie qu'elles sont toujours
  // celles du dossier, pour ne jamais enregistrer un accord sur des conditions qu'il n'a pas vues.
  terms: z.object(Object.fromEntries(AGREEMENT_FIELDS.map((field) => [field, termValue])) as Record<(typeof AGREEMENT_FIELDS)[number], typeof termValue>),
});

/** Dossiers clos : plus rien à confirmer. */
const CLOSED: BailStatus[] = [BailStatus.TERMINATED, BailStatus.DESISTE, BailStatus.CLASSE_SANS_SUITE];

/**
 * Nouvelle confirmation des conditions du bail par le locataire, depuis son espace, quand la précédente
 * a été retirée (conditions modifiées ou locataire remplacé). Aucun e-mail n'est envoyé.
 */
export async function confirmBailTermsAsTenant(data: unknown): Promise<Result> {
  const { client } = await requireLocataireAuth();
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Demande invalide" };
  const { bailId, terms } = parsed.data;

  const outcome = await prisma.$transaction(async (tx): Promise<Result> => {
    const bail = await tx.bail.findUnique({
      where: { id: bailId },
      select: { status: true, tenantConfirmedTermsAt: true, tenantReconfirmationRequestedAt: true },
    });
    const current = bail ? await readAgreementSnapshot(tx, bailId) : null;
    // Le locataire du dossier, et lui seul (un ancien locataire n'est plus partie au bail).
    if (!bail || !current || current.tenantId !== client.id) return { success: false, error: "Dossier introuvable" };
    if (CLOSED.includes(bail.status)) return { success: false, error: "Ce dossier est clos" };
    if (bail.tenantConfirmedTermsAt) return { success: true };
    if (!bail.tenantReconfirmationRequestedAt) return { success: false, error: "Aucune confirmation n'est attendue pour ce dossier" };
    if (agreementChanges(current.terms, terms as AgreementTerms).length > 0) {
      return { success: false, changed: true, error: "Les conditions du bail viennent d'être modifiées : relisez-les avant de confirmer." };
    }
    await recordTenantAgreement(tx, bailId, client.id);
    return { success: true };
  });

  if (outcome.success) {
    revalidatePath(`/client/locataire/baux/${bailId}`);
    revalidatePath("/client/locataire");
    revalidatePath(`/interface/baux/${bailId}`);
  }
  return outcome;
}
