/**
 * Bail commercial : libellés, réponses du formulaire propriétaire et règles partagées
 * (serveur et client). Les conditions sont enregistrées dans BailCommercialTerms.
 */

/** Types de local proposés pour un bail commercial (BienType). */
export const PREMISES_TYPES = ["BOUTIQUE", "BUREAU", "LOCAL_ACTIVITE", "ENTREPOT", "AUTRE_LOCAL"] as const;
export type PremisesType = (typeof PREMISES_TYPES)[number];

export const PREMISES_TYPE_LABELS: Record<PremisesType, string> = {
  BOUTIQUE: "Boutique",
  BUREAU: "Bureau",
  LOCAL_ACTIVITE: "Local d'activité",
  ENTREPOT: "Entrepôt",
  AUTRE_LOCAL: "Autre local",
};

export const PREMISES_TYPE_HINTS: Record<PremisesType, string> = {
  BOUTIQUE: "Commerce ouvert au public",
  BUREAU: "Activité de bureau, profession libérale",
  LOCAL_ACTIVITE: "Atelier, artisanat, production",
  ENTREPOT: "Stockage, logistique",
  AUTRE_LOCAL: "Restaurant, local mixte…",
};

export function isPremisesType(value: unknown): value is PremisesType {
  return typeof value === "string" && (PREMISES_TYPES as readonly string[]).includes(value);
}

export const COMMERCIAL_BAIL_TYPES = ["COMMERCIAL_3_6_9", "COMMERCIAL_DEROGATOIRE"] as const;

export function isCommercialBailType(value: unknown): boolean {
  return typeof value === "string" && (COMMERCIAL_BAIL_TYPES as readonly string[]).includes(value);
}

/** Durée maximale d'un bail dérogatoire (article L145-5 du Code de commerce). */
export const DEROGATORY_MAX_MONTHS = 36;

export const RENT_PERIODICITY_LABELS: Record<string, string> = {
  MONTHLY: "Mensuel",
  QUARTERLY: "Trimestriel",
};

export const INDEXATION_LABELS: Record<string, string> = {
  ILC: "Indice des loyers commerciaux (ILC)",
  ILAT: "Indice des loyers des activités tertiaires (ILAT)",
  NONE: "Pas de révision",
};

/** Indice proposé selon le type de local : activités de bureau → ILAT, sinon ILC. */
export function defaultIndexation(premisesType: unknown): "ILC" | "ILAT" {
  return premisesType === "BUREAU" ? "ILAT" : "ILC";
}

export const FEES_PAID_BY_LABELS: Record<string, string> = {
  TENANT: "Le locataire",
  OWNER: "Le propriétaire",
  SHARED: "À parts égales",
};

/** Charges, impôts et taxes à répartir (inventaire de la loi Pinel), pré-remplis selon l'usage. */
export const CHARGE_ITEMS = [
  { key: "propertyTax", label: "Taxe foncière", defaultPayer: "TENANT" },
  { key: "wasteTax", label: "Taxe d'enlèvement des ordures ménagères", defaultPayer: "TENANT" },
  { key: "coOwnershipCharges", label: "Charges courantes de copropriété", defaultPayer: "TENANT" },
  { key: "buildingInsurance", label: "Assurance de l'immeuble", defaultPayer: "TENANT" },
  { key: "routineMaintenance", label: "Entretien et petites réparations", defaultPayer: "TENANT" },
] as const;

/** Toujours à la charge du propriétaire (article R145-35 du Code de commerce). */
export const OWNER_ONLY_CHARGES = [
  { key: "majorRepairs", label: "Grosses réparations (article 606 du Code civil)" },
  { key: "managementFees", label: "Honoraires de gestion des loyers" },
] as const;

export const PAYER_LABELS: Record<string, string> = { OWNER: "Propriétaire", TENANT: "Locataire" };

export const CLAUSE_OPTIONS = [
  { key: "EXCLUSIVITY", label: "Exclusivité" },
  { key: "NON_COMPETITION", label: "Non-concurrence" },
  { key: "ASSIGNMENT", label: "Conditions particulières de cession du bail" },
  { key: "SUBLETTING", label: "Sous-location autorisée" },
] as const;

