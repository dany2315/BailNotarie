import { IntakeStatus, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

/**
 * Contrôle d'accès des envois de pièces (URL d'upload signée, puis enregistrement du document).
 *
 * - Avec un lien d'intake : le lien doit être en cours (PENDING) et chaque identifiant fourni
 *   doit appartenir à ce lien (son client, ses personnes ou son entreprise, son bien, son bail).
 * - Sans lien : une session est exigée. L'équipe accède à tout ; un notaire, aux dossiers qui lui
 *   sont attribués ; un client, à ses propres données (son client, ses biens, ses baux).
 */

export interface UploadTarget {
  token?: string | null;
  clientId?: string | null;
  personId?: string | null;
  entrepriseId?: string | null;
  propertyId?: string | null;
  bailId?: string | null;
}

export type UploadAccess =
  | { ok: true; intakeLinkId: string | null; userId: string | null }
  | { ok: false; status: number; error: string };

const STAFF_ROLES: string[] = [Role.ADMINISTRATEUR, Role.OPERATEUR, Role.REVIEWER];

const deny = (status: number, error: string): UploadAccess => ({ ok: false, status, error });

/** Client propriétaire d'une personne ou d'une entreprise. */
async function ownerClientOf(target: UploadTarget): Promise<{ personClientId: string | null; entrepriseClientId: string | null } | null> {
  const [person, entreprise] = await Promise.all([
    target.personId ? prisma.person.findUnique({ where: { id: target.personId }, select: { clientId: true } }) : null,
    target.entrepriseId ? prisma.entreprise.findUnique({ where: { id: target.entrepriseId }, select: { clientId: true } }) : null,
  ]);
  if ((target.personId && !person) || (target.entrepriseId && !entreprise)) return null;
  return { personClientId: person?.clientId ?? null, entrepriseClientId: entreprise?.clientId ?? null };
}

export async function authorizeUploadTarget(target: UploadTarget): Promise<UploadAccess> {
  const hasEntity = !!(target.clientId || target.personId || target.entrepriseId || target.propertyId || target.bailId);

  // 1. Formulaire d'intake (sans compte) : le lien fait foi, rien en dehors de lui.
  if (target.token) {
    const link = await prisma.intakeLink.findUnique({
      where: { token: target.token },
      select: { id: true, status: true, clientId: true, propertyId: true, bailId: true },
    });
    if (!link) return deny(404, "Lien d'intake introuvable");
    if (link.status !== IntakeStatus.PENDING) return deny(403, "Ce lien n'est plus actif");
    if (target.clientId && target.clientId !== link.clientId) return deny(403, "Accès refusé");
    if (target.propertyId && target.propertyId !== link.propertyId) return deny(403, "Accès refusé");
    if (target.bailId && target.bailId !== link.bailId) return deny(403, "Accès refusé");
    if (target.personId || target.entrepriseId) {
      const owners = await ownerClientOf(target);
      if (!owners) return deny(404, "Personne ou entreprise introuvable");
      if (target.personId && owners.personClientId !== link.clientId) return deny(403, "Accès refusé");
      if (target.entrepriseId && owners.entrepriseClientId !== link.clientId) return deny(403, "Accès refusé");
    }
    return { ok: true, intakeLinkId: link.id, userId: null };
  }

  if (!hasEntity) return deny(400, "Token, clientId, personId, entrepriseId, propertyId ou bailId requis");

  // 2. Utilisateur connecté.
  const user = await getCurrentUser();
  if (!user) return deny(401, "Connexion requise");
  if (STAFF_ROLES.includes(user.role)) return { ok: true, intakeLinkId: null, userId: user.id };

  const owners = await ownerClientOf(target);
  if (!owners) return deny(404, "Personne ou entreprise introuvable");
  const [property, bail] = await Promise.all([
    target.propertyId ? prisma.property.findUnique({ where: { id: target.propertyId }, select: { ownerId: true } }) : null,
    target.bailId
      ? prisma.bail.findUnique({
          where: { id: target.bailId },
          select: { property: { select: { ownerId: true } }, parties: { select: { id: true } } },
        })
      : null,
  ]);
  if ((target.propertyId && !property) || (target.bailId && !bail)) return deny(404, "Dossier introuvable");

  // Clients concernés par la demande : tous doivent être accessibles à l'utilisateur.
  const clientIds = [target.clientId, owners.personClientId, owners.entrepriseClientId, property?.ownerId].filter(
    (id): id is string => !!id,
  );

  if (user.role === Role.NOTAIRE) {
    // Notaire : uniquement les dossiers qui lui sont attribués.
    const assignments = await prisma.dossierNotaireAssignment.findMany({
      where: { notaireId: user.id },
      select: { clientId: true, propertyId: true, bailId: true, bail: { select: { parties: { select: { id: true } } } } },
    });
    const allowedClients = new Set(assignments.flatMap((a) => [a.clientId, ...(a.bail?.parties.map((p) => p.id) ?? [])]));
    const allowedProperties = new Set(assignments.map((a) => a.propertyId).filter(Boolean));
    const allowedBails = new Set(assignments.map((a) => a.bailId).filter(Boolean));
    if (target.bailId && !allowedBails.has(target.bailId)) return deny(403, "Accès refusé");
    if (target.propertyId && !allowedProperties.has(target.propertyId)) return deny(403, "Accès refusé");
    if (clientIds.filter((id) => id !== property?.ownerId).some((id) => !allowedClients.has(id))) return deny(403, "Accès refusé");
    return { ok: true, intakeLinkId: null, userId: user.id };
  }

  // Client (propriétaire ou locataire) : ses propres données uniquement.
  if (user.role !== Role.UTILISATEUR) return deny(403, "Accès refusé");
  const ownClientId = (await prisma.user.findUnique({ where: { id: user.id }, select: { clientId: true } }))?.clientId;
  if (!ownClientId) return deny(403, "Accès refusé");
  if (clientIds.some((id) => id !== ownClientId)) return deny(403, "Accès refusé");
  if (bail && bail.property.ownerId !== ownClientId && !bail.parties.some((party) => party.id === ownClientId)) {
    return deny(403, "Accès refusé");
  }
  return { ok: true, intakeLinkId: null, userId: user.id };
}

/** Clé produite par /api/blob/generate-upload-token (dossier « documents/ », sans remontée de dossier). */
export function isValidUploadKey(fileKey: unknown): fileKey is string {
  return typeof fileKey === "string" && fileKey.length >= 12 && fileKey.length <= 500 && fileKey.startsWith("documents/") && !fileKey.includes("..");
}
