// Pas de "use server" : fonctions internes, appelées seulement par lib/actions/complement-requests.ts
// après le contrôle de l'utilisateur (équipe ou client propriétaire de la demande).

import { BailFamille, BailType, ClientType, EnergyClass, Prisma, ProfilType } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { commercialTermsFromForm, commercialTermsToForm, entrepriseCommercialFields } from "@/lib/utils/commercial-terms";
import { rentRulesFromForm, rentRulesToForm } from "@/lib/utils/rent-draft";
import { computeBailEndDate } from "@/lib/utils/bail-duration";
import { OWNER_PERIODS } from "@/lib/utils/rent-cap";
import { euros } from "@/lib/utils/rent-relocation";
import { assessRentRules } from "@/lib/rent-rules";
import { updatePropertyZoneStatus } from "@/lib/services/zone-tendue";
import { ensurePropertyGeocoded } from "@/lib/geocode";
import { entrepriseRegistryFields } from "@/lib/services/company-registry";
import { updateClientCompletionStatus, updatePropertyCompletionStatus } from "@/lib/utils/completion-status";
import { FURNITURE_KEYS, isFurnishedBail } from "@/lib/rules/dossier-rules";
import {
  questionErrors,
  questionPaths,
  spouseRequired,
  type ComplementTarget,
  type QuestionContext,
  type QuestionRef,
} from "@/lib/rules/complement-questions";

/* -------------------------------------------------------------------------- */
/*                         Le dossier, tel que le formulaire le voit          */
/* -------------------------------------------------------------------------- */

async function loadForAnswers(bailId: string) {
  return prisma.bail.findUnique({
    where: { id: bailId },
    include: {
      property: true,
      commercialTerms: true,
      parties: {
        include: {
          persons: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
          entreprise: true,
        },
      },
    },
  });
}
type AnswerBail = NonNullable<Awaited<ReturnType<typeof loadForAnswers>>>;

export interface DossierState {
  bail: AnswerBail;
  party: AnswerBail["parties"][number];
  ctx: QuestionContext;
  /** Valeurs du dossier, sous la forme du formulaire (mêmes chemins que les règles). */
  values: any;
  /** Rang dans le formulaire → id de la personne. */
  personIds: string[];
}

const str = (value: unknown) => (value === null || value === undefined ? "" : String(value));
const isoDay = (value: Date | null | undefined) => (value ? value.toISOString().slice(0, 10) : "");
const yesNo = (value: boolean | null | undefined) => (value === true ? "yes" : value === false ? "no" : "");

function personToForm(person: any) {
  return {
    id: person.id,
    firstName: str(person.firstName),
    lastName: str(person.lastName),
    email: str(person.email),
    phone: str(person.phone),
    fullAddress: str(person.fullAddress),
    profession: str(person.profession),
    nationality: str(person.nationality),
    familyStatus: str(person.familyStatus),
    matrimonialRegime: str(person.matrimonialRegime),
    birthPlace: str(person.birthPlace),
    birthDate: isoDay(person.birthDate),
  };
}

function entrepriseToForm(entreprise: any) {
  if (!entreprise) return undefined;
  return {
    legalName: str(entreprise.legalName),
    registration: str(entreprise.registration),
    name: str(entreprise.name || entreprise.legalName),
    email: str(entreprise.email),
    phone: str(entreprise.phone),
    fullAddress: str(entreprise.fullAddress),
    representativeName: str(entreprise.representativeName),
    representativeRole: str(entreprise.representativeRole),
    isRegistered: yesNo(entreprise.isRegistered),
  };
}

/** Le dossier de cette personne, sous la forme du formulaire. null si elle n'est pas dans le bail. */
export async function loadDossierState(bailId: string, target: ComplementTarget): Promise<DossierState | null> {
  const bail = await loadForAnswers(bailId);
  if (!bail) return null;
  const party = bail.parties.find((p) => p.profilType === (target === "OWNER" ? ProfilType.PROPRIETAIRE : ProfilType.LOCATAIRE));
  if (!party) return null;
  return buildState(bail, party, target);
}

