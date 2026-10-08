/**
 * Étapes d'un dossier et prochaine action, pour l'espace administrateur.
 *
 * Les dix statuts de bail restent ceux de la base : cette couche ne fait que
 * les regrouper en six étapes lisibles et dire, pour chacun, qui doit agir et
 * quoi faire. Aucune donnée n'est modifiée ici.
 *
 * Statuts en chaînes plutôt qu'avec l'enum Prisma : le fichier est aussi
 * importé par des composants client, qui n'ont pas à embarquer @prisma/client.
 */

export type BailStatusValue =
  | "DRAFT"
  | "AWAITING_TENANT"
  | "AWAITING_TENANT_FORM"
  | "PENDING_VALIDATION"
  | "READY_FOR_NOTARY"
  | "CLIENT_CONTACTED"
  | "SIGNED"
  | "TERMINATED"
  | "DESISTE"
  | "CLASSE_SANS_SUITE";

export type StageKey = "constitution" | "attente_locataire" | "verification" | "notaire" | "signe" | "clos";

export const STAGES: Record<StageKey, { label: string; hint: string; className: string; statuses: BailStatusValue[] }> = {
  constitution: {
    label: "Constitution",
    hint: "Brouillons, pas encore soumis",
    className: "bg-amber-100 text-amber-900",
    statuses: ["DRAFT"],
  },
  attente_locataire: {
    label: "Attente locataire",
    hint: "Dossier soumis, locataire à venir",
    className: "bg-orange-100 text-orange-900",
    statuses: ["AWAITING_TENANT", "AWAITING_TENANT_FORM"],
  },
  verification: {
    label: "Vérification",
    hint: "À vérifier par nous",
    className: "bg-blue-100 text-blue-900",
    statuses: ["PENDING_VALIDATION"],
  },
  notaire: {
    label: "Notaire",
    hint: "Assignation, rendez-vous",
    className: "bg-violet-100 text-violet-900",
    statuses: ["READY_FOR_NOTARY", "CLIENT_CONTACTED"],
  },
  signe: {
    label: "Signé",
    hint: "Baux en cours",
    className: "bg-green-100 text-green-900",
    statuses: ["SIGNED"],
  },
  clos: {
    label: "Clos",
    hint: "Terminés, désistés, sans suite",
    className: "bg-slate-100 text-slate-700",
    statuses: ["TERMINATED", "DESISTE", "CLASSE_SANS_SUITE"],
  },
};

export const STAGE_ORDER: StageKey[] = ["constitution", "attente_locataire", "verification", "notaire", "signe", "clos"];

/** Libellés des statuts, identiques à ceux déjà affichés dans l'interface. */
export const STATUS_LABELS: Record<BailStatusValue, string> = {
  DRAFT: "Brouillon",
  AWAITING_TENANT: "En attente du locataire",
  AWAITING_TENANT_FORM: "Formulaire locataire en attente",
  PENDING_VALIDATION: "En cours de validation",
  READY_FOR_NOTARY: "Prêt pour notaire",
  CLIENT_CONTACTED: "Client contacté",
  SIGNED: "Signé",
  TERMINATED: "Terminé",
  DESISTE: "Désisté",
  CLASSE_SANS_SUITE: "Classé sans suite",
};

export function getStageKey(status: string): StageKey {
  for (const key of STAGE_ORDER) {
    if (STAGES[key].statuses.includes(status as BailStatusValue)) return key;
  }
  return "constitution";
}

export function getStage(status: string) {
  const key = getStageKey(status);
  return { key, ...STAGES[key] };
}

/** Qui doit agir pour que le dossier avance. */
export type Actor = "nous" | "proprietaire" | "locataire" | "client" | "notaire" | "personne";

export const ACTOR_LABELS: Record<Actor, string> = {
  nous: "À faire par nous",
  proprietaire: "Propriétaire",
  locataire: "Locataire",
  client: "Client",
  notaire: "Notaire",
  personne: "—",
};

export interface NextActionInput {
  status: string;
  hasTenant: boolean;
  hasNotaire: boolean;
  pendingNotaireRequests?: number;
}

export interface NextAction {
  label: string;
  actor: Actor;
  /** Le bouton principal de la ligne doit-il être mis en avant ? */
  primary: boolean;
}

/** La prochaine action d'un dossier, déduite de son statut. */
export function getNextAction({ status, hasTenant, hasNotaire, pendingNotaireRequests = 0 }: NextActionInput): NextAction {
  switch (status) {
    case "DRAFT":
      return { label: "Relancer le propriétaire", actor: "proprietaire", primary: false };
    case "AWAITING_TENANT":
      return hasTenant
        ? { label: "Envoyer le formulaire au locataire", actor: "nous", primary: true }
        : { label: "Ajouter le locataire", actor: "proprietaire", primary: true };
    case "AWAITING_TENANT_FORM":
      return { label: "Relancer le locataire", actor: "locataire", primary: false };
    case "PENDING_VALIDATION":
      return { label: "Vérifier le dossier", actor: "nous", primary: true };
    case "READY_FOR_NOTARY":
      if (!hasNotaire) return { label: "Assigner un notaire", actor: "nous", primary: true };
      return pendingNotaireRequests > 0
        ? { label: "Demande du notaire en attente", actor: "client", primary: false }
        : { label: "Suivre chez le notaire", actor: "notaire", primary: false };
    case "CLIENT_CONTACTED":
      return pendingNotaireRequests > 0
        ? { label: "Demande du notaire en attente", actor: "client", primary: false }
        : { label: "Rendez-vous de signature", actor: "notaire", primary: false };
    case "SIGNED":
    case "TERMINATED":
    case "DESISTE":
    case "CLASSE_SANS_SUITE":
    default:
      return { label: "Aucune", actor: "personne", primary: false };
  }
}

/**
 * Dernière activité connue d'un dossier : la plus récente entre sa date de
 * modification et son dernier événement d'historique.
 */
export function getLastActivity(updatedAt: Date | string, lastAuditAt?: Date | string | null): Date {
  const updated = new Date(updatedAt);
  if (!lastAuditAt) return updated;
  const audit = new Date(lastAuditAt);
  return audit > updated ? audit : updated;
}

/** Nombre de jours entiers écoulés depuis une date. */
export function daysSince(date: Date | string, now: Date = new Date()): number {
  const ms = now.getTime() - new Date(date).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Au-delà de ce délai sans évolution, un dossier en cours est signalé. */
export const STALE_AFTER_DAYS = 7;

/** Les étapes où l'attente a un sens (un bail signé ou clos n'attend rien). */
export function isActiveStage(key: StageKey): boolean {
  return key !== "signe" && key !== "clos";
}