const CLAUSE_LABELS: Record<string, string> = Object.fromEntries(CLAUSE_OPTIONS.map((c) => [c.key, c.label]));

export type YesNo = "" | "yes" | "no";
export type WorkLine = { label: string; amount: string; year: string };

/** Réponses du formulaire propriétaire (chaînes, comme les autres champs du formulaire). */
export type CommercialFormValues = {
  activity: string;
  ancillaryActivities: string;
  previouslyLet: YesNo;
  previousActivity: string;
  currentlyVacant: YesNo;
  derogatoryMonths: string;
  keysHandoverDate: string;
  rentFree: YesNo;
  rentFreeMonths: string;
  rentPeriodicity: "" | "MONTHLY" | "QUARTERLY";
  vat: YesNo;
  indexation: "" | "ILC" | "ILAT" | "NONE";
  entryFee: YesNo;
  entryFeeAmount: string;
  feesPaidBy: "" | "TENANT" | "OWNER" | "SHARED";
  charges: Record<string, "OWNER" | "TENANT">;
  hasPastWorks: YesNo;
  pastWorks: WorkLine[];
  hasPlannedWorks: YesNo;
  plannedWorks: WorkLine[];
  hasGuarantor: YesNo;
  guarantorName: string;
  guarantorEmail: string;
  clauses: string[];
  clausesNote: string;
  boughtDuringMarriage: YesNo;
};

export const EMPTY_WORK_LINE: WorkLine = { label: "", amount: "", year: "" };

export function defaultCharges(): Record<string, "OWNER" | "TENANT"> {
  return Object.fromEntries(CHARGE_ITEMS.map((item) => [item.key, item.defaultPayer])) as Record<string, "OWNER" | "TENANT">;
}

export const EMPTY_COMMERCIAL: CommercialFormValues = {
  activity: "",
  ancillaryActivities: "",
  previouslyLet: "",
  previousActivity: "",
  currentlyVacant: "",
  derogatoryMonths: "",
  keysHandoverDate: "",
  rentFree: "",
  rentFreeMonths: "",
  rentPeriodicity: "",
  vat: "",
  indexation: "",
  entryFee: "",
  entryFeeAmount: "",
  feesPaidBy: "",
  charges: defaultCharges(),
  hasPastWorks: "",
  pastWorks: [],
  hasPlannedWorks: "",
  plannedWorks: [],
  hasGuarantor: "",
  guarantorName: "",
  guarantorEmail: "",
  clauses: [],
  clausesNote: "",
  boughtDuringMarriage: "",
};

const yesNo = (value: boolean | null | undefined): YesNo => (value === true ? "yes" : value === false ? "no" : "");
const fromYesNo = (value: unknown): boolean | null => (value === "yes" ? true : value === "no" ? false : null);
const text = (value: unknown, max = 2000): string | null =>
  typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;
const int = (value: unknown, min: number, max: number): number | null => {
  const num = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  return Number.isFinite(num) && num >= min && num <= max ? Math.round(num) : null;
};
const isoDay = (value: unknown): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): T | null =>
  typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : null;

function worksToForm(value: unknown): WorkLine[] {
  if (!Array.isArray(value)) return [];
  return value.map((line: any) => ({
    label: typeof line?.label === "string" ? line.label : "",
    amount: line?.amount != null ? String(line.amount) : "",
    year: line?.year != null ? String(line.year) : "",
  }));
}

function worksFromForm(value: unknown): Array<{ label: string; amount: number | null; year: number | null }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((line: any) => ({
      label: text(line?.label, 300) ?? "",
      amount: int(line?.amount, 0, 1_000_000_000),
      year: int(line?.year, 1900, 2100),
    }))
    .filter((line) => line.label);
}

