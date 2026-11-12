"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3, Eye, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CheckSection, StateChip } from "@/components/admin/check-list";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { documentKindLabels } from "@/lib/utils/document-labels";
import {
  acceptComplementRequest,
  cancelComplementRequest,
  remindComplementRequest,
  reviewComplementItem,
  type StaffComplementItem,
  type StaffComplementRequest,
} from "@/lib/actions/complement-requests";
import { COMPLEMENT_NOTE_MAX, REASON_LABELS, REDO_REASONS, type ComplementReasonValue } from "@/lib/utils/complement";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Demandes de pièces en cours du dossier : ce qui est attendu, ce qui est arrivé, et la décision de l'équipe. */
export function ComplementRequestsPanel({ requests, locked = false }: { requests: StaffComplementRequest[]; locked?: boolean }) {
  return (
    <>
      {requests.map((request) => (
        <RequestCard key={request.id} request={request} locked={locked} />
      ))}
    </>
  );
}

function RequestCard({ request, locked }: { request: StaffComplementRequest; locked: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = React.useState(false);
  const toReview = request.items.filter((item) => item.status === "PROVIDED").length;
  const waiting = request.items.filter((item) => item.status === "PENDING").length;
  const who = request.target === "OWNER" ? "propriétaire" : "locataire";

  const run = async (key: string, action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) => {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(done);
    router.refresh();
  };

  const sent = `Envoyée le ${fmtDay(request.createdAt)}${request.sentCount > 1 ? `, relancée ${request.sentCount - 1} fois (dernière le ${fmtDay(request.lastSentAt)})` : ""}`;

  return (
    <CheckSection
      id={`demande-${request.id}`}
      title={`Pièces demandées au ${who}`}
      subtitle={`${request.recipientName} · ${request.submittedAt ? `réponse reçue le ${fmtDay(request.submittedAt)}` : sent}`}
      headerRight={
        request.status === "SUBMITTED" ? (
          <StateChip tone="neutral" className="bg-blue-100 text-blue-800">
            À vérifier · {toReview}
          </StateChip>
        ) : (
          <StateChip tone="neutral" className="bg-amber-100 text-amber-900">
            En attente du client
          </StateChip>
        )
      }
      footer={
        locked ? undefined : request.status === "SUBMITTED" || (toReview > 0 && waiting === 0) ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              className="h-10 gap-1.5 max-sm:flex-1"
              disabled={!!busy || toReview === 0}
              onClick={() => run("accept-all", () => acceptComplementRequest({ requestId: request.id }), "Pièces acceptées")}
            >
              {busy === "accept-all" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Tout accepter
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {confirmCancel ? (
              <span className="flex flex-wrap items-center gap-2 text-[13px]">
                Annuler la demande ?
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-9"
                  disabled={!!busy}
                  onClick={() => run("cancel", () => cancelComplementRequest({ requestId: request.id }), "Demande annulée")}
                >
                  {busy === "cancel" && <Loader2 className="size-3.5 animate-spin" />}
                  Oui, annuler
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-9" onClick={() => setConfirmCancel(false)}>
                  Non
                </Button>
              </span>
            ) : (
              <Button type="button" variant="ghost" className="h-10 text-muted-foreground" onClick={() => setConfirmCancel(true)}>
                Annuler la demande
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-10 gap-1.5"
              disabled={!!busy}
              onClick={() => run("remind", () => remindComplementRequest({ requestId: request.id }), `Rappel envoyé à ${request.recipientEmail}`)}
            >
              {busy === "remind" ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Relancer
            </Button>
          </div>
        )
      }
    >
      <ul className="flex flex-col divide-y">
        {request.items.map((item) => (
          <ItemRow key={item.id} item={item} locked={locked} busy={busy} run={run} />
        ))}
      </ul>
    </CheckSection>
  );
}

function ItemRow({
  item,
  locked,
  busy,
  run,
}: {
  item: StaffComplementItem;
  locked: boolean;
  busy: string | null;
  run: (key: string, action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) => Promise<void>;
}) {
  const [redo, setRedo] = React.useState(false);
  const [reason, setReason] = React.useState<ComplementReasonValue>("ILLEGIBLE");
  const [note, setNote] = React.useState("");
  const provided = item.status === "PROVIDED";

  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-2.5 px-5 py-3.5">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-[22px] items-center justify-center rounded-full",
          item.status === "ACCEPTED" && "bg-green-100 text-green-800",
          provided && "bg-blue-100 text-blue-800",
          item.status === "PENDING" && "border-2 border-slate-300 text-slate-400",
        )}
      >
        {item.status === "ACCEPTED" ? <Check className="size-3.5" strokeWidth={3} /> : provided ? <Eye className="size-3" /> : <Clock3 className="size-3" />}
      </span>

      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[14.5px] font-semibold leading-snug">{item.label}</span>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-slate-600">{REASON_LABELS[item.reason]}</span>
        </div>
        {item.note && <p className="text-[13px] leading-relaxed text-muted-foreground">« {item.note} »</p>}
        <p
          className={cn(
            "text-[13px]",
            item.status === "ACCEPTED" ? "text-green-800" : provided ? "font-semibold text-blue-800" : "text-muted-foreground",
          )}
        >
          {item.status === "ACCEPTED"
            ? "Acceptée"
            : provided
              ? `Reçue · à vérifier${item.replaces > 0 ? " · remplacera l'ancien fichier une fois acceptée" : ""}`
              : "En attente du client"}
        </p>

        {item.documents.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.documents.map((doc) => (
              <DocumentViewer
                key={doc.id}
                document={{ id: doc.id, kind: item.kind, fileKey: doc.fileKey, mimeType: doc.mimeType, label: doc.label } as any}
                documentKindLabels={documentKindLabels}
              >
                <Button type="button" variant="outline" size="sm" className="h-9 max-w-full gap-1.5">
                  <Eye className="size-4 shrink-0" />
                  <span className="truncate">{doc.label || "Voir le fichier"}</span>
                </Button>
              </DocumentViewer>
            ))}
          </div>
        )}

        {provided && !locked && !redo && (
          <div className="flex flex-wrap gap-2 pt-0.5">
            <Button
              type="button"
              size="sm"
              className="h-9 gap-1.5"
              disabled={!!busy}
              onClick={() => run(`accept-${item.id}`, () => reviewComplementItem({ itemId: item.id, decision: "accept" }), "Pièce acceptée")}
            >
              {busy === `accept-${item.id}` ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
              Accepter
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" disabled={!!busy} onClick={() => setRedo(true)}>
              <RotateCcw className="size-3.5" />
              Redemander
            </Button>
          </div>
        )}

        {redo && (
          <div className="flex flex-col gap-2.5 rounded-lg border bg-muted/30 p-3">
            <div role="radiogroup" aria-label="Motif" className="flex flex-wrap gap-1.5">
              {REDO_REASONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={reason === value}
                  onClick={() => setReason(value)}
                  className={cn(
                    "h-8 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                    reason === value ? "border-blue-600 bg-blue-600 text-white" : "border-border bg-background text-foreground/80 hover:border-foreground/30",
                  )}
                >
                  {REASON_LABELS[value]}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={COMPLEMENT_NOTE_MAX}
              rows={2}
              placeholder="Précision pour le client (facultatif)"
              className="w-full resize-y rounded-md border bg-background px-3 py-2 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" className="h-9" disabled={!!busy} onClick={() => setRedo(false)}>
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 gap-1.5"
                disabled={!!busy}
                onClick={() =>
                  run(
                    `redo-${item.id}`,
                    () => reviewComplementItem({ itemId: item.id, decision: "redo", reason, note: note.trim() || undefined }),
                    "Pièce redemandée : le client a reçu un e-mail",
                  )
                }
              >
                {busy === `redo-${item.id}` && <Loader2 className="size-3.5 animate-spin" />}
                Redemander au client
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}
