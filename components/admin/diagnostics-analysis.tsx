"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Check, ChevronDown, Copy, ExternalLink, Eye, FileText, Loader2, Send, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { answerDiagnosticQuestion, applyDiagnosticDpe, requestDiagnosticAnalysis } from "@/lib/actions/diagnostic-analysis";
import { sendDiagnosticsToOwner } from "@/lib/actions/reminders";
import type { DiagnosticAssessment, DiagnosticCheck, CheckTone } from "@/lib/diagnostics/assess";
import type { DiagnosticExtraction, QuestionKey } from "@/lib/diagnostics/schema";
import { cn } from "@/lib/utils";

export interface DiagnosticFileView {
  id: string;
  kind: string;
  fileKey: string;
  mimeType: string | null;
  label: string | null;
}

export interface DiagnosticAnalysisView {
  id: string;
  /** RUNNING, SUCCEEDED, FAILED, ou STALLED (en cours depuis trop longtemps). */
  status: "RUNNING" | "SUCCEEDED" | "FAILED" | "STALLED";
  model: string;
  createdAt: string;
  createdByName: string | null;
  costUsd: number | null;
  durationMs: number | null;
  error: string | null;
  /** Les fichiers de diagnostics ont changé depuis l'analyse. */
  stale: boolean;
  extraction: DiagnosticExtraction | null;
  assessment: DiagnosticAssessment | null;
}

const OVERALL: Record<string, { label: string; className: string }> = {
  conforme: { label: "Conforme", className: "bg-green-100 text-green-800" },
  a_verifier: { label: "À vérifier", className: "bg-amber-100 text-amber-900" },
  non_conforme: { label: "Non conforme", className: "bg-red-100 text-red-800" },
};

const TONE_TEXT: Record<CheckTone, string> = { ok: "text-foreground", warn: "text-amber-900", missing: "text-red-800" };

