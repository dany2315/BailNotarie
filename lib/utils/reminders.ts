/**
 * Logique des relances d'un dossier : qui doit agir, pourquoi, et quand le
 * relancer. Fonctions pures, partagées par la fiche dossier, la liste des
 * dossiers et « À traiter ».
 *
 * Règles :
 * - une attente (formulaire propriétaire, locataire à indiquer, formulaire
 *   locataire) se relance 24 h après le début du statut, puis toutes les 48 h
 *   après le dernier contact (e-mail ou appel) ;
 * - après 2 contacts sans réaction, on propose d'appeler si l'on a le numéro ;
 *   sinon, pour le propriétaire : classer le dossier sans suite, pour le
 *   locataire : relancer le propriétaire à son sujet. Relancer encore par
 *   e-mail reste toujours possible ;
 * - un report (« le propriétaire cherche encore son locataire ») suspend les
 *   rappels jusqu'à sa date.
 */

export type ReminderTargetValue = "OWNER" | "TENANT";
export type ReminderReasonValue =
  | "OWNER_FORM"
  | "TENANT_TO_ADD"
  | "TENANT_FORM"
  | "TENANT_VIA_OWNER"
  | "MISSING_ITEMS"
  | "RENT_CAP";
export type ReminderChannelValue = "EMAIL" | "CALL" | "SNOOZE";

export const FIRST_REMINDER_DELAY_H = 24;
export const NEXT_REMINDER_DELAY_H = 48;
/** Au-delà de ce nombre de contacts sans réaction, on propose d'autres moyens. */
export const ESCALATE_AFTER = 2;

const HOUR = 3_600_000;

export const REASON_LABELS: Record<ReminderReasonValue, string> = {
  OWNER_FORM: "Terminer son formulaire",
  TENANT_TO_ADD: "Indiquer son locataire",
  TENANT_FORM: "Remplir son formulaire",
  TENANT_VIA_OWNER: "Faire remplir le formulaire à son locataire",
  MISSING_ITEMS: "Envoyer les éléments manquants",
  RENT_CAP: "Loyer au-dessus du plafond",
};

export const TARGET_LABELS: Record<ReminderTargetValue, string> = { OWNER: "Propriétaire", TENANT: "Locataire" };

export const CHANNEL_LABELS: Record<ReminderChannelValue, string> = {
  EMAIL: "E-mail",
  CALL: "Appel",
  SNOOZE: "Report",
};

export interface ReminderRecord {
  target: ReminderTargetValue;
  reason: ReminderReasonValue;
  channel: ReminderChannelValue;
  createdAt: Date | string;
  snoozeUntil?: Date | string | null;
}

