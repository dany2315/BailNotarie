"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { AlertCircle, Check, CheckCircle2, FileText, Loader2, Paperclip, Send, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { OwnerCanvas, MicroLabel, Pill, IconTile, PrimaryAction, Surface } from "./owner-ui";
import { SubPageBar } from "./owner-tabs";
import { ACCEPT, MAX_SIZE, uploadToStorage } from "@/components/documents/document-upload-button";
import {
  addComplementDocument,
  removeComplementDocument,
  submitComplementRequest,
  type ClientComplementItem,
  type ClientComplementRequest,
} from "@/lib/actions/complement-requests";
import { REASON_LABELS, REASON_SENTENCES, complementCountLabel } from "@/lib/utils/complement";
import { ComplementFieldCard } from "./complement-field-card";
import { cn } from "@/lib/utils";

const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });

function formatSize(size: number | null) {
  if (!size) return null;
  return size < 1024 * 1024 ? `${Math.max(1, Math.round(size / 1024))} Ko` : `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}

/** Page « Demande » de l'espace client : seulement ce que l'équipe a demandé (informations, puis pièces). */
export function ComplementRequestView({ request, space }: { request: ClientComplementRequest; space: "proprietaire" | "locataire" }) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const home = `/client/${space}`;
  const title = request.propertyLabel || request.address.split(",")[0] || "Votre dossier";
  const fields = request.items.filter((item) => item.type === "FIELD" && item.question);
  const pieces = request.items.filter((item) => item.type !== "FIELD");
  const hasFieldItems = request.items.some((item) => item.type === "FIELD");
  const fromNotary = request.origin === "NOTAIRE";
  const kicker = fromNotary ? "Demande du notaire" : hasFieldItems ? "Demande de l'équipe" : "Pièces demandées";
  const total = fields.length + pieces.length;
  const done = pieces.filter((item) => item.documents.length > 0).length + fields.filter((item) => item.status === "PROVIDED").length;
  const left = total - done;
  const open = request.status === "OPEN";
  const what = complementCountLabel([...fields.map(() => ({ kind: "FIELD" as const })), ...pieces.map(() => ({ kind: "DOCUMENT" as const }))]);
  // Le dossier sous la forme du formulaire : les informations se remplissent avec les mêmes règles.
  const form = useForm({ defaultValues: request.form?.values ?? {} });

  const submit = async () => {
    setSubmitting(true);
    const result = await submitComplementRequest({ requestId: request.id });
    setSubmitting(false);
    if (!result.success) {
      toast.error("Envoi impossible", { description: result.error });
      return;
    }
    router.refresh();
  };

  return (
    <>
      <SubPageBar backHref={home} trail={[{ label: "Accueil", href: home }, { label: kicker }]} />
      <OwnerCanvas navOffset={false}>
        <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-2 sm:px-6 sm:pt-4">
          <header className="mb-6 mt-5">
            <MicroLabel>{kicker}</MicroLabel>
            <h1 className="lp-title mt-1.5 text-[24px] font-bold leading-tight text-slate-900 sm:text-[28px]">
              {open ? `${what} ${fields.length > 0 ? "à compléter" : "à nous envoyer"}` : "Merci, c'est bien reçu"}
            </h1>
            <p className="mt-1.5 truncate text-[13px] text-slate-500">{title === request.address ? request.address : `${title} · ${request.address}`}</p>
          </header>

          {!open ? (
            <Surface tone="raised" className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </span>
              <p className="text-[15px] font-semibold text-slate-900">
                {request.status === "ACCEPTED" ? "Tout a été validé." : "Votre réponse est envoyée."}
              </p>
              <p className="max-w-sm text-[13.5px] leading-relaxed text-slate-500">
                {request.status === "ACCEPTED"
                  ? "Tout est en ordre de notre côté pour cette demande."
                  : `${fromNotary ? "Le notaire vérifie" : "Notre équipe vérifie"} votre réponse${request.submittedAt ? ` (envoi du ${fmtDay(request.submittedAt)})` : ""}. Nous vous écrirons si quelque chose manque encore.`}
              </p>
              <Link href={home} className="mt-2 text-[13px] font-semibold text-[#3563e9] hover:text-[#2451c7]">
                Retour à l&apos;accueil
              </Link>
            </Surface>
          ) : (
            <div className="flex flex-col gap-4">
              {request.message && (
                <Surface tone="accent" className="flex gap-3 px-4 py-4 sm:px-5">
                  <span
                    aria-hidden
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#5b85f7] to-[#3563e9] text-[11px] font-bold text-white"
                  >
                    BN
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-[#3563e9]">Message de l&apos;équipe BailNotarie</p>
                    <p className="mt-1 whitespace-pre-line text-[14px] leading-relaxed text-slate-700">{request.message}</p>
                  </div>
                </Surface>
              )}

              <div className="flex items-center gap-3 px-1">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#5b85f7] to-[#3563e9] transition-[width] duration-500"
                    style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                  />
                </div>
                <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-slate-500">
                  {done} / {total} prêt{done > 1 ? "s" : ""}
                </span>
              </div>

              {fields.length > 0 && request.form && (
                <section className="flex flex-col gap-3">
                  {pieces.length > 0 && <SectionTitle>Informations à compléter</SectionTitle>}
                  <ul className="flex flex-col gap-3">
                    {fields.map((item) => (
                      <ComplementFieldCard key={item.id} item={item} form={form} ctx={request.form!.ctx} disabled={submitting} />
                    ))}
                  </ul>
                </section>
              )}

              {pieces.length > 0 && (
                <section className="flex flex-col gap-3">
                  {fields.length > 0 && <SectionTitle>Pièces à envoyer</SectionTitle>}
                  <ul className="flex flex-col gap-3">
                    {pieces.map((item) => (
                      <PieceCard key={item.id} item={item} disabled={submitting} />
                    ))}
                  </ul>
                </section>
              )}

              <Surface tone="plain" className="mt-1 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <p className={cn("text-[13px]", left > 0 ? "text-slate-500" : "font-semibold text-emerald-700")}>
                  {left > 0
                    ? `Encore ${left} élément${left > 1 ? "s" : ""} avant l'envoi.`
                    : fromNotary
                      ? "Tout est prêt : envoyez votre réponse au notaire."
                      : fields.length > 0
                      ? "Tout est prêt : envoyez votre réponse à notre équipe."
                      : "Tout est prêt : envoyez vos pièces à notre équipe."}
                </p>
                <PrimaryAction onClick={submit} disabled={left > 0 || submitting} className="h-11 w-full sm:w-auto">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {fromNotary ? "Envoyer au notaire" : "Envoyer à l'équipe"}
                </PrimaryAction>
              </Surface>
            </div>
          )}
        </div>
      </OwnerCanvas>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">{children}</h2>;
}

