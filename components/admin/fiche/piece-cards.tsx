"use client";

import * as React from "react";
import { ArrowRight, Clock3, Loader2, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComplementRequestButton } from "@/components/complements/complement-composer";
import { DocumentUploadButton, useAttachDocument } from "@/components/documents/document-upload-button";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { complementKey } from "@/lib/utils/complement";
import type { ChecklistRow } from "@/lib/utils/document-checklist";
import type { ChecklistVerification } from "@/components/documents/document-checklist";
import { cn } from "@/lib/utils";
import { RemindRequestButton, useFiche, type FicheClaim } from "./fiche-context";
import { PieceThumb } from "./piece-thumb";
import { PieceSheet } from "./piece-sheet";

export type PieceState = "todo" | "ok" | "missing" | "received" | "sent" | "plain";

export interface PieceInfo {
  row: ChecklistRow;
  label: string;
  /** À qui ou à quoi appartient la pièce (« Propriétaire · Chloë-Marie », « Le logement »). */
  owner?: string;
  state: PieceState;
  point?: { pointKey: string; verified: boolean };
  requestKey: string | null;
  claim?: FicheClaim;
}

const day = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) : null);

/** Pastille d'état d'une pièce : les mêmes mots sur la carte et dans le panneau. */
export function PieceStateChip({ info, className }: { info: PieceInfo; className?: string }) {
  const { state, claim } = info;
  const style =
    state === "ok"
      ? "bg-green-100 text-green-800"
      : state === "missing"
        ? "bg-red-100 text-red-800"
        : state === "received"
          ? "bg-blue-600 text-white"
          : state === "sent"
            ? "bg-amber-100 text-amber-900"
            : state === "plain"
              ? "bg-slate-100 text-slate-600"
              : "border border-slate-300 bg-background text-slate-600";
  const text =
    state === "ok"
      ? "✓ Vérifiée"
      : state === "missing"
        ? "! Manquante"
        : state === "received"
          ? "● Reçue · à contrôler"
          : state === "sent"
            ? `⏳ ${claim?.origin === "NOTAIRE" ? "Demandée par le notaire" : info.row.documents.length > 0 ? "Redemandée" : "Demandée"} le ${day(claim?.sentAt)}`
            : state === "plain"
              ? "Déposée"
              : "À vérifier";
  return <span className={cn("inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-full px-2 text-[11.5px] font-bold", style, className)}>{text}</span>;
}

/** État de chaque pièce : même règle partout (cartes, panneau, section « Pièces du dossier »). */
export function pieceInfos(
  rows: ChecklistRow[],
  verification: ChecklistVerification | undefined,
  complement: { bailId: string; target: "OWNER" | "TENANT" } | undefined,
  claims: Record<string, FicheClaim> | undefined,
  owner?: string,
): PieceInfo[] {
  return rows.map((row) => {
    const present = row.documents.length > 0;
    const point = verification && present ? verification.points[row.key] : undefined;
    const requestKey = complement && row.upload ? complementKey(row.kind, row.upload) : null;
    const claim = requestKey ? claims?.[requestKey] : undefined;
    const state: PieceState = !present
      ? row.required
        ? claim?.status === "PENDING"
          ? "sent"
          : "missing"
        : "plain"
      : claim?.status === "PROVIDED"
        ? "received"
        : claim?.status === "PENDING"
          ? "sent"
          : verification?.locked
            ? "ok"
            : !point
              ? "plain"
              : point.verified
                ? "ok"
                : "todo";
    return { row, label: row.label || documentKindLabels[row.kind] || row.kind, owner, state, point, requestKey, claim };
  });
}

/**
 * Pièces d'une section de la fiche dossier, en cartes compactes (deux par ligne) : aperçu, état en
 * clair, et l'action à faire. Un clic ouvre le panneau de vérification. Mêmes validations et mêmes
 * demandes que la liste classique.
 */
