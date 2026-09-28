"use client";

import * as React from "react";
import {
  ArrowDown,
  Ban,
  Check,
  CheckCheck,
  Clock,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Scale,
  Send,
  Trash2,
  User,
  Upload,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/* =========================================================================
   Les briques d'une conversation.

   Découpage volontairement calqué sur le motif `Message` de shadcn —
   `Conversation`, `Message`, `MessageContent`, `MessageAvatar`,
   `PromptInput` — pour que remplacer ces composants par les leurs, le jour
   où le registre sera accessible, ne demande qu'un changement d'import.

   L'écriture, elle, est celle du site : mêmes surfaces, même bleu, mêmes
   micro-libellés que l'espace client.
   ========================================================================= */

/* ---------- Le fil ---------------------------------------------------------- */

export const Conversation = React.forwardRef<
  HTMLDivElement,
  {
    children: React.ReactNode;
    className?: string;
    onScroll?: React.UIEventHandler<HTMLDivElement>;
  }
>(function Conversation({ children, className, onScroll }, ref) {
  return (
    <div
      ref={ref}
      onScroll={onScroll}
      className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain", className)}
    >
      <div className="flex flex-col gap-1 px-4 py-6 sm:px-5">{children}</div>
    </div>
  );
});

/** Le repère de jour, qui remplace la répétition de la date sur chaque bulle. */
export function DateSeparator({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 flex items-center gap-3 first:mt-0">
      <span className="h-px flex-1 bg-slate-200/70" />
      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 ring-1 ring-slate-200/70">
        {children}
      </span>
      <span className="h-px flex-1 bg-slate-200/70" />
    </div>
  );
}

export type MessageStatus = "sending" | "sent" | "read" | "error";

/* ---------- Un message ------------------------------------------------------ */

export function Message({
  from,
  /** Dernier d'une série du même auteur : c'est lui qui porte l'avatar et l'heure. */
  last = true,
  children,
}: {
  from: "me" | "them";
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-end gap-2",
        from === "me" ? "flex-row-reverse" : "flex-row",
        last ? "mb-1.5" : "mb-0.5",
      )}
    >
      {children}
    </div>
  );
}

export function MessageAvatar({
  name,
  role,
  hidden = false,
  /** Décale l'avatar quand l'heure s'affiche sous la bulle, pour rester à sa hauteur. */
  withMeta = false,
}: {
  name: string;
  role?: "notaire" | "client";
  hidden?: boolean;
  withMeta?: boolean;
}) {
  if (hidden) return <span aria-hidden className={cn("h-7 w-7 shrink-0", withMeta && "mb-[19px]")} />;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold",
        role === "notaire" ? "bg-[#4373f5] text-white" : "bg-slate-200 text-slate-600",
        withMeta && "mb-[19px]",
      )}
    >
      {role === "notaire" ? <Scale className="h-3.5 w-3.5" /> : initials || "?"}
    </span>
  );
}

export function MessageContent({
  from,
  last = true,
  status,
  time,
  author,
  children,
}: {
  from: "me" | "them";
  last?: boolean;
  status?: MessageStatus;
  time?: string;
  author?: string;
  children: React.ReactNode;
}) {
  const mine = from === "me";
  return (
    <div className={cn("flex min-w-0 max-w-[78%] flex-col gap-1", mine && "items-end")}>
      {author && !mine && (
        <span className="px-1 text-[11px] font-semibold text-slate-400">{author}</span>
      )}
      <div
        className={cn(
          "w-fit max-w-full break-words px-3.5 py-2.5 text-[13.5px] leading-relaxed",
          mine
            ? "rounded-2xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_8px_20px_-10px_rgba(53,99,233,0.65)]"
            : "rounded-2xl bg-white text-slate-800 ring-1 ring-slate-200/80",
          // Le coin fermé du côté de l'auteur, seulement sur le dernier d'une série.
          last && (mine ? "rounded-br-md" : "rounded-bl-md"),
          status === "error" && "opacity-70 ring-1 ring-red-300",
        )}
      >
        {children}
      </div>
      {last && (time || status) && (
        /* L'accusé se lit après l'heure : 07:22 ✓✓ */
        <span className="flex items-center gap-1 px-1 text-[10.5px] tabular-nums text-slate-400">
          {time}
          {mine && status === "sending" && <Clock className="h-3 w-3" />}
          {mine && status === "sent" && <Check className="h-3 w-3" />}
          {mine && status === "read" && <CheckCheck className="h-3 w-3 text-[#3563e9]" />}
          {mine && status === "error" && <span className="text-red-500">non envoyé</span>}
        </span>
      )}
    </div>
  );
}