/** Conditions enregistrées → réponses du formulaire. */
export function commercialTermsToForm(terms: any | null | undefined): CommercialFormValues {
  if (!terms) return { ...EMPTY_COMMERCIAL, charges: defaultCharges() };
  const charges = defaultCharges();
  if (terms.chargesAllocation && typeof terms.chargesAllocation === "object") {
    for (const item of CHARGE_ITEMS) {
      const payer = (terms.chargesAllocation as Record<string, unknown>)[item.key];
      if (payer === "OWNER" || payer === "TENANT") charges[item.key] = payer;
    }
  }
  return {
    activity: terms.activity ?? "",
    ancillaryActivities: terms.ancillaryActivities ?? "",
    previouslyLet: yesNo(terms.previouslyLet),
    previousActivity: terms.previousActivity ?? "",
    currentlyVacant: yesNo(terms.currentlyVacant),
    derogatoryMonths: terms.derogatoryMonths != null ? String(terms.derogatoryMonths) : "",
    keysHandoverDate: isoDay(terms.keysHandoverDate),
    rentFree: terms.rentFreeMonths == null ? "" : terms.rentFreeMonths > 0 ? "yes" : "no",
    rentFreeMonths: terms.rentFreeMonths ? String(terms.rentFreeMonths) : "",
    rentPeriodicity: oneOf(terms.rentPeriodicity, ["MONTHLY", "QUARTERLY"] as const) ?? "",
    vat: yesNo(terms.vatApplicable),
    indexation: oneOf(terms.indexation, ["ILC", "ILAT", "NONE"] as const) ?? "",
    entryFee: terms.entryFee == null ? "" : terms.entryFee > 0 ? "yes" : "no",
    entryFeeAmount: terms.entryFee ? String(terms.entryFee) : "",
    feesPaidBy: oneOf(terms.feesPaidBy, ["TENANT", "OWNER", "SHARED"] as const) ?? "",
    charges,
    hasPastWorks: yesNo(terms.hasPastWorks),
    pastWorks: worksToForm(terms.pastWorks),
    hasPlannedWorks: yesNo(terms.hasPlannedWorks),
    plannedWorks: worksToForm(terms.plannedWorks),
    hasGuarantor: yesNo(terms.hasGuarantor),
    guarantorName: terms.guarantorName ?? "",
    guarantorEmail: terms.guarantorEmail ?? "",
    clauses: Array.isArray(terms.clauses) ? terms.clauses.filter((c: unknown) => typeof c === "string" && CLAUSE_LABELS[c]) : [],
    clausesNote: terms.clausesNote ?? "",
    boughtDuringMarriage: yesNo(terms.premisesBoughtDuringMarriage),
  };
}

/**
 * Réponses du formulaire → colonnes de BailCommercialTerms. Seules les réponses envoyées
 * sont écrites ; une réponse « non » efface les précisions qui en dépendent.
 */