function ToneIcon({ tone }: { tone: CheckTone }) {
  if (tone === "ok") return <Check className="mt-0.5 size-3.5 shrink-0 text-green-700" strokeWidth={3} aria-label="conforme" />;
  if (tone === "warn") return <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-700" aria-label="à vérifier" />;
  return <X className="mt-0.5 size-3.5 shrink-0 text-red-700" strokeWidth={3} aria-label="manquant" />;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

const fileName = (file: DiagnosticFileView, index: number) => file.label || `Diagnostics ${index + 1}`;

/** « Voir les diagnostics » : un fichier s'ouvre directement, plusieurs fichiers dans une liste. */
function ViewFilesButton({ files }: { files: DiagnosticFileView[] }) {
  if (files.length === 0) {
    return (
      <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" disabled title="Aucun fichier de diagnostics">
        <Eye className="size-4" />
        Voir les diagnostics
      </Button>
    );
  }
  if (files.length === 1) {
    return (
      <DocumentViewer document={files[0]} documentKindLabels={documentKindLabels}>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Eye className="size-4" />
          Voir les diagnostics
        </Button>
      </DocumentViewer>
    );
  }
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
          <Eye className="size-4" />
          Voir les diagnostics ({files.length})
          <ChevronDown className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1.5">
        <ul className="flex flex-col">
          {files.map((file, index) => (
            <li key={file.id}>
              <DocumentViewer document={file} documentKindLabels={documentKindLabels}>
                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm hover:bg-muted">
                  <FileText className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 truncate">{fileName(file, index)}</span>
                </button>
              </DocumentViewer>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Données lues, en clair (repliées par défaut). */
function ExtractedData({ extraction }: { extraction: DiagnosticExtraction }) {
  const { property, dpe, diagnostician } = extraction;
  const rows: Array<[string, string | null]> = [
    ["Adresse", property.address],
    ["Type", property.type ? property.type.toLowerCase() : null],
    ["Surface", property.surfaceM2 != null ? `${String(property.surfaceM2).replace(".", ",")} m²` : null],
    ["Année de construction", property.constructionYear != null ? String(property.constructionYear) : null],
    ["Consommation", dpe.energyKwhM2 != null ? `${dpe.energyKwhM2} kWh/m²/an` : null],
    ["Émissions", dpe.emissionsKgM2 != null ? `${dpe.emissionsKgM2} kg CO₂/m²/an` : null],
    ["Numéro ADEME", dpe.ademeNumber],
    ["Diagnostiqueur", [diagnostician.name, diagnostician.company].filter(Boolean).join(" · ") || null],
    ["Certification", diagnostician.certification],
  ];
  return (
    <details className="group">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-primary">
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        Toutes les données lues
      </summary>
      <dl className="mt-1.5 grid grid-cols-1 gap-x-3 text-[13px] @sm:grid-cols-[150px_minmax(0,1fr)] @sm:gap-y-0.5">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="mt-1 text-muted-foreground first:mt-0 @sm:mt-0">{label}</dt>
            <dd className={cn("min-w-0 break-words", !value && "text-muted-foreground")}>{value || "non trouvé"}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}

/** Réponses déjà notées, rappelées sous les questions (avec ✕ pour les retirer). */
const ANSWER_LABELS: Record<QuestionKey, string> = {
  before1949: "Construit avant 1949",
  before1997: "Permis avant juillet 1997",
  electricityOld: "Électricité de plus de 15 ans",
  gasOld: "Gaz de plus de 15 ans",
  address: "Diagnostics du bon bien",
  surface: "Surface du diagnostic exacte",
};

/** Ouvre le service officiel de l'État qui pré-remplit l'état des risques à partir de l'adresse. */
const ERRIAL_URL = "https://errial.georisques.gouv.fr/";

async function copyLines(lines: string[]) {
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Texte copié");
  } catch {
    toast.error("Copie impossible");
  }
}

/** Un bloc d'action : titre coloré, une ligne par point, boutons en bas. */
function ActionBlock({ tone, title, children, footer }: { tone: "red" | "amber" | "slate"; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section
      className={cn(
        "flex flex-col gap-1.5 rounded-md border-l-[3px] bg-background py-2 pl-3 pr-2.5",
        tone === "red" ? "border-l-red-500" : tone === "amber" ? "border-l-amber-500" : "border-l-slate-400",
      )}
    >
      <h4 className={cn("text-[13px] font-semibold", tone === "red" ? "text-red-800" : tone === "amber" ? "text-amber-900" : "text-slate-700")}>{title}</h4>
      <ul className="flex flex-col gap-1">{children}</ul>
      {footer && <div className="flex flex-wrap gap-1.5 pt-0.5">{footer}</div>}
    </section>
  );
}

function SendButtons({ bailId, kind, lines, locked }: { bailId: string; kind: "blocking" | "ask"; lines: string[]; locked: boolean }) {
  const [sending, startSending] = React.useTransition();
  const send = () =>
    startSending(async () => {
      const result = await sendDiagnosticsToOwner({ bailId, kind });
      if (result.success) toast.success(`E-mail envoyé à ${result.data.email}`);
      else toast.error(result.error);
    });
  return (
    <>
      {!locked && (
        <Button type="button" size="sm" className="h-8 gap-1.5" onClick={send} disabled={sending}>
          {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
          {kind === "blocking" ? "Prévenir le propriétaire" : "Envoyer les questions"}
        </Button>
      )}
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => copyLines(lines)} title="Pour un appel ou un message">
        <Copy className="size-3.5" />
        Copier
      </Button>
    </>
  );
}

function AnswerButtons({ analysisId, questionKey, disabled }: { analysisId: string; questionKey: QuestionKey; disabled: boolean }) {
  const pathname = usePathname();
  const [pending, startPending] = React.useTransition();
  const answer = (value: boolean | null) =>
    startPending(async () => {
      const result = await answerDiagnosticQuestion({ analysisId, key: questionKey, answer: value, revalidate: pathname });
      if (!result.success) toast.error(result.error);
    });
  return (
    <span className="inline-flex shrink-0 gap-1">
      {pending ? (
        <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
      ) : (
        [true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            disabled={disabled}
            onClick={() => answer(value)}
            className="h-6 rounded border bg-background px-2 text-[12px] font-medium hover:bg-muted disabled:opacity-50"
            title="Réponse du propriétaire"
          >
            {value ? "Oui" : "Non"}
          </button>
        ))
      )}
    </span>
  );
}

function ResultBlocks({
  bailId,
  analysis,
  assessment,
  locked,
  applying,
  onApply,
}: {
  bailId: string;
  analysis: DiagnosticAnalysisView;
  assessment: DiagnosticAssessment;
  locked: boolean;
  applying: boolean;
  onApply: () => void;
}) {
  const pathname = usePathname();
  const [clearing, startClearing] = React.useTransition();
  const group = (name: DiagnosticCheck["group"]) => assessment.checks.filter((check) => check.group === name);
  const blocking = group("blocking");
  const asks = group("ask");
  const team = group("team");
  const ok = group("ok");
  const answers = Object.entries(analysis.extraction?.answers ?? {}) as Array<[QuestionKey, boolean]>;
  const clear = (key: QuestionKey) =>
    startClearing(async () => {
      const result = await answerDiagnosticQuestion({ analysisId: analysis.id, key, answer: null, revalidate: pathname });
      if (!result.success) toast.error(result.error);
    });

  return (
    <div className="flex flex-col gap-2">
      {blocking.length > 0 && (
        <ActionBlock
          tone="red"
          title="Bloque la location : prévenir le propriétaire"
          footer={<SendButtons bailId={bailId} kind="blocking" lines={blocking.map((c) => c.message!).filter(Boolean)} locked={locked} />}
        >
          {blocking.map((check) => (
            <li key={check.id} className="flex flex-col text-[13px]">
              <span>
                <span className="font-semibold">{check.label}</span> · {check.text}
              </span>
              {check.message && <span className="text-[12.5px] italic text-muted-foreground">« {check.message} »</span>}
            </li>
          ))}
        </ActionBlock>
      )}

      {(asks.length > 0 || answers.length > 0) && (
        <ActionBlock
          tone="amber"
          title="À demander au propriétaire"
          footer={asks.length > 0 ? <SendButtons bailId={bailId} kind="ask" lines={asks.map((c) => c.question!.text)} locked={locked} /> : undefined}
        >
          {asks.map((check) => (
            <li key={check.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[13px]">
              <span className="min-w-0">{check.question!.text}</span>
              {!locked && <AnswerButtons analysisId={analysis.id} questionKey={check.question!.key} disabled={analysis.stale} />}
            </li>
          ))}
          {answers.length > 0 && (
            <li className="flex flex-wrap gap-1 pt-0.5 text-[12px] text-muted-foreground">
              Réponses notées :
              {answers.map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1 rounded bg-muted px-1.5">
                  {ANSWER_LABELS[key]} : {value ? "oui" : "non"}
                  {!locked && (
                    <button type="button" onClick={() => clear(key)} disabled={clearing} aria-label={`Retirer la réponse « ${ANSWER_LABELS[key]} »`}>
                      <X className="size-3" />
                    </button>
                  )}
                </span>
              ))}
            </li>
          )}
        </ActionBlock>
      )}

      {team.length > 0 && (
        <ActionBlock tone="slate" title="À faire par l'équipe">
          {team.map((check) => (
            <li key={check.id} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[13px]">
              <span className="min-w-0">
                <span className="font-semibold">{check.label}</span> · {check.text}
              </span>
              {check.action === "erp" && !locked && (
                <a
                  href={ERRIAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border bg-background px-2 text-[12.5px] font-medium hover:bg-muted"
                  title="Service officiel de l'État : l'état des risques est pré-rempli à partir de l'adresse, puis signé par le propriétaire"
                >
                  Refaire l&apos;ERP
                  <ExternalLink className="size-3" />
                </a>
              )}
              {check.action === "dpe-fiche" && assessment.dpeToApply && !locked && !analysis.stale && (
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-[12.5px]" onClick={onApply} disabled={applying}>
                  {applying ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
                  Reporter classe {assessment.dpeToApply.dpeClass}
                </Button>
              )}
            </li>
          ))}
        </ActionBlock>
      )}

      {ok.length > 0 && (
        <details className="group">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-green-800">
            <Check className="size-3.5" strokeWidth={3} />
            {ok.length} conforme{ok.length > 1 ? "s" : ""}
            <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
          </summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {ok.map((check) => (
              <li key={check.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-x-2 text-[13px]">
                <ToneIcon tone={check.tone} />
                <span>
                  <span className="font-semibold">{check.label}</span> · <span className={TONE_TEXT[check.tone]}>{check.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function DiagnosticsAnalysis({
  bailId,
  files,
  analysis,
  locked,
  configured,
}: {
  bailId: string;
  files: DiagnosticFileView[];
  analysis: DiagnosticAnalysisView | null;
  /** Dossier transmis au notaire : plus d'analyse ni de report dans la fiche. */
  locked: boolean;
  /** Clé OpenAI présente sur le serveur. */
  configured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [starting, startTransition] = React.useTransition();
  const [applying, setApplying] = React.useState(false);
  const running = analysis?.status === "RUNNING";

  // Analyse en cours : la fiche se recharge toutes les 4 secondes jusqu'au résultat.
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [running, router]);

  const analyze = () =>
    startTransition(async () => {
      const result = await requestDiagnosticAnalysis({ bailId, revalidate: pathname });
      if (!result.success) toast.error(result.error);
      else toast.success("Analyse lancée : le résultat s'affiche ici dans une à deux minutes");
    });

  const apply = async () => {
    if (!analysis) return;
    setApplying(true);
    const result = await applyDiagnosticDpe({ analysisId: analysis.id, revalidate: pathname });
    setApplying(false);
    if (result.success) toast.success("DPE reporté dans la fiche du bien");
    else toast.error(result.error);
  };

  const disabledReason = files.length === 0 ? "Ajoutez d'abord le fichier des diagnostics dans « Le bien »" : !configured ? "Clé OpenAI non configurée sur ce serveur" : null;
  const assessment = analysis?.status === "SUCCEEDED" ? analysis.assessment : null;
  const overall = assessment ? OVERALL[assessment.overall] : null;

  return (
    <div className="@container flex flex-col gap-2.5 whitespace-normal">
      <div className="flex flex-wrap gap-2">
        <ViewFilesButton files={files} />
        {!locked && (
          <Button
            type="button"
            size="sm"
            variant={analysis ? "outline" : "default"}
            className="h-9 gap-1.5"
            disabled={!!disabledReason || starting || running}
            title={disabledReason || undefined}
            onClick={analyze}
          >
            {starting || running ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {running ? "Analyse en cours…" : analysis ? "Relancer l'analyse" : "Analyser les diagnostics"}
          </Button>
        )}
      </div>
      {disabledReason && files.length === 0 && <span className="text-[13px] text-muted-foreground">{disabledReason}.</span>}

      {running && (
        <p className="text-[13px] text-muted-foreground">
          Lecture des fichiers par l&apos;IA : jusqu&apos;à 2 minutes pour un gros dossier. Le résultat s&apos;affiche ici.
        </p>
      )}
      {(analysis?.status === "FAILED" || analysis?.status === "STALLED") && (
        <p className="text-[13px] font-semibold text-red-700">
          {analysis.status === "STALLED" ? "L'analyse ne s'est pas terminée : relancez-la." : analysis.error || "L'analyse a échoué : relancez-la."}
        </p>
      )}

      {assessment && analysis && overall && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className={cn("inline-flex h-6 items-center rounded-md px-2 text-[12.5px] font-semibold", overall.className)}>{overall.label}</span>
            <span className="text-[12.5px] text-muted-foreground">
              Analyse IA du {when(analysis.createdAt)}
              {analysis.createdByName ? ` par ${analysis.createdByName}` : ""}
              {analysis.costUsd != null ? ` · ${analysis.costUsd.toFixed(2).replace(".", ",")} $` : ""}
            </span>
          </div>
          {analysis.stale && (
            <p className="text-[13px] font-semibold text-amber-800">Les fichiers ont changé depuis cette analyse : relancez-la.</p>
          )}
          <ResultBlocks bailId={bailId} analysis={analysis} assessment={assessment} locked={locked} applying={applying} onApply={apply} />
          {assessment.notFound.length > 0 && (
            <p className="text-[12.5px] text-muted-foreground">Non trouvé dans les fichiers : {assessment.notFound.join(", ")}.</p>
          )}
          {analysis.extraction && <ExtractedData extraction={analysis.extraction} />}
          <p className="text-[11.5px] text-muted-foreground">
            Données lues par l&apos;IA ({analysis.model}), à confirmer avec la pastille de la ligne.
          </p>
        </div>
      )}
    </div>
  );
}