function buildState(bail: AnswerBail, party: AnswerBail["parties"][number], target: ComplementTarget): DossierState {
  const moral = party.type === ClientType.PERSONNE_MORALE;
  const persons = moral ? [] : party.persons.map(personToForm);
  const entreprise = entrepriseToForm(party.entreprise);
  const primary = party.persons[0];
  const values: any = {
    type: party.type,
    bailFamily: bail.bailFamily,
    email: str(party.entreprise?.email ?? primary?.email),
    phone: str(party.entreprise?.phone ?? primary?.phone),
    persons,
    entreprise,
  };
  const ctx: QuestionContext = {
    target,
    bailFamily: bail.bailFamily,
    clientType: party.type,
    isTightZone: bail.property?.isTightZone ?? null,
    hasTenant: bail.parties.some((p) => p.profilType === ProfilType.LOCATAIRE),
  };

  if (target === "OWNER") {
    const property: any = bail.property ?? {};
    Object.assign(values, {
      propertyFullAddress: str(property.fullAddress),
      propertyHousenumber: str(property.housenumber),
      propertyStreet: str(property.street),
      propertyCity: str(property.city),
      propertyPostalCode: str(property.postalCode),
      propertyDistrict: str(property.district),
      propertyInseeCode: str(property.inseeCode),
      propertyDepartment: str(property.department),
      propertyRegion: str(property.region),
      propertyLatitude: str(property.latitude),
      propertyLongitude: str(property.longitude),
      propertySurfaceM2: str(property.surfaceM2),
      propertyType: str(property.type),
      propertyLegalStatus: str(property.legalStatus),
      propertyMainRooms: property.mainRooms ?? "",
      propertyConstructionPeriod: str(property.constructionPeriod),
      propertyDpeClass: str(property.dpeClass),
      propertySyndicName: str(property.syndicName),
      propertySyndicEmail: str(property.syndicEmail),
      propertySyndicPhone: str(property.syndicPhone),
      propertySubdivisionOver10Years: str(property.subdivisionOver10Years),
      propertyInShoppingCenter:
        property.inShoppingCenter === true
          ? property.complexType === "ESTATE_COMPLEX"
            ? "estate_complex"
            : "shopping_center"
          : property.inShoppingCenter === false
            ? "no"
            : "",
      propertyOutbuildings: str(property.outbuildings),
      bailType: str(bail.bailType),
      bailRentAmount: Number(bail.rentAmount) > 0 ? String(bail.rentAmount) : "",
      bailMonthlyCharges: Number(bail.rentAmount) > 0 ? str(bail.monthlyCharges) : "",
      bailSecurityDeposit: Number(bail.rentAmount) > 0 ? str(bail.securityDeposit) : "",
      bailEffectiveDate: isoDay(bail.effectiveDate),
      bailPaymentDay: str(bail.paymentDay),
      commercial: commercialTermsToForm(bail.commercialTerms),
      rentRules: rentRulesToForm(bail as any),
      // Le locataire ne se demande pas par ce biais (la fiche a son propre bouton).
      tenantEmail: "",
    });
    for (const key of FURNITURE_KEYS) values[key] = property[key] === true;
  }
  return { bail, party, ctx, values, personIds: moral ? [] : party.persons.map((p) => p.id) };
}

/** Rang de la personne dans le formulaire (null si elle n'est plus dans le dossier). */
export function personIndexOf(state: DossierState, personId: string | null | undefined): number | null {
  if (!personId) return null;
  const index = state.personIds.indexOf(personId);
  return index >= 0 ? index : null;
}

/* -------------------------------------------------------------------------- */
/*                                 La réponse                                 */
/* -------------------------------------------------------------------------- */

const valueAt = (values: any, path: string) => path.split(".").reduce((node: any, key) => (node == null ? undefined : node[key]), values);

function setAt(values: any, path: string, value: unknown) {
  const keys = path.split(".");
  let node = values;
  for (let i = 0; i < keys.length - 1; i++) {
    if (node[keys[i]] === undefined || node[keys[i]] === null) node[keys[i]] = /^\d+$/.test(keys[i + 1]) ? [] : {};
    node = node[keys[i]];
  }
  node[keys[keys.length - 1]] = value;
}

const clean = (value: unknown) => (typeof value === "string" ? value.trim() : value);

/** Champs du dossier qu'une réponse peut modifier (ceux de la question, avant et après la réponse). */
const ADDRESS_GEO_PATHS = [
  "propertyHousenumber",
  "propertyStreet",
  "propertyCity",
  "propertyPostalCode",
  "propertyDistrict",
  "propertyInseeCode",
  "propertyDepartment",
  "propertyRegion",
  "propertyLatitude",
  "propertyLongitude",
];