export function commercialTermsFromForm(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const form = raw as Partial<CommercialFormValues>;
  const has = (key: keyof CommercialFormValues) => Object.prototype.hasOwnProperty.call(form, key);
  const data: Record<string, unknown> = {};
  if (has("activity")) data.activity = text(form.activity);
  if (has("ancillaryActivities")) data.ancillaryActivities = text(form.ancillaryActivities);
  if (has("previouslyLet")) {
    data.previouslyLet = fromYesNo(form.previouslyLet);
    if (data.previouslyLet === false) {
      data.previousActivity = null;
      data.currentlyVacant = null;
    }
  }
  if (has("previousActivity") && data.previouslyLet !== false) data.previousActivity = text(form.previousActivity, 300);
  if (has("currentlyVacant") && data.previouslyLet !== false) data.currentlyVacant = fromYesNo(form.currentlyVacant);
  if (has("derogatoryMonths")) data.derogatoryMonths = int(form.derogatoryMonths, 1, DEROGATORY_MAX_MONTHS);
  if (has("keysHandoverDate")) {
    const date = form.keysHandoverDate ? new Date(form.keysHandoverDate) : null;
    data.keysHandoverDate = date && !Number.isNaN(date.getTime()) ? date : null;
  }
  if (has("rentFree")) {
    const rentFree = fromYesNo(form.rentFree);
    data.rentFreeMonths = rentFree === true ? int(form.rentFreeMonths, 1, 120) : rentFree === false ? 0 : null;
  }
  if (has("rentPeriodicity")) data.rentPeriodicity = oneOf(form.rentPeriodicity, ["MONTHLY", "QUARTERLY"] as const);
  if (has("vat")) data.vatApplicable = fromYesNo(form.vat);
  if (has("indexation")) data.indexation = oneOf(form.indexation, ["ILC", "ILAT", "NONE"] as const);
  if (has("entryFee")) {
    const entryFee = fromYesNo(form.entryFee);
    data.entryFee = entryFee === true ? int(form.entryFeeAmount, 1, 1_000_000_000) : entryFee === false ? 0 : null;
  }
  if (has("feesPaidBy")) data.feesPaidBy = oneOf(form.feesPaidBy, ["TENANT", "OWNER", "SHARED"] as const);
  if (has("charges")) {
    const charges: Record<string, string> = {};
    for (const item of CHARGE_ITEMS) {
      const payer = (form.charges as Record<string, unknown> | undefined)?.[item.key];
      charges[item.key] = payer === "OWNER" || payer === "TENANT" ? payer : item.defaultPayer;
    }
    data.chargesAllocation = charges;
  }
  if (has("hasPastWorks")) {
    data.hasPastWorks = fromYesNo(form.hasPastWorks);
    data.pastWorks = data.hasPastWorks === true ? worksFromForm(form.pastWorks) : [];
  }
  if (has("hasPlannedWorks")) {
    data.hasPlannedWorks = fromYesNo(form.hasPlannedWorks);
    data.plannedWorks = data.hasPlannedWorks === true ? worksFromForm(form.plannedWorks) : [];
  }
  if (has("hasGuarantor")) {
    data.hasGuarantor = fromYesNo(form.hasGuarantor);
    data.guarantorName = data.hasGuarantor === true ? text(form.guarantorName, 200) : null;
    data.guarantorEmail = data.hasGuarantor === true ? text(form.guarantorEmail, 200) : null;
  }
  if (has("clauses")) data.clauses = Array.isArray(form.clauses) ? form.clauses.filter((c) => CLAUSE_LABELS[c]) : [];
  if (has("clausesNote")) data.clausesNote = text(form.clausesNote, 4000);
  if (has("boughtDuringMarriage")) data.premisesBoughtDuringMarriage = fromYesNo(form.boughtDuringMarriage);
  return data;
}

/** Marié en communauté réduite aux acquêts : on demande si le local a été acheté pendant le mariage. */
export function asksBoughtDuringMarriage(familyStatus: unknown, matrimonialRegime: unknown): boolean {
  return familyStatus === "MARIE" && matrimonialRegime === "COMMUNAUTE_REDUITE";
}

/**
 * Bail commercial d'un bien commun : les deux époux doivent le signer (article 1425 du Code civil).
 * Communauté universelle : toujours ; communauté légale : si le local a été acheté pendant le mariage.
 */
export function spouseMustSign(familyStatus: unknown, matrimonialRegime: unknown, boughtDuringMarriage: unknown): boolean {
  if (familyStatus !== "MARIE") return false;
  if (matrimonialRegime === "COMMUNAUTE_UNIVERSELLE") return true;
  return matrimonialRegime === "COMMUNAUTE_REDUITE" && boughtDuringMarriage === "yes";
}