/** Une pièce jointe, dans une bulle ou sous elle. */
export function MessageAttachment({
  name,
  meta,
  /** Qui a envoyé la pièce, sous son nom. */
  by,
  /** « Propriétaire », « Locataire » : la qualité de l'expéditeur. */
  byBadge,
  tone = "them",
  onOpen,
  onDownload,
  /** Réservé au notaire : verser la pièce aux annexes du bail. */
  onAddToBail,
  addToBailLabel = "Ajouter",
}: {
  name: string;
  meta?: string;
  by?: string;
  byBadge?: string;
  tone?: "me" | "them";
  onOpen?: () => void;
  onDownload?: () => void;
  onAddToBail?: () => void;
  addToBailLabel?: string;
}) {
  const mine = tone === "me";
  return (
    <div
      className={cn(
        "mt-2 flex items-center gap-2.5 rounded-xl px-2.5 py-2 first:mt-0",
        mine ? "bg-white/15" : "bg-slate-50 ring-1 ring-slate-200/70",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          mine ? "bg-white/20 text-white" : "bg-white text-[#3563e9] ring-1 ring-slate-200/70",
        )}
      >
        <FileText className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className={cn(
              "block max-w-full truncate text-left text-[12.5px] font-semibold underline-offset-2 hover:underline",
              mine ? "text-white" : "text-slate-800",
            )}
          >
            {name}
          </button>
        ) : (
          <span className={cn("block truncate text-[12.5px] font-semibold", mine ? "text-white" : "text-slate-800")}>
            {name}
          </span>
        )}
        {(meta || by) && (
          <span
            className={cn(
              "mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]",
              mine ? "text-white/70" : "text-slate-400",
            )}
          >
            {by && (
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {by}
              </span>
            )}
            {by && byBadge && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[10px] font-semibold",
                  mine ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500",
                )}
              >
                {byBadge}
              </span>
            )}
            {meta && <span>{meta}</span>}
          </span>
        )}
      </span>
      {onAddToBail && (
        <button
          type="button"
          onClick={onAddToBail}
          title="Ajouter aux pièces annexes du bail"
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold transition-colors",
            mine
              ? "text-white/80 hover:bg-white/20 hover:text-white"
              : "text-[#3563e9] hover:bg-[#4373f5]/10",
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {addToBailLabel}
        </button>
      )}
      {onDownload && (
        <button
          type="button"
          onClick={onDownload}
          title="Télécharger"
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
            mine ? "text-white/80 hover:bg-white/20 hover:text-white" : "text-slate-400 hover:bg-white hover:text-slate-700",
          )}
        >
          <Download className="h-4 w-4" />
          <span className="sr-only">Télécharger</span>
        </button>
      )}
    </div>
  );
}

