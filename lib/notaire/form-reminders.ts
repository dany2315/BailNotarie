// Ce que le dossier attend encore des clients avant d'être prêt (formulaires, locataire à indiquer), vu par le
// notaire : il peut relancer lui-même. Seules ses propres relances sont comptées, jamais celles de l'équipe.
// Pas de "use server" : lecture appelée par les pages du notaire et par l'action d'envoi, après contrôle d'accès.

import { IntakeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActorName, getClientDisplayName, getClientGreetingName } from "@/lib/actions/bail-audit-log";
import { statusSinceFrom, waitingReasons, type ReminderParty, type ReminderReasonValue, type ReminderTargetValue } from "@/lib/utils/reminders";

/** Relances « formulaire » ouvertes au notaire (les autres restent à l'équipe). */
export const NOTAIRE_FORM_REASONS = ["OWNER_FORM", "TENANT_TO_ADD", "TENANT_FORM"] as const;
export type NotaireFormReason = (typeof NOTAIRE_FORM_REASONS)[number];

/** Une relance conseillée 2 jours après le début de l'attente ou la dernière relance du notaire. */
const REMIND_AFTER_H = 48;

export const FORM_REASON_LABELS: Record<NotaireFormReason, string> = {
  OWNER_FORM: "Terminer son formulaire",
  TENANT_TO_ADD: "Indiquer son locataire",
  TENANT_FORM: "Remplir son formulaire",
};

/**
 * « Maître Diallo » : le nom du notaire tel qu'on l'écrit au client, avec une majuscule à chaque mot et
 * sans doubler « Maître » s'il est déjà dans le nom du compte. Sans nom, null (jamais l'adresse e-mail).
 */
export function notaireTitle(name: string | null | undefined): string | null {
  const bare = (name ?? "")
    .trim()
    .replace(/^(ma[iî]tre|me)\.?\s+/i, "")
    .trim();
  if (!bare) return null;
  const capitalized = bare
    .split(/(\s+|-)/)
    .map((part) => (/^[a-zà-ÿ]/i.test(part) ? part.charAt(0).toLocaleUpperCase("fr-FR") + part.slice(1) : part))
    .join("");
  return `Maître ${capitalized}`;
}

/** Phrase ajoutée aux relances du notaire : c'est lui qui attend ce retour. */
export function notaireReminderLine(user: { name?: string | null; email?: string | null }) {
  const title = notaireTitle(user.name);
  return title
    ? `${title}, le notaire qui rédigera votre bail, attend ce retour pour avancer.`
    : "Le notaire qui rédigera votre bail attend ce retour pour avancer.";
}

export interface NotaireFormWait {
  bailId: string;
  /** Adresse du bien, comme dans l'e-mail. */
  address: string;
  /** Nom après « Bonjour », comme dans l'e-mail. */
  greetingName: string;
  /** Phrase du notaire ajoutée à l'e-mail. */
  notaryLine: string;
  /** Personne relancée. */
  target: ReminderTargetValue;
  reason: NotaireFormReason;
  /** « Remplir son formulaire ». */
  label: string;
  partyName: string;
  email: string | null;
  /** Début de l'attente (ISO). */
  since: string;
  /** Relances faites par ce notaire depuis le début de l'attente. */
  mine: number;
  myLastAt: string | null;
  due: boolean;
}

const partySelect = {
  id: true,
  type: true,
  profilType: true,
  persons: { orderBy: { isPrimary: "desc" as const }, take: 1, select: { firstName: true, lastName: true, email: true, phone: true } },
  entreprise: { select: { legalName: true, name: true, email: true, phone: true } },
};

function toParty(row: any): ReminderParty | null {
  if (!row) return null;
  const person = row.persons[0];
  const company = row.type === "PERSONNE_MORALE";
  return {
    id: row.id,
    name: getClientGreetingName(row) || getClientDisplayName(row) || (row.profilType === "LOCATAIRE" ? "Locataire" : "Propriétaire"),
    greetingName: getClientGreetingName(row),
    email: (company ? row.entreprise?.email : person?.email) || null,
    phone: (company ? row.entreprise?.phone : person?.phone) || person?.phone || null,
  };
}

/** Attentes des clients sur ces dossiers, avec les relances du notaire `userId`. */
export async function notaireFormWaits(bailIds: string[], userId: string): Promise<NotaireFormWait[]> {
  if (bailIds.length === 0) return [];
  const bails = await prisma.bail.findMany({
    where: { id: { in: bailIds }, status: { in: ["DRAFT", "AWAITING_TENANT", "AWAITING_TENANT_FORM"] } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      property: { select: { fullAddress: true, label: true } },
      parties: { select: partySelect },
      intakes: { select: { target: true, clientId: true, status: true } },
      auditLogs: { where: { eventType: "STATUS_CHANGED" }, select: { eventType: true, toStatus: true, createdAt: true } },
      reminders: { where: { createdById: userId, channel: "EMAIL" }, orderBy: { createdAt: "desc" }, select: { target: true, reason: true, createdAt: true } },
    },
  });
  const now = Date.now();
  const notary = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const notaryLine = notaireReminderLine(notary ?? {});
  const out: NotaireFormWait[] = [];
  for (const bail of bails) {
    const owner = toParty(bail.parties.find((p) => p.profilType === "PROPRIETAIRE"));
    const tenant = toParty(bail.parties.find((p) => p.profilType === "LOCATAIRE"));
    const tenantFormSubmitted = !!tenant && bail.intakes.some((i) => i.target === "TENANT" && i.clientId === tenant.id && i.status === IntakeStatus.SUBMITTED);
    const since = statusSinceFrom(bail.status, bail.createdAt, bail.auditLogs);
    for (const wait of waitingReasons({ status: bail.status, owner, tenant, tenantFormSubmitted })) {
      if (!(NOTAIRE_FORM_REASONS as readonly string[]).includes(wait.reason)) continue;
      const reason = wait.reason as NotaireFormReason;
      const mine = bail.reminders.filter((r) => r.target === wait.target && r.reason === (reason as ReminderReasonValue) && r.createdAt >= since);
      const last = Math.max(+since, mine[0] ? +mine[0].createdAt : 0);
      out.push({
        bailId: bail.id,
        address: bail.property?.fullAddress || bail.property?.label || "votre logement",
        greetingName: wait.party.greetingName || "",
        notaryLine,
        target: wait.target,
        reason,
        label: FORM_REASON_LABELS[reason],
        partyName: wait.party.name,
        email: wait.party.email,
        since: since.toISOString(),
        mine: mine.length,
        myLastAt: mine[0]?.createdAt.toISOString() ?? null,
        due: now - last >= REMIND_AFTER_H * 3_600_000,
      });
    }
  }
  return out;
}
