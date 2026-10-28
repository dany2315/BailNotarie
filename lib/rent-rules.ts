import { assessRentCap, type RentCapAssessment, type RentCapInput } from "@/lib/rent-cap";
import { checkTightZone } from "@/lib/services/zone-tendue";
import { irlVariationAt } from "@/lib/irl-index";
import { toCents } from "@/lib/utils/rent-cap";
import {
  isFrozenDpe,
  relocationProofKinds,
  relocationSituation,
  monthsBefore,
  type RelocationAnswers,
} from "@/lib/utils/rent-relocation";

/**
 * Loyer maximal d'un bail d'habitation : plafond de l'arrêté d'encadrement (villes encadrées)
 * et évolution du loyer à la relocation (toutes les communes en zone tendue). La règle la plus
 * stricte l'emporte. Utilisé par les formulaires du propriétaire et par la fiche admin.
 */

export interface RentRulesInput {
  property: RentCapInput["property"] & { dpeClass?: string | null };
  bail: RentCapInput["bail"] & Partial<RelocationAnswers> & { rentSupplementAmount?: number | null };
  /** Date du contrôle : dernier IRL publié et vacance de 18 mois (par défaut, aujourd'hui). */
  now?: Date;
}

export type RelocationStatus =
  /** Pas de règle d'évolution : bail commercial, adresse non localisée ou commune hors zone tendue. */
  | "not_concerned"
  /** Il manque une réponse ou un montant pour calculer le maximum. */
  | "missing"
  /** Loyer libre (première location, logement vide depuis 18 mois ou plus, gros travaux récents). */
  | "free"
  | "ok"
  | "over";

export interface RelocationAssessment {
  status: RelocationStatus;
  notConcerned: "commercial" | "no_address" | "not_tight" | null;
  /** Le propriétaire n'a pas encore répondu (baux créés avant ces questions). */
  undeclared: boolean;
  situation: "first" | "vacant" | "relet" | null;
  /** Pourquoi le loyer est libre. */
  freeReason: "first" | "vacant" | "works" | null;
  missing: string[];
  dpeClass: string | null;
  frozen: boolean;
  previousRent: number | null;
  irl: { applied: boolean; rate: number | null; quarter: string | null; previousQuarter: string | null; note: string | null };
  /** Dernier loyer, révisé selon l'IRL s'il y a lieu. */
  revisedRent: number | null;
  increase: {
    kind: "works_partial" | "works_full" | "undervalued";
    accepted: boolean;
    amount: number | null;
    note: string;
    /** Loyer du voisinage retenu (loyer sous-évalué) et sa source. */
    neighborhood?: { amount: number; source: "arrete" | "owner" };
  } | null;
  maxRent: number | null;
  overBy: number | null;
  proofs: string[];
}

export interface RentRulesAssessment {
  rent: number;
  cap: RentCapAssessment;
  relocation: RelocationAssessment;
  /** Loyer maximal hors charges, complément compris quand il est permis (null = pas de maximum calculé). */
  maxRent: number | null;
  overBy: number | null;
  supplement: {
    /** Le loyer dépasse le plafond de l'arrêté : un complément est possible ou nécessaire. */
    needed: boolean;
    /** Loyer de base (au plus le plafond, à l'euro) et complément, si le loyer dépasse le plafond. */
    base: number | null;
    amount: number | null;
    forbidden: "dpe" | null;
    /** Classe DPE inconnue : impossible de savoir si le complément est permis. */
    dpeUnknown: boolean;
    accepted: boolean;
  };
  /** Bloquant pour le propriétaire (formulaires) : loyer au-dessus du maximum ou réponse manquante. */
  ownerBlocking: boolean;
  /** Bloquant pour l'envoi au notaire (fiche admin). */
  teamBlocking: boolean;
}

