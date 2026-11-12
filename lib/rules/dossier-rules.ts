/**
 * Règles du dossier, en un seul endroit : quelles pièces et quelles données sont attendues
 * selon les réponses du propriétaire ou du locataire (habitation et commercial).
 *
 * Fonctions pures, utilisables dans le navigateur et sur le serveur. Elles servent :
 * - aux formulaires propriétaire et locataire (contrôle de chaque étape, reprise du formulaire) ;
 * - au serveur, qui revérifie à l'envoi ;
 * - à la fiche du bail (pièces et données manquantes) ;
 * - aux demandes de complément (même dépendances quand une réponse change).
 *
 * Toute nouvelle règle s'ajoute ici, et nulle part ailleurs.
 */
import { BailType, BienLegalStatus, ClientType, DocumentKind, FamilyStatus, MatrimonialRegime } from "@prisma/client";
import {
  asksBoughtDuringMarriage,
  commercialDocuments,
  isCommercialBailType,
  isPremisesType,
  requiresKbis,
  spouseMustSign,
  validateCommercialStep,
  type CommercialStep,
} from "@/lib/utils/commercial-terms";

/* -------------------------------------------------------------------------- */
/*                               Petites règles                               */
/* -------------------------------------------------------------------------- */

/**
 * Pièce d'état civil attendue par le notaire : la convention de PACS, ou le
 * contrat de mariage quand le régime n'est pas la communauté légale (mariage
 * sans contrat : rien à fournir, l'étude demande l'extrait d'acte de mariage).
 */
export function getMaritalDocumentKind(
  familyStatus?: FamilyStatus | string | null,
  matrimonialRegime?: MatrimonialRegime | string | null,
): DocumentKind | null {
  if (familyStatus === FamilyStatus.PACS) return DocumentKind.CONTRAT_DE_PACS;
  if (familyStatus === FamilyStatus.MARIE && matrimonialRegime && matrimonialRegime !== MatrimonialRegime.COMMUNAUTE_REDUITE) {
    return DocumentKind.CONTRAT_DE_MARIAGE;
  }
  return null;
}

/**
 * Le règlement d'un lotissement ne s'applique plus 10 ans après son autorisation : il n'est demandé
 * que si le lotissement est plus récent, ou par prudence quand le propriétaire ne sait pas (ou n'a pas répondu).
 */
export function needsSubdivisionRules(subdivisionOver10Years?: string | null): boolean {
  return subdivisionOver10Years !== "YES";
}

/** Bail meublé (habitation) : mobilier obligatoire, dépôt de garantie jusqu'à 2 mois. */
export function isFurnishedBail(bailType: unknown): boolean {
  return bailType === BailType.BAIL_MEUBLE_1_ANS || bailType === BailType.BAIL_MEUBLE_9_MOIS;
}

/** Mobilier obligatoire d'une location meublée (décret du 31 juillet 2015). */
export const FURNITURE_KEYS = [
  "hasLiterie",
  "hasRideaux",
  "hasPlaquesCuisson",
  "hasFour",
  "hasRefrigerateur",
  "hasCongelateur",
  "hasVaisselle",
  "hasUstensilesCuisine",
  "hasTable",
  "hasSieges",
  "hasEtageresRangement",
  "hasLuminaires",
  "hasMaterielEntretien",
] as const;

/** Équipements obligatoires non cochés (vide si le bail n'est pas meublé). */
export function missingFurniture(values: Record<string, unknown>, bailType: unknown): string[] {
  if (!isFurnishedBail(bailType)) return [];
  return FURNITURE_KEYS.filter((key) => values[key] !== true);
}

/**
 * Dépôt de garantie maximum d'un bail d'habitation : 1 mois de loyer hors charges (vide), 2 mois (meublé).
 * Bail commercial : pas de plafond légal (null).
 */
