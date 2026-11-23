import { NotaireRequestStatus, Role } from "@prisma/client";

import type {
  ChatAttachmentView,
  ChatMessageView,
  ChatRequestView,
  ChatTimelineItem,
} from "./chat-panel";
import type { MessageStatus, RequestStatus } from "./chat-ui";

/* =========================================================================
   De la base à l'écran.

   Ces fonctions sont pures : elles reçoivent ce que les deux messageries
   chargent déjà et n'en font qu'une vue. Aucune requête, aucun état, aucune
   règle métier — les règles d'affichage reprises ici sont exactement celles
   des composants d'origine.
   ========================================================================= */

export type OptimisticEntry = { tempId: string; realId?: string; status: "sending" | "sent" | "error" };

/** L'état d'envoi d'un message, tel que la carte optimiste le connaît. */
function statusOf(entry: OptimisticEntry | undefined): MessageStatus | undefined {
  if (!entry) return undefined;
  if (entry.status === "sending") return "sending";
  if (entry.status === "error") return "error";
  return "sent";
}

const REQUEST_STATUS: Record<string, RequestStatus> = {
  [NotaireRequestStatus.PENDING]: "pending",
  [NotaireRequestStatus.COMPLETED]: "completed",
  [NotaireRequestStatus.CANCELLED]: "cancelled",
};

/** Le nom lisible de celui qui a déposé une pièce, et sa qualité. */
function documentSender(doc: any, currentUserId?: string): { by: string; byBadge?: string } {
  const own = doc.uploadedBy?.id === currentUserId;
  const by = own
    ? "Moi"
    : doc.client?.entreprise
      ? doc.client.entreprise.legalName || doc.client.entreprise.name
      : doc.client?.persons?.[0]
        ? `${doc.client.persons[0].firstName || ""} ${doc.client.persons[0].lastName || ""}`.trim()
        : doc.uploadedBy?.name || doc.uploadedBy?.email || "Utilisateur";
  const byBadge =
    doc.client?.profilType === "PROPRIETAIRE"
      ? "Propriétaire"
      : doc.client?.profilType === "LOCATAIRE"
        ? "Locataire"
        : undefined;
  return { by, byBadge };
}

export function toAttachment(doc: any, currentUserId?: string): ChatAttachmentView {
  const { by, byBadge } = documentSender(doc, currentUserId);
  return {
    id: doc.id,
    name: doc.label || "Document",
    fileKey: doc.fileKey,
    by,
    byBadge,
  };
}

export function toMessageView(
  message: any,
  {
    currentUserId,
    optimistic,
  }: { currentUserId?: string; optimistic?: Map<string, OptimisticEntry> },
): ChatMessageView {
  const mine = message.senderId === currentUserId;
  const entry = optimistic?.get(message.id);

  return {
    id: message.id,
    from: mine ? "me" : "them",
    authorName: mine ? "Moi" : message.sender?.name || message.sender?.email || "Utilisateur",
    authorRole: message.sender?.role === Role.NOTAIRE ? "notaire" : "client",
    content: message.content || "",
    createdAt: message.createdAt,
    status: mine ? statusOf(entry) : undefined,
    attachments: message.document
      ? [
          {
            id: message.document.id,
            name: message.document.label || "Document",
            fileKey: message.document.fileKey,
          },
        ]
      : undefined,
    // Comme aujourd'hui : ses propres messages, et pas tant qu'ils partent.
    canDelete: mine && entry === undefined,
  };
}

export function toRequestView(
  request: any,
  {
    currentUserId,
    /** Vrai côté client : la zone de dépôt est proposée sur une demande en attente. */
    canRespond = false,
    /** Vrai côté notaire : les destinataires sont rappelés sur la carte. */
    showTargets = false,
    optimistic,
  }: {
    currentUserId?: string;
    canRespond?: boolean;
    showTargets?: boolean;
    optimistic?: Map<string, OptimisticEntry>;
  },
): ChatRequestView {
  const status = REQUEST_STATUS[request.status] ?? "pending";
  const targets = showTargets
    ? [
        request.targetProprietaire ? "Propriétaire" : null,
        request.targetLocataire ? "Locataire" : null,
      ].filter(Boolean as unknown as (value: string | null) => value is string)
    : undefined;

  return {
    id: request.id,
    createdAt: request.createdAt,
    title: request.title,
    content: request.content,
    status,
    sending: optimistic?.get(request.id)?.status === "sending",
    targets,
    authorName:
      request.createdById === currentUserId
        ? "Moi"
        : request.createdBy?.name || request.createdBy?.email || "Utilisateur",
    documents: (request.documents || []).map((doc: any) => toAttachment(doc, currentUserId)),
    canRespond: canRespond && status === "pending",
  };
}

/** Le fil déjà trié des deux messageries, traduit d'un bloc. */
export function toTimeline(
  allItems: Array<{ type: "message" | "request"; id: string; createdAt: Date; data: any }>,
  options: {
    currentUserId?: string;
    canRespond?: boolean;
    showTargets?: boolean;
    optimisticMessages?: Map<string, OptimisticEntry>;
    optimisticRequests?: Map<string, OptimisticEntry>;
  },
): ChatTimelineItem[] {
  return allItems.map((item) =>
    item.type === "message"
      ? {
          type: "message" as const,
          id: item.id,
          createdAt: item.createdAt,
          data: toMessageView(item.data, {
            currentUserId: options.currentUserId,
            optimistic: options.optimisticMessages,
          }),
        }
      : {
          type: "request" as const,
          id: item.id,
          createdAt: item.createdAt,
          data: toRequestView(item.data, {
            currentUserId: options.currentUserId,
            canRespond: options.canRespond,
            showTargets: options.showTargets,
            optimistic: options.optimisticRequests,
          }),
        },
  );
}
