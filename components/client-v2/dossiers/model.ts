import { BailType, CompletionStatus } from "@prisma/client";
import { calculateBailEndDate } from "@/lib/utils/calculateBailEndDate";
import { TERMINAL_STATUSES } from "../owner-bail-card";
import type { Tone } from "../owner-ui";

/* =========================================================================
   Le modèle commun aux quatre compositions de « Mes dossiers ».

   Types, règles métier et libellés vivent ici, une seule fois : quelle que
   soit la mise en page retenue, ce sont les mêmes calculs qui la nourrissent.
   ========================================================================= */

export type BailOfProperty = {
  id: string;
  status: string;
  effectiveDate: string | null;
  endDate: string | null;
  rentAmount?: number | null;
  bailType?: string | null;
  bailFamily?: string | null;
  paidAt?: string | null;
  parties?: Array<{
    id: string;
    profilType: string;
    persons?: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
    entreprise?: { legalName: string | null; name: string | null } | null;
  }>;
  dossierAssignments?: Array<{
    id: string;
    notaire: { id: string; name: string | null; email: string | null } | null;
  }>;
  intakes?: Array<{ id: string; token: string; status: string }>;
};

export type PropertyWithBails = {
  id: string;
  label: string | null;
  fullAddress: string | null;
  status: string;
  completionStatus: CompletionStatus | string;
  surfaceM2: number | null;
  type?: string | null;
  createdAt: string;
  updatedAt: string;
  bails: BailOfProperty[];
};

export type Locataire = {
  id: string;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
  entreprise: { legalName: string; name: string; email: string | null } | null;
};

/* L'état de complétude d'un bien n'apparaît que lorsqu'il appelle quelque
   chose. Un bien complet n'a pas besoin d'une pastille verte pour le dire. */
export const COMPLETION_VIEW: Record<string, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: "Infos à compléter", tone: "amber" },
  PARTIAL: { label: "Infos à compléter", tone: "amber" },
  PENDING_CHECK: { label: "Infos en vérification", tone: "blue" },
};

/**
 * Un bien n'accepte un nouveau bail que si aucun bail actif ne court encore,
 * ou si tous arrivent à échéance dans moins d'un mois. Règle d'origine ; on
 * renvoie en plus la date à partir de laquelle ce sera possible, pour la dire
 * au propriétaire au lieu de le laisser deviner.
 */
export function newBailAvailability(bails: BailOfProperty[]): { allowed: boolean; from: Date | null } {
  const activeBails = bails.filter((bail) => !TERMINAL_STATUSES.includes(bail.status));
  if (activeBails.length === 0) return { allowed: true, from: null };

  let latestUnlock: Date | null = null;
  let allowed = true;

  for (const bail of activeBails) {
    const endDate = bail.endDate
      ? new Date(bail.endDate)
      : bail.effectiveDate && bail.bailType
        ? calculateBailEndDate(new Date(bail.effectiveDate), bail.bailType as BailType)
        : null;

    // Sans date de fin connue, on ne peut pas ouvrir : règle d'origine.
    if (!endDate) return { allowed: false, from: null };

    const oneMonthBefore = new Date(endDate);
    oneMonthBefore.setMonth(oneMonthBefore.getMonth() - 1);
    if (new Date() < oneMonthBefore) allowed = false;
    if (!latestUnlock || oneMonthBefore > latestUnlock) latestUnlock = oneMonthBefore;
  }

  return { allowed, from: allowed ? null : latestUnlock };
}

export function propertyTitle(bien: PropertyWithBails) {
  return bien.label || bien.fullAddress?.split(",")[0] || "Bien sans adresse";
}

/** Le brouillon non payé d'un bien : le seul « bail » qui n'en est pas encore un. */
export function findDraft(bails: BailOfProperty[]) {
  return bails.find((bail) => bail.status === "DRAFT" && !bail.paidAt) ?? null;
}

export function visibleBails(bails: BailOfProperty[]) {
  return bails.filter((bail) => !(bail.status === "DRAFT" && !bail.paidAt));
}

export function draftHref(draft: BailOfProperty) {
  return draft.intakes?.[0]
    ? `/intakes/${draft.intakes[0].token}`
    : `/client/proprietaire/baux/new?draftId=${draft.id}`;
}

/** Les trois familles d'avancement, pour la composition « par étape ». */
export type StageKey = "todo" | "running" | "done";

export function stageOf(status: string): StageKey {
  if (status === "AWAITING_TENANT" || status === "DRAFT") return "todo";
  if (TERMINAL_STATUSES.includes(status) || status === "SIGNED") return "done";
  return "running";
}

export const STAGE_VIEW: Record<StageKey, { title: string; hint: string }> = {
  todo: { title: "À traiter", hint: "Ces dossiers attendent quelque chose de vous" },
  running: { title: "En cours", hint: "Chez nous ou chez le notaire — rien à faire" },
  done: { title: "Terminés", hint: "Signés ou clos" },
};