export function PieceCards({
  rows,
  verification,
  editable = false,
  complement,
  requestAction,
}: {
  rows: ChecklistRow[];
  verification?: ChecklistVerification;
  editable?: boolean;
  complement?: { bailId: string; target: "OWNER" | "TENANT" };
  requestAction?: React.ReactNode;
}) {
  const fiche = useFiche();
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [showOptional, setShowOptional] = React.useState(false);

  const infos = pieceInfos(rows, verification, complement, fiche?.claims);
  // Pièces facultatives pas encore déposées : derrière « Ajouter une pièce ».
  const optional = infos.filter((i) => !i.row.required && i.row.documents.length === 0);
  const cards = infos.filter((i) => !optional.includes(i));
  const count = (state: PieceState) => cards.filter((c) => c.state === state).length;
  const summary = [
    count("received") && `${count("received")} reçue${count("received") > 1 ? "s" : ""} à contrôler`,
    count("todo") && `${count("todo")} à vérifier`,
    count("sent") && `${count("sent")} réclamée${count("sent") > 1 ? "s" : ""}`,
    count("missing") && `${count("missing")} manquante${count("missing") > 1 ? "s" : ""}`,
    count("ok") && `${count("ok")} vérifiée${count("ok") > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const openIndex = cards.findIndex((c) => c.row.key === openKey);
  const locked = !!verification?.locked;

  if (cards.length === 0 && optional.length === 0) return null;

  return (
    <div className="@container flex flex-col gap-3 bg-gradient-to-b from-slate-50/70 to-transparent px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px]">
          <span className="font-semibold">Pièces</span>
          {summary && <span className="text-muted-foreground"> · {summary}</span>}
        </p>
        {editable && optional.length > 0 && (
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" aria-expanded={showOptional} onClick={() => setShowOptional((v) => !v)}>
            <Plus className="size-3.5" />
            Ajouter une pièce
          </Button>
        )}
      </div>

      {showOptional && (
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3">
          <p className="text-[12.5px] text-muted-foreground">Pièces facultatives pour cette section :</p>
          {optional.map((info) => (
            <div key={info.row.key} className="flex items-center justify-between gap-2">
              <span className="text-[13.5px] font-medium">{info.label}</span>
              {info.row.upload && <DocumentUploadButton target={info.row.upload} kind={info.row.kind} />}
            </div>
          ))}
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 gap-2 @xl:grid-cols-2">
          {cards.map((info) => (
            <PieceCard
              key={info.row.key}
              info={info}
              locked={locked}
              editable={editable}
              complement={complement}
              verification={verification}
              requestAction={requestAction}
              onOpen={() => setOpenKey(info.row.key)}
            />
          ))}
        </div>
      )}

      {openIndex >= 0 && (
        <PieceSheet
          info={cards[openIndex]}
          index={openIndex}
          total={cards.length}
          locked={locked}
          editable={editable}
          complement={complement}
          bailId={verification?.bailId ?? complement?.bailId ?? null}
          onClose={() => setOpenKey(null)}
          onPrev={openIndex > 0 ? () => setOpenKey(cards[openIndex - 1].row.key) : undefined}
          onNext={openIndex < cards.length - 1 ? () => setOpenKey(cards[openIndex + 1].row.key) : undefined}
        />
      )}
    </div>
  );
}

export function PieceCard({
  info,
  locked,
  editable,
  complement,
  verification,
  requestAction,
  onOpen,
}: {
  info: PieceInfo;
  locked: boolean;
  editable: boolean;
  complement?: { bailId: string; target: "OWNER" | "TENANT" };
  verification?: ChecklistVerification;
  requestAction?: React.ReactNode;
  onOpen: () => void;
}) {
  const { row, state, point, claim, requestKey } = info;
  const latest = [...row.documents].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())[0];
  const [dragging, setDragging] = React.useState(false);
  const canUpload = editable && !!row.upload && !locked;
  const attach = useAttachDocument({ target: (row.upload ?? {}) as any, kind: row.kind });


  const meta =
    row.documents.length > 0
      ? [
          latest?.createdAt && `reçue le ${day(latest.createdAt)}`,
          row.documents.length > 1 && `${row.documents.length} fichiers`,
          latest?.viaComplement && "en réponse à la demande",
        ]
          .filter(Boolean)
          .join(" · ")
      : state === "sent"
        ? claim?.origin === "NOTAIRE"
          ? "le client va l'envoyer au notaire"
          : "en attente du client"
        : canUpload
          ? "déposez le fichier sur la carte"
          : "à fournir";

  const stop = (event: React.SyntheticEvent) => event.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && event.target === event.currentTarget && (event.preventDefault(), onOpen())}
      onDragOver={(event) => {
        if (!canUpload || row.documents.length > 0) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (!canUpload || row.documents.length > 0) return;
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files?.length) attach.onFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card p-2 pr-2.5 text-left transition-shadow hover:shadow-[0_8px_20px_-14px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        state === "received" && "border-2 border-blue-600",
        state === "missing" && "border-2 border-dashed border-red-200 bg-red-50/40",
        dragging && "border-primary bg-primary/5",
      )}
    >
      {/* Plusieurs fichiers : une pile de feuilles derrière la miniature, et leur nombre. */}
      <span className={cn("relative block h-14 w-11 shrink-0", row.documents.length > 1 && "mr-1.5 mt-1.5")}>
        {row.documents.length > 2 && <span aria-hidden className="absolute inset-0 translate-x-[7px] -translate-y-[7px] rounded-md border bg-slate-100" />}
        {row.documents.length > 1 && <span aria-hidden className="absolute inset-0 translate-x-[3.5px] -translate-y-[3.5px] rounded-md border bg-slate-200" />}
        <span className="relative block size-full overflow-hidden rounded-md ring-1 ring-black/5">
          {latest ? (
            <PieceThumb doc={latest} width={44} className="size-full" />
          ) : (
            <span className={cn("flex size-full items-center justify-center", state === "missing" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500")}>
              {attach.busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            </span>
          )}
        </span>
        {row.documents.length > 1 && (
          <span className="absolute -bottom-1.5 -right-2 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-primary px-1 text-[10.5px] font-extrabold text-primary-foreground">
            {row.documents.length}
          </span>
        )}
      </span>
      <span className="flex min-w-[9rem] flex-1 flex-col gap-1">
        <span className="truncate text-[14px] font-semibold" title={info.label}>
          {info.label}
        </span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-muted-foreground">
          <PieceStateChip info={info} />
          <span className="truncate">{attach.busy ? `envoi ${attach.progress} %` : meta}</span>
        </span>
      </span>
      {!locked && (
        <span className="ml-auto flex flex-wrap justify-end gap-1.5" onClick={stop} onKeyDown={stop}>
          {state === "todo" && point && (
            // Pas de « Bonne » sur la carte : on répond dans le panneau, la pièce sous les yeux.
            <Button type="button" size="sm" className="h-8 gap-1 px-3 text-[12.5px]" onClick={onOpen}>
              Vérifier
              <ArrowRight className="size-3.5" />
            </Button>
          )}
          {state === "received" && (
            <Button type="button" size="sm" className="h-8 px-3 text-[12.5px]" onClick={onOpen}>
              Contrôler
            </Button>
          )}
          {state === "sent" && claim && claim.origin === "TEAM" && claim.requestStatus === "OPEN" && (
            <RemindRequestButton requestId={claim.requestId} email={claim.email} className="h-8" />
          )}
          {state === "missing" && (
            <>
              {complement && requestKey ? (
                <ComplementRequestButton bailId={complement.bailId} target={complement.target} preselect={{ key: requestKey }} label="Demander" variant="default" className="h-8" />
              ) : (
                requestAction
              )}
              {canUpload && <DocumentUploadButton target={row.upload!} kind={row.kind} className="h-8" />}
            </>
          )}
          {state === "ok" && !point && null}
        </span>
      )}
      {locked && state === "sent" && (
        <span className="ml-auto flex justify-end">
          <Clock3 className="size-4 text-amber-700" />
        </span>
      )}
    </div>
  );
}