/** Les trois points, quand l'autre écrit. */
export function TypingBubble({ name, role }: { name: string; role?: "notaire" | "client" }) {
  return (
    <div className="mb-1.5 flex items-end gap-2">
      <MessageAvatar name={name} role={role} />
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 ring-1 ring-slate-200/80">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------- Une demande du notaire dans le fil ------------------------------ */

export type RequestStatus = "pending" | "completed" | "cancelled";

const REQUEST_VIEW: Record<
  RequestStatus,
  { label: string; rule: string; tile: string; icon: React.ElementType }
> = {
  pending: {
    label: "Document demandé",
    rule: "bg-amber-400",
    tile: "bg-amber-100 text-amber-600",
    icon: Upload,
  },
  completed: {
    label: "Demande complétée",
    rule: "bg-emerald-400",
    tile: "bg-emerald-100 text-emerald-600",
    icon: Check,
  },
  cancelled: {
    label: "Demande annulée",
    rule: "bg-slate-300",
    tile: "bg-slate-100 text-slate-500",
    icon: Ban,
  },
};

export function RequestCard({
  title,
  content,
  status,
  /** Vrai le temps que la création parvienne au serveur. */
  sending = false,
  /** « Propriétaire », « Locataire » : à qui la demande s'adresse. */
  targets = [],
  /** La ligne d'auteur et d'heure, comme au-dessus d'une bulle. */
  meta,
  documents = [],
  onDownloadDocument,
  onOpenDocument,
  onAddDocumentToBail,
  /** Le formulaire de réponse, fourni par l'appelant : il garde sa logique d'envoi. */
  respond,
  respondLabel = "Envoyer le document",
  /** Les commandes du notaire : changement de statut, suppression. */
  footer,
}: {
  title: string;
  content: string;
  status: RequestStatus;
  sending?: boolean;
  targets?: string[];
  meta?: string;
  documents?: Array<{ id: string; name: string; meta?: string; by?: string; byBadge?: string }>;
  onDownloadDocument?: (id: string) => void;
  onOpenDocument?: (id: string) => void;
  onAddDocumentToBail?: (id: string) => void;
  respond?: React.ReactNode;
  respondLabel?: string;
  footer?: React.ReactNode;
}) {
  const view = REQUEST_VIEW[status];
  const Icon = view.icon;
  // Ouvrir la zone de réponse est un état d'affichage, rien de plus.
  const [expanded, setExpanded] = React.useState(false);

  return (
    <div className={cn("my-3", sending && "opacity-70")}>
      {meta && (
        <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-400">
          {meta}
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
        <div aria-hidden className={cn("h-1", view.rule)} />
        <div className="p-4">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                view.tile,
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                {view.label}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[14px] font-semibold leading-tight tracking-tight text-slate-900",
                  status === "cancelled" && "text-slate-400 line-through",
                )}
              >
                {title}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-snug text-slate-500">
                {content}
              </p>
              {targets.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {targets.map((target) => (
                    <span
                      key={target}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500"
                    >
                      {target}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {documents.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                Documents fournis
              </p>
              {documents.map((doc) => (
                <MessageAttachment
                  key={doc.id}
                  name={doc.name}
                  meta={doc.meta}
                  by={doc.by}
                  byBadge={doc.byBadge}
                  onOpen={onOpenDocument ? () => onOpenDocument(doc.id) : undefined}
                  onDownload={onDownloadDocument ? () => onDownloadDocument(doc.id) : undefined}
                  onAddToBail={
                    onAddDocumentToBail ? () => onAddDocumentToBail(doc.id) : undefined
                  }
                />
              ))}
            </div>
          )}

          {respond && !expanded && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-800 sm:w-auto"
            >
              <Paperclip className="h-4 w-4" />
              {respondLabel}
            </button>
          )}
          {respond && expanded && (
            <div className="mt-3.5 border-t border-slate-100 pt-3.5">{respond}</div>
          )}

          {footer && <div className="mt-3.5 border-t border-slate-100 pt-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Les commandes d'une demande, côté notaire ----------------------- */

/** Le statut d'une demande, tel que le notaire peut le changer. */
export function RequestStatusControl({
  status,
  onChange,
  onDelete,
  busy = false,
}: {
  status: RequestStatus;
  onChange: (status: RequestStatus) => void;
  onDelete?: () => void;
  busy?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="sr-only" htmlFor="request-status">
        Statut de la demande
      </label>
      <div className="relative flex-1">
        <select
          id="request-status"
          value={status}
          disabled={busy}
          onChange={(event) => onChange(event.target.value as RequestStatus)}
          className="w-full appearance-none rounded-xl bg-slate-50 py-2 pl-3 pr-8 text-[12.5px] font-semibold text-slate-700 ring-1 ring-slate-200/80 outline-none transition-shadow focus:ring-2 focus:ring-[#4373f5]/40 disabled:opacity-60"
        >
          <option value="pending">En attente</option>
          <option value="completed">Complétée</option>
          <option value="cancelled">Annulée</option>
        </select>
        <ArrowDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          title="Supprimer la demande"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          <span className="sr-only">Supprimer la demande</span>
        </button>
      )}
    </div>
  );
}

/* ---------- Répondre à une demande : l'habillage seul ----------------------- */

/**
 * Le formulaire de réponse, sans logique d'envoi : l'appelant garde ses appels
 * réseau, sa progression et ses messages d'erreur, et ne passe ici que l'état.
 */
export function RequestRespondForm({
  files,
  onPick,
  onRemoveFile,
  onSubmit,
  sending = false,
  progress = 0,
  accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png",
}: {
  files: Array<{ name: string; size: number }>;
  onPick: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onSubmit: () => void;
  sending?: boolean;
  progress?: number;
  accept?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        className="hidden"
        onChange={(event) => {
          onPick(event.target.files);
          event.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={sending}
        className="flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-3.5 py-3 text-left transition-colors hover:border-[#4373f5]/50 hover:bg-[#4373f5]/[0.04] disabled:opacity-60"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#3563e9] ring-1 ring-slate-200/70">
          <Upload className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[12.5px] font-semibold text-slate-800">
            Choisir des documents
          </span>
          <span className="block text-[11px] text-slate-400">PDF, Word ou image</span>
        </span>
      </button>

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200/70"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-700">
                {file.name}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
                {(file.size / 1024).toFixed(0)} Ko
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile(index)}
                disabled={sending}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
              >
                <X className="h-3 w-3" />
                <span className="sr-only">Retirer</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sending && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span>Envoi en cours…</span>
            <span className="tabular-nums">{Math.round(progress)} %</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5b85f7] to-[#3563e9] transition-[width] duration-200"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={sending || files.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(53,99,233,0.9)] transition-opacity disabled:opacity-50"
      >
        {sending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Envoi en cours…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Envoyer {files.length > 0 ? `${files.length} fichier${files.length > 1 ? "s" : ""}` : "les documents"}
          </>
        )}
      </button>
    </div>
  );
}

/* ---------- Le composeur ---------------------------------------------------- */

export type PromptAction = {
  id: string;
  label: string;
  icon: React.ElementType;
  onSelect: () => void;
};

export function PromptInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  /** Les entrées du menu « + ». Sans elles, le trombone reste seul. */
  actions,
  files = [],
  onRemoveFile,
  sending = false,
  /** Faux côté notaire : Entrée va à la ligne, seul le bouton envoie. */
  enterToSend = true,
  placeholder = "Écrivez votre message…",
  onTyping,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach?: () => void;
  actions?: PromptAction[];
  files?: Array<{ name: string; size: number }>;
  onRemoveFile?: (index: number) => void;
  sending?: boolean;
  enterToSend?: boolean;
  placeholder?: string;
  onTyping?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Le message de validation, sous le champ. */
  error?: string | null;
}) {
  const canSend = !sending && (value.trim().length > 0 || files.length > 0);
  const areaRef = React.useRef<HTMLTextAreaElement>(null);
  // Sur une seule ligne, les boutons se centrent sur le texte ; dès que la zone
  // grandit, ils redescendent au bas du champ.
  const [multiline, setMultiline] = React.useState(false);

  // La zone grandit avec le texte, jusqu'à un plafond.
  React.useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    const height = Math.min(area.scrollHeight, 140);
    area.style.height = `${height}px`;
    setMultiline(height > 44);
  }, [value]);

  return (
    <div className="border-t border-slate-200/70 bg-white/80 p-3 backdrop-blur-xl sm:p-4">
      <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 transition-shadow focus-within:ring-2 focus-within:ring-[#4373f5]/40">
        {files.length > 0 && (
          <div className="space-y-1.5 border-b border-slate-100 p-2.5">
            <p className="px-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné
              {files.length > 1 ? "s" : ""}
            </p>
            <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-slate-50 py-1 pl-2 pr-1 text-[11.5px] font-medium text-slate-600 ring-1 ring-slate-200/70"
              >
                <FileText className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 tabular-nums text-slate-400">
                  {(file.size / 1024).toFixed(0)} Ko
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveFile?.(index)}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                >
                  <X className="h-3 w-3" />
                  <span className="sr-only">Retirer</span>
                </button>
              </span>
            ))}
            </div>
          </div>
        )}

        <div className={cn("flex gap-1 p-1.5", multiline ? "items-end" : "items-center")}>
          {actions && actions.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={sending}
                  title="Ajouter"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                >
                  <Plus className="h-[18px] w-[18px]" />
                  <span className="sr-only">Ajouter</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-60 rounded-xl">
                {actions.map((action) => (
                  <DropdownMenuItem
                    key={action.id}
                    onSelect={action.onSelect}
                    className="cursor-pointer gap-2 rounded-lg text-[13px] font-medium"
                  >
                    <action.icon className="h-4 w-4 shrink-0 text-slate-400" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={onAttach}
              disabled={sending}
              title="Joindre un document"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <Paperclip className="h-[18px] w-[18px]" />
              <span className="sr-only">Joindre un document</span>
            </button>
          )}

          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            disabled={sending}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              onTyping?.(event);
              if (enterToSend && event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (canSend) onSubmit();
              }
            }}
            /* 16 px : en dessous, les navigateurs mobiles zooment à la mise au point. */
            className="min-h-[36px] flex-1 resize-none bg-transparent py-2 text-base leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 disabled:opacity-60"
          />

          <button
            type="button"
            onClick={() => canSend && onSubmit()}
            disabled={!canSend}
            title="Envoyer"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
              canSend
                ? "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_8px_18px_-8px_rgba(53,99,233,0.8)]"
                : "bg-slate-100 text-slate-300",
            )}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Envoyer</span>
          </button>
        </div>
      </div>
      {error && <p className="mt-2 px-1 text-[11.5px] font-medium text-red-600">{error}</p>}
      <p className="mt-2 px-1 text-[11px] text-slate-400">
        {enterToSend
          ? "Entrée pour envoyer · Maj + Entrée pour aller à la ligne"
          : "Entrée va à la ligne · le bouton envoie le message"}
      </p>
    </div>
  );
}

