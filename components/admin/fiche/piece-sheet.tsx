"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, Check, Clock3, Download, File, Loader2, Maximize2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { DocumentUploadButton } from "@/components/documents/document-upload-button";
import { DocumentDeleteButton } from "@/components/documents/document-delete-button";
import { ComplementComposer } from "@/components/complements/complement-composer";
import { ComplementItemReview } from "@/components/complements/complement-requests-panel";
import { setVerificationPoints } from "@/lib/actions/verification";
import { useDownloadFile } from "@/hooks/use-download-file";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { getPdfPreviewUrl } from "@/lib/utils/pdf-preview";
import { COMPLEMENT_NOTE_MAX, REASON_LABELS, REDO_REASONS, type ComplementReasonValue } from "@/lib/utils/complement";
import { cn } from "@/lib/utils";
import { RemindRequestButton } from "./fiche-context";
import dynamic from "next/dynamic";
import { fileKindOf, signedUrl } from "./piece-thumb";

// Lecture des PDF (pdf.js) : seulement dans le navigateur.
const PdfPages = dynamic(() => import("./pdf-first-page").then((m) => m.PdfPages), { ssr: false });
import { PieceStateChip, type PieceInfo } from "./piece-cards";

const day = (d?: Date | string | null) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

/** Ce que l'équipe regarde sur la pièce (aide-mémoire, rien n'est enregistré). */
const HINTS: Record<string, string[]> = {
  ID_IDENTITY: ["Lisible : photo nette, document entier", "En cours de validité", "Au nom de la personne, avec les mêmes informations que celles saisies"],
  KBIS: ["Lisible", "Récent (moins de 3 mois)", "Au nom de la société"],
  STATUTES: ["Lisibles et complets", "Signés", "Au nom de la société"],
  DIAGNOSTICS: ["Tous les diagnostics obligatoires sont là", "Chacun est encore valable", "Pour ce logement"],
  TITLE_DEED: ["Lisible et complet", "Au nom du propriétaire", "Pour ce logement"],
  CONTRAT_DE_MARIAGE: ["Lisible et complet", "Au nom des deux époux"],
  CONTRAT_DE_PACS: ["Lisible et complet", "Au nom des deux partenaires"],
  INSURANCE: ["Lisible", "En cours de validité", "Pour ce logement"],
};
const DEFAULT_HINTS = ["Lisible et complet", "Correspond bien à la pièce demandée"];

/**
 * Panneau de vérification d'une pièce : la pièce en grand à gauche ; à droite ce qu'il faut regarder,
 * les données à comparer, puis « La pièce est bonne » (même validation que la fiche) ou « À redemander »
 * (fenêtre « Demander » habituelle, préremplie). Remplacer, ajouter, supprimer : les mêmes actions qu'avant.
 */