export function maxSecurityDeposit(input: { bailFamily?: unknown; bailType?: unknown; rentAmount: number }): number | null {
  if (input.bailFamily === "COMMERCIAL" || !(input.rentAmount > 0)) return null;
  return isFurnishedBail(input.bailType) ? input.rentAmount * 2 : input.rentAmount;
}

/** Réponse du formulaire « centre commercial » (no | shopping_center | estate_complex | yes) → champs du bien. */
export function shoppingCenterFromAnswer(value: unknown): { inShoppingCenter: boolean | null; complexType: string | null } {
  if (value === undefined || value === null || value === "") return { inShoppingCenter: null, complexType: null };
  if (value === "no" || value === false) return { inShoppingCenter: false, complexType: null };
  return { inShoppingCenter: true, complexType: value === "estate_complex" ? "ESTATE_COMPLEX" : "SHOPPING_CENTER" };
}

const isBlank = (value: unknown) =>
  value === undefined || value === null || value === "" || (typeof value === "string" && value.trim() === "");

const fullName = (person: { firstName?: string | null; lastName?: string | null } | undefined) =>
  `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim();

/* -------------------------------------------------------------------------- */
/*                                   Pièces                                   */
/* -------------------------------------------------------------------------- */

/**
 * Niveau d'une pièce :
 * - blocking : l'envoi du formulaire est impossible sans elle ;
 * - expected : le notaire en a besoin, mais elle peut arriver après l'envoi ;
 * - optional : utile si la personne l'a.
 */
export type RuleLevel = "blocking" | "expected" | "optional";

/** Où la pièce se rattache en base. */
export type DocumentTarget = "person" | "client" | "entreprise" | "property" | "bail";

export interface DocumentRequirement {
  kind: string;
  /** Nom simple, affiché tel quel (« Pièce d'identité de Marie Durand »). */
  label: string;
  hint?: string;
  target: DocumentTarget;
  /** Rang de la personne (pièce d'identité), personne principale en premier. */
  personIndex?: number;
  level: RuleLevel;
  /** Réponse qui rend la pièce nécessaire, en clair (« Bien en copropriété »). */
  because?: string;
}

export interface PartyDocumentInput {
  clientType?: ClientType | string | null;
  /** Personnes du client, personne principale en premier. */
  persons?: Array<{
    firstName?: string | null;
    lastName?: string | null;
    familyStatus?: FamilyStatus | string | null;
    matrimonialRegime?: MatrimonialRegime | string | null;
  }> | null;
  /** isRegistered : true / false, ou la réponse du formulaire « yes » / « no ». */
  entreprise?: { isRegistered?: boolean | string | null } | null;
}

const normalizeRegistered = (value: unknown): boolean | null =>
  value === true || value === "yes" ? true : value === false || value === "no" ? false : null;

/** Pièces de la partie (propriétaire ou locataire) : identité, état civil, société. */
export function partyDocumentRequirements(input: PartyDocumentInput): DocumentRequirement[] {
  const rules: DocumentRequirement[] = [];
  if (input.clientType === ClientType.PERSONNE_MORALE) {
    if (requiresKbis({ isRegistered: normalizeRegistered(input.entreprise?.isRegistered) })) {
      rules.push({ kind: DocumentKind.KBIS, label: "Kbis", target: "entreprise", level: "blocking" });
    }
    rules.push({ kind: DocumentKind.STATUTES, label: "Statuts de la société", target: "entreprise", level: "blocking" });
    return rules;
  }
  if (input.clientType !== ClientType.PERSONNE_PHYSIQUE) return rules;

  const persons = input.persons ?? [];
  persons.forEach((person, index) => {
    const name = fullName(person);
    rules.push({
      kind: DocumentKind.ID_IDENTITY,
      label: name ? `Pièce d'identité de ${name}` : "Pièce d'identité",
      target: "person",
      personIndex: index,
      level: "blocking",
    });
  });
  // Contrat de mariage ou convention de PACS : selon la situation de la personne principale.
  const primary = persons[0];
  const maritalKind = getMaritalDocumentKind(primary?.familyStatus, primary?.matrimonialRegime);
  if (maritalKind === DocumentKind.CONTRAT_DE_MARIAGE) {
    rules.push({ kind: maritalKind, label: "Contrat de mariage", target: "client", level: "blocking", because: "Marié avec un contrat" });
  } else if (maritalKind === DocumentKind.CONTRAT_DE_PACS) {
    rules.push({ kind: maritalKind, label: "Convention de PACS", target: "client", level: "blocking", because: "Pacsé" });
  }
  return rules;
}

