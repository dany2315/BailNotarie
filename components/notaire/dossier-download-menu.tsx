"use client";

import * as React from "react";
import { AlertTriangle, Check, CheckCircle2, Download, FileText, Folder, FolderDown, Loader2, MinusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/**
 * « Télécharger le dossier » : les pièces d'origine, rangées en sous-dossiers, plus le PDF complet,
 * écrites directement dans le dossier que le notaire choisit (sans zip à extraire).
 * Le navigateur est vérifié au clic : s'il ne permet pas d'écrire dans un dossier
 * (Safari, Firefox, mobile, Brave…), le dossier part en .zip, comme avant.
 */

type FileState = "waiting" | "writing" | "done" | "present" | "error";
interface Row {
  path: string;
  state: FileState;
  note?: string;
}
interface Manifest {
  root: string;
  pdfUrl: string;
  files: Array<{ id: string; path: string; size: number | null; url: string | null; fallbackUrl: string }>;
}

const PDF_NAME = "Dossier complet.pdf";

/** Le navigateur sait-il écrire dans un dossier choisi ? (Chrome, Edge, Opera sur ordinateur.) */
function canSaveToFolder() {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) return false;
  if (typeof (window as any).showDirectoryPicker !== "function") return false;
  try {
    // Le sélecteur de dossier est refusé dans un cadre d'un autre site.
    if (window.self !== window.top) return false;
  } catch {
    return false;
  }
  return true;
}

