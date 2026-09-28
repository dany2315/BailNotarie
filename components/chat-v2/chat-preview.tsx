"use client";

import * as React from "react";
import { FileText, Monitor, Paperclip, Smartphone } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { RequestRespondForm, RequestStatusControl, type RequestStatus } from "./chat-ui";
import {
  ChatPanel,
  type ChatMessageView,
  type ChatRequestView,
  type ChatTimelineItem,
} from "./chat-panel";

/* =========================================================================
   Aperçu de la messagerie — maquette.

   Rien n'est branché : ni session, ni base, ni Pusher. Les envois, la frappe
   d'en face et la progression d'un dépôt sont simulés, uniquement pour juger
   l'interface. Les composants affichés, eux, sont ceux qui serviront ensuite.
   ========================================================================= */

type Persona = "proprietaire" | "locataire" | "notaire";

const PERSONAS: Array<{ id: Persona; label: string; hint: string }> = [
  { id: "proprietaire", label: "Propriétaire", hint: "Côté propriétaire, face au notaire" },
  { id: "locataire", label: "Locataire", hint: "Côté locataire, face au notaire" },
  { id: "notaire", label: "Notaire", hint: "Côté notaire, face à son client" },
];

/* ---------- Données d'exemple ----------------------------------------------- */

function at(base: number, minutesAgo: number): Date {
  return new Date(base - minutesAgo * 60_000);
}