function PieceCard({ item, disabled }: { item: ClientComplementItem; disabled: boolean }) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [removing, setRemoving] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const added = item.documents.length > 0;
  const problem = item.reason !== "MISSING";

  const upload = async (files: File[]) => {
    for (const file of files) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} est trop lourd (20 Mo maximum)`);
        continue;
      }
      try {
        setProgress(0);
        const { fileKey } = await uploadToStorage(file, item.target, item.kind, setProgress);
        const result = await addComplementDocument({
          itemId: item.id,
          fileKey,
          fileName: file.name,
          mimeType: file.type || undefined,
          size: file.size,
        });
        if (!result.success) throw new Error(result.error);
      } catch (error: any) {
        toast.error("Fichier non envoyé", { description: error?.message || "Réessayez dans un instant." });
      }
    }
    setProgress(null);
    router.refresh();
  };

  const remove = async (documentId: string) => {
    setRemoving(documentId);
    const result = await removeComplementDocument({ documentId });
    setRemoving(null);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    router.refresh();
  };

  const busy = progress !== null || disabled;

  return (
    <li>
      <Surface tone={added ? "plain" : "raised"} className="overflow-hidden">
        <div className="flex items-start gap-3 px-4 pb-3 pt-4 sm:px-5">
          <IconTile icon={added ? Check : problem ? AlertCircle : FileText} tone={added ? "emerald" : problem ? "amber" : "blue"} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-[14.5px] font-semibold leading-snug text-slate-900">{item.label}</h2>
              {added ? (
                <Pill tone="emerald">Ajoutée</Pill>
              ) : (
                <Pill tone={problem ? "amber" : item.automatic ? "blue" : "slate"}>{problem ? REASON_LABELS[item.reason] : item.automatic ? "Suite à votre réponse" : "À envoyer"}</Pill>
              )}
            </div>
            {/* Une fois le fichier ajouté, l'explication n'a plus lieu d'être : le fichier suffit. */}
            {!added && (
              <p className="mt-1 text-[13px] leading-relaxed text-slate-500">
                {REASON_SENTENCES[item.reason]}
                {item.note ? <span className="text-slate-700"> {item.note}</span> : null}
              </p>
            )}
          </div>
        </div>

        {added && (
          <ul className="flex flex-col gap-1.5 px-4 pb-1 sm:px-5">
            {item.documents.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2">
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">{doc.label || "Fichier"}</span>
                {formatSize(doc.size) && <span className="shrink-0 text-[12px] tabular-nums text-slate-400">{formatSize(doc.size)}</span>}
                <button
                  type="button"
                  onClick={() => remove(doc.id)}
                  disabled={busy || removing === doc.id}
                  aria-label={`Retirer ${doc.label || "ce fichier"}`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700 disabled:opacity-50"
                >
                  {removing === doc.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="px-4 pb-4 pt-2 sm:px-5">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              if (files.length) void upload(files);
            }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const files = Array.from(event.dataTransfer.files ?? []);
              if (files.length && !busy) void upload(files);
            }}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 text-[13px] font-semibold transition-colors",
              added ? "h-10 border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700" : "h-14 border-[#4373f5]/35 bg-[#4373f5]/[0.035] text-[#3563e9] hover:bg-[#4373f5]/[0.07]",
              dragging && "border-[#4373f5] bg-[#4373f5]/10",
              "disabled:cursor-wait disabled:opacity-70",
            )}
          >
            {progress !== null ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi… {progress}%
              </>
            ) : (
              <>
                <UploadCloud className="h-4 w-4" />
                {added ? "Ajouter un autre fichier" : "Choisir un fichier"}
                <span className="hidden font-normal text-slate-400 sm:inline">· PDF ou photo</span>
              </>
            )}
          </button>
        </div>
      </Surface>
    </li>
  );
}
