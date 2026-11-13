/**
 * Informations que l'équipe peut demander au propriétaire ou au locataire après l'envoi de son formulaire.
 *
 * Une « question » regroupe les champs qui vont ensemble (« Situation familiale » = statut + régime si
 * marié, « Régime juridique du bien » = statut + syndic ou lotissement…). Elle s'appuie sur les règles
 * du dossier (dossier-rules.ts) : mêmes champs obligatoires, mêmes dépendances, mêmes messages que le
 * formulaire. Fonctions pures : la fenêtre de l'équipe, la page du client et le serveur les partagent.
 */
import { FURNITURE_KEYS, isFurnishedBail, ownerFieldIssues, tenantFieldIssues, type FieldIssue } from "./dossier-rules";
import {
  CHARGE_ITEMS,
  CLAUSE_OPTIONS,
  FEES_PAID_BY_LABELS,
  INDEXATION_LABELS,
  PREMISES_TYPE_LABELS,
  RENT_PERIODICITY_LABELS,
  spouseMustSign,
} from "@/lib/utils/commercial-terms";
import { FAMILY_STATUS_LABELS, MATRIMONIAL_REGIME_LABELS } from "@/lib/utils/person-labels";
import { PERIOD_LABELS, ROOMS_LABELS } from "@/lib/utils/rent-cap";
import { RENT_INCREASE_LABELS } from "@/lib/utils/rent-relocation";

export type ComplementTarget = "OWNER" | "TENANT";
export type QuestionScope = "person" | "entreprise" | "property" | "bail";

export const FIELD_QUESTION_IDS = [
  "person.identity",
  "person.birth",
  "person.nationality",
  "person.profession",
  "person.address",
  "person.phone",
  "person.email",
  "person.family",
  "company.identity",
  "company.phone",
  "company.representative",
  "property.address",
  "property.surface",
  "property.legalStatus",
  "property.category",
  "property.shoppingCenter",
  "property.furniture",
  "bail.type",
  "bail.rent",
  "bail.charges",
  "bail.dates",
  "bail.rentRules",
  "commercial.activity",
  "commercial.duration",
  "commercial.rent",
  "commercial.deposit",
  "commercial.charges",
  "commercial.clauses",
] as const;
export type FieldQuestionId = (typeof FIELD_QUESTION_IDS)[number];

export function isFieldQuestionId(value: unknown): value is FieldQuestionId {
  return typeof value === "string" && (FIELD_QUESTION_IDS as readonly string[]).includes(value);
}

/** Dossier vu par les questions : la personne visée et la forme du bail. */
export interface QuestionContext {
  target: ComplementTarget;
  bailFamily: string | null;
  clientType: string | null;
  /** Habitation en zone tendue (questions sur la location précédente). */
  isTightZone?: boolean | null;
  /** Un locataire est déjà rattaché au bail. */
  hasTenant?: boolean;
}

/** Une question, et la personne visée (rang dans le formulaire) pour les questions de personne. */
export interface QuestionRef {
  id: FieldQuestionId;
  personIndex: number | null;
}

export function questionScope(id: FieldQuestionId): QuestionScope {
  if (id.startsWith("person.")) return "person";
  if (id.startsWith("company.")) return "entreprise";
  if (id.startsWith("property.")) return "property";
  return "bail";
}

const isCommercial = (ctx: QuestionContext) => ctx.bailFamily === "COMMERCIAL";

const BASE_LABELS: Record<FieldQuestionId, string> = {
  "person.identity": "Nom et prénom",
  "person.birth": "Date et lieu de naissance",
  "person.nationality": "Nationalité",
  "person.profession": "Profession",
  "person.address": "Adresse",
  "person.phone": "Téléphone",
  "person.email": "Adresse e-mail",
  "person.family": "Situation familiale",
  "company.identity": "Informations de la société",
  "company.phone": "Téléphone de la société",
  "company.representative": "Représentant légal de la société",
  "property.address": "Adresse du bien",
  "property.surface": "Surface et type du bien",
  "property.legalStatus": "Régime juridique du bien",
  "property.category": "Pièces, époque de construction et classe énergétique",
  "property.shoppingCenter": "Emplacement du local",
  "property.furniture": "Mobilier du logement meublé",
  "bail.type": "Type de bail (vide ou meublé)",
  "bail.rent": "Montant du loyer",
  "bail.charges": "Charges et dépôt de garantie",
  "bail.dates": "Date de début et jour de paiement",
  "bail.rentRules": "Location précédente du logement",
  "commercial.activity": "Activité exercée dans le local",
  "commercial.duration": "Durée et dates du bail",
  "commercial.rent": "Loyer et conditions de paiement",
  "commercial.deposit": "Charges, dépôt de garantie et frais d'acte",
  "commercial.charges": "Travaux et répartition des charges",
  "commercial.clauses": "Garant et clauses particulières",
};