function scenario(persona: Persona, base: number): ChatTimelineItem[] {
  const message = (
    id: string,
    from: "me" | "them",
    content: string,
    minutesAgo: number,
    extra: Partial<ChatMessageView> = {},
  ): ChatTimelineItem => ({
    type: "message",
    id,
    createdAt: at(base, minutesAgo),
    data: { id, from, content, createdAt: at(base, minutesAgo), status: from === "me" ? "read" : undefined, ...extra },
  });

  const request = (
    id: string,
    minutesAgo: number,
    data: Omit<ChatRequestView, "id" | "createdAt">,
  ): ChatTimelineItem => ({
    type: "request",
    id,
    createdAt: at(base, minutesAgo),
    data: { id, createdAt: at(base, minutesAgo), ...data },
  });

  if (persona === "notaire") {
    return [
      message("n1", "me", "Bonjour Monsieur Lévy, j'ai bien reçu votre dossier pour le 14 rue des Chartrons. Je le prends en main aujourd'hui.", 1_620, { canDelete: true }),
      message("n2", "them", "Bonjour Maître, parfait. Dites-moi ce qu'il vous manque.", 1_580, { authorName: "David Lévy" }),
      request("nr1", 1_540, {
        title: "Titre de propriété",
        content: "Merci de joindre l'acte d'acquisition du bien, ou l'attestation notariée.",
        status: "completed",
        targets: ["Propriétaire"],
        authorName: "Moi",
        documents: [{ id: "nd1", name: "acte-acquisition-2019.pdf", meta: "David Lévy · 2,4 Mo" }],
      }),
      message("n3", "them", "Voilà pour le titre. J'ai aussi le dernier avis de taxe foncière si besoin.", 1_500, { authorName: "David Lévy" }),
      message("n4", "me", "Merci, c'est noté. Il me reste l'attestation d'assurance propriétaire non occupant.", 96, { canDelete: true }),
      request("nr2", 94, {
        title: "Attestation d'assurance PNO",
        content: "Une attestation en cours de validité suffit. Dès réception, je lance la rédaction du bail.",
        status: "pending",
        targets: ["Propriétaire"],
        authorName: "Moi",
      }),
      request("nr3", 92, {
        title: "Dernier avis de taxe foncière",
        content: "Finalement inutile : le titre de propriété suffit pour la rédaction.",
        status: "cancelled",
        targets: ["Propriétaire"],
        authorName: "Moi",
      }),
      message("n5", "them", "Je la demande à mon assureur, je vous l'envoie dans la journée.", 28, { authorName: "David Lévy" }),
      message("n6", "me", "Très bien. Le projet de bail sera prêt sous 48 h après réception.", 12, { canDelete: true }),
    ];
  }

  if (persona === "locataire") {
    return [
      message("l1", "them", "Bonjour Madame Bernard, je suis le notaire chargé du bail du 14 rue des Chartrons.", 1_500, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
      message("l2", "them", "Vos informations sont complètes, merci. Il me manque une pièce pour finaliser.", 1_499, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
      request("lr1", 1_470, {
        title: "Justificatif de domicile",
        content: "Une quittance de loyer ou une facture d'énergie de moins de trois mois.",
        status: "completed",
        targets: ["Locataire"],
        authorName: "Maître Claire Ferrand",
        documents: [{ id: "ld1", name: "quittance-juillet.pdf", meta: "Moi · 480 Ko" }],
      }),
      message("l3", "me", "C'est envoyé. Bonne réception.", 1_460),
      message("l4", "them", "Parfait. Dernière pièce et nous pourrons signer.", 140, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
      request("lr2", 138, {
        title: "Attestation d'assurance habitation",
        content: "L'attestation doit couvrir le logement à la date d'entrée, soit le 1er octobre.",
        status: "pending",
        targets: ["Locataire"],
        authorName: "Maître Claire Ferrand",
        canRespond: true,
      }),
      message("l5", "me", "Je récupère l'attestation auprès de mon assureur et je la dépose ici.", 34, { status: "read" }),
      message("l6", "them", "Très bien, je reste à votre disposition.", 8, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
    ];
  }

  return [
    message("p1", "them", "Bonjour Monsieur Lévy, votre dossier est ouvert. Je suis Maître Ferrand, je m'occupe de votre bail.", 1_600, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
    message("p2", "me", "Bonjour Maître, très bien. Que vous faut-il de mon côté ?", 1_590),
    request("pr1", 1_560, {
      title: "Titre de propriété",
      content: "Merci de joindre l'acte d'acquisition du bien, ou l'attestation notariée.",
      status: "completed",
      targets: ["Propriétaire"],
      authorName: "Maître Claire Ferrand",
      documents: [{ id: "pd1", name: "acte-acquisition-2019.pdf", meta: "Moi · 2,4 Mo" }],
    }),
    message("p3", "me", "Voilà le titre de propriété. J'ai aussi la taxe foncière si vous en avez besoin.", 1_552, {
      attachments: [{ id: "pa1", name: "taxe-fonciere-2025.pdf", meta: "1,1 Mo" }],
    }),
    message("p4", "them", "Reçu, merci. Je reviens vers vous après lecture du diagnostic.", 1_500, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
    message("p5", "them", "Le diagnostic est conforme. Il me manque une seule pièce pour rédiger le bail.", 120, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
    request("pr2", 118, {
      title: "Attestation d'assurance PNO",
      content: "Une attestation en cours de validité suffit. Dès réception, je lance la rédaction du bail.",
      status: "pending",
      targets: ["Propriétaire"],
      authorName: "Maître Claire Ferrand",
      canRespond: true,
    }),
    message("p6", "me", "Je la demande à mon assureur aujourd'hui.", 26, { status: "read" }),
    message("p7", "them", "Parfait. Comptez 48 h ensuite pour le projet de bail.", 9, { authorName: "Maître Claire Ferrand", authorRole: "notaire" }),
  ];
}

const REPLIES: Record<Persona, string[]> = {
  proprietaire: [
    "Très bien, je note. Je reviens vers vous dès que la pièce est validée.",
    "C'est enregistré dans votre dossier. Rien d'autre ne vous est demandé pour l'instant.",
    "Je vous confirme la réception. Le projet de bail suivra sous 48 h.",
  ],
  locataire: [
    "Merci, c'est bien reçu. Je vérifie la date de couverture et je vous confirme.",
    "Noté. Vous n'avez plus rien à faire de votre côté pour le moment.",
    "Parfait, votre dossier locataire est complet.",
  ],
  notaire: [
    "Merci Maître, c'est noté.",
    "Très bien, je vous envoie ça dans la journée.",
    "D'accord, je m'en occupe tout de suite.",
  ],
};

const INTERLOCUTOR: Record<
  Persona,
  { name: string; role: "notaire" | "client"; badge: string; subtitle: string }
> = {
  proprietaire: {
    name: "Maître Claire Ferrand",
    role: "notaire",
    badge: "Notaire",
    subtitle: "vu il y a 4 min",
  },
  locataire: {
    name: "Maître Claire Ferrand",
    role: "notaire",
    badge: "Notaire",
    subtitle: "vu il y a 4 min",
  },
  notaire: {
    name: "David Lévy",
    role: "client",
    badge: "Propriétaire",
    subtitle: "vu il y a 12 min",
  },
};

/* ---------- Le pilote de la maquette ---------------------------------------- */

function usePreviewChat(persona: Persona) {
  const base = React.useMemo(() => Date.now(), [persona]);
  const [items, setItems] = React.useState<ChatTimelineItem[]>(() => scenario(persona, base));
  const [value, setValue] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [typing, setTyping] = React.useState(false);
  const [replyIndex, setReplyIndex] = React.useState(0);
  const timers = React.useRef<number[]>([]);
  const pickerRef = React.useRef<HTMLInputElement>(null);

  // Changer de rôle repart d'un fil propre.
  React.useEffect(() => {
    setItems(scenario(persona, base));
    setValue("");
    setFiles([]);
    setSending(false);
    setTyping(false);
    setReplyIndex(0);
  }, [persona, base]);

  React.useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    [],
  );

  const later = React.useCallback((fn: () => void, delay: number) => {
    timers.current.push(window.setTimeout(fn, delay));
  }, []);

  const patchMessage = React.useCallback(
    (id: string, patch: Partial<ChatMessageView>) => {
      setItems((current) =>
        current.map((item) =>
          item.type === "message" && item.id === id
            ? { ...item, data: { ...item.data, ...patch } }
            : item,
        ),
      );
    },
    [],
  );

  const submit = React.useCallback(() => {
    const text = value.trim();
    if (!text && files.length === 0) return;
    const id = `local-${Date.now()}`;
    const createdAt = new Date();

    setItems((current) => [
      ...current,
      {
        type: "message",
        id,
        createdAt,
        data: {
          id,
          from: "me",
          content: text,
          createdAt,
          status: "sending",
          canDelete: true,
          attachments: files.map((file, index) => ({
            id: `${id}-${index}`,
            name: file.name,
            meta: `${(file.size / 1024).toFixed(0)} Ko`,
          })),
        },
      },
    ]);
    setValue("");
    setFiles([]);

    // Accusés de réception, puis une réponse d'en face — simulés.
    later(() => patchMessage(id, { status: "sent" }), 550);
    later(() => patchMessage(id, { status: "read" }), 1_300);
    later(() => setTyping(true), 1_700);
    later(() => {
      setTyping(false);
      const replies = REPLIES[persona];
      const reply = replies[replyIndex % replies.length];
      setReplyIndex((index) => index + 1);
      const replyId = `reply-${Date.now()}`;
      const replyAt = new Date();
      setItems((current) => [
        ...current,
        {
          type: "message",
          id: replyId,
          createdAt: replyAt,
          data: {
            id: replyId,
            from: "them",
            content: reply,
            createdAt: replyAt,
            authorName: INTERLOCUTOR[persona].name,
            authorRole: INTERLOCUTOR[persona].role,
          },
        },
      ]);
    }, 3_400);
  }, [value, files, later, patchMessage, persona, replyIndex]);

  const removeMessage = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    value,
    setValue,
    files,
    setFiles,
    sending,
    setSending,
    typing,
    submit,
    removeMessage,
    pickerRef,
    setItems,
  };
}

/* ---------- Le formulaire de réponse, simulé -------------------------------- */

function PreviewRespondForm({
  onDone,
}: {
  onDone: (files: File[]) => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [sending, setSending] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const submit = () => {
    if (files.length === 0) return;
    setSending(true);
    setProgress(0);
    let value = 0;
    const tick = window.setInterval(() => {
      value += 12 + Math.random() * 14;
      if (value >= 100) {
        window.clearInterval(tick);
        setProgress(100);
        window.setTimeout(() => {
          setSending(false);
          onDone(files);
          setFiles([]);
          setProgress(0);
        }, 320);
        return;
      }
      setProgress(value);
    }, 160);
  };

  return (
    <RequestRespondForm
      files={files}
      onPick={(picked) => picked && setFiles((current) => [...current, ...Array.from(picked)])}
      onRemoveFile={(index) => setFiles((current) => current.filter((_, i) => i !== index))}
      onSubmit={submit}
      sending={sending}
      progress={progress}
    />
  );
}

/* ---------- Créer une demande, côté notaire --------------------------------- */

/**
 * Le dialogue tel que le notaire l'ouvre depuis la barre d'écriture. Ici il ne
 * fait qu'ajouter une carte au fil ; dans l'application, il garde son appel à
 * `createNotaireRequest` et ses validations.
 */
function NewRequestDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (request: { title: string; content: string; targets: string[] }) => void;
}) {
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [targets, setTargets] = React.useState<string[]>(["Propriétaire"]);

  const toggle = (target: string) =>
    setTargets((current) =>
      current.includes(target) ? current.filter((t) => t !== target) : [...current, target],
    );

  const submit = () => {
    if (!title.trim() || !content.trim() || targets.length === 0) return;
    onCreate({ title: title.trim(), content: content.trim(), targets });
    setTitle("");
    setContent("");
    setTargets(["Propriétaire"]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-[17px] font-semibold tracking-tight">
            Créer une demande de document
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Demander un document à David Lévy (Propriétaire)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="request-title"
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
            >
              Nom du document
            </label>
            <input
              id="request-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex. Attestation d'assurance"
              className="w-full rounded-xl bg-slate-50 px-3.5 py-2.5 text-base text-slate-800 ring-1 ring-slate-200/80 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-[#4373f5]/40"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="request-content"
              className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400"
            >
              Contenu de la demande
            </label>
            <textarea
              id="request-content"
              rows={4}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Décrivez ce que vous attendez…"
              className="w-full resize-none rounded-xl bg-slate-50 px-3.5 py-2.5 text-base leading-relaxed text-slate-800 ring-1 ring-slate-200/80 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-[#4373f5]/40"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Destinataire
            </p>
            <div className="flex flex-wrap gap-2">
              {["Propriétaire", "Locataire"].map((target) => {
                const active = targets.includes(target);
                return (
                  <button
                    key={target}
                    type="button"
                    onClick={() => toggle(target)}
                    className={cn(
                      "rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                      active
                        ? "bg-[#4373f5]/10 text-[#3563e9] ring-1 ring-[#4373f5]/30"
                        : "bg-slate-50 text-slate-500 ring-1 ring-slate-200/80 hover:text-slate-800",
                    )}
                  >
                    {target}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || !content.trim() || targets.length === 0}
            className="rounded-xl bg-gradient-to-b from-[#5b85f7] to-[#3563e9] px-4 py-2.5 text-[12.5px] font-semibold text-white shadow-[0_10px_22px_-12px_rgba(53,99,233,0.9)] transition-opacity disabled:opacity-50"
          >
            Créer la demande
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- La page --------------------------------------------------------- */

export function ChatPreview() {
  const [persona, setPersona] = React.useState<Persona>("proprietaire");
  const [device, setDevice] = React.useState<"desktop" | "mobile">("desktop");
  // Le premier rendu client montre le squelette : c'est aussi un état à juger.
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const id = window.setTimeout(() => setReady(true), 650);
    return () => window.clearTimeout(id);
  }, []);

  const chat = usePreviewChat(persona);
  const who = INTERLOCUTOR[persona];
  const isNotaire = persona === "notaire";
  const [requestDialog, setRequestDialog] = React.useState(false);

  const completeRequest = (requestId: string, files: File[]) => {
    chat.setItems((current) =>
      current.map((item) =>
        item.type === "request" && item.id === requestId
          ? {
              ...item,
              data: {
                ...item.data,
                status: "completed" as const,
                canRespond: false,
                documents: [
                  ...(item.data.documents ?? []),
                  ...files.map((file, index) => ({
                    id: `${requestId}-up-${index}`,
                    name: file.name,
                    meta: `Envoyé · ${(file.size / 1024).toFixed(0)} Ko`,
                  })),
                ],
              },
            }
          : item,
      ),
    );
  };

  const addRequest = (request: { title: string; content: string; targets: string[] }) => {
    const id = `req-${Date.now()}`;
    const createdAt = new Date();
    chat.setItems((current) => [
      ...current,
      {
        type: "request",
        id,
        createdAt,
        data: {
          id,
          createdAt,
          title: request.title,
          content: request.content,
          status: "pending",
          targets: request.targets,
          authorName: "Moi",
        },
      },
    ]);
  };

  const setRequestStatus = (requestId: string, status: RequestStatus) => {
    chat.setItems((current) =>
      current.map((item) =>
        item.type === "request" && item.id === requestId
          ? { ...item, data: { ...item.data, status } }
          : item,
      ),
    );
  };

  const panel = (
    <ChatPanel
      interlocutor={{
        name: who.name,
        role: who.role,
        badge: who.badge,
        online: persona !== "notaire",
        typing: chat.typing,
        subtitle: who.subtitle,
      }}
      items={chat.items}
      loading={!ready}
      composer={{
        value: chat.value,
        onChange: chat.setValue,
        onSubmit: chat.submit,
        onAttach: () => chat.pickerRef.current?.click(),
        // Côté notaire, la barre d'écriture ouvre aussi la demande de document.
        actions: isNotaire
          ? [
              {
                id: "request",
                label: "Demande de document",
                icon: FileText,
                onSelect: () => setRequestDialog(true),
              },
              {
                id: "attach",
                label: "Ajouter photo / fichiers",
                icon: Paperclip,
                onSelect: () => chat.pickerRef.current?.click(),
              },
            ]
          : undefined,
        // Côté notaire, Entrée va à la ligne : seul le bouton envoie.
        enterToSend: !isNotaire,
        files: chat.files.map((file) => ({ name: file.name, size: file.size })),
        onRemoveFile: (index) =>
          chat.setFiles((current) => current.filter((_, i) => i !== index)),
        placeholder: isNotaire ? "Écrire à votre client…" : "Écrire au notaire…",
      }}
      onDeleteMessage={chat.removeMessage}
      onDownloadAttachment={() => undefined}
      onOpenAttachment={() => undefined}
      renderRespond={(request) => (
        <PreviewRespondForm onDone={(files) => completeRequest(request.id, files)} />
      )}
      renderRequestFooter={
        isNotaire
          ? (request) => (
              <RequestStatusControl
                status={request.status}
                onChange={(status) => setRequestStatus(request.id, status)}
                onDelete={() =>
                  chat.setItems((current) => current.filter((item) => item.id !== request.id))
                }
              />
            )
          : undefined
      }
      onClose={() => undefined}
    />
  );

  return (
    <div className="min-h-screen bg-[#f2f4f8]">
      {/* Le sélecteur de fichiers du composeur : réel, pour juger le parcours. */}
      <input
        ref={chat.pickerRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            chat.setFiles((current) => [...current, ...Array.from(event.target.files!)]);
          }
          event.target.value = "";
        }}
      />

      <NewRequestDialog
        open={requestDialog}
        onOpenChange={setRequestDialog}
        onCreate={addRequest}
      />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#3563e9]">
          Maquette
        </p>
        <h1 className="lp-title mt-2 text-[26px] font-bold tracking-tight text-slate-900 sm:text-[32px]">
          La messagerie, repensée
        </h1>
        <p className="mt-2 max-w-[560px] text-[13.5px] leading-relaxed text-slate-500">
          Le même fil pour les trois espaces : propriétaire, locataire et notaire. Tout est
          cliquable — écrivez, joignez un document, répondez à une demande, survolez vos
          messages pour les supprimer.
        </p>

        {/* ── Réglages de l'aperçu ─────────────────────────────────────────── */}
        <div className="mt-7 flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200/80">
            {PERSONAS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setPersona(entry.id)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-[12.5px] font-semibold transition-colors",
                  persona === entry.id
                    ? "bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-white shadow-[0_8px_18px_-10px_rgba(53,99,233,0.9)]"
                    : "text-slate-500 hover:text-slate-800",
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-slate-200/80">
            {([
              { id: "desktop" as const, label: "Bureau", icon: Monitor },
              { id: "mobile" as const, label: "Mobile", icon: Smartphone },
            ]).map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setDevice(entry.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold transition-colors",
                  device === entry.id ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800",
                )}
              >
                <entry.icon className="h-3.5 w-3.5" />
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-[12px] text-slate-400">
          {PERSONAS.find((entry) => entry.id === persona)?.hint}
        </p>

        {/* ── L'aperçu ─────────────────────────────────────────────────────── */}
        <div className="mt-6">
          {device === "desktop" ? (
            <div className="overflow-hidden rounded-[22px] bg-white shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70">
              <div className="flex items-center gap-1.5 border-b border-slate-200/70 bg-slate-50/80 px-4 py-2.5">
                {["#f87171", "#fbbf24", "#34d399"].map((color) => (
                  <span key={color} className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                ))}
                <span className="ml-2 text-[11px] font-medium text-slate-400">
                  Panneau latéral · largeur réelle du tiroir
                </span>
              </div>
              <div className="h-[640px]">{panel}</div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-[380px] max-w-full overflow-hidden rounded-[38px] bg-slate-900 p-2.5 shadow-[0_40px_80px_-30px_rgba(15,23,42,0.5)]">
                <div className="relative h-[720px] overflow-hidden rounded-[30px] bg-white">
                  <span className="absolute left-1/2 top-2 z-20 h-1.5 w-20 -translate-x-1/2 rounded-full bg-slate-900/80" />
                  <div className="h-full pt-4">{panel}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <ul className="mt-7 grid gap-x-8 gap-y-2 text-[12.5px] text-slate-500 sm:grid-cols-2">
          {[
            "Bulles regroupées par auteur, séparateurs de jour, heure sur la dernière du groupe",
            "Accusés : en cours, envoyé, lu — et l'état « non envoyé » en cas d'échec",
            "Demandes du notaire dans le fil : en attente, complétée, annulée, avec destinataires",
            "Côté notaire : « + » dans la barre d'écriture pour créer une demande, et statut modifiable",
            "Pièces jointes dans la bulle, téléchargement au clic",
            "Présence, « en train d'écrire… », squelette de chargement, retour en bas",
            "Suppression d'un message au survol, comme aujourd'hui",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#4373f5]" />
              {line}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