/* ---------- L'en-tête -------------------------------------------------------- */

export function ChatHeader({
  name,
  role,
  /** « Notaire », « Propriétaire », « Locataire »… */
  badge,
  online,
  typing,
  subtitle,
  onClose,
}: {
  name: string;
  role?: "notaire" | "client";
  badge?: string;
  online?: boolean;
  typing?: boolean;
  subtitle?: string;
  onClose?: () => void;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3.5 backdrop-blur-xl sm:px-5">
      <span className="relative shrink-0">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-bold",
            role === "notaire" ? "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white" : "bg-slate-200 text-slate-600",
          )}
        >
          {role === "notaire" ? (
            <Scale className="h-[18px] w-[18px]" />
          ) : (
            name
              .split(" ")
              .filter(Boolean)
              .map((part) => part[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()
          )}
        </span>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[14.5px] font-semibold tracking-tight text-slate-900">
          <span className="truncate">{name}</span>
          {badge && (
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                role === "notaire"
                  ? "bg-[#4373f5]/10 text-[#3563e9]"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {badge}
            </span>
          )}
        </p>
        {/* Une seule ligne : dans la bulle, la place est comptée. */}
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-slate-500">
          {typing ? (
            <>
              <span className="flex gap-0.5">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="h-1 w-1 animate-bounce rounded-full bg-slate-400"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
              en train d&apos;écrire…
            </>
          ) : online ? (
            "en ligne"
          ) : (
            <span className="truncate">{subtitle}</span>
          )}
        </p>
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fermer</span>
        </button>
      )}
    </header>
  );
}

