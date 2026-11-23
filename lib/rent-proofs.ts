import { prisma } from "@/lib/prisma";
import { getStageKey } from "@/lib/utils/bail-stage";
import { relocationProofKinds } from "@/lib/utils/rent-relocation";

/**
 * Justificatifs du loyer encore attendus du propriétaire (relocation en zone tendue), par bail
 * pas encore transmis au notaire. Calculés à partir de ses réponses : aucune requête par commune.
 */
export async function missingRentProofs(ownerClientId: string, bailId?: string) {
  const bails = await prisma.bail.findMany({
    where: {
      ...(bailId ? { id: bailId } : {}),
      property: { ownerId: ownerClientId },
      relocationLetBefore: true,
      OR: [{ status: { not: "DRAFT" } }, { paidAt: { not: null } }],
    },
    select: {
      id: true,
      status: true,
      relocationLetBefore: true,
      previousTenantLeftAt: true,
      previousRentAmount: true,
      previousRentRevisedRecently: true,
      rentIncreaseReason: true,
      worksAmount: true,
      worksCompletedAt: true,
      neighborhoodRent: true,
      documents: { select: { kind: true } },
      property: { select: { id: true, label: true, fullAddress: true, dpeClass: true } },
    },
  });
  return bails
    .filter((bail) => ["constitution", "attente_locataire", "verification"].includes(getStageKey(bail.status)))
    .map((bail) => {
      const received = new Set(bail.documents.map((doc) => doc.kind as string));
      const kinds = relocationProofKinds(bail, bail.property.dpeClass).filter((kind) => !received.has(kind));
      return { bailId: bail.id, property: bail.property, kinds };
    })
    .filter((item) => item.kinds.length > 0);
}
