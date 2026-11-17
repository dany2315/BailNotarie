import { Prisma, ProfilType, TenantAgreementEndReason } from "@prisma/client";

/**
 * Accord du locataire sur les conditions du bail.
 *
 * Le locataire confirme les conditions en envoyant son formulaire (ou depuis son espace quand une nouvelle
 * confirmation lui est demandée). Cet accord ne vaut que pour les conditions qu'il a vues : dès qu'une de
 * ces conditions change, ou que le locataire est remplacé, l'accord en cours est retiré du dossier, gardé
 * dans l'historique, et une nouvelle confirmation est attendue.
 *
 * Tout se fait dans la transaction de la modification : jamais de conditions modifiées avec un accord
 * resté valable.
 */

type Tx = Prisma.TransactionClient;

export {
  AGREEMENT_FIELDS,
  AGREEMENT_FIELD_LABELS,
  agreementChanges,
  agreementTerms,
  type AgreementChange,
  type AgreementField,
  type AgreementTerms,
} from "@/lib/bail/agreement-terms";
import { AGREEMENT_FIELD_LABELS, agreementChanges, agreementTerms, type AgreementChange, type AgreementTerms } from "@/lib/bail/agreement-terms";
import { triggerTenantReconfirmationEmail } from "@/lib/inngest/helpers";

const AGREEMENT_SELECT = {
  id: true,
  bailFamily: true,
  bailType: true,
  rentAmount: true,
  monthlyCharges: true,
  securityDeposit: true,
  effectiveDate: true,
  endDate: true,
  tenantConfirmedTermsAt: true,
  tenantConfirmedTerms: true,
  tenantConfirmedById: true,
  commercialTerms: { select: { rentPeriodicity: true } },
  parties: {
    select: {
      id: true,
      profilType: true,
      persons: { where: { isPrimary: true }, take: 1, select: { firstName: true, lastName: true, email: true } },
      entreprise: { select: { legalName: true, name: true } },
    },
  },
} satisfies Prisma.BailSelect;

export type AgreementSnapshot = {
  terms: AgreementTerms;
  tenantId: string | null;
  tenantName: string | null;
  confirmedAt: Date | null;
  confirmedTerms: Prisma.JsonValue | null;
  confirmedById: string | null;
};

type AgreementParty = Prisma.BailGetPayload<{ select: typeof AGREEMENT_SELECT }>["parties"][number];