/** Le bouton « revenir en bas », quand on a remonté le fil. */
export function ScrollToBottom({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute bottom-4 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-slate-600 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70"
    >
      <ArrowDown className="h-3.5 w-3.5" />
      Derniers messages
    </button>
  );
}


/* ---------- Chargement ------------------------------------------------------ */

/** Le fil pendant la première requête : la forme des bulles, sans le contenu. */
export function ChatSkeleton() {
  const rows: Array<{ from: "me" | "them"; width: string }> = [
    { from: "them", width: "62%" },
    { from: "them", width: "44%" },
    { from: "me", width: "52%" },
    { from: "them", width: "70%" },
    { from: "me", width: "38%" },
  ];
  return (
    <div className="flex flex-col gap-3 px-4 py-6 sm:px-5" aria-hidden>
      {rows.map((row, index) => (
        <div
          key={index}
          className={cn("flex items-end gap-2", row.from === "me" ? "flex-row-reverse" : "flex-row")}
        >
          <span className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-slate-200/70" />
          <span
            className={cn(
              "h-10 animate-pulse rounded-2xl",
              row.from === "me" ? "bg-[#4373f5]/15" : "bg-slate-200/70",
            )}
            style={{ width: row.width }}
          />
        </div>
      ))}
    </div>
  );
}