export interface PropertyDocumentInput {
  legalStatus?: BienLegalStatus | string | null;
  subdivisionOver10Years?: string | null;
}

/** Pièces du bien demandées pour tout bail : diagnostics, titre de propriété, règlements. */
export function propertyDocumentRequirements(input: PropertyDocumentInput): DocumentRequirement[] {
  const rules: DocumentRequirement[] = [
    { kind: DocumentKind.DIAGNOSTICS, label: "Diagnostics du bien", target: "property", level: "blocking" },
    { kind: DocumentKind.TITLE_DEED, label: "Titre de propriété", target: "property", level: "blocking" },
  ];
  if (input.legalStatus === BienLegalStatus.CO_PROPRIETE) {
    rules.push({
      kind: DocumentKind.REGLEMENT_COPROPRIETE,
      label: "Règlement de copropriété",
      target: "property",
      level: "blocking",
      because: "Bien en copropriété",
    });
  } else if (input.legalStatus === BienLegalStatus.LOTISSEMENT && needsSubdivisionRules(input.subdivisionOver10Years)) {
    rules.push({
      kind: DocumentKind.CAHIER_DE_CHARGE_LOTISSEMENT,
      label: "Règlement du lotissement",
      target: "property",
      level: "blocking",
      because: "Bien dans un lotissement de moins de 10 ans",
    });
  }
  return rules;
}

/** Pièces du bail commercial rattachées au bail (location précédente) ; les autres vont au bien. */
const BAIL_TARGET_KINDS = new Set(["PREVIOUS_LEASE", "LEASE_TERMINATION", "PREVIOUS_TENANT_EXIT_PROOF"]);

export interface LeaseDocumentInput {
  bailFamily?: string | null;
  property?: {
    legalStatus?: string | null;
    inShoppingCenter?: boolean | null;
    complexType?: string | null;
    surfaceM2?: number | string | { toString(): string } | null;
    type?: string | null;
  } | null;
  /** Bail commercial : local déjà loué. */
  previouslyLet?: boolean | null;
  /** Propriétaire société : propose l'autorisation de signer. */
  isCompany?: boolean;
  /** Habitation, ville à loyers encadrés : déclaration d'occupation (calculée par le serveur). */
  occupancyDeclarationRequired?: boolean;
  /** Habitation, zone tendue : justificatifs du loyer (relocationProofKinds). */
  rentProofKinds?: string[];
}