function partyName(party: AgreementParty | undefined): string | null {
  if (!party) return null;
  const person = party.persons[0];
  const name = party.entreprise?.legalName || party.entreprise?.name || [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
  return name || person?.email || null;
}

/**
 * État de l'accord et des conditions du bail, à lire AVANT la modification, dans la même transaction.
 * Renvoie null si le bail n'existe pas.
 */
export async function readAgreementSnapshot(tx: Tx, bailId: string): Promise<AgreementSnapshot | null> {
  const bail = await tx.bail.findUnique({ where: { id: bailId }, select: AGREEMENT_SELECT });
  if (!bail) return null;
  const tenant = bail.parties.find((party) => party.profilType === ProfilType.LOCATAIRE);
  return {
    terms: agreementTerms(bail),
    tenantId: tenant?.id ?? null,
    tenantName: partyName(tenant),
    confirmedAt: bail.tenantConfirmedTermsAt,
    confirmedTerms: bail.tenantConfirmedTerms,
    confirmedById: bail.tenantConfirmedById,
  };
}

export type AgreementActor = { id: string | null; name: string };

export type AgreementOutcome = {
  /** L'accord en cours a été retiré et archivé. */
  invalidated: boolean;
  reason: TenantAgreementEndReason | null;
  changes: AgreementChange[];
};

/**
 * À appeler APRÈS la modification du bail, dans la même transaction, avec l'état lu juste avant.
 * Compare les conditions et le locataire ; si l'un a réellement changé alors qu'un accord était en cours,
 * archive cet accord (auteur, date, conditions connues) et demande une nouvelle confirmation.
 * Ne fait rien si rien n'a changé ou s'il n'y avait pas d'accord.
 */
export async function settleTenantAgreement(
  tx: Tx,
  bailId: string,
  before: AgreementSnapshot | null,
  actor: AgreementActor,
  // Cas où la personne change sans que la fiche locataire change (adresse e-mail du locataire remplacée) :
  // l'accord est retiré même si les conditions sont identiques.
  options: { tenantReplaced?: boolean } = {},
): Promise<AgreementOutcome> {
  const none: AgreementOutcome = { invalidated: false, reason: null, changes: [] };
  if (!before) return none;
  const after = await readAgreementSnapshot(tx, bailId);
  if (!after) return none;

  const changes = agreementChanges(before.terms, after.terms);
  const tenantChanged = before.tenantId !== after.tenantId || options.tenantReplaced === true;
  if (!before.confirmedAt || (changes.length === 0 && !tenantChanged)) return { ...none, changes };

  // Le remplacement du locataire prime : l'accord était celui d'une autre personne.
  const reason = tenantChanged ? TenantAgreementEndReason.TENANT_REPLACED : TenantAgreementEndReason.TERMS_CHANGED;
  await tx.bailTenantAgreementHistory.create({
    data: {
      bailId,
      // L'auteur de l'accord est celui enregistré avec l'accord ; à défaut, le locataire du dossier à ce moment-là.
      tenantId: before.confirmedById ?? before.tenantId,
      tenantName: before.tenantName,
      confirmedAt: before.confirmedAt,
      // Conditions réellement montrées au locataire : seulement si elles avaient été enregistrées.
      confirmedTerms: before.confirmedTerms ?? Prisma.DbNull,
      termsBeforeChange: before.terms,
      changes: changes.length > 0 ? changes : Prisma.DbNull,
      reason,
      invalidatedById: actor.id,
      invalidatedByName: actor.name,
    },
  });
  const requestedAt = after.tenantId ? new Date() : null;
  await tx.bail.update({
    where: { id: bailId },
    data: {
      tenantConfirmedTermsAt: null,
      tenantConfirmedTerms: Prisma.DbNull,
      tenantConfirmedById: null,
      // Sans locataire sur le dossier, il n'y a personne à qui redemander pour l'instant.
      tenantReconfirmationRequestedAt: requestedAt,
    },
  });
  // Un seul e-mail au locataire, sans relance (M15). Seulement quand les conditions changent : un nouveau
  // locataire reçoit déjà son invitation à remplir le formulaire. La tâche de fond vérifie, une minute plus
  // tard, que la demande est toujours en cours (modification annulée, déjà reconfirmée → rien n'est envoyé).
  // Un échec d'envoi ne bloque jamais la modification.
  if (requestedAt && reason === TenantAgreementEndReason.TERMS_CHANGED) {
    await triggerTenantReconfirmationEmail({
      bailId,
      requestedAt: requestedAt.toISOString(),
      changedLabels: changes.map((change) => AGREEMENT_FIELD_LABELS[change.field]),
    }).catch((error) => console.error("[tenant-agreement] e-mail de reconfirmation", error));
  }
  return { invalidated: true, reason, changes };
}

/**
 * Enregistre l'accord du locataire sur les conditions actuelles du bail (avec ces conditions, pour pouvoir
 * dire plus tard à quoi il avait consenti).
 */
export async function recordTenantAgreement(tx: Tx, bailId: string, tenantClientId: string, at: Date = new Date()) {
  const current = await readAgreementSnapshot(tx, bailId);
  if (!current) throw new Error("Dossier introuvable");
  await tx.bail.update({
    where: { id: bailId },
    data: {
      tenantConfirmedTermsAt: at,
      tenantConfirmedTerms: current.terms,
      tenantConfirmedById: tenantClientId,
      tenantReconfirmationRequestedAt: null,
    },
  });
  return current.terms;
}

/** État affiché à l'équipe, au notaire et au locataire. */
export type AgreementStatus = "confirmed" | "to_renew" | "none";

export function agreementStatus(bail: { tenantConfirmedTermsAt?: Date | string | null; tenantReconfirmationRequestedAt?: Date | string | null }): AgreementStatus {
  if (bail.tenantConfirmedTermsAt) return "confirmed";
  if (bail.tenantReconfirmationRequestedAt) return "to_renew";
  return "none";
}
