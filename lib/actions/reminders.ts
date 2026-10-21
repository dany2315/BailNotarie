"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { BailStatus, IntakeStatus, ReminderChannel, ReminderReason, ReminderTarget, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { resendSendEmail } from "@/lib/resend-rate-limited";
import MailRelance from "@/emails/mail-relance";
import { getBailMissingData, transitionLease } from "@/lib/actions/leases";
import { getActorName, getClientDisplayName } from "@/lib/actions/bail-audit-log";
import { describeMissingItems } from "@/lib/utils/missing-items";
import { assessRentCap, rentCapOverLines } from "@/lib/rent-cap";
import { documentKindLabels } from "@/lib/utils/document-labels";
import {
  computeReminderNeeds,
  statusSinceFrom,
  type ReminderNeed,
  type ReminderParty,
  type ReminderReasonValue,
  type ReminderTargetValue,
} from "@/lib/utils/reminders";

type Fail = { success: false; error: string };

const BASE_URL = () => process.env.NEXT_PUBLIC_URL || "http://localhost:3000";

const SUBJECTS: Record<ReminderReasonValue, string> = {
  OWNER_FORM: "Votre dossier de bail notarié n'est pas terminé",
  TENANT_TO_ADD: "Votre bail notarié : indiquez-nous votre locataire",
  TENANT_FORM: "Votre formulaire locataire est en attente",
  TENANT_VIA_OWNER: "Votre locataire n'a pas encore rempli son formulaire",
  MISSING_ITEMS: "Votre bail notarié : éléments manquants",
  RENT_CAP: "Votre bail notarié : loyer au-dessus du plafond",
};

const BAIL_FIELD_LABELS: Record<string, string> = {
  rentAmount: "Loyer",
  effectiveDate: "Date de prise d'effet",
  paymentDay: "Jour de paiement",
  securityDeposit: "Dépôt de garantie",
};

/* ------------------------------------------------------------------ */
/* Lecture du dossier                                                   */
/* ------------------------------------------------------------------ */

const partySelect = {
  id: true,
  type: true,
  profilType: true,
  persons: {
    orderBy: { isPrimary: "desc" as const },
    take: 1,
    select: { firstName: true, lastName: true, email: true, phone: true },
  },
  entreprise: { select: { legalName: true, name: true, email: true, phone: true } },
};

type PartyRow = {
  id: string;
  type: string;
  profilType: string;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null; phone: string | null }>;
  entreprise: { legalName: string | null; name: string | null; email: string | null; phone: string | null } | null;
};

function toParty(row: PartyRow | undefined): ReminderParty | null {
  if (!row) return null;
  const person = row.persons[0];
  const isCompany = row.type === "PERSONNE_MORALE";
  return {
    id: row.id,
    name: getClientDisplayName(row as any) || (row.profilType === "LOCATAIRE" ? "Locataire" : "Propriétaire"),
    email: (isCompany ? row.entreprise?.email : person?.email) || null,
    phone: (isCompany ? row.entreprise?.phone : person?.phone) || person?.phone || null,
  };
}