/** Nom simple de la question, montré tel quel à l'équipe et au client (« Date et lieu de naissance de Camille Durand »). */
export function questionLabel(id: FieldQuestionId, options: { personName?: string | null; commercial?: boolean } = {}): string {
  let base = BASE_LABELS[id];
  if (options.commercial && id === "property.surface") base = "Surface et type du local";
  if (options.commercial && id === "property.legalStatus") base = "Régime juridique du local";
  const name = options.personName?.trim();
  return questionScope(id) === "person" && name ? `${base} de ${name}` : base;
}

const personName = (person: any) => `${person?.firstName ?? ""} ${person?.lastName ?? ""}`.trim();

/** Questions qu'on peut poser à cette personne, dans l'ordre du formulaire. */
export function availableQuestions(values: any, ctx: QuestionContext): QuestionRef[] {
  const v = values ?? {};
  const refs: QuestionRef[] = [];
  const commercial = isCommercial(ctx);
  if (ctx.clientType === "PERSONNE_PHYSIQUE") {
    const persons: any[] = Array.isArray(v.persons) ? v.persons : [];
    persons.forEach((_, index) => {
      const ids: FieldQuestionId[] = ["person.identity", "person.birth", "person.nationality", "person.profession", "person.address", "person.phone"];
      // L'e-mail de la personne principale est celui de son espace : il ne se change pas par une demande.
      if (index > 0) ids.push("person.email");
      ids.push("person.family");
      for (const id of ids) refs.push({ id, personIndex: index });
    });
  } else if (ctx.clientType === "PERSONNE_MORALE") {
    refs.push({ id: "company.identity", personIndex: null }, { id: "company.phone", personIndex: null });
    if (commercial) refs.push({ id: "company.representative", personIndex: null });
  }
  if (ctx.target === "OWNER") {
    const ids: FieldQuestionId[] = ["property.address", "property.surface", "property.legalStatus"];
    if (commercial) {
      ids.push("property.shoppingCenter", "commercial.activity", "commercial.duration", "commercial.rent", "commercial.deposit", "commercial.charges", "commercial.clauses");
    } else {
      ids.push("property.category", "bail.type", "bail.rent");
      // Zone tendue : à la relocation, le loyer dépend du loyer du locataire précédent.
      if (ctx.isTightZone) ids.push("bail.rentRules");
      ids.push("bail.charges");
      if (isFurnishedBail(v.bailType)) ids.push("property.furniture");
      ids.push("bail.dates");
    }
    for (const id of ids) refs.push({ id, personIndex: null });
  }
  return refs;
}

export function sameQuestion(a: QuestionRef, b: QuestionRef) {
  return a.id === b.id && (a.personIndex ?? null) === (b.personIndex ?? null);
}