/**
 * Applique la réponse du client au dossier (en mémoire) : seuls les champs de la question sont pris.
 * Bail commercial d'un bien commun : la réponse peut ajouter le conjoint (`spouse`).
 */
export function mergeAnswer(state: DossierState, ref: QuestionRef, answer: Record<string, unknown>): any {
  const merged = structuredClone(state.values);
  const draft = structuredClone(state.values);
  for (const [path, value] of Object.entries(answer)) if (path !== "spouse") setAt(draft, path, clean(value));
  const allowed = new Set([...questionPaths(ref, state.values, state.ctx), ...questionPaths(ref, draft, state.ctx)]);
  if (ref.id === "property.address") ADDRESS_GEO_PATHS.forEach((path) => allowed.add(path));
  for (const [path, value] of Object.entries(answer)) {
    if (path === "spouse" || !allowed.has(path)) continue;
    setAt(merged, path, clean(value));
  }
  // Situation familiale : le régime n'a de sens que pour une personne mariée.
  if (ref.id === "person.family") {
    const person = merged.persons?.[ref.personIndex ?? 0];
    if (person && person.familyStatus !== "MARIE") person.matrimonialRegime = "";
    // Le conjoint à ajouter (bail commercial) : une seule fois, s'il n'y a qu'une personne.
    const spouse = answer.spouse as Record<string, unknown> | undefined;
    if (spouse && typeof spouse === "object" && spouseRequired(merged, state.ctx) && merged.persons.length < 2) {
      merged.persons.push({
        isNew: true,
        firstName: clean(spouse.firstName) ?? "",
        lastName: clean(spouse.lastName) ?? "",
        email: String(clean(spouse.email) ?? "").toLowerCase(),
        phone: clean(spouse.phone) ?? "",
        fullAddress: clean(spouse.fullAddress) ?? "",
        profession: clean(spouse.profession) ?? "",
        nationality: clean(spouse.nationality) ?? "",
        familyStatus: "MARIE",
        matrimonialRegime: person?.matrimonialRegime ?? "",
        birthPlace: clean(spouse.birthPlace) ?? "",
        birthDate: clean(spouse.birthDate) ?? "",
      });
    }
  }
  return merged;
}

/** E-mail déjà pris par une autre personne ou une autre société que ce client ? */
async function emailTaken(email: string, clientId: string, exceptPersonId?: string) {
  const [person, entreprise] = await Promise.all([
    prisma.person.findFirst({ where: { email, ...(exceptPersonId ? { id: { not: exceptPersonId } } : {}) }, select: { clientId: true } }),
    prisma.entreprise.findFirst({ where: { email }, select: { clientId: true } }),
  ]);
  // L'e-mail d'une personne est unique dans toute la base ; celui d'une société, par client.
  return !!person || (!!entreprise && entreprise.clientId !== clientId);
}