const asNumber = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));
const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export async function assessRelocation(input: RentRulesInput, cap: RentCapAssessment): Promise<RelocationAssessment> {
  const { property, bail } = input;
  const now = input.now ?? new Date();
  const dpeClass = property.dpeClass ?? null;
  const frozen = isFrozenDpe(dpeClass);
  const answers: RelocationAnswers = {
    relocationLetBefore: bail.relocationLetBefore ?? null,
    previousTenantLeftAt: bail.previousTenantLeftAt ?? null,
    previousRentAmount: asNumber(bail.previousRentAmount),
    previousRentRevisedRecently: bail.previousRentRevisedRecently ?? null,
    rentIncreaseReason: bail.rentIncreaseReason ?? null,
    worksAmount: asNumber(bail.worksAmount),
    worksCompletedAt: bail.worksCompletedAt ?? null,
    neighborhoodRent: asNumber(bail.neighborhoodRent),
  };
  const result: RelocationAssessment = {
    status: "not_concerned",
    notConcerned: null,
    undeclared: false,
    situation: null,
    freeReason: null,
    missing: [],
    dpeClass,
    frozen,
    previousRent: answers.previousRentAmount,
    irl: { applied: false, rate: null, quarter: null, previousQuarter: null, note: null },
    revisedRent: null,
    increase: null,
    maxRent: null,
    overBy: null,
    proofs: [],
  };

  if (bail.bailFamily === "COMMERCIAL") return { ...result, notConcerned: "commercial" };
  if (!property.inseeCode) return { ...result, notConcerned: "no_address" };
  const { isTightZone } = await checkTightZone(property.inseeCode);
  if (!isTightZone) return { ...result, notConcerned: "not_tight" };

  result.status = "missing";
  if (answers.relocationLetBefore === null) {
    result.undeclared = true;
    result.missing.push("logement déjà loué ou non");
    return result;
  }
  if (answers.relocationLetBefore && !toDate(answers.previousTenantLeftAt)) result.missing.push("date de départ du locataire précédent");
  if (answers.relocationLetBefore && !dpeClass) result.missing.push("classe énergétique (DPE)");
  if (result.missing.length) return result;

  const situation = relocationSituation(answers, now)!;
  result.situation = situation;
  result.proofs = relocationProofKinds(answers, dpeClass, now);
  const rent = bail.rentAmount;
  const finish = (max: number | null) => {
    if (max === null) return result;
    result.maxRent = toCents(max);
    result.overBy = toCents(rent - result.maxRent);
    result.status = result.overBy > 0 ? "over" : "ok";
    return result;
  };

  if (situation === "first") {
    result.status = "free";
    result.freeReason = "first";
    return result;
  }
  if (situation === "vacant" && !frozen) {
    result.status = "free";
    result.freeReason = "vacant";
    return result;
  }

  // Reloué (ou vide depuis 18 mois ou plus avec un DPE F ou G) : le dernier loyer est le maximum.
  const previous = answers.previousRentAmount;
  if (!previous || previous <= 0) {
    result.missing.push("dernier loyer du locataire précédent");
    return result;
  }
  if (situation === "vacant") {
    result.revisedRent = previous;
    result.irl.note = "Logement classé F ou G : loyer gelé au dernier loyer, sans révision.";
    return finish(previous);
  }

  // Révision IRL : seulement si le loyer n'a pas été révisé depuis un an, et jamais pour un F ou G.
  let revised = previous;
  if (frozen) {
    result.irl.note = "Logement classé F ou G : pas de révision selon l'IRL.";
  } else if (answers.previousRentRevisedRecently === null) {
    result.missing.push("révision du loyer au cours des 12 derniers mois");
    return result;
  } else if (answers.previousRentRevisedRecently) {
    result.irl.note = "Loyer déjà révisé au cours des 12 derniers mois : pas de nouvelle révision.";
  } else {
    const irl = await irlVariationAt(now);
    if (irl) {
      revised = toCents(previous * (1 + irl.rate));
      result.irl = { applied: true, rate: irl.rate, quarter: irl.quarter, previousQuarter: irl.previousQuarter, note: null };
    } else {
      result.irl.note = "Indice de référence des loyers indisponible : pas de révision appliquée.";
    }
  }
  result.revisedRent = revised;

  const reason = answers.rentIncreaseReason || "NONE";
  if (reason === "WORKS") {
    const annualRent = previous * 12;
    const works = answers.worksAmount;
    if (frozen) {
      result.increase = { kind: "works_partial", accepted: false, amount: null, note: "Logement classé F ou G : pas de hausse après travaux." };
      return finish(revised);
    }
    if (!works || works <= 0) {
      result.missing.push("coût des travaux");
      return result;
    }
    const completedAt = toDate(answers.worksCompletedAt);
    if (!completedAt) {
      result.missing.push("date de fin des travaux");
      return result;
    }
    // Travaux d'au moins une année de loyer, finis depuis moins de 6 mois : loyer libre.
    if (works >= annualRent && completedAt > monthsBefore(now, 6) && completedAt <= now) {
      result.status = "free";
      result.freeReason = "works";
      result.increase = { kind: "works_full", accepted: true, amount: null, note: "Travaux d'au moins une année de loyer, finis depuis moins de 6 mois : loyer libre." };
      return result;
    }
    // Travaux d'au moins la moitié d'une année de loyer : hausse annuelle de 15 % du coût TTC au plus.
    if (works >= annualRent / 2) {
      const amount = toCents((works * 0.15) / 12);
      result.increase = { kind: "works_partial", accepted: true, amount, note: "Hausse de 15 % du coût TTC des travaux par an au plus." };
      return finish(revised + amount);
    }
    result.increase = {
      kind: "works_partial",
      accepted: false,
      amount: null,
      note: `Travaux trop faibles pour une hausse : il faut au moins la moitié d'une année de loyer (${toCents(annualRent / 2)} €).`,
    };
    return finish(revised);
  }

  if (reason === "UNDERVALUED") {
    if (frozen) {
      result.increase = { kind: "undervalued", accepted: false, amount: null, note: "Logement classé F ou G : pas de réévaluation du loyer." };
      return finish(revised);
    }
    // Ville encadrée : le loyer de référence de l'arrêté (loyer médian des logements comparables).
    // Ailleurs : le loyer du voisinage indiqué par le propriétaire, avec ses références.
    const fromArrete = cap.reference && cap.surface ? toCents(cap.reference.ref * cap.surface) : null;
    const neighborhood = fromArrete ?? answers.neighborhoodRent;
    if (!neighborhood || neighborhood <= 0) {
      result.missing.push("loyer du voisinage pour un logement comparable");
      return result;
    }
    const source = fromArrete !== null ? "arrete" : "owner";
    if (cap.maxRent != null && previous > cap.maxRent) {
      result.increase = {
        kind: "undervalued",
        accepted: false,
        amount: null,
        note: "Le dernier loyer dépasse déjà le plafond de l'arrêté : il ne peut pas être sous-évalué.",
        neighborhood: { amount: neighborhood, source },
      };
      return finish(revised);
    }
    if (neighborhood <= revised) {
      result.increase = {
        kind: "undervalued",
        accepted: false,
        amount: null,
        note: "Le dernier loyer n'est pas sous-évalué : il atteint déjà le loyer du voisinage.",
        neighborhood: { amount: neighborhood, source },
      };
      return finish(revised);
    }
    // Hausse limitée à la moitié de l'écart entre le loyer du voisinage et le dernier loyer révisé.
    const amount = toCents((neighborhood - revised) / 2);
    result.increase = {
      kind: "undervalued",
      accepted: true,
      amount,
      note: "Hausse limitée à la moitié de l'écart avec le loyer du voisinage.",
      neighborhood: { amount: neighborhood, source },
    };
    return finish(revised + amount);
  }

  return finish(revised);
}