/** Champs du formulaire couverts par la question (avec ceux que sa réponse peut rendre obligatoires). */
export function questionPaths(ref: QuestionRef, values: any, ctx: QuestionContext): string[] {
  const v = values ?? {};
  const i = ref.personIndex ?? 0;
  const p = (field: string) => `persons.${i}.${field}`;
  const commercial = isCommercial(ctx);
  switch (ref.id) {
    case "person.identity":
      return [p("firstName"), p("lastName")];
    case "person.birth":
      return [p("birthDate"), p("birthPlace")];
    case "person.nationality":
      return [p("nationality")];
    case "person.profession":
      return [p("profession")];
    case "person.address":
      return [p("fullAddress")];
    case "person.phone":
      return i === 0 ? [p("phone"), "phone"] : [p("phone")];
    case "person.email":
      return [p("email")];
    case "person.family": {
      const paths = [p("familyStatus"), p("matrimonialRegime")];
      // Bail commercial : local acheté pendant le mariage, et le conjoint qui doit signer.
      if (i === 0 && ctx.target === "OWNER" && commercial) {
        paths.push("commercial.boughtDuringMarriage", "persons");
        (Array.isArray(v.persons) ? v.persons : []).forEach((person: any, index: number) => {
          if (person?.isNew) for (const field of PERSON_FIELDS) paths.push(`persons.${index}.${field}`);
        });
      }
      return paths;
    }
    case "company.identity":
      return ["entreprise", "entreprise.legalName", "entreprise.name", "entreprise.registration", "entreprise.fullAddress", "entreprise.isRegistered"];
    case "company.phone":
      return ["entreprise.phone", "phone"];
    case "company.representative":
      return ["entreprise.representativeName", "entreprise.representativeRole"];
    case "property.address":
      return ["propertyFullAddress"];
    case "property.surface":
      return ["propertySurfaceM2", "propertyType"];
    case "property.legalStatus":
      return ["propertyLegalStatus", "propertySyndicName", "propertySyndicEmail", "propertySyndicPhone", "propertySubdivisionOver10Years"];
    case "property.category":
      return ["propertyMainRooms", "propertyConstructionPeriod", "propertyDpeClass"];
    case "property.shoppingCenter":
      return ["propertyInShoppingCenter", "propertyOutbuildings"];
    case "property.furniture":
      return [...FURNITURE_KEYS];
    case "bail.type":
      // Passer en meublé : mobilier obligatoire et dépôt jusqu'à 2 mois (l'inverse peut le rendre trop élevé).
      return ["bailType", ...(isFurnishedBail(v.bailType) ? FURNITURE_KEYS : []), "bailSecurityDeposit"];
    case "bail.rent":
      return ["bailRentAmount", "bailSecurityDeposit"];
    case "bail.charges":
      return ["bailMonthlyCharges", "bailSecurityDeposit"];
    case "bail.dates":
      return ["bailEffectiveDate", "bailPaymentDay"];
    case "bail.rentRules":
      return RENT_RULE_PATHS;
    case "commercial.activity":
      return ["commercial.activity", "commercial.ancillaryActivities", "commercial.previouslyLet", "commercial.previousActivity", "commercial.currentlyVacant"];
    case "commercial.duration":
      return ["bailType", "commercial.derogatoryMonths", "bailEffectiveDate", "commercial.keysHandoverDate", "bailPaymentDay"];
    case "commercial.rent":
      return ["bailRentAmount", "commercial.rentPeriodicity", "commercial.vat", "commercial.indexation", "commercial.rentFree", "commercial.rentFreeMonths"];
    case "commercial.deposit":
      return ["bailMonthlyCharges", "bailSecurityDeposit", "commercial.entryFee", "commercial.entryFeeAmount", "commercial.feesPaidBy"];
    case "commercial.charges":
      return ["commercial.hasPastWorks", "commercial.pastWorks", "commercial.hasPlannedWorks", "commercial.plannedWorks", "commercial.charges"];
    case "commercial.clauses":
      return ["commercial.hasGuarantor", "commercial.guarantorName", "commercial.guarantorEmail", "commercial.clauses", "commercial.clausesNote"];
  }
}

/** Questions de la relocation en zone tendue (mêmes champs que l'étape « Loyer » du formulaire). */
const RENT_RULE_PATHS = [
  "rentRules.relocationLetBefore",
  "rentRules.previousTenantLeftAt",
  "rentRules.previousRentAmount",
  "rentRules.previousRentRevisedRecently",
  "rentRules.rentIncreaseReason",
  "rentRules.worksAmount",
  "rentRules.worksCompletedAt",
  "rentRules.neighborhoodRent",
];

const PERSON_FIELDS = ["firstName", "lastName", "email", "phone", "fullAddress", "profession", "nationality", "familyStatus", "matrimonialRegime", "birthPlace", "birthDate"];

const PERSON_FIELD_QUESTION: Record<string, FieldQuestionId> = {
  firstName: "person.identity",
  lastName: "person.identity",
  birthDate: "person.birth",
  birthPlace: "person.birth",
  nationality: "person.nationality",
  profession: "person.profession",
  fullAddress: "person.address",
  phone: "person.phone",
  email: "person.email",
  familyStatus: "person.family",
  matrimonialRegime: "person.family",
};

const COMMERCIAL_FIELD_QUESTION: Record<string, FieldQuestionId> = {
  activity: "commercial.activity",
  ancillaryActivities: "commercial.activity",
  previouslyLet: "commercial.activity",
  previousActivity: "commercial.activity",
  currentlyVacant: "commercial.activity",
  derogatoryMonths: "commercial.duration",
  keysHandoverDate: "commercial.duration",
  rentPeriodicity: "commercial.rent",
  vat: "commercial.rent",
  indexation: "commercial.rent",
  rentFree: "commercial.rent",
  rentFreeMonths: "commercial.rent",
  entryFee: "commercial.deposit",
  entryFeeAmount: "commercial.deposit",
  feesPaidBy: "commercial.deposit",
  hasPastWorks: "commercial.charges",
  pastWorks: "commercial.charges",
  hasPlannedWorks: "commercial.charges",
  plannedWorks: "commercial.charges",
  charges: "commercial.charges",
  hasGuarantor: "commercial.clauses",
  guarantorName: "commercial.clauses",
  guarantorEmail: "commercial.clauses",
  clauses: "commercial.clauses",
  clausesNote: "commercial.clauses",
};