/** Pièces qui dépendent du bail : bail commercial, déclaration d'occupation, justificatifs du loyer. */
export function leaseDocumentRequirements(input: LeaseDocumentInput): DocumentRequirement[] {
  if (input.bailFamily === "COMMERCIAL") {
    const raw = input.property?.surfaceM2;
    const surface = raw != null ? Number(raw.toString()) : null;
    return commercialDocuments({
      previouslyLet: input.previouslyLet === true ? "yes" : input.previouslyLet === false ? "no" : "",
      legalStatus: input.property?.legalStatus,
      inShoppingCenter: input.property?.inShoppingCenter,
      complexType: input.property?.complexType,
      surfaceM2: Number.isFinite(surface) ? surface : null,
      premisesType: input.property?.type,
      isCompany: input.isCompany,
    }).map((rule) => ({
      kind: rule.kind,
      label: rule.label,
      hint: rule.hint,
      level: rule.required ? "blocking" : "optional",
      target:
        rule.kind === "SIGNING_AUTHORITY" ? "entreprise" : rule.kind === "OTHER" || BAIL_TARGET_KINDS.has(rule.kind) ? "bail" : "property",
      because:
        rule.kind === "SHOPPING_CENTER_RULES"
          ? input.property?.complexType === "ESTATE_COMPLEX"
            ? "Local dans un ensemble immobilier"
            : "Local dans un centre commercial"
          : undefined,
    }));
  }
  const rules: DocumentRequirement[] = [];
  for (const kind of input.rentProofKinds ?? []) {
    rules.push({ kind, label: RENT_PROOF_LABELS[kind] ?? kind, target: "bail", level: "expected", because: "Logement en zone tendue" });
  }
  if (input.occupancyDeclarationRequired) {
    rules.push({
      kind: DocumentKind.OCCUPANCY_DECLARATION,
      label: "Déclaration d'occupation du logement",
      target: "property",
      level: "expected",
      because: "Ville où les loyers sont encadrés",
    });
  }
  return rules;
}

const RENT_PROOF_LABELS: Record<string, string> = {
  PREVIOUS_RENT_PROOF: "Dernier loyer du locataire précédent",
  PREVIOUS_TENANT_EXIT_PROOF: "Départ du locataire précédent",
  WORKS_INVOICES: "Factures des travaux",
  RENT_REFERENCES: "Loyers de logements comparables",
};

export interface OwnerDocumentInput extends PartyDocumentInput, Omit<LeaseDocumentInput, "property" | "isCompany"> {
  property?: (PropertyDocumentInput & NonNullable<LeaseDocumentInput["property"]>) | null;
}

/** Toutes les pièces du propriétaire pour ce bail (partie, bien, bail). */
export function ownerDocumentRequirements(input: OwnerDocumentInput): DocumentRequirement[] {
  return [
    ...partyDocumentRequirements(input),
    ...propertyDocumentRequirements(input.property ?? {}),
    ...leaseDocumentRequirements({ ...input, isCompany: input.clientType === ClientType.PERSONNE_MORALE }),
  ];
}

/** Toutes les pièces du locataire (identité, état civil, société). */
export function tenantDocumentRequirements(input: PartyDocumentInput): DocumentRequirement[] {
  return partyDocumentRequirements(input);
}

/** Pièces encore manquantes, au niveau donné (par défaut : celles qui bloquent l'envoi). */
export function missingDocuments(
  rules: DocumentRequirement[],
  isProvided: (rule: DocumentRequirement) => boolean,
  levels: RuleLevel[] = ["blocking"],
): DocumentRequirement[] {
  return rules.filter((rule) => levels.includes(rule.level) && !isProvided(rule));
}

/** Pièces déjà en base, rangées par rattachement, pour savoir si une pièce est fournie. */
export interface ProvidedDocuments {
  persons?: Array<Array<{ kind: string }>>;
  client?: Array<{ kind: string }>;
  entreprise?: Array<{ kind: string }>;
  property?: Array<{ kind: string }>;
  bail?: Array<{ kind: string }>;
}

/**
 * Pièce fournie ? Les pièces du bien et du bail sont regardées ensemble (une pièce commerciale
 * peut avoir été rattachée à l'un ou à l'autre selon l'ancienne version du formulaire).
 */