/** Le petit bandeau « Mise à jour… », le temps d'un rafraîchissement. */
export function RefreshChip({ children = "Mise à jour…" }: { children?: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2.5">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-slate-500 shadow-[0_6px_18px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70 backdrop-blur">
        <Loader2 className="h-3 w-3 animate-spin" />
        {children}
      </span>
    </div>
  );
}


/** L'en-tête pendant la première requête : la forme, sans les noms. */
export function ChatHeaderSkeleton() {
  return (
    <header
      aria-hidden
      className="flex items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 py-3.5 backdrop-blur-xl sm:px-5"
    >
      <span className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200/70" />
      <div className="flex-1 space-y-2">
        <span className="block h-4 w-40 animate-pulse rounded bg-slate-200/70" />
        <span className="block h-3 w-24 animate-pulse rounded bg-slate-200/60" />
      </div>
    </header>
  );
}

/* ---------- Confirmations --------------------------------------------------- */

/**
 * La confirmation avant une suppression. L'appelant garde son action serveur
 * et son message d'erreur ; ce composant n'est que la fenêtre.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  warning,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  busy = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  warning?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold tracking-tight">{title}</DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed">
            {description}
          </DialogDescription>
        </DialogHeader>

        {warning && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-red-600">
            {warning}
          </p>
        )}

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={busy}
            className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


/* ---------- Le tiroir ------------------------------------------------------- */

/**
 * L'habillage du panneau de conversation.
 *
 * Sur mobile, la conversation prend l'écran : c'est la seule mise en page
 * tenable au pouce. À partir de `sm`, elle se détache en bulle posée en bas à
 * droite, aux angles arrondis, et laisse voir la page derrière elle.
 *
 * La croix native du tiroir est masquée : l'en-tête de la conversation porte
 * la sienne, à sa place.
 */
export const CHAT_SHEET_CLASS = cn(
  "flex w-full flex-col gap-0 overflow-hidden p-0",
  "[&>button:last-child]:hidden",
  "sm:inset-y-auto sm:top-auto sm:bottom-5 sm:right-5",
  "sm:h-[min(46rem,calc(100dvh-2.5rem))] sm:max-w-[28rem]",
  "sm:rounded-[28px] sm:border sm:border-slate-200/70",
  "sm:shadow-[0_32px_80px_-28px_rgba(15,23,42,0.45)]",
);