/**
 * Question qui répond à une donnée manquante (chemin d'un FieldIssue), ou null si elle ne se demande
 * pas par une demande (type de bail ou de client, e-mail de l'espace, e-mail du locataire, questions du loyer).
 */
export function questionForPath(path: string, ctx: QuestionContext): QuestionRef | null {
  const commercial = isCommercial(ctx);
  const person = /^persons\.(\d+)\.(\w+)$/.exec(path);
  if (person) {
    const index = Number(person[1]);
    const id = PERSON_FIELD_QUESTION[person[2]];
    if (!id || (id === "person.email" && index === 0)) return null;
    return { id, personIndex: index };
  }
  if (path === "persons") return ctx.target === "OWNER" && commercial ? { id: "person.family", personIndex: 0 } : null;
  if (path === "phone") {
    return ctx.clientType === "PERSONNE_MORALE" ? { id: "company.phone", personIndex: null } : { id: "person.phone", personIndex: 0 };
  }
  const company = /^entreprise(?:\.(\w+))?$/.exec(path);
  if (company) {
    const field = company[1];
    if (field === "email") return null;
    if (field === "phone") return { id: "company.phone", personIndex: null };
    if (field === "representativeName" || field === "representativeRole") return { id: "company.representative", personIndex: null };
    return { id: "company.identity", personIndex: null };
  }
  const commercialField = /^commercial\.(\w+)/.exec(path);
  if (commercialField) {
    if (commercialField[1] === "boughtDuringMarriage") return { id: "person.family", personIndex: 0 };
    const id = COMMERCIAL_FIELD_QUESTION[commercialField[1]];
    return id ? { id, personIndex: null } : null;
  }
  if ((FURNITURE_KEYS as readonly string[]).includes(path)) return { id: "property.furniture", personIndex: null };
  if (path.startsWith("rentRules.")) return commercial ? null : { id: "bail.rentRules", personIndex: null };
  const simple: Record<string, FieldQuestionId> = {
    propertyFullAddress: "property.address",
    propertySurfaceM2: "property.surface",
    propertyType: "property.surface",
    propertyLegalStatus: "property.legalStatus",
    propertySyndicName: "property.legalStatus",
    propertySyndicEmail: "property.legalStatus",
    propertySyndicPhone: "property.legalStatus",
    propertySubdivisionOver10Years: "property.legalStatus",
    propertyMainRooms: "property.category",
    propertyConstructionPeriod: "property.category",
    propertyDpeClass: "property.category",
    propertyInShoppingCenter: "property.shoppingCenter",
    bailType: commercial ? "commercial.duration" : "bail.type",
    bailRentAmount: commercial ? "commercial.rent" : "bail.rent",
    bailMonthlyCharges: commercial ? "commercial.deposit" : "bail.charges",
    bailSecurityDeposit: commercial ? "commercial.deposit" : "bail.charges",
    bailEffectiveDate: commercial ? "commercial.duration" : "bail.dates",
    bailPaymentDay: commercial ? "commercial.duration" : "bail.dates",
  };
  const id = simple[path];
  return id ? { id, personIndex: null } : null;
}

/**
 * Questions qui répondent à des champs de la base (fiche du dossier : « Manquant : lieu de naissance… »).
 * Les champs qui ne se demandent pas (e-mail de l'espace, forme juridique…) sont ignorés.
 */
export function questionsForDataFields(
  scope: QuestionScope,
  fields: string[],
  options: { commercial?: boolean; primaryPerson?: boolean } = {},
): FieldQuestionId[] {
  const out = new Set<FieldQuestionId>();
  const c = !!options.commercial;
  const maps: Record<QuestionScope, Record<string, FieldQuestionId | null>> = {
    person: {
      firstName: "person.identity",
      lastName: "person.identity",
      birthDate: "person.birth",
      birthPlace: "person.birth",
      nationality: "person.nationality",
      profession: "person.profession",
      fullAddress: "person.address",
      phone: "person.phone",
      email: options.primaryPerson ? null : "person.email",
      familyStatus: "person.family",
      matrimonialRegime: "person.family",
    },
    entreprise: {
      legalName: "company.identity",
      name: "company.identity",
      registration: "company.identity",
      isRegistered: "company.identity",
      fullAddress: "company.identity",
      phone: "company.phone",
      representativeName: "company.representative",
      representativeRole: "company.representative",
    },
    property: {
      fullAddress: "property.address",
      surfaceM2: "property.surface",
      type: "property.surface",
      legalStatus: "property.legalStatus",
      syndicName: "property.legalStatus",
      syndicEmail: "property.legalStatus",
      syndicPhone: "property.legalStatus",
      subdivisionOver10Years: "property.legalStatus",
      mainRooms: c ? null : "property.category",
      constructionPeriod: c ? null : "property.category",
      dpeClass: c ? null : "property.category",
      inShoppingCenter: c ? "property.shoppingCenter" : null,
      ...Object.fromEntries(FURNITURE_KEYS.map((key) => [key, c ? null : "property.furniture"])),
    },
    bail: {
      bailType: c ? "commercial.duration" : "bail.type",
      rentAmount: c ? "commercial.rent" : "bail.rent",
      monthlyCharges: c ? "commercial.deposit" : "bail.charges",
      securityDeposit: c ? "commercial.deposit" : "bail.charges",
      effectiveDate: c ? "commercial.duration" : "bail.dates",
      paymentDay: c ? "commercial.duration" : "bail.dates",
      relocationLetBefore: c ? null : "bail.rentRules",
      previousRentAmount: c ? null : "bail.rentRules",
      previousTenantLeftAt: c ? null : "bail.rentRules",
    },
  };
  for (const field of fields) {
    const id = maps[scope][field];
    if (id) out.add(id);
  }
  return Array.from(out);
}