async function loadBail(bailId: string) {
  return prisma.bail.findUnique({
    where: { id: bailId },
    select: {
      id: true,
      status: true,
      createdAt: true,
      propertyId: true,
      property: { select: { label: true, fullAddress: true } },
      parties: { select: partySelect },
      intakes: { select: { id: true, token: true, target: true, clientId: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      auditLogs: { where: { eventType: "STATUS_CHANGED" }, select: { eventType: true, toStatus: true, createdAt: true } },
      reminders: { orderBy: { createdAt: "desc" } },
    },
  });
}

type LoadedBail = NonNullable<Awaited<ReturnType<typeof loadBail>>>;

function contextOf(bail: LoadedBail) {
  const owner = toParty(bail.parties.find((p) => p.profilType === "PROPRIETAIRE") as PartyRow | undefined);
  const tenant = toParty(bail.parties.find((p) => p.profilType === "LOCATAIRE") as PartyRow | undefined);
  const tenantFormSubmitted = !!tenant && bail.intakes.some((i) => i.target === "TENANT" && i.clientId === tenant.id && i.status === IntakeStatus.SUBMITTED);
  return {
    owner,
    tenant,
    tenantFormSubmitted,
    needs: computeReminderNeeds({
      status: bail.status,
      statusSince: statusSinceFrom(bail.status, bail.createdAt, bail.auditLogs),
      owner,
      tenant,
      tenantFormSubmitted,
      reminders: bail.reminders,
    }),
  };
}

/** Éléments encore manquants, par personne (pour une relance manuelle après soumission). */
async function missingByTarget(bailId: string): Promise<Record<ReminderTargetValue, string[]>> {
  const missing = await getBailMissingData(bailId);
  if (!missing) return { OWNER: [], TENANT: [] };
  const ownerExtras = [
    ...missing.bail.missingFields.filter((f) => BAIL_FIELD_LABELS[f]).map((f) => BAIL_FIELD_LABELS[f]),
    ...(missing.property?.missingFields || []).map((f) => (f === "fullAddress" ? "Adresse du bien" : f)),
    ...(missing.property?.missingDocuments || []).map((k) => documentKindLabels[k] || k),
  ];
  return {
    OWNER: Array.from(new Set([...describeMissingItems(missing.owner), ...ownerExtras])),
    TENANT: describeMissingItems(missing.tenant),
  };
}

export interface ReminderHistoryItem {
  id: string;
  target: ReminderTargetValue;
  reason: ReminderReasonValue;
  channel: "EMAIL" | "CALL" | "SNOOZE";
  recipientEmail: string | null;
  note: string | null;
  items: string[];
  snoozeUntil: string | null;
  createdAt: string;
  createdByName: string | null;
}

export interface ReminderPanel {
  bailId: string;
  status: string;
  address: string;
  owner: ReminderParty | null;
  tenant: ReminderParty | null;
  needs: ReminderNeed[];
  /** Éléments manquants par personne : relance manuelle uniquement. */
  missing: Record<ReminderTargetValue, string[]>;
  history: ReminderHistoryItem[];
}

function toHistory(r: LoadedBail["reminders"][number]): ReminderHistoryItem {
  return {
    id: r.id,
    target: r.target,
    reason: r.reason,
    channel: r.channel,
    recipientEmail: r.recipientEmail,
    note: r.note,
    items: Array.isArray(r.items) ? (r.items as string[]) : [],
    snoozeUntil: r.snoozeUntil ? r.snoozeUntil.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdByName,
  };
}

/** Tout ce qu'il faut pour relancer depuis la fiche, la liste ou « À traiter ». */
export async function getReminderPanel(bailId: string): Promise<{ success: true; data: ReminderPanel } | Fail> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = z.string().min(1).safeParse(bailId);
  if (!parsed.success) return { success: false, error: "Dossier invalide" };
  const bail = await loadBail(parsed.data);
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const ctx = contextOf(bail);
  return {
    success: true,
    data: {
      bailId: bail.id,
      status: bail.status,
      address: bail.property?.fullAddress || bail.property?.label || "votre logement",
      owner: ctx.owner,
      tenant: ctx.tenant,
      needs: ctx.needs,
      missing: await missingByTarget(bail.id),
      history: bail.reminders.map(toHistory),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Envoi                                                                */
/* ------------------------------------------------------------------ */

const sendSchema = z.object({
  bailId: z.string().min(1),
  sends: z
    .array(z.object({ target: z.nativeEnum(ReminderTarget), reason: z.nativeEnum(ReminderReason) }))
    .min(1, "Choisissez au moins une personne")
    .max(4),
  note: z.string().trim().max(1000).optional(),
});

/** Lien de formulaire en attente pour cette personne et ce dossier (créé pour le locataire si besoin). */
async function pendingIntakeUrl(bail: LoadedBail, target: "OWNER" | "TENANT", clientId: string, userId: string) {
  let link = bail.intakes.find((i) => i.target === target && i.clientId === clientId && i.status === IntakeStatus.PENDING);
  // Formulaire propriétaire lancé avant la création du dossier : lien rattaché au client.
  if (!link && target === "OWNER") {
    const ownerLink = await prisma.intakeLink.findFirst({
      where: { target: "OWNER", clientId, status: IntakeStatus.PENDING },
      orderBy: { createdAt: "desc" },
      select: { id: true, token: true, target: true, clientId: true, status: true, createdAt: true },
    });
    link = ownerLink ?? undefined;
  }
  if (!link && target === "TENANT") {
    link = await prisma.intakeLink.create({
      data: { target: "TENANT", clientId, bailId: bail.id, createdById: userId, propertyId: bail.propertyId },
      select: { id: true, token: true, target: true, clientId: true, status: true, createdAt: true },
    });
  }
  return link ? { id: link.id, url: `${BASE_URL()}/intakes/${link.token}` } : null;
}

/**
 * Relance par e-mail, envoyée par l'application et tracée. Chaque envoi
 * précise à qui et pourquoi ; l'échec d'un envoi n'empêche pas les autres.
 */
export async function sendBailReminders(
  data: unknown,
): Promise<{ success: true; data: { sent: Array<{ target: string; email: string }>; failed: Array<{ target: string; error: string }> } } | Fail> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = sendSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || "Données invalides" };
  const { bailId, sends, note } = parsed.data;

  const bail = await loadBail(bailId);
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const { owner, tenant } = contextOf(bail);
  const address = bail.property?.fullAddress || bail.property?.label || "votre logement";
  const missing = sends.some((s) => s.reason === "MISSING_ITEMS") ? await missingByTarget(bailId) : null;
  const rentCapItems = sends.some((s) => s.reason === "RENT_CAP") ? await rentCapLines(bailId) : null;

  const sent: Array<{ target: string; email: string }> = [];
  const failed: Array<{ target: string; error: string }> = [];

  for (const { target, reason } of sends) {
    const label = target === "OWNER" ? "Propriétaire" : "Locataire";
    // Relance au sujet du locataire : c'est le propriétaire qui la reçoit.
    const party = reason === "TENANT_VIA_OWNER" ? owner : target === "OWNER" ? owner : tenant;
    const coherent =
      (reason === "OWNER_FORM" && target === "OWNER") ||
      (reason === "TENANT_TO_ADD" && target === "OWNER") ||
      (reason === "TENANT_FORM" && target === "TENANT") ||
      (reason === "TENANT_VIA_OWNER" && target === "OWNER") ||
      (reason === "RENT_CAP" && target === "OWNER") ||
      reason === "MISSING_ITEMS";
    if (!coherent) {
      failed.push({ target: label, error: "Relance non prévue" });
      continue;
    }
    if (!party) {
      failed.push({ target: label, error: `${label} absent du dossier` });
      continue;
    }
    if (!party.email) {
      failed.push({ target: label, error: `${party.name} n'a pas d'adresse e-mail` });
      continue;
    }

    let actionUrl = `${BASE_URL()}/client`;
    let intakeId: string | null = null;
    let items: string[] = [];
    if (reason === "OWNER_FORM" || reason === "TENANT_FORM") {
      const intake = await pendingIntakeUrl(bail, reason === "OWNER_FORM" ? "OWNER" : "TENANT", party.id, user.id);
      if (intake) {
        actionUrl = intake.url;
        intakeId = intake.id;
      }
    } else if (reason === "TENANT_TO_ADD" || reason === "TENANT_VIA_OWNER" || reason === "RENT_CAP" || (reason === "MISSING_ITEMS" && target === "OWNER")) {
      actionUrl = `${BASE_URL()}/client/proprietaire/baux/${bailId}`;
    } else if (reason === "MISSING_ITEMS") {
      actionUrl = `${BASE_URL()}/client/locataire/baux/${bailId}`;
    }
    if (reason === "RENT_CAP") {
      if (!rentCapItems) {
        failed.push({ target: label, error: "Le loyer ne dépasse pas le plafond" });
        continue;
      }
      items = rentCapItems;
    }
    if (reason === "MISSING_ITEMS") {
      items = missing?.[target] || [];
      if (items.length === 0) {
        failed.push({ target: label, error: `Rien ne manque pour ${party.name}` });
        continue;
      }
    }

    try {
      const result = await resendSendEmail({
        from: "BailNotarie – Équipe <contact@bailnotarie.fr>",
        to: party.email,
        subject: SUBJECTS[reason],
        react: MailRelance({
          reason,
          name: party.name,
          address,
          actionUrl,
          items,
          tenantName: tenant?.name,
          note: note || undefined,
        }),
      });
      if (result.error) throw new Error(result.error.message);
    } catch (error: any) {
      console.error("[sendBailReminders]", error);
      failed.push({ target: label, error: `Envoi impossible à ${party.email}` });
      continue;
    }

    await prisma.bailReminder.create({
      data: {
        bailId,
        clientId: party.id,
        target: reason === "TENANT_VIA_OWNER" ? ReminderTarget.OWNER : target,
        reason,
        channel: ReminderChannel.EMAIL,
        recipientEmail: party.email,
        items: items.length ? items : undefined,
        note: note || null,
        createdById: user.id,
        createdByName: getActorName(user),
      },
    });
    // Le suivi des envois du formulaire (affiché dans le dossier) reste à jour.
    if (intakeId) {
      const now = new Date();
      await prisma.intakeLink.update({
        where: { id: intakeId },
        data: { formEmailCount: { increment: 1 }, lastFormEmailSentAt: now },
      });
      await prisma.intakeLink.updateMany({ where: { id: intakeId, formEmailSentAt: null }, data: { formEmailSentAt: now } });
    }
    sent.push({ target: label, email: party.email });
  }

  revalidateBail(bailId);
  return { success: true, data: { sent, failed } };
}

const contactSchema = z.object({
  bailId: z.string().min(1),
  target: z.nativeEnum(ReminderTarget),
  reason: z.nativeEnum(ReminderReason),
  note: z.string().trim().max(1000).optional(),
});

/** Appel passé par l'équipe : noté comme un contact, il repousse la prochaine relance de 48 h. */
export async function logBailCall(data: unknown): Promise<{ success: true } | Fail> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = contactSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { bailId, target, reason, note } = parsed.data;
  const bail = await prisma.bail.findUnique({ where: { id: bailId }, select: { parties: { select: { id: true, profilType: true } } } });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const party = bail.parties.find((p) => p.profilType === (target === "OWNER" ? "PROPRIETAIRE" : "LOCATAIRE"));
  await prisma.bailReminder.create({
    data: {
      bailId,
      clientId: party?.id,
      target,
      reason,
      channel: ReminderChannel.CALL,
      note: note || null,
      createdById: user.id,
      createdByName: getActorName(user),
    },
  });
  revalidateBail(bailId);
  return { success: true };
}

const snoozeSchema = contactSchema.extend({ days: z.union([z.literal(7), z.literal(14), z.literal(30)]) });

/** Reporte les rappels (ex. le propriétaire cherche encore son locataire). */
export async function snoozeBailReminder(data: unknown): Promise<{ success: true } | Fail> {
  const user = await requireRole([Role.ADMINISTRATEUR]);
  const parsed = snoozeSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const { bailId, target, reason, note, days } = parsed.data;
  const exists = await prisma.bail.findUnique({ where: { id: bailId }, select: { id: true } });
  if (!exists) return { success: false, error: "Dossier introuvable" };
  await prisma.bailReminder.create({
    data: {
      bailId,
      target,
      reason,
      channel: ReminderChannel.SNOOZE,
      snoozeUntil: new Date(Date.now() + days * 86_400_000),
      note: note || null,
      createdById: user.id,
      createdByName: getActorName(user),
    },
  });
  revalidateBail(bailId);
  return { success: true };
}

/** Proposé quand le propriétaire ne réagit plus : l'administrateur confirme lui-même. */
export async function classifyBailWithoutFollowUp(data: unknown): Promise<{ success: true } | Fail> {
  await requireRole([Role.ADMINISTRATEUR]);
  const parsed = z.object({ bailId: z.string().min(1) }).safeParse(data);
  if (!parsed.success) return { success: false, error: "Données invalides" };
  const bail = await prisma.bail.findUnique({ where: { id: parsed.data.bailId }, select: { status: true } });
  if (!bail) return { success: false, error: "Dossier introuvable" };
  const allowed: BailStatus[] = [BailStatus.DRAFT, BailStatus.AWAITING_TENANT, BailStatus.AWAITING_TENANT_FORM];
  if (!allowed.includes(bail.status)) return { success: false, error: "Ce dossier n'est plus en attente du client" };
  await transitionLease({ id: parsed.data.bailId, nextStatus: "CLASSE_SANS_SUITE" });
  revalidateBail(parsed.data.bailId);
  return { success: true };
}

/** Le détail du dépassement, pour l'e-mail au propriétaire (null si le loyer est conforme). */
async function rentCapLines(bailId: string): Promise<string[] | null> {
  const bail = await prisma.bail.findUnique({
    where: { id: bailId },
    select: {
      rentAmount: true,
      bailType: true,
      effectiveDate: true,
      rentSupplementReason: true,
      property: {
        select: {
          inseeCode: true,
          latitude: true,
          longitude: true,
          surfaceM2: true,
          type: true,
          mainRooms: true,
          constructionPeriod: true,
          rentCapZone: true,
        },
      },
    },
  });
  if (!bail?.property) return null;
  return rentCapOverLines(await assessRentCap({ property: bail.property, bail }));
}

function revalidateBail(bailId: string) {
  revalidatePath("/interface");
  revalidatePath("/interface/baux");
  revalidatePath(`/interface/baux/${bailId}`);
}