export type CommercialStep = "activity" | "duration" | "rent" | "deposit" | "charges" | "clauses";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Contrôle d'une étape du parcours commercial : { chemin du champ: message }. */
export function validateCommercialStep(
  step: CommercialStep,
  values: Partial<CommercialFormValues> | undefined,
  context: { bailType?: unknown } = {},
): Record<string, string> {
  const v = { ...EMPTY_COMMERCIAL, ...(values ?? {}) };
  const errors: Record<string, string> = {};
  const set = (key: string, message: string) => {
    errors[`commercial.${key}`] = message;
  };
  if (step === "activity") {
    if (!v.activity.trim()) set("activity", "Décrivez l'activité qui sera exercée dans le local");
    if (!v.previouslyLet) set("previouslyLet", "Indiquez si le local a déjà été loué");
    if (v.previouslyLet === "yes") {
      if (!v.previousActivity.trim()) set("previousActivity", "Indiquez l'activité du locataire précédent");
      if (!v.currentlyVacant) set("currentlyVacant", "Indiquez si le local est libre aujourd'hui");
    }
  }
  if (step === "duration") {
    if (context.bailType === "COMMERCIAL_DEROGATOIRE" && !int(v.derogatoryMonths, 1, DEROGATORY_MAX_MONTHS)) {
      set("derogatoryMonths", `Indiquez une durée de 1 à ${DEROGATORY_MAX_MONTHS} mois`);
    }
  }
  if (step === "rent") {
    if (!v.rentPeriodicity) set("rentPeriodicity", "Choisissez le rythme de paiement");
    if (!v.vat) set("vat", "Indiquez si le loyer est soumis à la TVA");
    if (!v.indexation) set("indexation", "Choisissez la révision du loyer");
    if (!v.rentFree) set("rentFree", "Indiquez s'il y a une période sans loyer");
    if (v.rentFree === "yes" && !int(v.rentFreeMonths, 1, 120)) set("rentFreeMonths", "Indiquez le nombre de mois sans loyer");
  }
  if (step === "deposit") {
    if (!v.entryFee) set("entryFee", "Indiquez s'il y a un pas-de-porte");
    if (v.entryFee === "yes" && !int(v.entryFeeAmount, 1, 1_000_000_000)) set("entryFeeAmount", "Indiquez le montant du pas-de-porte");
    if (!v.feesPaidBy) set("feesPaidBy", "Indiquez qui paie les frais d'acte");
  }
  if (step === "charges") {
    for (const key of ["hasPastWorks", "hasPlannedWorks"] as const) {
      const lines = key === "hasPastWorks" ? v.pastWorks : v.plannedWorks;
      if (!v[key]) set(key, "Répondez à la question sur les travaux");
      else if (v[key] === "yes" && !lines.some((line) => line.label.trim() && int(line.amount, 0, 1_000_000_000) !== null)) {
        set(key, "Indiquez au moins des travaux avec leur coût");
      }
    }
  }
  if (step === "clauses") {
    if (!v.hasGuarantor) set("hasGuarantor", "Indiquez s'il y a un garant");
    if (v.hasGuarantor === "yes") {
      if (!v.guarantorName.trim()) set("guarantorName", "Indiquez le nom du garant");
      if (v.guarantorEmail.trim() && !EMAIL_RE.test(v.guarantorEmail.trim())) set("guarantorEmail", "E-mail invalide");
    }
  }
  return errors;
}

export type CommercialDocumentRule = { kind: string; label: string; required: boolean; hint?: string };

/** Pièces propres au bail commercial, selon les réponses du propriétaire. */
export function commercialDocuments(input: {
  previouslyLet?: YesNo;
  legalStatus?: string | null;
  inShoppingCenter?: boolean | null;
  /** SHOPPING_CENTER | ESTATE_COMPLEX */
  complexType?: string | null;
  surfaceM2?: number | null;
  premisesType?: string | null;
  isCompany?: boolean;
}): CommercialDocumentRule[] {
  const rules: CommercialDocumentRule[] = [];
  if (input.inShoppingCenter) {
    rules.push(
      input.complexType === "ESTATE_COMPLEX"
        ? {
            kind: "SHOPPING_CENTER_RULES",
            label: "Cahier des charges et statuts de l'association syndicale (ASL, AFUL)",
            required: true,
            hint: "Remis par le gestionnaire de l'ensemble immobilier.",
          }
        : {
            kind: "SHOPPING_CENTER_RULES",
            label: "Règlement intérieur ou d'exploitation du centre commercial",
            required: true,
            hint: "Remis par le gestionnaire du centre ou de la galerie marchande.",
          },
    );
  }
  if (input.legalStatus === "CO_PROPRIETE") {
    rules.push({ kind: "GENERAL_ASSEMBLY_MINUTES", label: "Derniers procès-verbaux d'assemblée générale", required: false, hint: "Disponibles sur l'espace en ligne de votre syndic." });
  }
  if (input.previouslyLet === "yes") {
    rules.push(
      { kind: "PREVIOUS_LEASE", label: "Bail du locataire précédent", required: false },
      { kind: "LEASE_TERMINATION", label: "Congé ou accord de fin du bail précédent", required: false },
      { kind: "PREVIOUS_TENANT_EXIT_PROOF", label: "État des lieux de sortie", required: false },
    );
  }
  const surface = input.surfaceM2 ?? 0;
  if (surface >= 1000) {
    rules.push({
      kind: "OPERAT_CERTIFICATE",
      label: "Dernière attestation OPERAT",
      required: false,
      hint: "Bâtiments tertiaires de 1 000 m² et plus (dispositif Éco Énergie Tertiaire).",
    });
  }
  if (surface > 2000 && (input.premisesType === "BUREAU" || input.premisesType === "BOUTIQUE")) {
    rules.push({
      kind: "ENVIRONMENTAL_APPENDIX",
      label: "Annexe environnementale ou éléments pour l'établir",
      required: false,
      hint: "Bureaux et commerces de plus de 2 000 m² : équipements, consommations d'eau et d'énergie, déchets.",
    });
  }
  rules.push({ kind: "PREMISES_PLANS", label: "Plans du local", required: false });
  if (input.isCompany) {
    rules.push({ kind: "SIGNING_AUTHORITY", label: "Autorisation de signer ou délégation de pouvoirs", required: false, hint: "Si le signataire n'est pas le représentant légal." });
  }
  rules.push({ kind: "OTHER", label: "Autres documents utiles", required: false, hint: "Commission de sécurité, accessibilité, conformité électrique…" });
  return rules;
}

