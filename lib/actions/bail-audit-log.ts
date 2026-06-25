import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { BailAuditEventType, BailStatus, Role, Prisma, type PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

type Actor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export function getActorName(actor?: Actor | null) {
  return actor?.name || actor?.email || "BailNotarie";
}

export function getClientDisplayName(client?: {
  type?: string | null;
  persons?: Array<{ firstName?: string | null; lastName?: string | null; email?: string | null }>;
  entreprise?: { legalName?: string | null; name?: string | null; email?: string | null } | null;
} | null) {
  if (!client) return null;

  const primaryPerson = client.persons?.[0];
  const personName = [primaryPerson?.firstName, primaryPerson?.lastName].filter(Boolean).join(" ").trim();

  return (
    personName ||
    primaryPerson?.email ||
    client.entreprise?.legalName ||
    client.entreprise?.name ||
    client.entreprise?.email ||
    null
  );
}

export async function createBailAuditLog(
  data: {
    bailId: string;
    eventType: BailAuditEventType;
    actorId?: string | null;
    actorName?: string | null;
    fromStatus?: BailStatus | null;
    toStatus?: BailStatus | null;
    tenantId?: string | null;
    tenantName?: string | null;
    notaireId?: string | null;
    notaireName?: string | null;
    createdAt?: Date;
  },
  tx: PrismaLike = prisma
) {
  return tx.bailAuditLog.create({
    data: {
      bailId: data.bailId,
      eventType: data.eventType,
      actorId: data.actorId || null,
      actorName: data.actorName || "BailNotarie",
      fromStatus: data.fromStatus || null,
      toStatus: data.toStatus || null,
      tenantId: data.tenantId || null,
      tenantName: data.tenantName || null,
      notaireId: data.notaireId || null,
      notaireName: data.notaireName || null,
      createdAt: data.createdAt,
    },
  });
}

export async function getBailAuditLogs(bailId: string) {
  await requireRole([Role.ADMINISTRATEUR, Role.OPERATEUR, Role.REVIEWER]);

  return prisma.bailAuditLog.findMany({
    where: { bailId },
    orderBy: { createdAt: "desc" },
  });
}