const isBlank = (value: unknown) => value === undefined || value === null || (typeof value === "string" && value.trim() === "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Toutes les données manquantes du dossier pour cette personne (mêmes règles que le formulaire). */
export function dossierIssues(values: any, ctx: QuestionContext): FieldIssue[] {
  const issues: FieldIssue[] =
    ctx.target === "OWNER"
      ? ownerFieldIssues(values, { isTightZone: ctx.isTightZone, hasTenant: ctx.hasTenant })
      : tenantFieldIssues(values, { bailFamily: ctx.bailFamily });
  return issues.filter((issue) => issue.level === "blocking");
}

/** Questions qui ont une donnée manquante, avec leurs messages. */
export function missingQuestions(values: any, ctx: QuestionContext): Array<QuestionRef & { messages: string[] }> {
  const available = availableQuestions(values, ctx);
  const out: Array<QuestionRef & { messages: string[] }> = [];
  for (const issue of dossierIssues(values, ctx)) {
    const ref = questionForPath(issue.path, ctx);
    if (!ref || !available.some((a) => sameQuestion(a, ref))) continue;
    const existing = out.find((q) => sameQuestion(q, ref));
    if (existing) {
      if (!existing.messages.includes(issue.message)) existing.messages.push(issue.message);
    } else out.push({ ...ref, messages: [issue.message] });
  }
  return out;
}

const valueAt = (values: any, path: string) => path.split(".").reduce((node: any, key) => (node == null ? undefined : node[key]), values);

/**
 * Ce qui empêche d'enregistrer la réponse à cette question : les règles du dossier sur ses champs,
 * plus quelques contrôles de forme (e-mail, montants, dates). { chemin: message }.
 */
export function questionErrors(ref: QuestionRef, values: any, ctx: QuestionContext): Record<string, string> {
  const paths = questionPaths(ref, values, ctx);
  const own = new Set(paths);
  const errors: Record<string, string> = {};
  for (const issue of dossierIssues(values, ctx)) {
    if (own.has(issue.path) && !errors[issue.path]) errors[issue.path] = issue.message;
  }
  const set = (path: string, message: string) => {
    if (own.has(path) && !errors[path]) errors[path] = message;
  };
  for (const path of paths) {
    const value = valueAt(values, path);
    if (isBlank(value)) continue;
    if (/\.email$|^propertySyndicEmail$|guarantorEmail$/.test(path) && !EMAIL_RE.test(String(value).trim())) set(path, "Adresse e-mail invalide");
    if (/\.birthDate$/.test(path)) {
      const date = new Date(String(value));
      if (Number.isNaN(date.getTime()) || date > new Date()) set(path, "Date de naissance invalide");
    }
    if (path === "bailEffectiveDate" && Number.isNaN(new Date(String(value)).getTime())) set(path, "Date invalide");
    if (path === "propertySurfaceM2" && !(Number(String(value).replace(",", ".")) > 0)) set(path, "Indiquez une surface supérieure à 0");
    if (path === "bailRentAmount" && !(Number(value) > 0)) set(path, "Indiquez un loyer supérieur à 0");
    if ((path === "bailMonthlyCharges" || path === "bailSecurityDeposit") && !(Number(value) >= 0)) set(path, "Indiquez un montant valide");
    if (path === "bailPaymentDay") {
      const day = Number(value);
      if (!Number.isInteger(day) || day < 1 || day > 31) set(path, "Indiquez un jour entre 1 et 31");
    }
  }
  // Relocation en zone tendue : les réponses qui permettent de calculer le loyer maximum.
  if (ref.id === "bail.rentRules") {
    const r = values?.rentRules ?? {};
    const need = (key: string, message: string) => {
      if (isBlank(r[key])) set(`rentRules.${key}`, message);
    };
    need("relocationLetBefore", "Indiquez si le logement a déjà été loué");
    if (r.relocationLetBefore === "yes") {
      need("previousTenantLeftAt", "Indiquez la date de départ du locataire précédent");
      need("previousRentAmount", "Indiquez le dernier loyer hors charges");
      const leftAt = r.previousTenantLeftAt ? new Date(String(r.previousTenantLeftAt)) : null;
      const vacant = leftAt && !Number.isNaN(leftAt.getTime()) && leftAt <= new Date(new Date().setMonth(new Date().getMonth() - 18));
      if (leftAt && !vacant) {
        need("previousRentRevisedRecently", "Indiquez si le loyer a été révisé au cours des 12 derniers mois");
        need("rentIncreaseReason", "Indiquez s'il y a une hausse par rapport au dernier loyer");
        if (r.rentIncreaseReason === "WORKS") {
          need("worksAmount", "Indiquez le coût des travaux");
          need("worksCompletedAt", "Indiquez la date de fin des travaux");
        }
        if (r.rentIncreaseReason === "UNDERVALUED") need("neighborhoodRent", "Indiquez le loyer du voisinage");
      }
    }
  }

  // Deux personnes du même client ne peuvent pas avoir le même e-mail.
  if (Array.isArray(values?.persons)) {
    const seen = new Map<string, number>();
    values.persons.forEach((person: any, index: number) => {
      const email = String(person?.email ?? "").trim().toLowerCase();
      if (!email) return;
      if (seen.has(email)) set(`persons.${index}.email`, "Cet e-mail est déjà celui d'une autre personne du dossier");
      else seen.set(email, index);
    });
  }
  return errors;
}

/** La réponse de cette question doit-elle ajouter le conjoint (bail commercial d'un bien commun) ? */
export function spouseRequired(values: any, ctx: QuestionContext): boolean {
  if (ctx.target !== "OWNER" || !isCommercial(ctx) || ctx.clientType !== "PERSONNE_PHYSIQUE") return false;
  const first = values?.persons?.[0];
  return spouseMustSign(first?.familyStatus, first?.matrimonialRegime, values?.commercial?.boughtDuringMarriage);
}

/* -------------------------------------------------------------------------- */
/*                        Valeurs : avant / après, en clair                   */
/* -------------------------------------------------------------------------- */

/** Valeurs des champs de la question (ce qui est gardé dans l'historique de la ligne). */
export function pickQuestionValues(ref: QuestionRef, values: any, ctx: QuestionContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of questionPaths(ref, values, ctx)) {
    if (path === "persons" || path === "entreprise") continue;
    const value = valueAt(values, path);
    out[path] = value instanceof Date ? value.toISOString().slice(0, 10) : value === undefined ? null : value;
  }
  return out;
}

