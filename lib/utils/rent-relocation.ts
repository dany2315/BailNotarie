/**
 * Relocation en zone tendue : règles pures et libellés (utilisables côté client et serveur).
 *
 * Décret n° 2017-1198 du 27 juillet 2017, reconduit chaque année (en dernier jusqu'au
 * 31 juillet 2027), pris pour l'article 18 de la loi du 6 juillet 1989. Dans une commune en
 * zone tendue, le loyer d'un logement reloué après moins de 18 mois de vacance ne peut pas
 * dépasser le dernier loyer du locataire précédent, révisé selon l'IRL s'il ne l'a pas été depuis
 * un an. Exceptions : travaux d'amélioration ou loyer manifestement sous-évalué. Logement vide
 * depuis 18 mois ou plus, ou première location : loyer libre (DPE F ou G : dernier loyer au
 * maximum). Dans les villes encadrées, le plafond de l'arrêté s'applique en plus.
 */

import type { RelocationAssessment } from "@/lib/rent-rules";

/** Raison d'une hausse au-delà du dernier loyer révisé. */
export const RENT_INCREASE_REASONS = ["NONE", "WORKS", "UNDERVALUED"] as const;
export type RentIncreaseReason = (typeof RENT_INCREASE_REASONS)[number];

export const RENT_INCREASE_LABELS: Record<RentIncreaseReason, string> = {
  NONE: "Non, pas de hausse",
  WORKS: "Oui, après des travaux d'amélioration",
  UNDERVALUED: "Oui, l'ancien loyer était sous-évalué",
};

/** Classes énergétiques interdisant toute hausse, complément de loyer ou révision. */
export const FROZEN_DPE_CLASSES = ["F", "G"];
export const isFrozenDpe = (dpeClass: string | null | undefined) => !!dpeClass && FROZEN_DPE_CLASSES.includes(dpeClass);

/** Vacance au-delà de laquelle le loyer redevient libre (logement A à E). */
export const VACANCY_MONTHS = 18;

/** Réponses qui manquent pour calculer le maximum (affichées à l'équipe, et repères du formulaire). */
export const RELOCATION_MISSING = {
  letBefore: "logement déjà loué ou non",
  dpe: "classe énergétique (DPE)",
  previousRent: "dernier loyer du locataire précédent",
  leftAt: "date de départ du locataire précédent",
  revised: "révision du loyer au cours des 12 derniers mois",
  worksAmount: "coût des travaux",
  worksDate: "date de fin des travaux",
  neighborhood: "loyer du voisinage pour un logement comparable",
} as const;

/** Données saisies par le propriétaire sur la relocation (toutes facultatives : null = non répondu). */
export interface RelocationAnswers {
  relocationLetBefore: boolean | null;
  previousTenantLeftAt: Date | string | null;
  previousRentAmount: number | null;
  previousRentRevisedRecently: boolean | null;
  rentIncreaseReason: string | null;
  worksAmount: number | null;
  worksCompletedAt: Date | string | null;
  neighborhoodRent: number | null;
}

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date du jour moins n mois (même jour du mois). */
export function monthsBefore(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

/** Situation du logement : première location, vide depuis 18 mois ou plus, ou reloué. */
export function relocationSituation(answers: Pick<RelocationAnswers, "relocationLetBefore" | "previousTenantLeftAt">, now = new Date()) {
  if (answers.relocationLetBefore === false) return "first" as const;
  if (answers.relocationLetBefore !== true) return null;
  const leftAt = toDate(answers.previousTenantLeftAt);
  if (!leftAt) return null;
  return leftAt <= monthsBefore(now, VACANCY_MONTHS) ? ("vacant" as const) : ("relet" as const);
}

export const PROOF_LABELS: Record<string, { label: string; hint: string }> = {
  PREVIOUS_RENT_PROOF: {
    label: "Dernier loyer du locataire précédent",
    hint: "Dernière quittance ou avis d'échéance, ou ancien bail avec la dernière révision.",
  },
  PREVIOUS_TENANT_EXIT_PROOF: {
    label: "Date de départ du locataire précédent",
    hint: "État des lieux de sortie, ou lettre de congé avec la date de remise des clés.",
  },
  WORKS_INVOICES: {
    label: "Factures des travaux",
    hint: "Factures TTC des travaux d'amélioration ou de mise en conformité.",
  },
  RENT_REFERENCES: {
    label: "Loyers de logements comparables",
    hint: "Au moins 3 loyers de logements comparables du voisinage (annonces, observatoire des loyers, agence).",
  },
};

/**
 * Justificatifs à demander au propriétaire selon ses réponses. Ils ne bloquent pas le formulaire :
 * l'équipe les réclame avant l'envoi au notaire.
 */
export function relocationProofKinds(answers: RelocationAnswers, dpeClass: string | null | undefined, now = new Date()): string[] {
  // Déjà loué sans date de départ (inutile au calcul) : on demande les pièces d'une relocation.
  const situation = relocationSituation(answers, now) ?? (answers.relocationLetBefore === true ? ("relet" as const) : null);
  const frozen = isFrozenDpe(dpeClass);
  if (situation === "vacant") return frozen ? ["PREVIOUS_TENANT_EXIT_PROOF", "PREVIOUS_RENT_PROOF"] : ["PREVIOUS_TENANT_EXIT_PROOF"];
  if (situation !== "relet") return [];
  const kinds = ["PREVIOUS_RENT_PROOF"];
  if (!frozen && answers.rentIncreaseReason === "WORKS") kinds.push("WORKS_INVOICES");
  if (!frozen && answers.rentIncreaseReason === "UNDERVALUED") kinds.push("RENT_REFERENCES");
  return kinds;
}

export const euros = (value: number) =>
  `${value.toLocaleString("fr-FR", { minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }).replace(/[  ]/g, " ")} €`;

/** Détail du maximum à la relocation, en phrases (formulaire du propriétaire et fiche admin). */
export function relocationSummaryLines(relocation: RelocationAssessment): string[] {
  const lines: string[] = [];
  if (relocation.freeReason === "first") lines.push("Première location : le loyer est libre (dans la limite du plafond s'il y en a un).");
  if (relocation.freeReason === "vacant") lines.push(`Logement vide depuis ${VACANCY_MONTHS} mois ou plus : le loyer est libre (dans la limite du plafond s'il y en a un).`);
  if (relocation.previousRent && relocation.revisedRent != null && relocation.status !== "missing") {
    lines.push(
      relocation.irl.applied
        ? `Dernier loyer ${euros(relocation.previousRent)}, révisé selon l'IRL (+ ${((relocation.irl.rate ?? 0) * 100).toFixed(2).replace(".", ",")} %) : ${euros(relocation.revisedRent)}.`
        : `Dernier loyer : ${euros(relocation.previousRent)}.${relocation.irl.note ? ` ${relocation.irl.note}` : ""}`,
    );
  }
  if (relocation.increase) {
    lines.push(
      relocation.increase.accepted && relocation.increase.amount != null
        ? `${relocation.increase.note} Hausse permise : ${euros(relocation.increase.amount)} par mois.`
        : relocation.increase.note,
    );
  }
  if (relocation.maxRent != null && !relocation.provisional) lines.push(`Loyer maximum à la relocation : ${euros(relocation.maxRent)} hors charges.`);
  return lines;
}