export function PieceSheet({
  info,
  index,
  total,
  locked,
  editable,
  complement,
  bailId,
  onClose,
  onPrev,
  onNext,
}: {
  info: PieceInfo;
  index: number;
  total: number;
  locked: boolean;
  editable: boolean;
  complement?: { bailId: string; target: "OWNER" | "TENANT" };
  bailId: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const { row, point, claim, requestKey, state } = info;
  const files = React.useMemo(
    () => [...row.documents].sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()),
    [row.documents],
  );
  const [fileIndex, setFileIndex] = React.useState(0);
  const doc = files[Math.min(fileIndex, Math.max(0, files.length - 1))];
  const [url, setUrl] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [redo, setRedo] = React.useState(false);
  const [reason, setReason] = React.useState<ComplementReasonValue>("ILLEGIBLE");
  const [note, setNote] = React.useState("");
  const [composing, setComposing] = React.useState(false);
  const [pdfFailed, setPdfFailed] = React.useState(false);
  const { downloadFile, isFileDownloading } = useDownloadFile();
  const canUpload = editable && !!row.upload && !locked;

  React.useEffect(() => {
    setFileIndex(0);
    setRedo(false);
    setNote("");
    setReason("ILLEGIBLE");
    setPdfFailed(false);
  }, [row.key]);

  React.useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    setUrl(null);
    signedUrl(doc.fileKey).then((value) => !cancelled && setUrl(value));
    return () => {
      cancelled = true;
    };
  }, [doc?.fileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const setVerified = (verified: boolean) =>
    startTransition(async () => {
      if (!point || !bailId) return;
      const result = await setVerificationPoints({ bailId, pointKeys: [point.pointKey], verified });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (verified) {
        toast.success(`${info.label} : vérifiée`);
        onNext?.();
      }
    });

  const kind = doc ? fileKindOf(doc) : "other";
  const hints = HINTS[row.kind] ?? DEFAULT_HINTS;
  const name = doc ? doc.label || documentKindLabels[doc.kind] || "Fichier" : info.label;

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-[min(1100px,100vw)]">
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-1">
          {/* La pièce en grand */}
          <div className="flex min-h-[40vh] min-w-0 flex-col bg-slate-100 lg:min-h-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2 border-b bg-card px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold" title={name}>
                {name}
              </span>
              {files.length > 1 && (
                <span role="tablist" aria-label="Fichiers" className="flex gap-1">
                  {files.map((file, i) => (
                    <button
                      key={file.id}
                      type="button"
                      role="tab"
                      aria-selected={i === fileIndex}
                      onClick={() => setFileIndex(i)}
                      className={cn("h-7 rounded-md px-2.5 text-[12.5px] font-semibold", i === fileIndex ? "bg-slate-900 text-white" : "text-muted-foreground hover:bg-muted")}
                    >
                      Fichier {i + 1}
                    </button>
                  ))}
                </span>
              )}
              {doc && (
                <>
                  <DocumentViewer document={doc} documentKindLabels={documentKindLabels}>
                    <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                      <Maximize2 className="size-3.5" />
                      Agrandir
                    </Button>
                  </DocumentViewer>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={isFileDownloading(doc.fileKey)}
                    onClick={() => downloadFile(doc.fileKey, name)}
                  >
                    {isFileDownloading(doc.fileKey) ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                    Télécharger
                  </Button>
                </>
              )}
            </div>
            <div className={cn("flex min-h-0 flex-1 justify-center overflow-y-auto p-4", kind === "pdf" && url && !pdfFailed ? "items-start" : "items-center")}>
              {!doc ? (
                <div className="flex flex-col items-center gap-2 text-center text-[14px] text-muted-foreground">
                  <File className="size-10" />
                  Pas encore de fichier pour cette pièce.
                </div>
              ) : !url ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : kind === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={name} className="max-h-full max-w-full rounded-md object-contain shadow-sm" />
              ) : kind === "pdf" && !pdfFailed ? (
                <PdfPages key={url} url={url} onFail={() => setPdfFailed(true)} />
              ) : kind === "pdf" ? (
                // Lecture impossible (fichier protégé, réseau) : le lecteur du navigateur prend le relais.
                <iframe src={getPdfPreviewUrl(url)} title={name} className="size-full min-h-[60vh] rounded-md border bg-white lg:min-h-0" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-[14px] text-muted-foreground">
                  <File className="size-10" />
                  Aperçu impossible pour ce type de fichier : téléchargez-le.
                </div>
              )}
            </div>
          </div>

          {/* Ce qu'il faut vérifier, et la réponse */}
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto p-5">
            <div className="flex flex-col gap-1 pr-8">
              <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
                Pièce {index + 1} sur {total}
              </p>
              <SheetTitle className="text-[20px] font-semibold leading-snug">{info.label}</SheetTitle>
              <SheetDescription className="flex flex-wrap items-center gap-1.5 text-[13px]">
                <PieceStateChip info={info} />
                {doc?.createdAt ? <span>reçue le {day(doc.createdAt)}</span> : null}
              </SheetDescription>
            </div>

            {claim?.status === "PROVIDED" && (
              <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13.5px] text-blue-950">
                  <p className="font-semibold">● Nouvelle pièce envoyée en réponse{claim.submittedAt ? ` le ${day(claim.submittedAt)}` : ""}</p>
                  <p>{claim.origin === "NOTAIRE" ? "Demandée par le notaire : c'est lui qui la contrôle." : "Regardez-la puis acceptez-la, ou redemandez-la."}</p>
                </div>
                {claim.origin === "TEAM" && <ComplementItemReview item={claim.item} locked={locked} canArchive />}
              </div>
            )}
            {claim?.status === "PENDING" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13.5px] text-amber-950">
                <p className="flex items-center gap-1.5 font-semibold">
                  <Clock3 className="size-4" />
                  {claim.origin === "NOTAIRE" ? "Demandée par le notaire" : row.documents.length > 0 ? "Redemandée" : "Demandée"} le {day(claim.sentAt)}
                </p>
                <p>
                  {REASON_LABELS[claim.reason]} · pas encore de réponse{claim.sentCount > 1 ? ` · relancée ${claim.sentCount - 1} fois` : ""}
                </p>
                {!locked && claim.origin === "TEAM" && claim.requestStatus === "OPEN" && (
                  <RemindRequestButton requestId={claim.requestId} email={claim.email} className="mt-2 bg-white" />
                )}
              </div>
            )}

            {doc && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[12px] font-bold uppercase tracking-[0.07em] text-muted-foreground">À vérifier</p>
                <ul className="flex flex-col gap-1.5">
                  {hints.map((hint) => (
                    <li key={hint} className="flex items-start gap-2 text-[14px]">
                      <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-primary/60" />
                      {hint}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {row.compare && <div className="text-[14px]">{row.compare}</div>}
            {row.extra && <div className="flex flex-wrap items-center gap-2 text-[13.5px]">{row.extra}</div>}

            {/* La réponse */}
            {!locked && point && state !== "received" && (
              <div className="flex flex-col gap-2">
                {point.verified ? (
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold text-green-800">
                    <Check className="size-4" strokeWidth={3} />
                    Vérifiée
                    <button type="button" className="text-[13px] font-medium text-muted-foreground hover:underline" disabled={pending} onClick={() => setVerified(false)}>
                      Annuler
                    </button>
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" className="h-12 gap-1.5 bg-green-700 text-[15px] hover:bg-green-800" disabled={pending} onClick={() => setVerified(true)}>
                      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" strokeWidth={3} />}
                      La pièce est bonne
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 gap-1.5 border-2 border-red-200 text-[15px] text-red-700 hover:bg-red-50 hover:text-red-800"
                      disabled={!complement || !requestKey || state === "sent"}
                      title={state === "sent" ? "Déjà réclamée : relancez plutôt" : undefined}
                      onClick={() => setRedo(true)}
                    >
                      <X className="size-4" strokeWidth={3} />
                      À redemander
                    </Button>
                  </div>
                )}
              </div>
            )}

            {redo && complement && requestKey && (
              <div className="flex flex-col gap-2.5 rounded-xl border border-red-200 bg-red-50/60 p-3.5">
                <p className="text-[14px] font-semibold">Qu&apos;est-ce qui ne va pas ?</p>
                <div role="radiogroup" aria-label="Motif" className="flex flex-wrap gap-1.5">
                  {REDO_REASONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={reason === value}
                      onClick={() => setReason(value)}
                      className={cn(
                        "h-9 rounded-full border px-3.5 text-[13.5px] font-semibold",
                        reason === value ? "border-red-800 bg-red-800 text-white" : "border-red-200 bg-white text-red-900 hover:border-red-400",
                      )}
                    >
                      {REASON_LABELS[value]}
                    </button>
                  ))}
                </div>
                <input
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={COMPLEMENT_NOTE_MAX}
                  placeholder="Un mot pour le client (facultatif)"
                  className="h-10 rounded-lg border border-red-200 bg-white px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-red-300"
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" className="h-10 flex-1" onClick={() => setComposing(true)}>
                    Préparer la demande
                  </Button>
                  <Button type="button" variant="ghost" className="h-10" onClick={() => setRedo(false)}>
                    Annuler
                  </Button>
                </div>
                <p className="text-[12.5px] text-muted-foreground">Vous relisez l&apos;e-mail avant l&apos;envoi.</p>
              </div>
            )}
            {/* Pièce manquante : la demander au client (fenêtre « Demander », motif « manquante »), ou l'ajouter soi-même */}
            {row.documents.length === 0 && !locked && state !== "sent" && (
              <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3.5">
                <p className="text-[14px] font-semibold text-red-900">{row.required ? "Cette pièce manque au dossier." : "Pièce facultative, pas encore fournie."}</p>
                {complement && requestKey ? (
                  <Button
                    type="button"
                    className="h-11 text-[15px]"
                    onClick={() => {
                      setReason("MISSING");
                      setNote("");
                      setComposing(true);
                    }}
                  >
                    Demander {complement.target === "OWNER" ? "au propriétaire" : "au locataire"}
                  </Button>
                ) : null}
                <p className="text-[12.5px] text-muted-foreground">
                  {complement && requestKey ? "Vous relisez l'e-mail avant l'envoi. " : ""}
                  Vous l&apos;avez reçue par un autre moyen ? Ajoutez-la ci-dessous.
                </p>
              </div>
            )}

            {/* Corriger soi-même : mêmes actions que la fiche */}
            {canUpload && (
              <div className="flex flex-wrap gap-2">
                {doc ? (
                  <>
                    <DocumentUploadButton target={row.upload!} kind={row.kind} replaceIds={[doc.id]} />
                    <DocumentUploadButton target={row.upload!} kind={row.kind} label="Ajouter un fichier" />
                    <DocumentDeleteButton documentId={doc.id} fileName={name} />
                  </>
                ) : (
                  <DocumentUploadButton target={row.upload!} kind={row.kind} />
                )}
              </div>
            )}

            {files.length > 0 && (
              <div className="flex flex-col gap-1 border-t pt-3 text-[12.5px] text-muted-foreground">
                <p className="font-semibold text-foreground">Fichiers de la pièce</p>
                {files.map((file, i) => (
                  <button key={file.id} type="button" onClick={() => setFileIndex(i)} className={cn("truncate text-left hover:underline", i === fileIndex && "font-semibold text-foreground")}>
                    {day(file.createdAt)} · {file.label || "Fichier"}
                    {file.viaComplement ? " · reçue en réponse à une demande" : ""}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-auto flex justify-between gap-2 pt-2">
              <Button type="button" variant="outline" className="h-10 gap-1.5" disabled={!onPrev} onClick={onPrev}>
                <ArrowLeft className="size-4" />
                Précédente
              </Button>
              <Button type="button" variant="outline" className="h-10 gap-1.5" disabled={!onNext} onClick={onNext}>
                Suivante
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        {composing && complement && requestKey && (
          <ComplementComposer
            bailId={complement.bailId}
            target={complement.target}
            open
            onOpenChange={(open) => !open && setComposing(false)}
            preselect={{ items: [{ key: requestKey, reason, note: note.trim() }] }}
            onSent={() => {
              setComposing(false);
              setRedo(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