export async function assessRentRules(input: RentRulesInput): Promise<RentRulesAssessment> {
  const cap = await assessRentCap({ property: input.property, bail: input.bail });
  const relocation = await assessRelocation(input, cap);
  const rent = input.bail.rentAmount;

  // Complément de loyer : loyer de base égal au plafond, le reste en complément justifié.
  // Interdit pour un logement classé F ou G (loi du 22 août 2021, baux signés depuis le 18 août 2022).
  const capOver = cap.status === "over" && cap.maxRent != null;
  const base = capOver ? Math.floor(cap.maxRent!) : null;
  const forbidden = capOver && isFrozenDpe(input.property.dpeClass) ? ("dpe" as const) : null;
  const dpeUnknown = capOver && !input.property.dpeClass;
  const accepted = capOver && !forbidden && !!input.bail.rentSupplementReason?.trim();
  const supplement = {
    needed: capOver,
    base,
    amount: capOver ? rent - base! : null,
    forbidden,
    dpeUnknown,
    accepted,
  };

  // Plafond de l'arrêté (sauf complément accepté), puis maximum de relocation : le plus strict l'emporte.
  const ceilings = [
    cap.maxRent != null && cap.validity === "in" && !accepted ? cap.maxRent : null,
    relocation.maxRent,
  ].filter((value): value is number => value !== null);
  const maxRent = ceilings.length ? Math.min(...ceilings) : null;
  const overBy = maxRent !== null ? toCents(rent - maxRent) : null;
  const over = overBy !== null && overBy > 0;

  // Formulaire : toutes les questions doivent avoir une réponse (sauf la zone, que l'équipe confirme).
  const ownerBlocking = over || relocation.status === "missing" || (capOver && (!!forbidden || dpeUnknown));
  // Fiche admin : les baux créés avant ces questions ne sont pas bloqués (à renseigner par l'équipe).
  const teamBlocking =
    cap.status === "missing" ||
    (capOver && cap.validity === "in" && !accepted) ||
    (relocation.status === "over") ||
    (relocation.status === "missing" && !relocation.undeclared);

  return { rent, cap, relocation, maxRent, overBy, supplement, ownerBlocking, teamBlocking };
}
