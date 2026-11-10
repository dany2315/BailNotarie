"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Minus,
  MoreHorizontal,
  Paperclip,
  RefreshCw,
  Send,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentViewer } from "@/components/leases/document-viewer";
import { DocumentUploadButton, uploadToStorage, ACCEPT } from "@/components/documents/document-upload-button";
import { documentKindLabels } from "@/lib/utils/document-labels";
import { applyDiagnosticDpe, decideDiagnosticItem, requestDiagnosticAnalysis, revokeDiagnosticDecision } from "@/lib/actions/diagnostic-analysis";
import { sendDiagnosticsToOwner } from "@/lib/actions/reminders";
import { displayFileName, type DiagnosticItemView, type ItemStatus } from "@/lib/diagnostics/items";
import type { DiagnosticFileView, DiagnosticStateView } from "@/lib/diagnostics/state";
import type { DiagnosticExtraction } from "@/lib/diagnostics/schema";
import { cn } from "@/lib/utils";

/** Service officiel de l'État : l'état des risques est pré-rempli à partir de l'adresse, puis signé par le propriétaire. */
const ERRIAL_URL = "https://errial.georisques.gouv.fr/";

export const STATUS: Record<ItemStatus, { label: string; chip: string; icon: React.ReactNode }> = {
  replace: {
    label: "À remplacer",
    chip: "bg-red-100 text-red-800",
    icon: <X className="size-3.5 text-red-700" strokeWidth={3} aria-hidden />,
  },
  missing: {
    label: "Manquant",
    chip: "bg-red-100 text-red-800",
    icon: <X className="size-3.5 text-red-700" strokeWidth={3} aria-hidden />,
  },
  check: {
    label: "À vérifier",
    chip: "bg-amber-100 text-amber-900",
    icon: <AlertTriangle className="size-3.5 text-amber-700" aria-hidden />,
  },
  valid: {
    label: "Valide",
    chip: "bg-green-100 text-green-800",
    icon: <Check className="size-3.5 text-green-700" strokeWidth={3} aria-hidden />,
  },
  na: {
    label: "Non concerné",
    chip: "bg-muted text-muted-foreground",
    icon: <Minus className="size-3.5 text-muted-foreground" strokeWidth={3} aria-hidden />,
  },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", timeZone: "Europe/Paris" });

/** Exemples de motif, pour aider à écrire court. */
const NOTE_HINTS: Record<string, { conforme: string; na: string }> = {
  electricite: { conforme: "Tableau électrique refait en 2025, attestation de l'électricien", na: "Installation refaite en 2015, facture fournie" },
  gaz: { conforme: "Chaudière remplacée en 2024, attestation du chauffagiste", na: "Pas de gaz dans le logement, confirmé par le propriétaire" },
  plomb: { conforme: "Peintures refaites en 2024, facture fournie", na: "Construit en 1955 d'après l'acte de propriété" },
  amiante: { conforme: "DTA reçu par e-mail le 12/11", na: "Permis de construire de 2001 d'après l'acte" },
  adresse: { conforme: "Même bien : ancienne numérotation de la rue", na: "" },
  surface: { conforme: "Surface confirmée par le propriétaire", na: "" },
};

const fileName = (file: DiagnosticFileView, index: number) => file.label || `Diagnostics ${index + 1}`;

/** « Voir les diagnostics » : un fichier s'ouvre directement, plusieurs fichiers dans une liste. */
export function ViewFilesButton({ files }: { files: DiagnosticFileView[] }) {
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
function ExtractedData({ extraction, notFound }: { extraction: DiagnosticExtraction; notFound: string[] }) {
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
      {notFound.length > 0 && <p className="mt-1 text-[12.5px] text-muted-foreground">Non trouvé dans les fichiers : {notFound.join(", ")}.</p>}
    </details>
  );
}

type DialogMode = { item: DiagnosticItemView; kind: "CONFORME" | "NON_CONCERNE" } | null;

/** « Marquer conforme » (avec ou sans justificatif) ou « Non concerné » : motif obligatoire. */
function DecisionDialog({ mode, bailId, propertyId, onClose }: { mode: DialogMode; bailId: string; propertyId: string; onClose: () => void }) {
  const pathname = usePathname();
  const [withProof, setWithProof] = React.useState<"yes" | "no">("no");
  const [file, setFile] = React.useState<File | null>(null);
  const [note, setNote] = React.useState("");
  const [progress, setProgress] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (mode) {
      setWithProof("no");
      setFile(null);
      setNote("");
      setProgress(null);
    }
  }, [mode]);

  if (!mode) return null;
  const conforme = mode.kind === "CONFORME";
  const hint = NOTE_HINTS[mode.item.id]?.[conforme ? "conforme" : "na"] || (conforme ? "Ce qui a été vérifié, et comment" : "Pourquoi ce diagnostic n'est pas exigé");
  const needsFile = conforme && withProof === "yes";
  const canSave = note.trim().length >= 3 && (!needsFile || !!file) && !saving;

  const save = async () => {
    setSaving(true);
    try {
      let proof: { fileKey: string; fileName: string; mimeType?: string; size: number } | undefined;
      if (needsFile && file) {
        setProgress(0);
        const { fileKey } = await uploadToStorage(file, { propertyId }, "OTHER", setProgress);
        proof = { fileKey, fileName: file.name, mimeType: file.type || undefined, size: file.size };
      }
      const result = await decideDiagnosticItem({
        bailId,
        item: mode.item.id,
        kind: mode.kind,
        note: note.trim(),
        basis: mode.item.basis,
        proof,
        revalidate: pathname,
      });
      if (!result.success) throw new Error(result.error);
      toast.success(conforme ? `${mode.item.label} : marqué conforme` : `${mode.item.label} : non concerné`);
      onClose();
    } catch (error: any) {
      toast.error(error?.message || "Enregistrement impossible");
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode.item.label} : {conforme ? "marquer conforme" : "non concerné"}
          </DialogTitle>
          <DialogDescription>
            Constat : {mode.item.text}. {conforme ? "Votre décision et son motif seront visibles du notaire." : "Le notaire verra ce motif."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {conforme && (
            <RadioGroup value={withProof} onValueChange={(value) => setWithProof(value as "yes" | "no")} className="gap-2">
              <Label className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 font-normal has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="yes" />
                Avec un justificatif
              </Label>
              {withProof === "yes" && (
                <Input type="file" accept={ACCEPT} onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="h-auto py-1.5 text-sm" />
              )}
              <Label className="flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5 font-normal has-[[data-state=checked]]:border-primary">
                <RadioGroupItem value="no" />
                Sans justificatif
              </Label>
            </RadioGroup>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diagnostic-note">Motif</Label>
            <Textarea id="diagnostic-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder={hint} rows={3} maxLength={500} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button type="button" onClick={save} disabled={!canSave}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {progress !== null ? `${progress} %` : conforme ? "Marquer conforme" : "Non concerné"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Nouveau fichier non lu : date du diagnostic saisie à la main. */
function DateEntry({ item, bailId }: { item: DiagnosticItemView; bailId: string }) {
  const pathname = usePathname();
  const [date, setDate] = React.useState("");
  const [saving, startSaving] = React.useTransition();
  const save = () =>
    startSaving(async () => {
      const result = await decideDiagnosticItem({ bailId, item: item.id, kind: "DATE", date, revalidate: pathname });
      if (result.success) toast.success("Date enregistrée");
      else toast.error(result.error);
    });
  return (
    <span className="inline-flex items-center gap-1.5">
      <Input
        type="date"
        value={date}
        max={new Date().toISOString().slice(0, 10)}
        onChange={(event) => setDate(event.target.value)}
        className="h-9 w-[150px] text-sm"
        aria-label={`Date du nouveau diagnostic ${item.label}`}
      />
      <Button type="button" size="sm" className="h-9" onClick={save} disabled={!date || saving}>
        {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Enregistrer
      </Button>
    </span>
  );
}

function ItemRow({
  item,
  bailId,
  propertyId,
  state,
  locked,
  onDecide,
}: {
  item: DiagnosticItemView;
  bailId: string;
  propertyId: string;
  state: DiagnosticStateView;
  locked: boolean;
  onDecide: (mode: NonNullable<DialogMode>) => void;
}) {
  const pathname = usePathname();
  const [busy, startBusy] = React.useTransition();
  const status = STATUS[item.status];
  const proof = item.decision?.documentId ? state.documents[item.decision.documentId] : null;

  const run = (action: () => Promise<{ success: boolean; error?: string }>, done: string) =>
    startBusy(async () => {
      const result = await action();
      if (result.success) toast.success(done);
      else toast.error(result.error || "Action impossible");
    });

  const uploadLabel = item.status === "replace" ? "Ajouter le nouveau fichier" : "Ajouter le fichier";
  const button = (action: DiagnosticItemView["actions"][number], primary: boolean) => {
    const variant = primary ? "default" : "outline";
    switch (action) {
      case "upload":
        return (
          <DocumentUploadButton
            key="upload"
            target={{ propertyId }}
            kind="DIAGNOSTICS"
            diagnosticItem={item.id}
            bailId={bailId}
            label={uploadLabel}
            variant={variant}
            icon={<Upload className="size-4" />}
            successMessage="Fichier ajouté : lecture en cours"
            disabled={item.reading}
          />
        );
      case "conforme":
        return (
          <Button key="conforme" type="button" size="sm" variant={variant} className="h-9 gap-1.5" onClick={() => onDecide({ item, kind: "CONFORME" })}>
            <Check className="size-4" />
            Marquer conforme
          </Button>
        );
      case "na":
        return (
          <Button key="na" type="button" size="sm" variant={variant} className="h-9 gap-1.5" onClick={() => onDecide({ item, kind: "NON_CONCERNE" })}>
            <Minus className="size-4" />
            Non concerné
          </Button>
        );
      case "erp":
        return (
          <Button key="erp" asChild size="sm" variant={variant} className="h-9 gap-1.5">
            <a href={ERRIAL_URL} target="_blank" rel="noopener noreferrer" title="Service officiel de l'État : l'état des risques est pré-rempli à partir de l'adresse">
              Refaire l&apos;ERP
              <ExternalLink className="size-3.5" />
            </a>
          </Button>
        );
      case "dpe-fiche":
        return state.dpeToApply ? (
          <Button
            key="dpe"
            type="button"
            size="sm"
            variant={variant}
            className="h-9 gap-1.5"
            disabled={busy}
            onClick={() => run(() => applyDiagnosticDpe({ bailId, revalidate: pathname }), "DPE reporté dans la fiche du bien")}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Reporter classe {state.dpeToApply.dpeClass}
          </Button>
        ) : null;
      case "date":
        return <DateEntry key="date" item={item} bailId={bailId} />;
    }
  };

  // Bouton principal visible ; les autres dans « ⋯ » (sauf l'ajout de fichier, qui a besoin de son propre bouton).
  const [primary, ...others] = locked ? [] : item.actions;
  const inline = others.filter((action) => action === "upload" || action === "erp");
  const menu = others.filter((action) => action === "conforme" || action === "na");

  return (
    <li className="flex flex-col gap-2 py-2.5 @xl:flex-row @xl:items-start @xl:justify-between @xl:gap-4">
      <div className="grid min-w-0 grid-cols-[18px_minmax(0,1fr)] gap-x-2">
        <span className="mt-[3px] flex size-[18px] items-center justify-center">{status.icon}</span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-semibold">{item.label}</span>
            {item.status !== "valid" && (
              <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[11.5px] font-semibold", status.chip)}>{status.label}</span>
            )}
          </div>
          <span className={cn("text-[13.5px]", item.status === "na" && "text-muted-foreground")}>{item.text}</span>
          {item.decision && (
            <span className="text-[12.5px] text-muted-foreground">
              Par {item.decision.byName || "l'équipe"} le {shortDay(item.decision.at)}
              {item.decision.note ? ` : « ${item.decision.note} »` : ""}
              {item.finding ? ` · constat : ${item.finding}` : ""}
            </span>
          )}
          {item.origin && <span className="text-[12px] text-muted-foreground">{item.origin}</span>}
          {(item.decision || item.manualDateId) && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px]">
              {proof && (
                <DocumentViewer document={proof} documentKindLabels={documentKindLabels}>
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    <Paperclip className="size-3" />
                    Voir le justificatif
                  </button>
                </DocumentViewer>
              )}
              {!locked && (
                <button
                  type="button"
                  disabled={busy}
                  className="font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50"
                  onClick={() =>
                    run(
                      () => revokeDiagnosticDecision({ bailId, decisionId: (item.decision?.id || item.manualDateId)!, revalidate: pathname }),
                      item.decision ? "Décision annulée" : "Date retirée",
                    )
                  }
                >
                  {item.decision ? "Annuler la décision" : "Retirer la date saisie"}
                </button>
              )}
            </span>
          )}
          {item.reading && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
              <Loader2 className="size-3.5 animate-spin" />
              Lecture du nouveau fichier…
            </span>
          )}
          {item.unreadFile && !item.reading && item.status !== "valid" && (
            <span className="text-[12.5px] font-medium text-amber-800">
              Le nouveau fichier{item.unreadFile.label ? ` « ${displayFileName(item.unreadFile.label)} »` : ""} n&apos;a pas pu être lu
              {item.actions.includes("date") ? " : saisissez la date du diagnostic." : " : vérifiez-le, puis marquez conforme."}
            </span>
          )}
        </div>
      </div>
      {primary && (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5 pl-[26px] @xl:pl-0">
          {button(primary, true)}
          {inline.map((action) => button(action, false))}
          {menu.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0" aria-label={`Autres actions pour ${item.label}`}>
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menu.map((action) => (
                  <DropdownMenuItem key={action} onSelect={() => onDecide({ item, kind: action === "conforme" ? "CONFORME" : "NON_CONCERNE" })}>
                    {action === "conforme" ? <Check className="size-4" /> : <Minus className="size-4" />}
                    {action === "conforme" ? "Marquer conforme" : "Non concerné"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}
    </li>
  );
}

function OwnerButtons({ bailId, state, locked }: { bailId: string; state: DiagnosticStateView; locked: boolean }) {
  const [sending, startSending] = React.useTransition();
  const lines = [
    ...state.items.filter((item) => (item.status === "replace" || item.status === "missing") && item.message).map((item) => item.message!),
    ...state.items.filter((item) => item.status === "check" && item.question).map((item) => item.question!),
  ];
  if (lines.length === 0) return null;
  const send = () =>
    startSending(async () => {
      const result = await sendDiagnosticsToOwner({ bailId });
      if (result.success) toast.success(`E-mail envoyé à ${result.data.email}`);
      else toast.error(result.error);
    });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Texte copié");
    } catch {
      toast.error("Copie impossible");
    }
  };
  return (
    <span className="inline-flex gap-1.5">
      {!locked && (
        <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" onClick={send} disabled={sending} title={lines.join("\n")}>
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Prévenir le propriétaire
        </Button>
      )}
      <Button type="button" size="sm" variant="ghost" className="h-9 w-9 p-0" onClick={copy} aria-label="Copier le texte pour le propriétaire" title="Copier le texte (appel, message)">
        <Copy className="size-4" />
      </Button>
    </span>
  );
}

/**
 * Diagnostics du bien, une ligne par diagnostic : statut, constat, et une action.
 * Les fichiers sont lus automatiquement par l'IA dès qu'ils arrivent ; l'équipe ajoute un nouveau fichier,
 * marque conforme ou non concerné (motif gardé, visible du notaire).
 */
export function DiagnosticsPanel({
  bailId,
  propertyId,
  state,
  locked,
  configured,
}: {
  bailId: string;
  propertyId: string;
  state: DiagnosticStateView;
  /** Bail signé : plus de modification. */
  locked: boolean;
  /** Clé OpenAI présente sur le serveur. */
  configured: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [starting, startTransition] = React.useTransition();
  const [dialog, setDialog] = React.useState<DialogMode>(null);
  const running = state.reading === "running";
  const readingItem = state.items.some((item) => item.reading);

  // Lecture en cours : la fiche se recharge toutes les 4 secondes jusqu'au résultat.
  React.useEffect(() => {
    if (!running && !readingItem) return;
    const timer = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(timer);
  }, [running, readingItem, router]);

  const reread = () =>
    startTransition(async () => {
      const result = await requestDiagnosticAnalysis({ bailId, revalidate: pathname });
      if (!result.success) toast.error(result.error);
      else toast.success("Lecture lancée : le résultat s'affiche ici dans une à deux minutes");
    });

  const noFiles = state.files.length === 0;
  const { toFix, toCheck } = state.counts;
  const summary =
    state.items.length === 0
      ? null
      : toFix + toCheck === 0
        ? { text: "Tout est en ordre", className: "text-green-800" }
        : {
            text: [toFix ? `${toFix} à remplacer` : null, toCheck ? `${toCheck} à vérifier` : null].filter(Boolean).join(" · "),
            className: toFix ? "text-red-800" : "text-amber-900",
          };
  const rereadButton = !locked && configured && !noFiles && (
    <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-1.5 text-[12.5px]" onClick={reread} disabled={starting || running}>
      <RefreshCw className={cn("size-3.5", (starting || running) && "animate-spin")} />
      Relire les fichiers
    </Button>
  );

  return (
    <div className="@container flex flex-col gap-2 whitespace-normal">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {summary ? <span className={cn("text-[14px] font-semibold", summary.className)}>{summary.text}</span> : <span />}
        <div className="flex flex-wrap gap-1.5">
          <ViewFilesButton files={state.files} />
          <OwnerButtons bailId={bailId} state={state} locked={locked} />
        </div>
      </div>

      {noFiles ? (
        <p className="text-[13px] text-muted-foreground">
          Aucun fichier de diagnostics. Dès qu&apos;un fichier est ajouté (par le propriétaire ou dans « Le bien »), il est lu automatiquement.
        </p>
      ) : running ? (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Lecture des fichiers par l&apos;IA : jusqu&apos;à 2 minutes pour un gros dossier.
        </p>
      ) : !configured && state.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Lecture automatique indisponible : clé OpenAI non configurée sur ce serveur.</p>
      ) : state.reading === "failed" || state.reading === "stalled" ? (
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-semibold text-red-700">
          {state.reading === "stalled" ? "La lecture ne s'est pas terminée." : state.error || "La lecture a échoué."}
          {rereadButton}
        </p>
      ) : state.filesChanged ? (
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] font-semibold text-amber-800">
          Les fichiers ont changé depuis la dernière lecture.
          {rereadButton}
        </p>
      ) : state.items.length === 0 ? (
        <p className="flex flex-wrap items-center gap-x-2 text-[13px] text-muted-foreground">
          Fichiers pas encore lus.
          {rereadButton}
        </p>
      ) : null}

      {state.items.length > 0 && (
        <ul className="flex flex-col divide-y rounded-lg border bg-background px-3">
          {state.items.map((item) => (
            <ItemRow key={item.id} item={item} bailId={bailId} propertyId={propertyId} state={state} locked={locked} onDecide={setDialog} />
          ))}
        </ul>
      )}

      {state.items.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {state.lastRead && (
            <span className="text-[11.5px] text-muted-foreground">
              Lu par l&apos;IA le {when(state.lastRead.at)}
              {state.lastRead.byName ? ` (${state.lastRead.byName})` : " (automatique)"}
              {state.lastRead.costUsd != null ? ` · ${state.lastRead.costUsd.toFixed(2).replace(".", ",")} $` : ""}
            </span>
          )}
          {!running && !state.filesChanged && state.reading === "ready" && rereadButton}
        </div>
      )}
      {state.extraction && state.items.length > 0 && <ExtractedData extraction={state.extraction} notFound={state.notFound} />}

      <DecisionDialog mode={dialog} bailId={bailId} propertyId={propertyId} onClose={() => setDialog(null)} />
    </div>
  );
}