const toDate = (value: unknown) => {
  const text = str(value);
  if (!text) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00.000Z` : text);
  return Number.isNaN(date.getTime()) ? null : date;
};
const toInt = (value: unknown) => {
  const num = Number.parseInt(str(value), 10);
  return Number.isFinite(num) ? num : null;
};
const textOrNull = (value: unknown, max = 500) => {
  const text = str(value).trim();
  return text ? text.slice(0, max) : null;
};

/** Le loyer est-il au-dessus du maximum autorisé (zone d'encadrement), sans complément possible ? */
async function rentTooHigh(state: DossierState, merged: any): Promise<string | null> {
  if (state.bail.bailFamily === BailFamille.COMMERCIAL || !state.bail.property) return null;
  const rent = toInt(merged.bailRentAmount);
  if (!rent) return null;
  const check = await assessRentRules({
    property: state.bail.property as any,
    bail: {
      rentAmount: rent,
      bailType: merged.bailType || state.bail.bailType,
      bailFamily: state.bail.bailFamily,
      effectiveDate: toDate(merged.bailEffectiveDate),
      rentCapExemption: (state.bail as any).rentCapExemption ?? null,
      ...rentRulesFromForm(merged.rentRules ?? {}),
    } as any,
  });
  const tooHigh = check.overBy !== null && check.overBy > 0 && check.maxRent !== null;
  const supplementPossible = check.supplement.needed && !check.supplement.forbidden && check.relocation.status !== "over";
  return tooHigh && !supplementPossible ? `Le loyer dépasse le maximum autorisé de ${euros(check.maxRent!)} hors charges.` : null;
}

export type AnswerResult = { ok: true; merged: any } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Contrôle puis enregistre la réponse : mêmes règles que le formulaire (le serveur ne fait pas
 * confiance au navigateur), puis écriture dans la personne, la société, le bien ou le bail.
 */
export async function saveAnswer(state: DossierState, ref: QuestionRef, answer: Record<string, unknown>): Promise<AnswerResult> {
  const merged = mergeAnswer(state, ref, answer);
  const fieldErrors = questionErrors(ref, merged, state.ctx);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: Object.values(fieldErrors)[0], fieldErrors };
  }
  if (ref.id === "bail.rent" || ref.id === "bail.type" || ref.id === "bail.dates") {
    const tooHigh = await rentTooHigh(state, merged);
    if (tooHigh) return { ok: false, error: tooHigh, fieldErrors: { bailRentAmount: tooHigh } };
  }

  const { bail, party } = state;
  const index = ref.personIndex ?? 0;
  const person = merged.persons?.[index];
  const personId = state.personIds[index];
  const scopeOk =
    ref.id.startsWith("person.") ? !!person && !!personId : ref.id.startsWith("company.") ? !!party.entreprise : !!bail.property || ref.id.startsWith("bail.") || ref.id.startsWith("commercial.");
  if (!scopeOk) return { ok: false, error: "Cette information ne correspond plus au dossier" };

  // E-mails : uniques dans toute la base (connexion à l'espace client).
  if (ref.id === "person.email") {
    const email = str(person.email).toLowerCase();
    if (await emailTaken(email, party.id, personId)) return { ok: false, error: "Cet e-mail est déjà utilisé", fieldErrors: { [`persons.${index}.email`]: "Cet e-mail est déjà utilisé" } };
  }
  const newSpouse = ref.id === "person.family" ? merged.persons.find((p: any) => p?.isNew) : null;
  if (newSpouse) {
    const spouseIndex = merged.persons.indexOf(newSpouse);
    if (await emailTaken(str(newSpouse.email).toLowerCase(), party.id)) {
      return { ok: false, error: "Cet e-mail est déjà utilisé", fieldErrors: { [`persons.${spouseIndex}.email`]: "Cet e-mail est déjà utilisé" } };
    }
  }

  const bailData: Prisma.BailUpdateInput = {};
  const propertyData: Prisma.PropertyUpdateInput = {};
  const commercial = bail.bailFamily === BailFamille.COMMERCIAL;
  const endDate = () =>
    computeBailEndDate(toDate(merged.bailEffectiveDate), merged.bailType || bail.bailType, toInt(merged.commercial?.derogatoryMonths));

  await prisma.$transaction(async (tx) => {
    switch (ref.id) {
      case "person.identity":
        await tx.person.update({ where: { id: personId }, data: { firstName: textOrNull(person.firstName, 200), lastName: textOrNull(person.lastName, 200) } });
        break;
      case "person.birth":
        await tx.person.update({ where: { id: personId }, data: { birthDate: toDate(person.birthDate), birthPlace: textOrNull(person.birthPlace, 200) } });
        break;
      case "person.nationality":
        await tx.person.update({ where: { id: personId }, data: { nationality: textOrNull(person.nationality, 100) } });
        break;
      case "person.profession":
        await tx.person.update({ where: { id: personId }, data: { profession: textOrNull(person.profession, 200) } });
        break;
      case "person.address":
        await tx.person.update({ where: { id: personId }, data: { fullAddress: textOrNull(person.fullAddress, 500) } });
        break;
      case "person.phone":
        await tx.person.update({ where: { id: personId }, data: { phone: textOrNull(person.phone, 30) } });
        break;
      case "person.email":
        await tx.person.update({ where: { id: personId }, data: { email: str(person.email).trim().toLowerCase() } });
        break;
      case "person.family": {
        await tx.person.update({
          where: { id: personId },
          data: {
            familyStatus: (person.familyStatus || null) as any,
            matrimonialRegime: (person.familyStatus === "MARIE" ? person.matrimonialRegime || null : null) as any,
          },
        });
        if (commercial && index === 0) {
          const terms = commercialTermsFromForm(merged.commercial);
          await tx.bailCommercialTerms.upsert({ where: { bailId: bail.id }, create: { bailId: bail.id, ...terms }, update: terms });
        }
        if (newSpouse) {
          await tx.person.create({
            data: {
              clientId: party.id,
              isPrimary: false,
              firstName: textOrNull(newSpouse.firstName, 200),
              lastName: textOrNull(newSpouse.lastName, 200),
              email: str(newSpouse.email).trim().toLowerCase(),
              phone: textOrNull(newSpouse.phone, 30),
              fullAddress: textOrNull(newSpouse.fullAddress, 500),
              profession: textOrNull(newSpouse.profession, 200),
              nationality: textOrNull(newSpouse.nationality, 100),
              familyStatus: "MARIE",
              matrimonialRegime: (person.matrimonialRegime || null) as any,
              birthPlace: textOrNull(newSpouse.birthPlace, 200),
              birthDate: toDate(newSpouse.birthDate),
            },
          });
        }
        break;
      }
      case "company.identity": {
        const e = merged.entreprise ?? {};
        const before = state.values.entreprise ?? {};
        const registry =
          str(e.registration).trim() !== str(before.registration).trim()
            ? await entrepriseRegistryFields({ registration: e.registration }).catch(() => ({}))
            : {};
        await tx.entreprise.update({
          where: { id: party.entreprise!.id },
          data: {
            legalName: str(e.legalName).trim(),
            name: str(e.name).trim() || str(e.legalName).trim(),
            registration: str(e.registration).trim(),
            fullAddress: str(e.fullAddress).trim(),
            ...entrepriseCommercialFields({ isRegistered: e.isRegistered === "" ? undefined : e.isRegistered }),
            ...registry,
          },
        });
        break;
      }
      case "company.phone":
        await tx.entreprise.update({ where: { id: party.entreprise!.id }, data: { phone: str(merged.entreprise?.phone).trim() } });
        break;
      case "company.representative":
        await tx.entreprise.update({
          where: { id: party.entreprise!.id },
          data: entrepriseCommercialFields({
            representativeName: merged.entreprise?.representativeName,
            representativeRole: merged.entreprise?.representativeRole,
          }),
        });
        break;
      case "property.address":
        Object.assign(propertyData, {
          fullAddress: str(merged.propertyFullAddress).trim(),
          housenumber: textOrNull(merged.propertyHousenumber, 20),
          street: textOrNull(merged.propertyStreet, 200),
          city: textOrNull(merged.propertyCity, 200),
          postalCode: textOrNull(merged.propertyPostalCode, 10),
          district: textOrNull(merged.propertyDistrict, 200),
          inseeCode: textOrNull(merged.propertyInseeCode, 10),
          department: textOrNull(merged.propertyDepartment, 100),
          region: textOrNull(merged.propertyRegion, 100),
          latitude: str(merged.propertyLatitude) ? new Decimal(str(merged.propertyLatitude)) : null,
          longitude: str(merged.propertyLongitude) ? new Decimal(str(merged.propertyLongitude)) : null,
        });
        break;
      case "property.surface":
        Object.assign(propertyData, { surfaceM2: new Decimal(str(merged.propertySurfaceM2).replace(",", ".")), type: merged.propertyType });
        break;
      case "property.legalStatus":
        Object.assign(propertyData, { legalStatus: merged.propertyLegalStatus });
        if (merged.propertyLegalStatus === "CO_PROPRIETE") {
          Object.assign(propertyData, {
            syndicName: textOrNull(merged.propertySyndicName, 200),
            syndicEmail: textOrNull(merged.propertySyndicEmail, 200),
            syndicPhone: textOrNull(merged.propertySyndicPhone, 30),
          });
        }
        if (merged.propertyLegalStatus === "LOTISSEMENT") {
          Object.assign(propertyData, {
            subdivisionOver10Years: ["YES", "NO", "UNKNOWN"].includes(merged.propertySubdivisionOver10Years) ? merged.propertySubdivisionOver10Years : null,
          });
        }
        break;
      case "property.category": {
        const rooms = Number(merged.propertyMainRooms);
        Object.assign(propertyData, {
          mainRooms: Number.isInteger(rooms) && rooms >= 1 && rooms <= 4 ? rooms : null,
          constructionPeriod: (OWNER_PERIODS as readonly string[]).includes(merged.propertyConstructionPeriod) ? merged.propertyConstructionPeriod : null,
          dpeClass: (Object.values(EnergyClass) as string[]).includes(merged.propertyDpeClass) ? merged.propertyDpeClass : null,
        });
        break;
      }
      case "property.shoppingCenter": {
        const value = merged.propertyInShoppingCenter;
        const complexType = value === "estate_complex" ? "ESTATE_COMPLEX" : value === "shopping_center" || value === "yes" ? "SHOPPING_CENTER" : null;
        Object.assign(propertyData, {
          inShoppingCenter: complexType ? true : value === "no" ? false : null,
          complexType,
          outbuildings: textOrNull(merged.propertyOutbuildings, 1000),
        });
        break;
      }
      case "property.furniture":
        for (const key of FURNITURE_KEYS) (propertyData as any)[key] = merged[key] === true;
        break;
      case "bail.type":
        Object.assign(bailData, { bailType: merged.bailType as BailType, securityDeposit: toInt(merged.bailSecurityDeposit) ?? 0, endDate: endDate() });
        if (isFurnishedBail(merged.bailType)) for (const key of FURNITURE_KEYS) (propertyData as any)[key] = merged[key] === true;
        break;
      case "bail.rent":
        Object.assign(bailData, { rentAmount: toInt(merged.bailRentAmount) ?? 0, securityDeposit: toInt(merged.bailSecurityDeposit) ?? 0 });
        break;
      case "bail.charges":
        Object.assign(bailData, { monthlyCharges: toInt(merged.bailMonthlyCharges) ?? 0, securityDeposit: toInt(merged.bailSecurityDeposit) ?? 0 });
        break;
      case "bail.dates":
        Object.assign(bailData, { effectiveDate: toDate(merged.bailEffectiveDate) ?? bail.effectiveDate, paymentDay: toInt(merged.bailPaymentDay), endDate: endDate() });
        break;
      case "commercial.duration":
        Object.assign(bailData, {
          bailType: merged.bailType as BailType,
          effectiveDate: toDate(merged.bailEffectiveDate) ?? bail.effectiveDate,
          paymentDay: toInt(merged.bailPaymentDay),
          endDate: endDate(),
        });
        break;
      case "commercial.rent":
        Object.assign(bailData, { rentAmount: toInt(merged.bailRentAmount) ?? 0 });
        break;
      case "commercial.deposit":
        Object.assign(bailData, { monthlyCharges: toInt(merged.bailMonthlyCharges) ?? 0, securityDeposit: toInt(merged.bailSecurityDeposit) ?? 0 });
        break;
    }
    if (ref.id.startsWith("commercial.")) {
      const terms = commercialTermsFromForm(merged.commercial);
      await tx.bailCommercialTerms.upsert({ where: { bailId: bail.id }, create: { bailId: bail.id, ...terms }, update: terms });
    }
    if (Object.keys(bailData).length > 0) await tx.bail.update({ where: { id: bail.id }, data: bailData });
    if (Object.keys(propertyData).length > 0 && bail.property) await tx.property.update({ where: { id: bail.property.id }, data: propertyData });
  });

  // Nouvelle adresse ou nouveau type : localisation et zone tendue recalculées (comme le formulaire).
  if (bail.property && (ref.id === "property.address" || ref.id === "property.surface")) {
    await ensurePropertyGeocoded(bail.property.id).catch((error) => console.error("[complement-answers] géocodage", error));
    const located = await prisma.property.findUnique({ where: { id: bail.property.id }, select: { inseeCode: true, type: true } });
    if (located?.inseeCode && located.type) {
      await updatePropertyZoneStatus(bail.property.id, located.inseeCode, located.type).catch((error) => console.error("[complement-answers] zone", error));
    }
  }
  await updateClientCompletionStatus(party.id).catch((error) => console.error("[complement-answers] client", error));
  if (bail.property) await updatePropertyCompletionStatus(bail.property.id).catch((error) => console.error("[complement-answers] bien", error));

  return { ok: true, merged };
}

/** Valeur d'un champ du dossier (pour l'historique). */
export function stateValue(state: DossierState, path: string) {
  return valueAt(state.values, path);
}
