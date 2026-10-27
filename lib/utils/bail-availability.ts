import type { BailType } from "@prisma/client";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";

/** Dossiers terminés ou abandonnés : ils n'empêchent jamais un nouveau bail. */
export const TERMINAL_BAIL_STATUSES = ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"];

/** Un nouveau bail se prépare au plus tôt ce nombre de mois avant la fin du bail signé en cours. */
export const NEW_BAIL_LEAD_MONTHS = 1;

export type BailForAvailability = {
  id: string;
  status: string;
  paidAt?: Date | string | null;
  endDate?: Date | string | null;
  effectiveDate?: Date | string | null;
  bailType?: string | null;
};

export type NewBailAvailability =
  | { allowed: true }
  /** Un dossier est déjà en cours de constitution sur ce bien. */
  | { allowed: false; reason: "in_progress"; bailId: string }
  /** Un bail signé court encore : nouveau bail possible à partir de availableFrom. */
  | { allowed: false; reason: "signed"; bailId: string; endDate: Date; availableFrom: Date };

/**
 * Un propriétaire peut-il préparer un nouveau bail sur ce bien ?
 * Non s'il y a déjà un dossier en cours, ni avant le dernier mois d'un bail signé.
 * Un brouillon impayé ne compte pas (comme dans « Mes dossiers »).
 */
export function newBailAvailability(
  bails: BailForAvailability[],
  options: { excludeBailId?: string | null; now?: Date } = {},
): NewBailAvailability {
  const now = options.now ?? new Date();
  const active = bails.filter(
    (b) =>
      b.id !== options.excludeBailId &&
      !TERMINAL_BAIL_STATUSES.includes(b.status) &&
      !(b.status === "DRAFT" && !b.paidAt),
  );

  const inProgress = active.find((b) => b.status !== "SIGNED");
  if (inProgress) return { allowed: false, reason: "in_progress", bailId: inProgress.id };

  // Plusieurs baux signés (cas rare) : c'est le dernier à se libérer qui compte.
  let blocking: Extract<NewBailAvailability, { reason: "signed" }> | null = null;
  for (const bail of active) {
    const endDate = bail.endDate
      ? new Date(bail.endDate)
      : bail.effectiveDate && bail.bailType
        ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
        : null;
    // Bail signé sans date de fin connue : on ne peut pas savoir quand il se libère.
    if (!endDate) return { allowed: false, reason: "in_progress", bailId: bail.id };
    const availableFrom = new Date(endDate);
    availableFrom.setMonth(availableFrom.getMonth() - NEW_BAIL_LEAD_MONTHS);
    if (now < availableFrom && (!blocking || availableFrom > blocking.availableFrom)) {
      blocking = { allowed: false, reason: "signed", bailId: bail.id, endDate, availableFrom };
    }
  }
  return blocking ?? { allowed: true };
}

const dateFr = (date: Date) => date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Explication courte pour le propriétaire, ou null si un nouveau bail est possible. */
export function newBailBlockedMessage(availability: NewBailAvailability): string | null {
  if (availability.allowed) return null;
  if (availability.reason === "in_progress") {
    return "Un dossier est déjà en cours sur ce bien : un nouveau bail sera possible une fois ce dossier terminé.";
  }
  return `Bail en cours jusqu'au ${dateFr(availability.endDate)} : un nouveau bail sera possible à partir du ${dateFr(availability.availableFrom)}.`;
}
