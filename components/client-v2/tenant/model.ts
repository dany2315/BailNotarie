import { BailType, ProfilType } from "@prisma/client";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import type { Tone } from "../owner-ui";

/* =========================================================================
   L'espace locataire, vu depuis le locataire.

   Un même statut ne veut pas dire la même chose des deux côtés du bail :
   `AWAITING_TENANT_FORM`, c'est « on attend le locataire » chez le
   propriétaire, et « c'est à vous de jouer » ici. Les libellés sont donc
   écrits pour celui qui lit, pas pour la base.

   Les règles, elles, ne changent pas : même découpage en trois étapes, même
   calcul de date de fin, mêmes statuts terminaux.
   ========================================================================= */

export type TenantBail = {
  id: string;
  bailType: string | null;
  bailFamily: string | null;
  status: string;
  rentAmount: number | null;
  effectiveDate: string | null;
  endDate: string | null;
  property: { id: string; label: string | null; fullAddress: string | null };
  parties: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null; email: string | null } | null;
  }>;
  dossierAssignments: Array<{
    id: string;
    notaire: { id: string; name: string | null; email: string } | null;
  }>;
};

export type TenantPendingRequest = {
  id: string;
  title: string;
  content?: string | null;
  createdAt: string | Date;
  bail: { id: string; property: { id: string; label: string | null; fullAddress: string | null } } | null;
};

export type TenantIntake = {
  token: string;
  intakeUrl: string;
  stage: "identity" | "property" | "bail" | "finalize";
  description: string;
  propertyLabel: string | null;
  bailType: string | null;
  bailId: string | null;
};

export const STEPS = ["Vérification", "Notaire", "Signé"] as const;

export const STEP_INDEX: Record<string, number> = {
  DRAFT: 0,
  AWAITING_TENANT: 0,
  AWAITING_TENANT_FORM: 0,
  PENDING_VALIDATION: 0,
  READY_FOR_NOTARY: 1,
  CLIENT_CONTACTED: 1,
  SIGNED: 2,
  TERMINATED: 2,
};

export const ACTIVE_STATUSES = [
  "DRAFT",
  "AWAITING_TENANT_FORM",
  "PENDING_VALIDATION",
  "READY_FOR_NOTARY",
  "CLIENT_CONTACTED",
];

/** Les statuts où le bail ne bouge plus. */
export const TERMINAL_STATUSES = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"];

export const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Bail nu 3 ans",
  BAIL_NU_6_ANS: "Bail nu 6 ans",
  BAIL_MEUBLE_1_ANS: "Bail meublé 1 an",
  BAIL_MEUBLE_9_MOIS: "Bail meublé 9 mois",
};

export const STATUS_VIEW: Record<string, { title: string; note?: string; tone: Tone }> = {
  DRAFT: {
    title: "En vérification",
    note: "Vos informations sont en cours de vérification.",
    tone: "blue",
  },
  AWAITING_TENANT: {
    title: "En attente",
    note: "Votre propriétaire prépare le dossier.",
    tone: "amber",
  },
  AWAITING_TENANT_FORM: {
    title: "Formulaire à compléter",
    note: "Complétez vos informations pour débloquer le bail.",
    tone: "amber",
  },
  PENDING_VALIDATION: {
    title: "En vérification",
    note: "Votre dossier est entre nos mains. On revient vers vous sous 48 h.",
    tone: "blue",
  },
  READY_FOR_NOTARY: {
    title: "Chez le notaire",
    note: "Un notaire a pris le dossier en charge. Il vous contacte bientôt.",
    tone: "violet",
  },
  CLIENT_CONTACTED: {
    title: "Avec le notaire",
    note: "Vous préparez ensemble la signature.",
    tone: "violet",
  },
  SIGNED: { title: "Signé", note: "Votre bail a été signé.", tone: "emerald" },
  TERMINATED: { title: "Terminé", tone: "slate" },
  DESISTE: { title: "Désistement", tone: "slate" },
  CLASSE_SANS_SUITE: { title: "Classé sans suite", tone: "slate" },
};

export const FALLBACK_VIEW = { title: "En cours", tone: "slate" as Tone };

export const STAGE_LABELS: Record<string, string> = {
  identity: "Informations personnelles",
  property: "Bien immobilier",
  bail: "Détails du bail",
  finalize: "Documents",
};

/** Le nom du propriétaire : c'est lui que le locataire cherche sur un bail. */
export function getProprietaireName(parties: TenantBail["parties"]): string | null {
  const owner = parties?.find((party) => party.profilType === ProfilType.PROPRIETAIRE);
  if (!owner) return null;
  if (owner.entreprise) return owner.entreprise.legalName || owner.entreprise.name || "Entreprise";
  const person = owner.persons?.[0];
  if (!person) return null;
  return `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || null;
}

/** Tout ce qu'une ligne de bail affiche, calculé une fois. */
export function tenantBailFacts(bail: TenantBail) {
  const view = STATUS_VIEW[bail.status] ?? FALLBACK_VIEW;
  const endDate = bail.endDate
    ? bail.endDate
    : bail.effectiveDate && bail.bailType
      ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType).toISOString()
      : null;

  return {
    view,
    endDate,
    terminal: TERMINAL_STATUSES.includes(bail.status),
    stepIndex: STEP_INDEX[bail.status] ?? 0,
    notaire: bail.dossierAssignments?.[0]?.notaire ?? null,
    proprietaire: getProprietaireName(bail.parties),
    isCommercial: bail.bailFamily === "COMMERCIAL",
    rent:
      bail.rentAmount != null && bail.rentAmount > 0
        ? new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(bail.rentAmount)
        : null,
    typeLabel: bail.bailType
      ? BAIL_TYPE_LABELS[bail.bailType] || bail.bailType
      : bail.bailFamily === "COMMERCIAL"
        ? "Bail commercial"
        : null,
    propertyLabel: bail.property.label || bail.property.fullAddress?.split(",")[0] || "Bien",
    propertyDescription:
      bail.property.label && bail.property.fullAddress
        ? `${bail.property.label} — ${bail.property.fullAddress}`
        : bail.property.fullAddress || bail.property.label || "Bien",
  };
}
