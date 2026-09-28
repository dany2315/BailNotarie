"use client";

import * as React from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ChatHeader,
  ChatSkeleton,
  Conversation,
  DateSeparator,
  Message,
  MessageAttachment,
  MessageAvatar,
  MessageContent,
  RefreshChip,
  RequestCard,
  PromptInput,
  type PromptAction,
  type RequestStatus,
  ScrollToBottom,
  TypingBubble,
  type MessageStatus,
} from "./chat-ui";

/* =========================================================================
   La composition d'une conversation : en-tête, fil, composeur.

   Ce composant ne décide de rien. Il reçoit un fil déjà trié, l'état du
   composeur et des fonctions de rappel ; l'appelant garde l'authentification,
   les requêtes, Pusher, les envois et la suppression. Seuls le regroupement
   des bulles, les séparateurs de jour et le défilement — de l'affichage —
   sont calculés ici.
   ========================================================================= */

export type ChatAttachmentView = {
  id: string;
  name: string;
  meta?: string;
};

export type ChatMessageView = {
  id: string;
  from: "me" | "them";
  /** Affiché au-dessus de la bulle quand ce n'est pas moi qui parle. */
  authorName?: string | null;
  authorRole?: "notaire" | "client";
  content: string;
  createdAt: Date | string;
  status?: MessageStatus;
  attachments?: ChatAttachmentView[];
  canDelete?: boolean;
};

export type ChatRequestView = {
  id: string;
  createdAt: Date | string;
  title: string;
  content: string;
  status: RequestStatus;
  /** « Propriétaire », « Locataire » : à qui la demande s'adresse. */
  targets?: string[];
  /** L'auteur de la demande, affiché au-dessus de la carte. */
  authorName?: string | null;
  documents?: ChatAttachmentView[];
  /** Quand c'est vrai, la zone de réponse est proposée. */
  canRespond?: boolean;
};

export type ChatTimelineItem =
  | { type: "message"; id: string; createdAt: Date | string; data: ChatMessageView }
  | { type: "request"; id: string; createdAt: Date | string; data: ChatRequestView };

/* ---------- Dates ----------------------------------------------------------- */

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function timeLabel(value: Date | string): string {
  const date = asDate(value);
  return Number.isNaN(date.getTime()) ? "" : TIME.format(date);
}

function dayKey(value: Date | string): string {
  const date = asDate(value);
  return Number.isNaN(date.getTime()) ? "" : date.toDateString();
}

