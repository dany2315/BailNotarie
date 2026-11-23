/**
 * Questions sur le loyer (relocation en zone tendue, complément de loyer, DPE) telles que les
 * formulaires les manipulent (chaînes), et leur conversion vers les colonnes du bail.
 */

export interface RentRulesFormValues {
  relocationLetBefore: "" | "yes" | "no";
  previousTenantLeftAt: string;
  previousRentAmount: string;
  previousRentRevisedRecently: "" | "yes" | "no";
  rentIncreaseReason: "" | "NONE" | "WORKS" | "UNDERVALUED";
  worksAmount: string;
  worksCompletedAt: string;
  neighborhoodRent: string;
  rentSupplementReason: string;
}

export const EMPTY_RENT_RULES: RentRulesFormValues = {
  relocationLetBefore: "",
  previousTenantLeftAt: "",
  previousRentAmount: "",
  previousRentRevisedRecently: "",
  rentIncreaseReason: "",
  worksAmount: "",
  worksCompletedAt: "",
  neighborhoodRent: "",
  rentSupplementReason: "",
};

/** Colonnes du bail correspondantes (null = non répondu). */
export interface RentRulesData {
  relocationLetBefore: boolean | null;
  previousTenantLeftAt: Date | null;
  previousRentAmount: number | null;
  previousRentRevisedRecently: boolean | null;
  rentIncreaseReason: string | null;
  worksAmount: number | null;
  worksCompletedAt: Date | null;
  neighborhoodRent: number | null;
  rentSupplementReason: string | null;
}

const yesNo = (value: unknown) => (value === "yes" || value === true ? true : value === "no" || value === false ? false : null);
const int = (value: unknown) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Math.round(Number(String(value).replace(",", ".")));
  return Number.isFinite(num) && num >= 0 ? num : null;
};
const day = (value: unknown) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Réponses du formulaire vers les colonnes du bail. Les réponses qui ne s'appliquent plus (par
 * exemple les travaux quand le propriétaire choisit « pas de hausse ») sont remises à null.
 */
export function rentRulesFromForm(values: Partial<RentRulesFormValues>): RentRulesData {
  const letBefore = yesNo(values.relocationLetBefore);
  const relet = letBefore === true;
  const reason = relet && values.rentIncreaseReason ? values.rentIncreaseReason : null;
  return {
    relocationLetBefore: letBefore,
    previousTenantLeftAt: relet ? day(values.previousTenantLeftAt) : null,
    previousRentAmount: relet ? int(values.previousRentAmount) : null,
    previousRentRevisedRecently: relet ? yesNo(values.previousRentRevisedRecently) : null,
    rentIncreaseReason: reason,
    worksAmount: reason === "WORKS" ? int(values.worksAmount) : null,
    worksCompletedAt: reason === "WORKS" ? day(values.worksCompletedAt) : null,
    neighborhoodRent: reason === "UNDERVALUED" ? int(values.neighborhoodRent) : null,
    rentSupplementReason: values.rentSupplementReason?.trim() ? values.rentSupplementReason.trim() : null,
  };
}

const isoDay = (value: unknown) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));

/** Colonnes du bail vers les valeurs du formulaire (reprise d'un dossier). */
export function rentRulesToForm(bail: Partial<Record<keyof RentRulesData, unknown>> | null | undefined): RentRulesFormValues {
  if (!bail) return { ...EMPTY_RENT_RULES };
  const yn = (value: unknown) => (value === true ? "yes" : value === false ? "no" : "") as "" | "yes" | "no";
  return {
    relocationLetBefore: yn(bail.relocationLetBefore),
    previousTenantLeftAt: isoDay(bail.previousTenantLeftAt),
    previousRentAmount: str(bail.previousRentAmount),
    previousRentRevisedRecently: yn(bail.previousRentRevisedRecently),
    rentIncreaseReason: (str(bail.rentIncreaseReason) as RentRulesFormValues["rentIncreaseReason"]) || "",
    worksAmount: str(bail.worksAmount),
    worksCompletedAt: isoDay(bail.worksCompletedAt),
    neighborhoodRent: str(bail.neighborhoodRent),
    rentSupplementReason: str(bail.rentSupplementReason),
  };
}