const FIELD_LABELS: Record<string, string> = {
  firstName: "Prénom",
  lastName: "Nom",
  birthDate: "Date de naissance",
  birthPlace: "Lieu de naissance",
  nationality: "Nationalité",
  profession: "Profession",
  fullAddress: "Adresse",
  phone: "Téléphone",
  email: "E-mail",
  familyStatus: "Situation familiale",
  matrimonialRegime: "Régime matrimonial",
  legalName: "Raison sociale",
  name: "Nom commercial",
  registration: "Numéro d'immatriculation",
  isRegistered: "Société immatriculée",
  representativeName: "Représentant légal",
  representativeRole: "Qualité du représentant",
  propertyFullAddress: "Adresse du bien",
  propertySurfaceM2: "Surface",
  propertyType: "Type",
  propertyLegalStatus: "Régime juridique",
  propertySyndicName: "Syndic",
  propertySyndicEmail: "E-mail du syndic",
  propertySyndicPhone: "Téléphone du syndic",
  propertySubdivisionOver10Years: "Lotissement de plus de 10 ans",
  propertyMainRooms: "Pièces principales",
  propertyConstructionPeriod: "Époque de construction",
  propertyDpeClass: "Classe énergétique",
  propertyInShoppingCenter: "Emplacement",
  propertyOutbuildings: "Dépendances",
  bailType: "Type de bail",
  bailRentAmount: "Loyer",
  bailMonthlyCharges: "Charges",
  bailSecurityDeposit: "Dépôt de garantie",
  bailEffectiveDate: "Prise d'effet",
  bailPaymentDay: "Jour de paiement",
  activity: "Activité",
  ancillaryActivities: "Activités annexes",
  previouslyLet: "Déjà loué",
  previousActivity: "Activité précédente",
  currentlyVacant: "Libre aujourd'hui",
  derogatoryMonths: "Durée (mois)",
  keysHandoverDate: "Remise des clés",
  rentPeriodicity: "Paiement du loyer",
  vat: "TVA",
  indexation: "Révision du loyer",
  rentFree: "Franchise de loyer",
  rentFreeMonths: "Mois sans loyer",
  entryFee: "Pas-de-porte",
  entryFeeAmount: "Montant du pas-de-porte",
  feesPaidBy: "Frais d'acte",
  hasPastWorks: "Travaux passés",
  pastWorks: "Liste des travaux passés",
  hasPlannedWorks: "Travaux prévus",
  plannedWorks: "Liste des travaux prévus",
  charges: "Répartition des charges",
  hasGuarantor: "Garant",
  guarantorName: "Nom du garant",
  guarantorEmail: "E-mail du garant",
  clauses: "Clauses",
  clausesNote: "Précisions",
  boughtDuringMarriage: "Acheté pendant le mariage",
  hasLiterie: "Literie",
  hasRideaux: "Volets ou rideaux",
  hasPlaquesCuisson: "Plaques de cuisson",
  hasFour: "Four",
  hasRefrigerateur: "Réfrigérateur",
  hasCongelateur: "Congélateur",
  hasVaisselle: "Vaisselle",
  hasUstensilesCuisine: "Ustensiles de cuisine",
  hasTable: "Table",
  hasSieges: "Sièges",
  hasEtageresRangement: "Étagères",
  hasLuminaires: "Luminaires",
  hasMaterielEntretien: "Matériel d'entretien",
  relocationLetBefore: "Déjà loué",
  previousTenantLeftAt: "Départ du locataire précédent",
  previousRentAmount: "Dernier loyer hors charges",
  previousRentRevisedRecently: "Révisé dans les 12 derniers mois",
  rentIncreaseReason: "Hausse du loyer",
  worksAmount: "Coût des travaux",
  worksCompletedAt: "Fin des travaux",
  neighborhoodRent: "Loyer du voisinage",
};