export function isDocumentProvided(rule: DocumentRequirement, provided: ProvidedDocuments): boolean {
  const has = (docs: Array<{ kind: string }> | undefined) => !!docs?.some((doc) => doc.kind === rule.kind);
  switch (rule.target) {
    case "person":
      return has(provided.persons?.[rule.personIndex ?? 0]);
    case "client":
      return has(provided.client);
    case "entreprise":
      return has(provided.entreprise);
    case "property":
    case "bail":
      return has(provided.property) || has(provided.bail);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  Données                                   */
/* -------------------------------------------------------------------------- */

/** Étapes du formulaire propriétaire (dans l'ordre). */
export type OwnerStep =
  | "bailFamilySelection"
  | "clientType"
  | "clientInfo"
  | "propertyAddress"
  | "propertyDetails"
  | "commercialActivity"
  | "bailType"
  | "bailRent"
  | "bailCharges"
  | "commercialCharges"
  | "commercialClauses"
  | "bailFurniture"
  | "bailDates"
  | "tenant";

export const OWNER_STEP_ORDER: OwnerStep[] = [
  "bailFamilySelection",
  "clientType",
  "clientInfo",
  "propertyAddress",
  "propertyDetails",
  "commercialActivity",
  "bailType",
  "bailRent",
  "bailCharges",
  "commercialCharges",
  "commercialClauses",
  "bailFurniture",
  "bailDates",
  "tenant",
];

/** Donnée manquante ou incohérente : chemin du champ du formulaire et message simple. */
export interface FieldIssue<Step extends string = string> {
  step: Step;
  path: string;
  message: string;
  /** expected : peut être complété plus tard (ex. e-mail du locataire). */
  level: RuleLevel;
}

const PERSON_FIELD_MESSAGES: Array<[string, string]> = [
  ["firstName", "Le prénom est requis"],
  ["lastName", "Le nom est requis"],
  ["email", "L'email est requis"],
  ["phone", "Le téléphone est requis"],
  ["fullAddress", "L'adresse est requise"],
  ["profession", "La profession est requise"],
  ["nationality", "La nationalité est requise"],
  ["familyStatus", "La situation familiale est requise"],
  ["birthPlace", "Le lieu de naissance est requis"],
  ["birthDate", "La date de naissance est requise"],
];

/** Données de chaque personne (identité, naissance, situation familiale, régime si marié). */
function personIssues<Step extends string>(persons: any[] | null | undefined, step: Step): FieldIssue<Step>[] {
  const issues: FieldIssue<Step>[] = [];
  if (!Array.isArray(persons) || persons.length === 0) {
    issues.push({ step, path: "persons", message: "Au moins une personne est requise", level: "blocking" });
    return issues;
  }
  persons.forEach((person, index) => {
    for (const [field, message] of PERSON_FIELD_MESSAGES) {
      if (isBlank(person?.[field])) issues.push({ step, path: `persons.${index}.${field}`, message, level: "blocking" });
    }
    if (person?.familyStatus === FamilyStatus.MARIE && isBlank(person?.matrimonialRegime)) {
      issues.push({
        step,
        path: `persons.${index}.matrimonialRegime`,
        message: "Le régime matrimonial est requis lorsque le statut familial est marié",
        level: "blocking",
      });
    }
  });
  return issues;
}

export interface OwnerFieldContext {
  /** Bien en zone tendue (relocation : question sur la location précédente). */
  isTightZone?: boolean | null;
  /** Un locataire est déjà rattaché au bail. */
  hasTenant?: boolean;
}

/**
 * Toutes les données attendues du propriétaire, avec leurs dépendances (habitation ou commercial,
 * personne ou société, copropriété, lotissement, meublé, garant, dépôt de garantie…), dans l'ordre
 * des étapes du formulaire. Le contrôle de forme (e-mail valide, nombre positif…) reste dans le schéma Zod ;
 * le plafond de loyer (arrêté d'encadrement) est calculé par le serveur.
 */
export function ownerFieldIssues(values: any, context: OwnerFieldContext = {}): FieldIssue<OwnerStep>[] {
  const v = values ?? {};
  const issues: FieldIssue<OwnerStep>[] = [];
  const add = (step: OwnerStep, path: string, message: string, level: RuleLevel = "blocking") =>
    issues.push({ step, path, message, level });
  const commercial = v.bailFamily === "COMMERCIAL";
  const commercialCheck = (step: CommercialStep, formStep: OwnerStep) => {
    if (!commercial) return;
    for (const [path, message] of Object.entries(validateCommercialStep(step, v.commercial, { bailType: v.bailType }))) {
      add(formStep, path, message);
    }
  };

  // Type de bail
  if (isBlank(v.bailFamily)) add("bailFamilySelection", "bailFamily", "Choisissez le type de bail");

  // Type de client
  if (isBlank(v.type)) add("clientType", "type", "Choisissez le type de client");

  // Informations client
  if (v.type === ClientType.PERSONNE_PHYSIQUE) {
    issues.push(...personIssues(v.persons, "clientInfo"));
    // E-mail et téléphone du dossier : ceux de la personne principale à défaut (comme à l'envoi)
    const primary = Array.isArray(v.persons) ? v.persons.find((p: any) => p?.isPrimary) || v.persons[0] : undefined;
    if (isBlank(v.email) && isBlank(primary?.email)) add("clientInfo", "email", "L'email est requis");
    if (isBlank(v.phone) && isBlank(primary?.phone)) add("clientInfo", "phone", "Le numéro de téléphone est requis");
    // Bail commercial d'un bien commun : le conjoint doit aussi signer (article 1425 du Code civil)
    const first = Array.isArray(v.persons) ? v.persons[0] : undefined;
    if (commercial && asksBoughtDuringMarriage(first?.familyStatus, first?.matrimonialRegime)) {
      if (isBlank(v.commercial?.boughtDuringMarriage)) {
        add("clientInfo", "commercial.boughtDuringMarriage", "Indiquez si le local a été acheté pendant votre mariage");
      } else if (
        (v.persons?.length ?? 0) < 2 &&
        spouseMustSign(first?.familyStatus, first?.matrimonialRegime, v.commercial?.boughtDuringMarriage)
      ) {
        add("clientInfo", "persons", "Votre conjoint doit aussi signer le bail commercial : ajoutez-le");
      }
    }
  } else if (v.type === ClientType.PERSONNE_MORALE) {
    const e = v.entreprise;
    if (!e) add("clientInfo", "entreprise", "Les informations de l'entreprise sont requises");
    else {
      if (isBlank(e.legalName)) add("clientInfo", "entreprise.legalName", "La raison sociale est requise");
      if (isBlank(e.registration)) add("clientInfo", "entreprise.registration", "Le numéro d'enregistrement est requis");
      if (isBlank(e.name)) add("clientInfo", "entreprise.name", "Le nom commercial est requis");
      if (isBlank(e.email)) add("clientInfo", "entreprise.email", "L'email est requis");
      if (isBlank(e.phone)) add("clientInfo", "entreprise.phone", "Le numéro de téléphone est requis");
      if (isBlank(e.fullAddress)) add("clientInfo", "entreprise.fullAddress", "L'adresse est requise");
      if (commercial && isBlank(e.representativeName)) add("clientInfo", "entreprise.representativeName", "Indiquez le représentant légal");
    }
    // E-mail et téléphone du dossier : ceux de la société à défaut (comme à l'envoi)
    if (isBlank(v.email) && isBlank(e?.email)) add("clientInfo", "email", "L'email est requis");
    if (isBlank(v.phone) && isBlank(e?.phone)) add("clientInfo", "phone", "Le numéro de téléphone est requis");
  }

  // Le bien : adresse choisie dans la liste (commune connue), surface, type qui suit la famille de bail
  if (isBlank(v.propertyFullAddress)) add("propertyAddress", "propertyFullAddress", "L'adresse du bien est requise");
  else if (isBlank(v.propertyInseeCode)) {
    add("propertyAddress", "propertyFullAddress", "Choisissez l'adresse dans la liste proposée pour que le bien soit localisé.");
  }
  if (isBlank(v.propertySurfaceM2)) add("propertyAddress", "propertySurfaceM2", "La surface est requise");
  if (isBlank(v.propertyType)) add("propertyAddress", "propertyType", "Le type de bien est requis");
  else if (commercial ? !isPremisesType(v.propertyType) : isPremisesType(v.propertyType)) {
    add("propertyAddress", "propertyType", commercial ? "Choisissez le type de local" : "Choisissez le type d'habitat");
  }

  // Caractéristiques du bien
  if (isBlank(v.propertyLegalStatus)) add("propertyDetails", "propertyLegalStatus", "Le statut légal est requis");
  if (!commercial) {
    // Habitation : catégorie du logement pour le plafond de loyer
    if (isBlank(v.propertyMainRooms)) add("propertyDetails", "propertyMainRooms", "Indiquez le nombre de pièces principales");
    if (isBlank(v.propertyConstructionPeriod)) add("propertyDetails", "propertyConstructionPeriod", "Indiquez l'époque de construction");
    if (isBlank(v.propertyDpeClass)) add("propertyDetails", "propertyDpeClass", "Indiquez la classe énergétique du logement");
  } else if (isBlank(v.propertyInShoppingCenter)) {
    add("propertyDetails", "propertyInShoppingCenter", "Indiquez où se trouve le local");
  }
  if (v.propertyLegalStatus === BienLegalStatus.CO_PROPRIETE) {
    if (isBlank(v.propertySyndicName)) add("propertyDetails", "propertySyndicName", "Indiquez le nom du syndic");
    if (isBlank(v.propertySyndicEmail) && isBlank(v.propertySyndicPhone)) {
      add("propertyDetails", "propertySyndicEmail", "Indiquez l'e-mail ou le téléphone du syndic");
    }
  }
  if (v.propertyLegalStatus === BienLegalStatus.LOTISSEMENT && isBlank(v.propertySubdivisionOver10Years)) {
    add("propertyDetails", "propertySubdivisionOver10Years", "Répondez à la question sur le lotissement");
  }

  // Bail commercial : l'activité
  commercialCheck("activity", "commercialActivity");

  // Type de contrat (commercial : durée et dates)
  if (isBlank(v.bailType)) add("bailType", "bailType", "Le type de bail est requis");
  else if (commercial && !isCommercialBailType(v.bailType)) add("bailType", "bailType", "Choisissez la durée du bail");
  else if (!commercial && isCommercialBailType(v.bailType)) add("bailType", "bailType", "Le type de bail est requis");
  commercialCheck("duration", "bailType");

  // Le loyer
  if (isBlank(v.bailRentAmount)) add("bailRent", "bailRentAmount", "Le montant du loyer est requis");
  commercialCheck("rent", "bailRent");
  if (!commercial && context.isTightZone && isBlank(v.rentRules?.relocationLetBefore)) {
    add("bailRent", "rentRules.relocationLetBefore", "Répondez aux questions sur le loyer");
  }

  // Charges et dépôt de garantie (plafond en habitation)
  if (isBlank(v.bailMonthlyCharges)) add("bailCharges", "bailMonthlyCharges", "Les charges mensuelles sont requises");
  if (isBlank(v.bailSecurityDeposit)) add("bailCharges", "bailSecurityDeposit", "Le dépôt de garantie est requis");
  else {
    const rent = Number.parseInt(String(v.bailRentAmount ?? "0"), 10) || 0;
    const deposit = Number.parseInt(String(v.bailSecurityDeposit ?? "0"), 10) || 0;
    const max = maxSecurityDeposit({ bailFamily: v.bailFamily, bailType: v.bailType, rentAmount: rent });
    if (max !== null && deposit > max) {
      add(
        "bailCharges",
        "bailSecurityDeposit",
        `Le dépôt de garantie ne peut pas dépasser ${isFurnishedBail(v.bailType) ? "2" : "1"} mois de loyer hors charges (max ${max.toLocaleString("fr-FR")} €)`,
      );
    }
  }
  commercialCheck("deposit", "bailCharges");

  // Bail commercial : charges et travaux, garanties et clauses (garant)
  commercialCheck("charges", "commercialCharges");
  commercialCheck("clauses", "commercialClauses");

  // Mobilier obligatoire du meublé
  if (!commercial) {
    for (const key of missingFurniture(v, v.bailType)) add("bailFurniture", key, "Cet équipement est requis pour un bail meublé");
  }

  // Dates (commercial : dans « Durée et dates »)
  const datesStep: OwnerStep = commercial ? "bailType" : "bailDates";
  if (isBlank(v.bailEffectiveDate)) add(datesStep, "bailEffectiveDate", "La date de prise d'effet est requise");
  if (isBlank(v.bailPaymentDay)) add(datesStep, "bailPaymentDay", "Le jour de paiement est requis");

  // Locataire : peut être invité plus tard
  if (isBlank(v.tenantEmail) && !context.hasTenant) add("tenant", "tenantEmail", "Indiquez l'e-mail du locataire", "expected");

  return issues;
}

/** Étapes du formulaire locataire. */
export type TenantStep = "clientType" | "clientInfo";

/**
 * Toutes les données attendues du locataire : personne(s) ou société, et pour un bail commercial
 * le représentant légal et l'immatriculation de la société.
 */
export function tenantFieldIssues(values: any, context: { bailFamily?: string | null } = {}): FieldIssue<TenantStep>[] {
  const v = values ?? {};
  const issues: FieldIssue<TenantStep>[] = [];
  const add = (path: string, message: string) => issues.push({ step: "clientInfo", path, message, level: "blocking" });
  if (isBlank(v.type)) {
    issues.push({ step: "clientType", path: "type", message: "Choisissez le type de client", level: "blocking" });
    return issues;
  }
  if (v.type === ClientType.PERSONNE_PHYSIQUE) {
    issues.push(...personIssues(v.persons, "clientInfo"));
    const primary = Array.isArray(v.persons) ? v.persons[0] : undefined;
    if (isBlank(v.phone) && isBlank(primary?.phone)) add("phone", "Le numéro de téléphone est requis");
  } else if (v.type === ClientType.PERSONNE_MORALE) {
    const e = v.entreprise;
    if (!e) add("entreprise", "Les informations de l'entreprise sont requises");
    else {
      if (isBlank(e.legalName)) add("entreprise.legalName", "La raison sociale est requise");
      if (isBlank(e.name)) add("entreprise.name", "Le nom commercial est requis");
      if (isBlank(e.email)) add("entreprise.email", "L'email est requis");
      if (isBlank(e.phone)) add("entreprise.phone", "Le numéro de téléphone est requis");
      if (isBlank(e.fullAddress)) add("entreprise.fullAddress", "L'adresse est requise");
      // Société en cours de création (bail commercial) : pas encore de SIREN
      if (isBlank(e.registration) && normalizeRegistered(e.isRegistered) !== false) {
        add("entreprise.registration", "Le numéro d'enregistrement est requis");
      }
      if (context.bailFamily === "COMMERCIAL") {
        if (isBlank(e.representativeName)) add("entreprise.representativeName", "Indiquez le représentant légal");
        if (isBlank(e.isRegistered)) add("entreprise.isRegistered", "Indiquez si la société est déjà immatriculée");
      }
    }
  }
  return issues;
}

/** Première étape (dans l'ordre donné) qui a une donnée manquante, ou null. */
export function firstIncompleteStep<Step extends string>(
  issues: FieldIssue<Step>[],
  order: readonly Step[],
  levels: RuleLevel[] = ["blocking", "expected"],
): Step | null {
  const steps = new Set(issues.filter((issue) => levels.includes(issue.level)).map((issue) => issue.step));
  return order.find((step) => steps.has(step)) ?? null;
}
