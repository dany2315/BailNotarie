// Module serveur interne (pas une action appelable depuis le navigateur).
//
// Données du dossier ajoutées aux e-mails au moment de l'envoi (adresse, propriétaire, locataire, notaire,
// état de la vérification). Lues dans la tâche de fond, juste avant l'envoi : l'e-mail dit ce qui est vrai à
// cet instant. Une lecture en échec ne bloque jamais l'envoi : l'e-mail retombe sur sa formulation générale.

import { BailStatus, CompletionStatus, IntakeTarget, ProfilType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientGreetingName } from "@/lib/actions/bail-audit-log";
import { notaireTitle } from "@/lib/notaire/form-reminders";

const CLOSED: BailStatus[] = [BailStatus.TERMINATED, BailStatus.DESISTE, BailStatus.CLASSE_SANS_SUITE];

const PARTY_SELECT = {
  id: true,
  type: true,
  profilType: true,
  completionStatus: true,
  persons: { where: { isPrimary: true }, take: 1, select: { firstName: true, lastName: true } },
  entreprise: { select: { legalName: true, name: true } },
} as const;

const BAIL_SELECT = {
  id: true,
  bailFamily: true,
  property: { select: { fullAddress: true, label: true, completionStatus: true, owner: { select: PARTY_SELECT } } },
  parties: { select: PARTY_SELECT },
  intakes: { where: { target: IntakeTarget.TENANT }, select: { formEmailSentAt: true, formEmailCount: true } },
  dossierAssignments: { orderBy: { assignedAt: "desc" }, take: 1, select: { notaire: { select: { name: true } } } },
} as const;

export type DossierEmailContext = {
  /** Adresse du bien. */
  propertyAddress: string | null;
  /** « logement » ou « local » selon le bail. */
  premisesWord: "logement" | "local";
  ownerName: string | null;
  tenantName: string | null;
  /** Prénom du locataire (pour « Bonjour Léa »). */
  tenantFirstName: string | null;
  /** Un locataire est sur le dossier. */
  hasTenant: boolean;
  /** Le formulaire a déjà été envoyé au locataire. */
  tenantInvited: boolean;
  /** Le bien et toutes les parties (propriétaire et locataire) sont vérifiés. */
  allVerified: boolean;
  /** « Maître Durand » si un notaire est assigné. */
  notaireName: string | null;
};

const EMPTY: DossierEmailContext = {
  propertyAddress: null,
  premisesWord: "logement",
  ownerName: null,
  tenantName: null,
  tenantFirstName: null,
  hasTenant: false,
  tenantInvited: false,
  allVerified: false,
  notaireName: null,
};

/** Le dossier visé : par jeton de formulaire, par bail, ou le dernier dossier en cours d'un client ou d'un bien. */
export type DossierLookup = { token?: string | null; bailId?: string | null; clientId?: string | null; propertyId?: string | null };

async function findBail(lookup: DossierLookup) {
  if (lookup.bailId) return prisma.bail.findUnique({ where: { id: lookup.bailId }, select: BAIL_SELECT });
  if (lookup.token) {
    const link = await prisma.intakeLink.findUnique({ where: { token: lookup.token }, select: { bailId: true } });
    return link?.bailId ? prisma.bail.findUnique({ where: { id: link.bailId }, select: BAIL_SELECT }) : null;
  }
  const where = lookup.clientId
    ? { parties: { some: { id: lookup.clientId } } }
    : lookup.propertyId
      ? { propertyId: lookup.propertyId }
      : null;
  if (!where) return null;
  return prisma.bail.findFirst({ where: { ...where, status: { notIn: CLOSED } }, orderBy: { createdAt: "desc" }, select: BAIL_SELECT });
}

/** Jeton d'un lien de formulaire (« …/intakes/<jeton> »). */
export function tokenFromFormUrl(formUrl: string | null | undefined): string | null {
  if (!formUrl) return null;
  try {
    return new URL(formUrl, "http://localhost").pathname.split("/").filter(Boolean).pop() || null;
  } catch {
    return null;
  }
}

export async function getDossierEmailContext(lookup: DossierLookup): Promise<DossierEmailContext> {
  try {
    const bail = await findBail(lookup);
    if (!bail) return EMPTY;
    const owner = bail.parties.find((party) => party.profilType === ProfilType.PROPRIETAIRE) ?? bail.property?.owner ?? null;
    const tenant = bail.parties.find((party) => party.profilType === ProfilType.LOCATAIRE) ?? null;
    const verifiedParties = [owner, tenant].every((party) => party?.completionStatus === CompletionStatus.COMPLETED);
    return {
      propertyAddress: bail.property?.fullAddress || bail.property?.label || null,
      premisesWord: bail.bailFamily === "COMMERCIAL" ? "local" : "logement",
      ownerName: getClientGreetingName(owner),
      tenantName: getClientGreetingName(tenant),
      tenantFirstName: tenant?.type === "PERSONNE_MORALE" ? getClientGreetingName(tenant) : tenant?.persons[0]?.firstName?.trim() || null,
      hasTenant: !!tenant,
      tenantInvited: !!tenant && bail.intakes.some((link) => !!link.formEmailSentAt || link.formEmailCount > 0),
      allVerified: verifiedParties && bail.property?.completionStatus === CompletionStatus.COMPLETED,
      notaireName: notaireTitle(bail.dossierAssignments[0]?.notaire?.name),
    };
  } catch (error) {
    console.error("[dossier-context] lecture du dossier pour l'e-mail impossible :", error);
    return EMPTY;
  }
}