const BAIL_TYPE_LABELS: Record<string, string> = {
  BAIL_NU_3_ANS: "Vide, 3 ans",
  BAIL_NU_6_ANS: "Vide, 6 ans (société)",
  BAIL_MEUBLE_1_ANS: "Meublé, 1 an",
  BAIL_MEUBLE_9_MOIS: "Meublé étudiant, 9 mois",
  COMMERCIAL_3_6_9: "Bail commercial 3-6-9",
  COMMERCIAL_DEROGATOIRE: "Bail dérogatoire",
};
const LEGAL_STATUS_LABELS: Record<string, string> = { PLEIN_PROPRIETE: "Monopropriété", CO_PROPRIETE: "Copropriété", LOTISSEMENT: "Lotissement" };
const PROPERTY_TYPE_LABELS: Record<string, string> = { APPARTEMENT: "Appartement", MAISON: "Maison", ...PREMISES_TYPE_LABELS };
const SUBDIVISION_LABELS: Record<string, string> = { YES: "Oui", NO: "Non", UNKNOWN: "Ne sait pas" };
const COMPLEX_LABELS: Record<string, string> = { no: "Immeuble ou rue", shopping_center: "Centre commercial", estate_complex: "Ensemble immobilier", yes: "Centre commercial" };
const CHARGE_LABELS: Record<string, string> = Object.fromEntries(CHARGE_ITEMS.map((item) => [item.key, item.label]));
const CLAUSE_LABELS: Record<string, string> = Object.fromEntries(CLAUSE_OPTIONS.map((clause) => [clause.key, clause.label]));

const fieldOf = (path: string) => path.split(".").pop() ?? path;

/** Libellé d'un champ, pour l'historique (« Date de naissance », « Syndic »…). */
export function fieldLabel(path: string): string {
  return FIELD_LABELS[fieldOf(path)] ?? FIELD_LABELS[path] ?? path;
}

const euro = (value: unknown) => `${Number(value).toLocaleString("fr-FR")} €`;
const isoDay = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