const euros = (value: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
const frDate = (value: unknown) => {
  const date = value instanceof Date ? value : value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat("fr-FR").format(date) : null;
};

function worksText(value: unknown): string {
  const lines = Array.isArray(value) ? value : [];
  return lines
    .map((line: any) => [line?.label, line?.year ? `(${line.year})` : null, line?.amount != null ? euros(Number(line.amount)) : null].filter(Boolean).join(" "))
    .join(" ; ");
}

/** Situation du local pour l'éditeur de l'équipe : NONE | SHOPPING_CENTER | ESTATE_COMPLEX, depuis les deux champs du bien. */
export function complexTypeValue(inShoppingCenter: boolean | null | undefined, complexType: string | null | undefined): string | null {
  if (inShoppingCenter === false) return "NONE";
  if (inShoppingCenter) return complexType === "ESTATE_COMPLEX" ? "ESTATE_COMPLEX" : "SHOPPING_CENTER";
  return null;
}

/** Paiement du loyer commercial, en clair : « Par trimestre », « Le 5 de chaque mois ». */
export function commercialPaymentText(terms: any | null | undefined, paymentDay?: number | null): string | null {
  if (terms?.rentPeriodicity === "QUARTERLY") return "Par trimestre";
  if (paymentDay) return `Le ${paymentDay} de chaque mois`;
  return terms?.rentPeriodicity === "MONTHLY" ? "Chaque mois" : null;
}

/** TVA sur le loyer commercial, en clair (null : pas encore renseignée). */
export function commercialVatText(terms: any | null | undefined): string | null {
  if (terms?.vatApplicable === true) return "TVA en sus du loyer";
  if (terms?.vatApplicable === false) return "Pas de TVA";
  return null;
}

/**
 * Résumé lisible des conditions : [libellé, valeur]. Pour l'équipe et le notaire, tout ; pour le
 * locataire (forTenant), sans ce qui ne regarde que le propriétaire (location précédente, achat
 * pendant le mariage). omitRent retire le loyer, affiché à part dans les espaces client.
 */
export function commercialTermsSummary(
  terms: any | null | undefined,
  bail?: { bailType?: string | null; rentAmount?: number | null },
  options: { forTenant?: boolean; omitRent?: boolean } = {},
): Array<[string, string]> {
  if (!terms) return [];
  const rows: Array<[string, string]> = [];
  const push = (label: string, value: string | null | undefined) => {
    if (value) rows.push([label, value]);
  };
  push("Activité autorisée", terms.activity);
  push("Activités annexes ou restrictions", terms.ancillaryActivities);
  if (terms.previouslyLet === false && !options.forTenant) push("Location précédente", "Première location");
  if (terms.previouslyLet === true && !options.forTenant) {
    push("Location précédente", [terms.previousActivity, terms.currentlyVacant === true ? "local libre" : terms.currentlyVacant === false ? "local encore occupé" : null].filter(Boolean).join(" · "));
  }
  if (bail?.bailType === "COMMERCIAL_DEROGATOIRE" && terms.derogatoryMonths) push("Durée du bail dérogatoire", `${terms.derogatoryMonths} mois`);
  push("Remise des clés", frDate(terms.keysHandoverDate));
  if (terms.rentFreeMonths != null) push("Franchise de loyer", terms.rentFreeMonths > 0 ? `${terms.rentFreeMonths} mois` : "Aucune");
  if (!options.omitRent) {
    if (bail?.rentAmount) push("Loyer annuel hors taxes", euros(bail.rentAmount * 12));
    push("Paiement du loyer", terms.rentPeriodicity ? RENT_PERIODICITY_LABELS[terms.rentPeriodicity] : null);
    if (terms.vatApplicable != null) push("TVA sur le loyer", terms.vatApplicable ? "Oui" : "Non");
  }
  push("Révision du loyer", terms.indexation ? INDEXATION_LABELS[terms.indexation] : null);
  if (terms.entryFee != null) push("Pas-de-porte", terms.entryFee > 0 ? euros(terms.entryFee) : "Aucun");
  push("Frais d'acte payés par", terms.feesPaidBy ? FEES_PAID_BY_LABELS[terms.feesPaidBy] : null);
  if (terms.chargesAllocation && typeof terms.chargesAllocation === "object") {
    const allocation = terms.chargesAllocation as Record<string, string>;
    const byPayer = (payer: string) => CHARGE_ITEMS.filter((item) => allocation[item.key] === payer).map((item) => item.label);
    const tenant = byPayer("TENANT");
    const owner = [...byPayer("OWNER"), ...OWNER_ONLY_CHARGES.map((item) => item.label)];
    push("Charges du locataire", tenant.join(", ") || "Aucune");
    push("Charges du propriétaire", owner.join(", "));
  }
  if (terms.hasPastWorks != null) push("Travaux des 3 dernières années", terms.hasPastWorks ? worksText(terms.pastWorks) : "Aucun");
  if (terms.hasPlannedWorks != null) push("Travaux prévus dans les 3 ans", terms.hasPlannedWorks ? worksText(terms.plannedWorks) : "Aucun");
  if (terms.hasGuarantor != null) push("Garant", terms.hasGuarantor ? [terms.guarantorName, terms.guarantorEmail].filter(Boolean).join(" · ") : "Aucun");
  const clauses = Array.isArray(terms.clauses) ? terms.clauses.map((c: string) => CLAUSE_LABELS[c]).filter(Boolean) : [];
  push("Clauses particulières", [clauses.join(", "), terms.clausesNote].filter(Boolean).join(" — "));
  if (terms.premisesBoughtDuringMarriage != null && !options.forTenant) {
    push("Local acheté pendant le mariage", terms.premisesBoughtDuringMarriage ? "Oui (le conjoint signe aussi)" : "Non");
  }
  return rows;
}

/** Société (bail commercial) : représentant légal et immatriculation, écrits seulement s'ils sont envoyés. */
export function entrepriseCommercialFields(entreprise: any): {
  representativeName?: string | null;
  representativeRole?: string | null;
  isRegistered?: boolean | null;
} {
  const out: ReturnType<typeof entrepriseCommercialFields> = {};
  if (!entreprise || typeof entreprise !== "object") return out;
  if (entreprise.representativeName !== undefined) out.representativeName = text(entreprise.representativeName, 200);
  if (entreprise.representativeRole !== undefined) out.representativeRole = text(entreprise.representativeRole, 200);
  if (entreprise.isRegistered !== undefined) {
    out.isRegistered =
      entreprise.isRegistered === true || entreprise.isRegistered === "yes"
        ? true
        : entreprise.isRegistered === false || entreprise.isRegistered === "no"
          ? false
          : null;
  }
  return out;
}

/** Le Kbis n'est pas exigé d'une société pas encore immatriculée (en cours de création). */
export function requiresKbis(entreprise: { isRegistered?: boolean | null } | null | undefined): boolean {
  return entreprise?.isRegistered !== false;
}
