// Module serveur interne (pas une action appelable depuis le navigateur).

import { cache } from "react";
import { headers } from "next/headers";
import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES } from "@/lib/auth-helpers";

/**
 * Accès aux formulaires d'intake (propriétaire et locataire).
 *
 * Le lien seul ne suffit pas : il circule par e-mail et reste dans l'historique du navigateur.
 * Il faut aussi une session, ouverte par le code reçu à l'adresse du dossier :
 * - le client du lien (un utilisateur rattaché à ce client) ;
 * - ou l'équipe, qui consulte les formulaires depuis l'interface.
 */

export const INTAKE_SESSION_REQUIRED =
  "Connexion requise : rechargez la page pour recevoir un code d'accès par e-mail.";

/** Utilisateur de la session en cours, lu une fois par requête. */
const sessionUser = cache(async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return null;
    return prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true, clientId: true } });
  } catch {
    return null;
  }
});

/** La session ouvre-t-elle le formulaire de ce client ? */
export async function hasIntakeSession(clientId: string | null | undefined): Promise<boolean> {
  const user = await sessionUser();
  if (!user) return false;
  if (STAFF_ROLES.includes(user.role)) return true;
  return user.role === Role.UTILISATEUR && !!clientId && user.clientId === clientId;
}

/** Pour les actions d'enregistrement : refuse sans session du client du lien. */
export async function requireIntakeSession(clientId: string | null | undefined): Promise<void> {
  if (!(await hasIntakeSession(clientId))) throw new Error(INTAKE_SESSION_REQUIRED);
}

/** Une session est-elle ouverte, quel que soit le compte ? (pour prévenir d'un changement de compte) */
export async function hasAnySession(): Promise<boolean> {
  return !!(await sessionUser());
}

/** j•••••n@gmail.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.length <= 2 ? local.slice(0, 1) : `${local[0]}${"•".repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

type ResolvedAccount = { ok: true; email: string } | { ok: false; error: string };

const CONTACT_US = "Contactez-nous pour accéder à ce formulaire.";

/**
 * Adresse à laquelle envoyer le code pour le client d'un lien : celle du compte déjà rattaché à
 * ce client, sinon l'adresse du dossier (entreprise, puis personne principale). Le compte est
 * créé au besoin, comme à la connexion à l'espace client (pas à l'affichage : create false).
 */
export async function resolveIntakeAccount(
  clientId: string | null | undefined,
  { create = true }: { create?: boolean } = {},
): Promise<ResolvedAccount> {
  if (!clientId) return { ok: false, error: `Ce formulaire n'est rattaché à aucun dossier. ${CONTACT_US}` };

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      entreprise: { select: { email: true, legalName: true, name: true } },
      persons: { where: { isPrimary: true }, take: 1, select: { email: true, firstName: true, lastName: true } },
      users: { where: { role: Role.UTILISATEUR }, select: { email: true } },
    },
  });
  if (!client) return { ok: false, error: `Dossier introuvable. ${CONTACT_US}` };

  const person = client.persons[0];
  const contact = (client.entreprise?.email || person?.email || "").toLowerCase().trim();

  // Le compte déjà rattaché, de préférence celui de l'adresse du dossier.
  const linked = client.users.find((user) => user.email === contact) ?? client.users[0];
  if (linked) return { ok: true, email: linked.email };

  if (!contact) return { ok: false, error: `Aucune adresse e-mail n'est associée à ce dossier. ${CONTACT_US}` };

  const existing = await prisma.user.findUnique({ where: { email: contact }, select: { id: true } });
  // Adresse déjà prise par un autre compte (autre client, équipe, notaire) : pas de code envoyé.
  if (existing) return { ok: false, error: `L'adresse de ce dossier est déjà utilisée par un autre compte. ${CONTACT_US}` };

  if (!create) return { ok: true, email: contact };

  const name = client.entreprise
    ? client.entreprise.legalName || client.entreprise.name || null
    : `${person?.firstName || ""} ${person?.lastName || ""}`.trim() || null;
  try {
    await prisma.user.create({
      data: { email: contact, role: Role.UTILISATEUR, name, clientId, emailVerified: false },
    });
  } catch (error: any) {
    // Créé entre-temps par une autre demande : on le reprend s'il est bien celui de ce client.
    if (error?.code !== "P2002") throw error;
    const raced = await prisma.user.findUnique({ where: { email: contact }, select: { clientId: true, role: true } });
    if (raced?.clientId !== clientId || raced.role !== Role.UTILISATEUR) {
      return { ok: false, error: `L'adresse de ce dossier est déjà utilisée par un autre compte. ${CONTACT_US}` };
    }
  }
  return { ok: true, email: contact };
}

/**
 * Écran de code à afficher avant le formulaire, ou null quand la session ouvre déjà ce dossier.
 * Rien n'est créé ni envoyé ici : le code ne part qu'à la demande du visiteur.
 */
export async function intakeGate(clientId: string | null | undefined) {
  if (await hasIntakeSession(clientId)) return null;
  const account = await resolveIntakeAccount(clientId, { create: false });
  return {
    maskedEmail: account.ok ? maskEmail(account.email) : null,
    unavailableReason: account.ok ? null : account.error,
    signedInAsOther: await hasAnySession(),
  };
}
