"use server";

import { BailStatus, NotaireRequestStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { daysSince, getLastActivity, getNextAction, type Actor } from "@/lib/utils/bail-stage";

/** Statuts où un dossier est encore en cours (ni signé, ni clos). */
const ACTIVE_STATUSES: BailStatus[] = [
  BailStatus.DRAFT,
  BailStatus.AWAITING_TENANT,
  BailStatus.AWAITING_TENANT_FORM,
  BailStatus.PENDING_VALIDATION,
  BailStatus.READY_FOR_NOTARY,
  BailStatus.CLIENT_CONTACTED,
];

const partySelect = {
  id: true,
  type: true,
  profilType: true,
  persons: {
    orderBy: { isPrimary: "desc" as const },
    take: 1,
    select: { firstName: true, lastName: true, email: true },
  },
  entreprise: { select: { legalName: true, name: true, email: true } },
};

type PartyLite = {
  type: string;
  profilType: string;
  persons: Array<{ firstName: string | null; lastName: string | null; email: string | null }>;
  entreprise: { legalName: string | null; name: string | null; email: string | null } | null;
};

function partyName(party: PartyLite | undefined | null): string | null {
  if (!party) return null;
  if (party.type === "PERSONNE_MORALE") {
    return party.entreprise?.legalName || party.entreprise?.name || party.entreprise?.email || null;
  }
  const person = party.persons[0];
  if (!person) return null;
  return `${person.firstName || ""} ${person.lastName || ""}`.trim() || person.email || null;
}

export interface QueueItem {
  id: string;
  address: string;
  bailType: string;
  status: string;
  ownerName: string | null;
  tenantName: string | null;
  paidAt: string | null;
  action: string;
  actor: Actor;
  primary: boolean;
  /** Précision affichée après l'action (formulaire envoyé, relancé, ouvert…). */
  detail: string | null;
  days: number;
}

export interface AdminDashboardData {
  statusCounts: Record<string, number>;
  unpaidCount: number;
  queue: QueueItem[];
  unpaid: Array<{ id: string; address: string; status: string; ownerName: string | null; days: number }>;
  notaireRequests: Array<{
    id: string;
    title: string;
    createdAt: string;
    notaireName: string;
    bailId: string | null;
    address: string | null;
  }>;
  receivedToday: Array<{ id: string; target: string; name: string | null; submittedAt: string; bailId: string | null }>;
}

const fmt = (date: Date) =>
  date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Résumé du suivi d'un formulaire envoyé : envoi, relances, ouverture. */
function formTrackingDetail(link: {
  formEmailSentAt: Date | null;
  formEmailCount: number;
  lastFormEmailSentAt: Date | null;
  firstOpenedAt: Date | null;
} | undefined): string | null {
  if (!link) return null;
  const firstSent = link.formEmailSentAt || link.lastFormEmailSentAt;
  // Les envois antérieurs au suivi n'ont pas été enregistrés : ne rien affirmer.
  if (!firstSent) return link.firstOpenedAt ? `envoi non enregistré · ouvert le ${fmt(link.firstOpenedAt)}` : "envoi non enregistré";
  const parts = [`envoyé le ${fmt(firstSent)}`];
  if (link.formEmailCount > 1 && link.lastFormEmailSentAt) {
    parts.push(`relancé ${link.formEmailCount - 1} fois (dernière le ${fmt(link.lastFormEmailSentAt)})`);
  }
  parts.push(link.firstOpenedAt ? `ouvert le ${fmt(link.firstOpenedAt)}` : "jamais ouvert");
  return parts.join(" · ");
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  await requireRole([Role.ADMINISTRATEUR]);

  // Minuit, heure de Paris (le serveur tourne en UTC).
  const now = new Date();
  const parisNow = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const parisMidnight = new Date(parisNow);
  parisMidnight.setHours(0, 0, 0, 0);
  const startOfToday = new Date(parisMidnight.getTime() - (parisNow.getTime() - now.getTime()));

  const [statusGroups, unpaidCount, activeBails, unpaidBails, requests, received, pendingRequestBails] = await Promise.all([
    prisma.bail.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.bail.count({ where: { paidAt: null, status: { in: ACTIVE_STATUSES } } }),
    prisma.bail.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      select: {
        id: true,
        status: true,
        bailType: true,
        paidAt: true,
        updatedAt: true,
        property: { select: { label: true, fullAddress: true } },
        parties: { select: partySelect },
        dossierAssignments: { select: { id: true }, take: 1 },
        auditLogs: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
        intakes: {
          where: { target: "TENANT", status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { formEmailSentAt: true, formEmailCount: true, lastFormEmailSentAt: true, firstOpenedAt: true },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 200,
    }),
    prisma.bail.findMany({
      where: { paidAt: null, status: { in: ACTIVE_STATUSES } },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        property: { select: { label: true, fullAddress: true } },
        parties: { select: partySelect },
      },
      orderBy: { updatedAt: "asc" },
      take: 6,
    }),
    prisma.notaireRequest.findMany({
      where: { status: NotaireRequestStatus.PENDING },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        createdAt: true,
        dossier: {
          select: {
            notaire: { select: { name: true, email: true } },
            bail: { select: { id: true, property: { select: { label: true, fullAddress: true } } } },
          },
        },
      },
    }),
    prisma.intakeLink.findMany({
      where: { submittedAt: { gte: startOfToday } },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        target: true,
        submittedAt: true,
        bailId: true,
        client: { select: partySelect },
      },
    }),
    // Toutes les demandes en attente (la liste ci-dessus est limitée à 8).
    prisma.notaireRequest.findMany({
      where: { status: NotaireRequestStatus.PENDING },
      select: { dossier: { select: { bailId: true } } },
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const g of statusGroups) statusCounts[g.status] = g._count._all;

  const pendingRequestsByBail = new Map<string, number>();
  for (const r of pendingRequestBails) {
    const bailId = r.dossier?.bailId;
    if (bailId) pendingRequestsByBail.set(bailId, (pendingRequestsByBail.get(bailId) || 0) + 1);
  }

  const queue: QueueItem[] = activeBails.map((bail) => {
    const owner = bail.parties.find((p) => p.profilType === "PROPRIETAIRE");
    const tenant = bail.parties.find((p) => p.profilType === "LOCATAIRE");
    const next = getNextAction({
      status: bail.status,
      hasTenant: !!tenant,
      hasNotaire: bail.dossierAssignments.length > 0,
      pendingNotaireRequests: pendingRequestsByBail.get(bail.id) || 0,
    });
    const detail = bail.status === BailStatus.AWAITING_TENANT_FORM ? formTrackingDetail(bail.intakes[0]) : null;
    return {
      id: bail.id,
      address: bail.property?.label || bail.property?.fullAddress || "Bien sans adresse",
      bailType: bail.bailType,
      status: bail.status,
      ownerName: partyName(owner as PartyLite | undefined),
      tenantName: partyName(tenant as PartyLite | undefined),
      paidAt: bail.paidAt ? bail.paidAt.toISOString() : null,
      action: next.label,
      actor: next.actor,
      primary: next.primary,
      detail,
      days: daysSince(getLastActivity(bail.updatedAt, bail.auditLogs[0]?.createdAt)),
    };
  });
  // Les plus anciens d'abord : ce sont ceux qui attendent depuis le plus longtemps.
  queue.sort((a, b) => b.days - a.days);

  return {
    statusCounts,
    unpaidCount,
    queue,
    unpaid: unpaidBails.map((bail) => ({
      id: bail.id,
      address: bail.property?.label || bail.property?.fullAddress || "Bien sans adresse",
      status: bail.status,
      ownerName: partyName(bail.parties.find((p) => p.profilType === "PROPRIETAIRE") as PartyLite | undefined),
      days: daysSince(bail.updatedAt),
    })),
    notaireRequests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.createdAt.toISOString(),
      notaireName: r.dossier?.notaire?.name || r.dossier?.notaire?.email || "Notaire",
      bailId: r.dossier?.bail?.id || null,
      address: r.dossier?.bail?.property?.label || r.dossier?.bail?.property?.fullAddress || null,
    })),
    receivedToday: received.map((link) => ({
      id: link.id,
      target: link.target,
      name: partyName(link.client as PartyLite | null),
      submittedAt: (link.submittedAt as Date).toISOString(),
      bailId: link.bailId,
    })),
  };
}
