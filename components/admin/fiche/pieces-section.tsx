"use client";

import * as React from "react";
import { FolderOpen, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentUploadButton } from "@/components/documents/document-upload-button";
import type { ChecklistRow } from "@/lib/utils/document-checklist";
import type { ChecklistVerification } from "@/components/documents/document-checklist";
import { cn } from "@/lib/utils";
import { useFiche } from "./fiche-context";
import { PieceCard, pieceInfos, type PieceInfo, type PieceState } from "./piece-cards";
import { PieceSheet } from "./piece-sheet";
import { GuidedReview, START_REVIEW_EVENT, type AnswerInfo, type BasketEntry, type RelanceInfo } from "./guided-review";

export interface PieceGroup {
  id: string;
  /** « Propriétaire », « Locataire », « Le logement », « Le bail ». */
  title: string;
  /** Nom de la personne (vide pour le logement et le bail). */
  name?: string;
  rows: ChecklistRow[];
  verification?: ChecklistVerification;
  complement?: { bailId: string; target: "OWNER" | "TENANT" };
  editable: boolean;
}

interface Item {
  info: PieceInfo;
  group: PieceGroup;
}

/**
 * Toutes les pièces du dossier au même endroit, rangées par personne puis le logement et le bail :
 * on les contrôle d'une traite, et « Suivante » passe d'une pièce à l'autre dans tout le dossier.
 * Mêmes validations, mêmes demandes et mêmes envois de fichiers que la fiche classique.
 */
