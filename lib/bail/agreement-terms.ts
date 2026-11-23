/**
 * Conditions du bail couvertes par l'accord du locataire — fonctions sans accès à la base, utilisables
 * aussi dans les composants du navigateur. La logique d'archivage est dans tenant-agreement.ts (serveur).
 */

import { formatEuros, formatFrenchDate } from "@/lib/utils/email-format";

/** Conditions couvertes par l'accord. Le reste du dossier (pièces, relocation, clauses…) ne le remet pas en cause. */
export const AGREEMENT_FIELDS = [
  "bailFamily",
  "bailType",
  "rentAmount",
  "monthlyCharges",
  "securityDeposit",
  "effectiveDate",
  "endDate",
  "rentPeriodicity",
] as const;

export type AgreementField = (typeof AGREEMENT_FIELDS)[number];
export type AgreementTerms = Record<AgreementField, string | number | null>;
export type AgreementChange = { field: AgreementField; before: string | number | null; after: string | number | null };

export const AGREEMENT_FIELD_LABELS: Record<AgreementField, string> = {
  bailFamily: "Usage du bail",
  bailType: "Type de bail",
  rentAmount: "Loyer",
  monthlyCharges: "Charges",
  securityDeposit: "Dépôt de garantie",
  effectiveDate: "Date de prise d'effet",
  endDate: "Date de fin",
  rentPeriodicity: "Périodicité du loyer",
};

const day = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

type BailTermsSource = {
  bailFamily: string;
  bailType: string;
  rentAmount: number;
  monthlyCharges: number;
  securityDeposit: number;
  effectiveDate: Date | string | null;
  endDate: Date | string | null;
  commercialTerms?: { rentPeriodicity?: string | null } | null;
};

/** Conditions du bail sous une forme stable et comparable (dates au jour près). */
export function agreementTerms(bail: BailTermsSource): AgreementTerms {
  return {
    bailFamily: bail.bailFamily,
    bailType: bail.bailType,
    rentAmount: bail.rentAmount,
    monthlyCharges: bail.monthlyCharges,
    securityDeposit: bail.securityDeposit,
    effectiveDate: day(bail.effectiveDate),
    endDate: day(bail.endDate),
    rentPeriodicity: bail.commercialTerms?.rentPeriodicity ?? null,
  };
}

/** Champs réellement différents entre deux états des conditions (une sauvegarde identique ne renvoie rien). */
export function agreementChanges(before: AgreementTerms, after: AgreementTerms): AgreementChange[] {
  return AGREEMENT_FIELDS.filter((field) => (before[field] ?? null) !== (after[field] ?? null)).map((field) => ({
    field,
    before: before[field] ?? null,
    after: after[field] ?? null,
  }));
}

const BAIL_FAMILY_TEXT: Record<string, string> = { HABITATION: "Habitation", COMMERCIAL: "Commercial" };
const BAIL_TYPE_TEXT: Record<string, string> = {
  BAIL_NU_3_ANS: "Location vide, 3 ans",
  BAIL_NU_6_ANS: "Location vide, 6 ans",
  BAIL_MEUBLE_1_ANS: "Location meublée, 1 an",
  BAIL_MEUBLE_9_MOIS: "Location meublée étudiant, 9 mois",
  COMMERCIAL_3_6_9: "Bail commercial 3-6-9",
  COMMERCIAL_DEROGATOIRE: "Bail commercial dérogatoire",
};
const PERIODICITY_TEXT: Record<string, string> = { MONTHLY: "Mensuel", QUARTERLY: "Trimestriel" };

/** Valeur d'une condition telle qu'on la montre au locataire (« 1 100 € », « 1er décembre 2026 »…). */
export function formatAgreementValue(field: AgreementField, value: string | number | null): string {
  if (value === null || value === undefined || value === "") return "Non renseigné";
  switch (field) {
    case "rentAmount":
    case "monthlyCharges":
    case "securityDeposit":
      return formatEuros(Number(value)) ?? String(value);
    case "effectiveDate":
    case "endDate":
      return formatFrenchDate(String(value)) ?? String(value);
    case "bailFamily":
      return BAIL_FAMILY_TEXT[String(value)] ?? String(value);
    case "bailType":
      return BAIL_TYPE_TEXT[String(value)] ?? String(value);
    case "rentPeriodicity":
      return PERIODICITY_TEXT[String(value)] ?? String(value);
  }
}