/** Nom du navigateur, pour le message seulement : la décision repose sur canSaveToFolder(). */
function browserName() {
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod/i.test(ua);
  let name = "Ce navigateur";
  if (/Firefox|FxiOS/i.test(ua)) name = "Firefox";
  else if (/EdgA?\//i.test(ua)) name = "Edge";
  else if (/OPR\//i.test(ua)) name = "Opera";
  else if ((navigator as any).brave) name = "Brave";
  else if (/Chrome|CriOS/i.test(ua)) name = "Chrome";
  else if (/Safari/i.test(ua)) name = "Safari";
  return mobile && name !== "Ce navigateur" ? `${name} sur mobile` : name;
}

function downloadZip(base: string) {
  const link = document.createElement("a");
  link.href = `${base}/zip`;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Regroupe les lignes par sous-dossier, dans l'ordre d'arrivée ; le PDF complet reste à la racine. */
function groupRows(rows: Row[]) {
  const groups: Array<{ folder: string | null; rows: Array<Row & { name: string }> }> = [];
  for (const row of rows) {
    const cut = row.path.indexOf("/");
    const folder = cut === -1 ? null : row.path.slice(0, cut);
    const name = cut === -1 ? row.path : row.path.slice(cut + 1);
    let group = groups.find((g) => g.folder === folder);
    if (!group) {
      group = { folder, rows: [] };
      groups.push(group);
    }
    group.rows.push({ ...row, name });
  }
  return groups;
}

function StateIcon({ state }: { state: FileState }) {
  if (state === "writing") return <Loader2 className="size-3.5 animate-spin text-primary" />;
  if (state === "done") return <Check className="size-3.5 text-emerald-600" />;
  if (state === "present") return <MinusCircle className="size-3.5 text-muted-foreground" />;
  if (state === "error") return <XCircle className="size-3.5 text-destructive" />;
  return <span className="size-1.5 rounded-full bg-muted-foreground/30" />;
}

export function DossierDownloadMenu({ assignmentId, documentCount }: { assignmentId: string; documentCount: number }) {
  const [starting, setStarting] = React.useState(false);
  const [save, setSave] = React.useState<{ open: boolean; running: boolean; folder: string; root: string; rows: Row[] }>({
    open: false,
    running: false,
    folder: "",
    root: "",
    rows: [],
  });
  const base = `/api/notaire/dossiers/${assignmentId}`;

  const fallbackToZip = (reason: string) => {
    toast.info(reason, { description: "Le dossier est téléchargé en .zip : sous Windows, un double-clic l'ouvre comme un dossier." });
    downloadZip(base);
  };

  const setRow = (path: string, state: FileState, note?: string) =>
    setSave((s) => ({ ...s, rows: s.rows.map((r) => (r.path === path ? { ...r, state, note } : r)) }));

  const start = async () => {
    if (starting || save.running) return;
    if (!canSaveToFolder()) {
      fallbackToZip(`${browserName()} ne permet pas d'enregistrer directement dans un dossier.`);
      return;
    }

    let dir: any;
    try {
      dir = await (window as any).showDirectoryPicker({ id: "bailnotarie-dossiers", mode: "readwrite", startIn: "documents" });
    } catch (error: any) {
      if (error?.name === "AbortError") return; // le notaire a annulé
      console.error("[dossier enregistrer] sélecteur", error);
      fallbackToZip("Le navigateur a refusé l'accès au dossier.");
      return;
    }

    setStarting(true);
    let manifest: Manifest;
    try {
      const response = await fetch(`${base}/files`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      manifest = await response.json();
    } catch (error) {
      console.error("[dossier enregistrer]", error);
      toast.error("La liste des pièces n'a pas pu être lue. Réessayez dans un instant.");
      setStarting(false);
      return;
    }

    let rootDir: any = null;
    try {
      rootDir = await dir.getDirectoryHandle(manifest.root, { create: true });
    } catch (error) {
      console.error("[dossier enregistrer] racine", error);
      setStarting(false);
      fallbackToZip("Impossible d'écrire à cet emplacement.");
      return;
    }

    setStarting(false);
    setSave({
      open: true,
      running: true,
      folder: dir.name,
      root: manifest.root,
      rows: [...manifest.files.map((f) => ({ path: f.path, state: "waiting" as FileState })), { path: PDF_NAME, state: "waiting" }],
    });

    const write = async (path: string, data: Blob) => {
      const parts = path.split("/");
      let target = rootDir;
      for (const part of parts.slice(0, -1)) target = await target.getDirectoryHandle(part, { create: true });
      const handle = await target.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
    };
    /** Déjà enregistré avec la même taille (nouveau clic après un ajout de pièce) : on ne le réécrit pas. */
    const alreadyThere = async (path: string, size: number | null) => {
      if (!size) return false;
      try {
        const parts = path.split("/");
        let target = rootDir;
        for (const part of parts.slice(0, -1)) target = await target.getDirectoryHandle(part);
        const file = await (await target.getFileHandle(parts[parts.length - 1])).getFile();
        return file.size === size;
      } catch {
        return false;
      }
    };

    for (const file of manifest.files) {
      if (await alreadyThere(file.path, file.size)) {
        setRow(file.path, "present");
        continue;
      }
      setRow(file.path, "writing");
      try {
        let response: Response | null = null;
        if (file.url) response = await fetch(file.url).catch(() => null);
        if (!response?.ok) response = await fetch(file.fallbackUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await write(file.path, await response.blob());
        setRow(file.path, "done");
      } catch (error) {
        console.error("[dossier enregistrer]", file.path, error);
        setRow(file.path, "error", "non récupéré");
      }
    }

    // Le PDF complet en dernier : c'est le plus long à préparer.
    setRow(PDF_NAME, "writing", "préparation…");
    try {
      const response = await fetch(manifest.pdfUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      await write(PDF_NAME, await response.blob());
      setRow(PDF_NAME, "done");
    } catch (error) {
      console.error("[dossier enregistrer] pdf", error);
      setRow(PDF_NAME, "error", "non préparé");
    }
    setSave((s) => ({ ...s, running: false }));
  };

  const total = save.rows.length;
  const done = save.rows.filter((r) => r.state === "done").length;
  const present = save.rows.filter((r) => r.state === "present").length;
  const failed = save.rows.filter((r) => r.state === "error").length;
  const handled = done + present + failed;
  const percent = total ? Math.round((handled / total) * 100) : 0;
  const groups = groupRows(save.rows);
  const finished = !save.running && total > 0;

  // Garde le fichier en cours visible dans la liste.
  const listRef = React.useRef<HTMLDivElement>(null);
  const current = save.rows.find((r) => r.state === "writing")?.path;
  React.useEffect(() => {
    listRef.current?.querySelector("[data-writing]")?.scrollIntoView({ block: "nearest" });
  }, [current]);

  return (
    <>
      <Button className="col-span-2 h-10 gap-2 sm:col-span-1" disabled={starting || save.running} onClick={() => void start()}>
        {starting || save.running ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
        Télécharger le dossier
        <span className="font-normal opacity-80">
          · {documentCount} pièce{documentCount > 1 ? "s" : ""}
        </span>
      </Button>

      <Dialog open={save.open} onOpenChange={(open) => !save.running && setSave((s) => ({ ...s, open }))}>
        <DialogContent
          showCloseButton={false}
          className="gap-0 overflow-hidden p-0 sm:max-w-[520px]"
          onInteractOutside={(event) => save.running && event.preventDefault()}
          onEscapeKeyDown={(event) => save.running && event.preventDefault()}
        >
          <DialogHeader className="flex-row items-start gap-3.5 space-y-0 px-6 pt-6 pb-5 text-left">
            <span
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-xl",
                save.running && "bg-primary/10 text-primary",
                finished && !failed && "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
                finished && failed > 0 && "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
              )}
            >
              {save.running ? (
                <FolderDown className="size-5" />
              ) : failed ? (
                <AlertTriangle className="size-5" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <DialogTitle className="text-[17px] leading-tight">
                {save.running ? "Enregistrement du dossier" : failed ? "Dossier enregistré, à compléter" : "Dossier enregistré"}
              </DialogTitle>
              <DialogDescription asChild>
                <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
                  <Folder className="size-3.5 shrink-0" />
                  {save.folder && (
                    <>
                      <span className="shrink-0">{save.folder}</span>
                      <span className="shrink-0 opacity-50">›</span>
                    </>
                  )}
                  <span className="truncate font-medium text-foreground" title={save.root}>
                    {save.root}
                  </span>
                </div>
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-2 px-6 pb-4">
            <div className="flex items-baseline justify-between text-[12.5px] text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground tabular-nums">{handled}</span> sur {total} fichier{total > 1 ? "s" : ""}
              </span>
              <span className="tabular-nums">{percent} %</span>
            </div>
            <Progress
              value={percent}
              className={cn("h-1.5", finished && !failed && "bg-emerald-100 [&>div]:bg-emerald-500", finished && failed > 0 && "bg-amber-100 [&>div]:bg-amber-500")}
            />
          </div>

          <div ref={listRef} className="mx-6 max-h-[46vh] overflow-y-auto rounded-xl border bg-muted/30 py-1.5 text-[13px]">
            {groups.map((group) => (
              <div key={group.folder ?? "__racine"} className={cn(group.folder === null && "mt-1 border-t pt-1")}>
                {group.folder && (
                  <div className="flex items-center gap-2 px-3 pt-1.5 pb-1 font-medium">
                    <Folder className="size-3.5 shrink-0 fill-primary/15 text-primary" />
                    <span className="truncate" title={group.folder}>
                      {group.folder}
                    </span>
                    <span className="ml-auto shrink-0 text-[11.5px] font-normal text-muted-foreground tabular-nums">{group.rows.length}</span>
                  </div>
                )}
                {group.rows.map((row) => (
                  <div key={row.path} data-writing={row.state === "writing" || undefined} className={cn("flex items-center gap-2 py-1 pr-3", group.folder ? "pl-8" : "pl-3")}>
                    <FileText className={cn("size-3.5 shrink-0", group.folder ? "text-muted-foreground/70" : "text-primary")} />
                    <span
                      className={cn("min-w-0 flex-1 truncate", row.state === "waiting" && "text-muted-foreground", !group.folder && "font-medium")}
                      title={row.path}
                    >
                      {row.name}
                    </span>
                    {(row.note || row.state === "present") && (
                      <span className={cn("shrink-0 text-[11.5px]", row.state === "error" ? "text-destructive" : "text-muted-foreground")}>
                        {row.note ?? "déjà là"}
                      </span>
                    )}
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      <StateIcon state={row.state} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {finished && (
            <p
              className={cn(
                "mx-6 mt-3 rounded-lg px-3 py-2 text-[12.5px] leading-snug",
                failed
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
              )}
            >
              {done} fichier{done > 1 ? "s" : ""} enregistré{done > 1 ? "s" : ""}
              {present > 0 && `, ${present} déjà présent${present > 1 ? "s" : ""}`}
              {failed > 0
                ? `. ${failed} fichier${failed > 1 ? "s n'ont" : " n'a"} pas pu être récupéré${failed > 1 ? "s" : ""} : téléchargez-le${failed > 1 ? "s" : ""} depuis la liste des pièces.`
                : ". Tout le dossier est sur votre ordinateur."}
            </p>
          )}

          <DialogFooter className="mt-4 border-t bg-muted/20 px-6 py-3.5">
            {save.running ? (
              <Button disabled className="gap-2">
                <Loader2 className="size-4 animate-spin" />
                Enregistrement en cours…
              </Button>
            ) : (
              <Button className="min-w-28" onClick={() => setSave((s) => ({ ...s, open: false }))}>
                Terminé
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