function dayLabel(value: Date | string): string {
  const date = asDate(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return "Hier";
  const label = DAY.format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Deux messages du même auteur, à moins de cinq minutes, forment une série. */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

function sameSeries(
  a: ChatTimelineItem | undefined,
  b: ChatTimelineItem | undefined,
): boolean {
  if (!a || !b || a.type !== "message" || b.type !== "message") return false;
  if (a.data.from !== b.data.from) return false;
  if ((a.data.authorName ?? null) !== (b.data.authorName ?? null)) return false;
  if (dayKey(a.createdAt) !== dayKey(b.createdAt)) return false;
  const gap = asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime();
  return Number.isFinite(gap) && gap < GROUP_WINDOW_MS;
}

/* ---------- Le panneau ------------------------------------------------------ */

export type ChatPanelProps = {
  /** La personne en face : nom, rôle, présence. */
  interlocutor: {
    name: string;
    role?: "notaire" | "client";
    /** « Notaire », « Propriétaire », « Locataire »… */
    badge?: string;
    online?: boolean;
    typing?: boolean;
    subtitle?: string;
  };
  items: ChatTimelineItem[];
  loading?: boolean;
  refreshing?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
  composer: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onAttach?: () => void;
    /** Les entrées du menu « + » : côté notaire, la demande de document. */
    actions?: PromptAction[];
    files?: Array<{ name: string; size: number }>;
    onRemoveFile?: (index: number) => void;
    sending?: boolean;
    /** Faux côté notaire : Entrée va à la ligne, seul le bouton envoie. */
    enterToSend?: boolean;
    placeholder?: string;
    onTyping?: () => void;
  };
  onDownloadAttachment?: (attachmentId: string) => void;
  onOpenAttachment?: (attachmentId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  /** Le formulaire de réponse d'une demande, rendu par l'appelant. */
  renderRespond?: (request: ChatRequestView) => React.ReactNode;
  /** Les commandes du notaire sur une demande : statut, suppression. */
  renderRequestFooter?: (request: ChatRequestView) => React.ReactNode;
  onClose?: () => void;
  className?: string;
};

export function ChatPanel({
  interlocutor,
  items,
  loading = false,
  refreshing = false,
  emptyTitle = "Aucun message",
  emptyHint = "Écrivez le premier message : le notaire vous répond ici.",
  composer,
  onDownloadAttachment,
  onOpenAttachment,
  onDeleteMessage,
  renderRespond,
  renderRequestFooter,
  onClose,
  className,
}: ChatPanelProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = React.useState(true);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
  }, []);

  // On suit le fil tant que l'on est déjà en bas ; sinon on ne bouge pas la vue.
  const count = items.length;
  const lastId = items.length > 0 ? items[items.length - 1].id : null;
  React.useEffect(() => {
    if (loading) return;
    if (atBottom) scrollToBottom("auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, lastId, loading, interlocutor.typing]);

  const handleScroll = React.useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    setAtBottom(distance < 80);
  }, []);

  return (
    <div className={cn("flex h-full min-h-0 flex-col bg-[#f7f8fb]", className)}>
      <ChatHeader
        name={interlocutor.name}
        role={interlocutor.role}
        badge={interlocutor.badge}
        online={interlocutor.online}
        typing={interlocutor.typing}
        subtitle={interlocutor.subtitle}
        onClose={onClose}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {refreshing && !loading && <RefreshChip />}

        {loading ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatSkeleton />
          </div>
        ) : (
          <Conversation ref={scrollRef} onScroll={handleScroll}>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-300 ring-1 ring-slate-200/70">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <p className="text-[14px] font-semibold tracking-tight text-slate-800">
                  {emptyTitle}
                </p>
                <p className="max-w-[260px] text-[12.5px] leading-snug text-slate-500">
                  {emptyHint}
                </p>
              </div>
            ) : (
              items.map((item, index) => {
                const previous = items[index - 1];
                const next = items[index + 1];
                const newDay = !previous || dayKey(previous.createdAt) !== dayKey(item.createdAt);

                const separator = newDay ? (
                  <DateSeparator key={`day-${item.id}`}>{dayLabel(item.createdAt)}</DateSeparator>
                ) : null;

                if (item.type === "request") {
                  const request = item.data;
                  return (
                    <React.Fragment key={item.id}>
                      {separator}
                      <RequestCard
                        title={request.title}
                        content={request.content}
                        status={request.status}
                        targets={request.targets}
                        meta={
                          request.authorName
                            ? `${request.authorName} · ${timeLabel(request.createdAt)}`
                            : undefined
                        }
                        documents={request.documents}
                        onDownloadDocument={onDownloadAttachment}
                        onOpenDocument={onOpenAttachment}
                        respond={
                          request.canRespond && request.status === "pending"
                            ? renderRespond?.(request)
                            : undefined
                        }
                        footer={renderRequestFooter?.(request)}
                      />
                    </React.Fragment>
                  );
                }

                const message = item.data;
                const mine = message.from === "me";
                const first = !sameSeries(previous, item);
                const last = !sameSeries(item, next);

                return (
                  <React.Fragment key={item.id}>
                    {separator}
                    <div className="group/message relative">
                      <Message from={message.from} last={last}>
                        {/* Mes messages se passent d'avatar : l'alignement suffit. */}
                        {!mine && (
                          <MessageAvatar
                            name={message.authorName || interlocutor.name}
                            role={message.authorRole ?? interlocutor.role}
                            hidden={!last}
                            withMeta={last}
                          />
                        )}
                        <MessageContent
                          from={message.from}
                          last={last}
                          status={mine ? message.status : undefined}
                          time={last ? timeLabel(message.createdAt) : undefined}
                          author={first && !mine ? message.authorName ?? undefined : undefined}
                        >
                          {message.content && (
                            <span className="whitespace-pre-wrap">{message.content}</span>
                          )}
                          {message.attachments?.map((attachment) => (
                            <MessageAttachment
                              key={attachment.id}
                              name={attachment.name}
                              meta={attachment.meta}
                              tone={mine ? "me" : "them"}
                              onOpen={
                                onOpenAttachment ? () => onOpenAttachment(attachment.id) : undefined
                              }
                              onDownload={
                                onDownloadAttachment
                                  ? () => onDownloadAttachment(attachment.id)
                                  : undefined
                              }
                            />
                          ))}
                        </MessageContent>

                        {message.canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(message.id)}
                            title="Supprimer le message"
                            className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition-all hover:bg-white hover:text-red-500 focus-visible:opacity-100 group-hover/message:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Supprimer le message</span>
                          </button>
                        )}
                      </Message>
                    </div>
                  </React.Fragment>
                );
              })
            )}

            {interlocutor.typing && (
              <TypingBubble name={interlocutor.name} role={interlocutor.role} />
            )}
          </Conversation>
        )}

        {!loading && !atBottom && items.length > 0 && (
          <ScrollToBottom onClick={() => scrollToBottom()} />
        )}
      </div>

      <PromptInput
        value={composer.value}
        onChange={composer.onChange}
        onSubmit={composer.onSubmit}
        onAttach={composer.onAttach}
        actions={composer.actions}
        files={composer.files}
        onRemoveFile={composer.onRemoveFile}
        sending={composer.sending}
        enterToSend={composer.enterToSend}
        placeholder={composer.placeholder}
        onTyping={composer.onTyping}
      />
    </div>
  );
}
