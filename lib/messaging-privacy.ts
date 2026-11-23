import type { Prisma } from "@prisma/client";

/**
 * Confidentialité de la messagerie d'un bail.
 *
 * Le notaire échange avec chaque partie dans un fil séparé : propriétaire d'un côté, locataire de l'autre.
 * Un client (propriétaire ou locataire) ne voit que son propre fil : les messages qu'il a envoyés et ceux qui
 * lui sont adressés, ainsi que les fichiers joints à ces messages. Le notaire et l'équipe voient tout.
 */

/** Messages du fil d'un client : envoyés par un compte de ce client, ou adressés à ce client. */
export function clientThreadWhere(clientId: string): Prisma.BailMessageWhereInput {
  return { OR: [{ sender: { clientId } }, { recipientPartyId: clientId }] };
}

/**
 * Pièces qu'un client peut voir parmi celles d'un bail : toute pièce qui n'est pas jointe à un message, et les
 * pièces jointes aux messages de son propre fil.
 */
export function clientVisibleDocumentWhere(clientId: string): Prisma.DocumentWhereInput {
  return { OR: [{ bailMessages: { none: {} } }, { bailMessages: { some: clientThreadWhere(clientId) } }] };
}

/** Même règle, pour une pièce déjà chargée avec ses messages (contrôle d'accès à un fichier). */
export function messageDocumentVisibleTo(
  messages: { recipientPartyId: string | null; sender: { clientId: string | null } }[],
  clientId: string,
): boolean {
  if (messages.length === 0) return true;
  return messages.some((m) => m.recipientPartyId === clientId || m.sender.clientId === clientId);
}
