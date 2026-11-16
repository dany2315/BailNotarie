/**
 * Conditions du bail couvertes par l'accord du locataire — fonctions sans accès à la base, utilisables
 * aussi dans les composants du navigateur. La logique d'archivage est dans tenant-agreement.ts (serveur).
 */

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