/** Valeur d'un champ en clair (« Marié(e) », « 1 200 € », « 12/04/1985 »), « — » si vide. */
export function formatFieldValue(path: string, value: unknown): string {
  if (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0)) return "—";
  const field = fieldOf(path);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  if (value === "yes") return "Oui";
  if (value === "no") return "Non";
  if (Array.isArray(value)) {
    if (field === "clauses") return value.map((key) => CLAUSE_LABELS[String(key)] ?? String(key)).join(", ");
    const lines = value.filter((line: any) => line?.label?.trim?.());
    return lines.length ? lines.map((line: any) => `${line.label}${line.amount ? ` (${euro(line.amount)})` : ""}`).join(", ") : "—";
  }
  if (typeof value === "object") {
    if (field === "charges") {
      return Object.entries(value as Record<string, string>)
        .map(([key, payer]) => `${CHARGE_LABELS[key] ?? key} : ${payer === "OWNER" ? "propriétaire" : "locataire"}`)
        .join(", ");
    }
    return "—";
  }
  const text = String(value);
  switch (field) {
    case "familyStatus":
      return FAMILY_STATUS_LABELS[text] ?? text;
    case "matrimonialRegime":
      return MATRIMONIAL_REGIME_LABELS[text] ?? text;
    case "bailType":
      return BAIL_TYPE_LABELS[text] ?? text;
    case "propertyLegalStatus":
      return LEGAL_STATUS_LABELS[text] ?? text;
    case "propertyType":
      return PROPERTY_TYPE_LABELS[text] ?? text;
    case "propertySubdivisionOver10Years":
      return SUBDIVISION_LABELS[text] ?? text;
    case "propertyInShoppingCenter":
      return COMPLEX_LABELS[text] ?? text;
    case "propertyMainRooms":
      return ROOMS_LABELS[Number(text)] ?? text;
    case "propertyConstructionPeriod":
      return PERIOD_LABELS[text] ?? text;
    case "propertyDpeClass":
      return `Classe ${text}`;
    case "propertySurfaceM2":
      return `${text.replace(".", ",")} m²`;
    case "bailRentAmount":
    case "bailMonthlyCharges":
    case "bailSecurityDeposit":
    case "entryFeeAmount":
    case "previousRentAmount":
    case "worksAmount":
    case "neighborhoodRent":
      return euro(text);
    case "rentIncreaseReason":
      return RENT_INCREASE_LABELS[text as keyof typeof RENT_INCREASE_LABELS] ?? text;
    case "bailPaymentDay":
      return `Le ${text} du mois`;
    case "rentPeriodicity":
      return RENT_PERIODICITY_LABELS[text] ?? text;
    case "indexation":
      return INDEXATION_LABELS[text] ?? text;
    case "feesPaidBy":
      return FEES_PAID_BY_LABELS[text] ?? text;
    case "isRegistered":
      return text === "true" ? "Oui" : text === "false" ? "Non" : text;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return isoDay(text);
  return text;
}

export interface FieldChange {
  label: string;
  before: string;
  after: string;
}

/** Ce qui a changé entre deux relevés d'une question (historique « avant → après »). */
export function describeChanges(before: Record<string, unknown> | null | undefined, after: Record<string, unknown> | null | undefined): FieldChange[] {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]));
  const changes: FieldChange[] = [];
  for (const key of keys) {
    const b = formatFieldValue(key, before?.[key]);
    const a = formatFieldValue(key, after?.[key]);
    if (a === b) continue;
    // Une case de mobilier décochée puis non renseignée n'est pas un changement utile.
    if (a === "—" && b === "Non") continue;
    changes.push({ label: fieldLabel(key), before: b, after: a });
  }
  return changes;
}

/**
 * Résumé des valeurs de la question, sans les champs qu'elle ne fait que surveiller (le dépôt de garantie
 * pour le loyer ou le type de bail) : « Marié(e) · Séparation de biens ».
 */
export function questionSummary(ref: QuestionRef, values: any, ctx: QuestionContext): string {
  const picked = pickQuestionValues(ref, values, ctx);
  if (ref.id === "bail.type" || ref.id === "bail.rent") delete picked.bailSecurityDeposit;
  if (ref.id === "person.phone") delete picked.phone;
  if (ref.id === "company.phone") delete picked.phone;
  return summarizeValues(picked);
}

/** Valeurs actuelles, en une ligne courte (fenêtre de l'équipe : « Marié(e) · Séparation de biens »). */
export function summarizeValues(values: Record<string, unknown>): string {
  const furniture = FURNITURE_KEYS.filter((key) => key in values);
  if (furniture.length === FURNITURE_KEYS.length) {
    const others = Object.fromEntries(Object.entries(values).filter(([key]) => !(FURNITURE_KEYS as readonly string[]).includes(key)));
    const count = furniture.filter((key) => values[key] === true).length;
    return [summarizeValues(others), `Mobilier : ${count} sur ${FURNITURE_KEYS.length}`].filter(Boolean).join(" · ");
  }
  return Object.entries(values)
    .map(([key, value]) => {
      const text = formatFieldValue(key, value);
      // « Oui » ou « Non » seul ne dit rien : on dit à quoi il répond.
      return text === "Oui" || text === "Non" ? `${fieldLabel(key)} : ${text.toLowerCase()}` : text;
    })
    .filter((text) => text !== "—")
    .join(" · ");
}

export { personName as questionPersonName };