export interface ReminderParty {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface ReminderContext {
  status: string;
  /** Début du statut actuel (dernier changement de statut, ou création du dossier). */
  statusSince: Date | string;
  owner: ReminderParty | null;
  tenant: ReminderParty | null;
  /** Le formulaire du locataire pour ce dossier a-t-il été soumis ? */
  tenantFormSubmitted: boolean;
  reminders: ReminderRecord[];
  now?: Date;
}

export interface ReminderNeed {
  target: ReminderTargetValue;
  reason: ReminderReasonValue;
  party: ReminderParty;
  /** Contacts (e-mails et appels) depuis le début du statut. */
  contacts: number;
  lastContactAt: string | null;
  /** Date à partir de laquelle une relance est conseillée. */
  dueAt: string;
  due: boolean;
  snoozedUntil: string | null;
  /** Après {@link ESCALATE_AFTER} contacts sans réaction. */
  escalated: boolean;
  /** Options proposées une fois l'escalade atteinte. */
  canCall: boolean;
  suggestClassify: boolean;
  suggestViaOwner: boolean;
}

/** Ce qui est attendu de qui, d'après le statut du dossier. */
export function waitingReasons(ctx: Pick<ReminderContext, "status" | "owner" | "tenant" | "tenantFormSubmitted">) {
  const list: Array<{ target: ReminderTargetValue; reason: ReminderReasonValue; party: ReminderParty }> = [];
  if (ctx.status === "DRAFT" && ctx.owner) list.push({ target: "OWNER", reason: "OWNER_FORM", party: ctx.owner });
  if (ctx.status === "AWAITING_TENANT" && !ctx.tenant && ctx.owner) {
    list.push({ target: "OWNER", reason: "TENANT_TO_ADD", party: ctx.owner });
  }
  if ((ctx.status === "AWAITING_TENANT" || ctx.status === "AWAITING_TENANT_FORM") && ctx.tenant && !ctx.tenantFormSubmitted) {
    list.push({ target: "TENANT", reason: "TENANT_FORM", party: ctx.tenant });
  }
  return list;
}

/** Les relances à prévoir pour un dossier, avec leur échéance. */
export function computeReminderNeeds(ctx: ReminderContext): ReminderNeed[] {
  const now = ctx.now ?? new Date();
  const since = new Date(ctx.statusSince);

  return waitingReasons(ctx).map(({ target, reason, party }) => {
    const related = ctx.reminders.filter((r) => new Date(r.createdAt) >= since && r.target === target && r.reason === reason);
    const contactsList = related.filter((r) => r.channel !== "SNOOZE");
    // Le propriétaire relancé au sujet de son locataire (enregistré côté propriétaire)
    // repousse aussi la prochaine relance du locataire.
    const viaOwner =
      reason === "TENANT_FORM"
        ? ctx.reminders.filter((r) => new Date(r.createdAt) >= since && r.reason === "TENANT_VIA_OWNER" && r.channel !== "SNOOZE")
        : [];
    const contacts = [...contactsList, ...viaOwner].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const last = contacts[0] ? new Date(contacts[0].createdAt) : null;
    const snooze = related
      .filter((r) => r.channel === "SNOOZE" && r.snoozeUntil)
      .map((r) => new Date(r.snoozeUntil as Date))
      .sort((a, b) => +b - +a)[0];

    let dueAt = last ? new Date(+last + NEXT_REMINDER_DELAY_H * HOUR) : new Date(+since + FIRST_REMINDER_DELAY_H * HOUR);
    if (snooze && snooze > dueAt) dueAt = snooze;
    const escalated = contactsList.length >= ESCALATE_AFTER;

    return {
      target,
      reason,
      party,
      contacts: contactsList.length,
      lastContactAt: last ? last.toISOString() : null,
      dueAt: dueAt.toISOString(),
      due: dueAt <= now,
      snoozedUntil: snooze && snooze > now ? snooze.toISOString() : null,
      escalated,
      canCall: !!party.phone,
      suggestClassify: escalated && target === "OWNER" && !party.phone,
      suggestViaOwner: escalated && target === "TENANT" && !party.phone,
    };
  });
}

/** Libellé de l'action de relance, pour la file et la liste des dossiers. */
export function reminderActionLabel(needs: ReminderNeed[]): string | null {
  const due = needs.filter((n) => n.due);
  if (due.length === 0) return null;
  const targets = new Set(due.map((n) => n.target));
  if (targets.size > 1) return "Relancer propriétaire et locataire";
  const need = due[0];
  const who = need.target === "OWNER" ? "le propriétaire" : "le locataire";
  if (need.escalated && need.canCall) return `Appeler ${who}`;
  if (need.suggestClassify) return "Relancer ou classer sans suite";
  if (need.suggestViaOwner) return "Relancer via le propriétaire";
  return `Relancer ${who}`;
}

/** « 1re relance », « 2e relance », « 3e relance »… */
export function reminderRank(contacts: number): string {
  const n = contacts + 1;
  return n === 1 ? "1re relance" : `${n}e relance`;
}

/** Début du statut actuel : dernier passage dans ce statut, ou création du dossier. */
export function statusSinceFrom(
  status: string,
  createdAt: Date | string,
  auditLogs: Array<{ eventType: string; toStatus?: string | null; createdAt: Date | string }>,
): Date {
  const entered = auditLogs
    .filter((log) => log.eventType === "STATUS_CHANGED" && log.toStatus === status)
    .map((log) => new Date(log.createdAt))
    .sort((a, b) => +b - +a)[0];
  return entered ?? new Date(createdAt);
}