export function PiecesSection({
  groups,
  bailId,
  diagnostics,
  guided,
}: {
  groups: PieceGroup[];
  bailId: string;
  /** « Commencer la vérification » : contrôles légaux, relances et transmission repris dans le parcours. */
  guided?: {
    legalChecks?: React.ReactNode;
    legalPending: number;
    answers: AnswerInfo[];
    relances: RelanceInfo[];
    remind?: React.ReactNode;
    sendButton?: React.ReactNode;
  };
  /** Lecture des diagnostics (décisions par diagnostic, envoi au propriétaire) : dans le panneau de la pièce. */
  diagnostics?: React.ReactNode;
}) {
  const fiche = useFiche();
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [optionalFor, setOptionalFor] = React.useState<string | null>(null);
  // Parcours guidé : pièces figées au départ ; ce qui est mis de côté part en une demande à la fin.
  const [review, setReview] = React.useState<string[] | null>(null);
  const [basket, setBasket] = React.useState<BasketEntry[]>([]);

  const perGroup = groups.map((group) => {
    const infos = pieceInfos(group.rows, group.verification, group.complement, fiche?.claims, group.name ? `${group.title} · ${group.name}` : group.title);
    const optional = infos.filter((i) => !i.row.required && i.row.documents.length === 0);
    return { group, cards: infos.filter((i) => !optional.includes(i)), optional };
  });
  const items: Item[] = perGroup.flatMap(({ group, cards }) => cards.map((info) => ({ info, group })));
  const count = (state: PieceState) => items.filter((item) => item.info.state === state).length;
  const summary = [
    count("received") && `${count("received")} reçue${count("received") > 1 ? "s" : ""} à contrôler`,
    count("todo") && `${count("todo")} à vérifier`,
    count("sent") && `${count("sent")} réclamée${count("sent") > 1 ? "s" : ""}`,
    count("missing") && `${count("missing")} manquante${count("missing") > 1 ? "s" : ""}`,
    count("ok") && `${count("ok")} vérifiée${count("ok") > 1 ? "s" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
  // Ordre du parcours : réponses reçues, puis pièces à vérifier, puis pièces manquantes.
  const reviewOrder: PieceState[] = ["received", "todo", "missing"];
  const startReview = React.useCallback(() => {
    if (!guided) return;
    setOpenKey(null);
    setReview(
      reviewOrder.flatMap((state) =>
        items.filter((item) => item.info.state === state && !(state === "missing" && !item.group.complement)).map((item) => item.info.row.key),
      ),
    );
  }, [guided, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const startRef = React.useRef(startReview);
  startRef.current = startReview;
  React.useEffect(() => {
    const onStart = () => {
      startRef.current();
      document.getElementById("bloc-pieces")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    window.addEventListener(START_REVIEW_EVENT, onStart);
    return () => window.removeEventListener(START_REVIEW_EVENT, onStart);
  }, []);
  const openIndex = items.findIndex((item) => item.info.row.key === openKey);
  const open = openIndex >= 0 ? items[openIndex] : null;

  if (items.length === 0 && perGroup.every((g) => g.optional.length === 0)) return null;

  return (
    <section id="bloc-pieces" className="@container scroll-mt-64 overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderOpen className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[17px] font-semibold leading-snug">Pièces du dossier</h2>
            <p className="text-[13px] text-muted-foreground">
              {items.length} pièce{items.length > 1 ? "s" : ""}
              {summary ? ` · ${summary}` : ""}
            </p>
          </div>
        </div>
        {guided && (
          <Button type="button" className="h-10 gap-1.5" onClick={startReview}>
            <Play className="size-4" />
            Commencer la vérification
          </Button>
        )}
      </header>

      <div className="flex flex-col divide-y">
        {perGroup.map(({ group, cards, optional }) =>
          cards.length === 0 && optional.length === 0 ? null : (
            <div key={group.id} className="flex flex-col gap-2.5 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 text-[14px]">
                  <span className="font-semibold">{group.title}</span>
                  {group.name && <span className="text-muted-foreground"> · {group.name}</span>}
                </p>
                {group.editable && optional.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    aria-expanded={optionalFor === group.id}
                    onClick={() => setOptionalFor((current) => (current === group.id ? null : group.id))}
                  >
                    <Plus className="size-3.5" />
                    Ajouter une pièce
                  </Button>
                )}
              </div>
              {optionalFor === group.id && (
                <div className="flex flex-col gap-1.5 rounded-xl border bg-muted/30 p-3">
                  <p className="text-[12.5px] text-muted-foreground">Pièces facultatives :</p>
                  {optional.map((info) => (
                    <div key={info.row.key} className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium">{info.label}</span>
                      {info.row.upload && <DocumentUploadButton target={info.row.upload} kind={info.row.kind} />}
                    </div>
                  ))}
                </div>
              )}
              {cards.length > 0 && (
                <div className={cn("grid grid-cols-1 gap-2 @xl:grid-cols-2")}>
                  {cards.map((info) => (
                    <PieceCard
                      key={info.row.key}
                      info={info}
                      locked={!!group.verification?.locked}
                      editable={group.editable}
                      complement={group.complement}
                      verification={group.verification}
                      onOpen={() => setOpenKey(info.row.key)}
                    />
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>

      {review && guided && (
        <GuidedReview
          items={items}
          pieceKeys={review}
          basket={basket}
          setBasket={setBasket}
          legalChecks={guided.legalChecks}
          legalPending={guided.legalPending}
          answers={guided.answers}
          relances={guided.relances}
          remind={guided.remind}
          sendButton={guided.sendButton}
          diagnostics={diagnostics}
          bailId={bailId}
          onExit={() => setReview(null)}
        />
      )}

      {open && !review && (
        <PieceSheet
          info={open.info}
          index={openIndex}
          total={items.length}
          locked={!!open.group.verification?.locked}
          editable={open.group.editable}
          complement={open.group.complement}
          bailId={open.group.verification?.bailId ?? open.group.complement?.bailId ?? bailId}
          onClose={() => setOpenKey(null)}
          onPrev={openIndex > 0 ? () => setOpenKey(items[openIndex - 1].info.row.key) : undefined}
          onNext={openIndex < items.length - 1 ? () => setOpenKey(items[openIndex + 1].info.row.key) : undefined}
          extra={open.info.row.kind === "DIAGNOSTICS" ? diagnostics : undefined}
        />
      )}
    </section>
  );
}
