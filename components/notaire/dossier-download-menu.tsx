"use client";

import * as React from "react";
import { Check, ChevronDown, Download, FileArchive, FileText, FolderDown, Loader2, MinusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Trois façons de récupérer le dossier complet, proposées en test au notaire :
 * - « Enregistrer le dossier » : les pièces d'origine, rangées en sous-dossiers, plus le PDF complet,
 *   écrites directement dans le dossier qu'il choisit (Chrome et Edge) ; sinon, le zip ;
 * - « Un seul PDF » : fiche, sommaire et toutes les pièces à la suite ;
 * - « Fichier .zip » : le téléchargement d'avant.
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
const supportsFolder = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function fileNameFrom(response: Response, fallback: string) {
  const header = response.headers.get("content-disposition") ?? "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1] : fallback;
}

export function DossierDownloadMenu({ assignmentId, documentCount }: { assignmentId: string; documentCount: number }) {
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [save, setSave] = React.useState<{ open: boolean; running: boolean; folder: string; root: string; rows: Row[] }>({
    open: false,
    running: false,
    folder: "",
    root: "",
    rows: [],
  });
  const base = `/api/notaire/dossiers/${assignmentId}`;

  const downloadZip = () => {
    const link = document.createElement("a");
    link.href = `${base}/zip`;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const downloadPdf = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    const id = toast.loading("Préparation du PDF du dossier… (jusqu'à une minute pour un gros dossier)");
    try {
      const response = await fetch(`${base}/pdf`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      saveBlob(await response.blob(), fileNameFrom(response, "Dossier complet.pdf"));
      toast.success("PDF du dossier téléchargé", { id });
    } catch (error) {
      console.error("[dossier pdf]", error);
      toast.error("Le PDF n'a pas pu être préparé. Réessayez, ou prenez le zip.", { id });
    } finally {
      setPdfBusy(false);
    }
  };

  const setRow = (path: string, state: FileState, note?: string) =>
    setSave((s) => ({ ...s, rows: s.rows.map((r) => (r.path === path ? { ...r, state, note } : r)) }));

  const saveToFolder = async () => {
    if (!supportsFolder()) {
      toast.info("Ce navigateur ne permet pas d'enregistrer dans un dossier (seuls Chrome et Edge sur ordinateur le font) : le zip est téléchargé à la place.");
      downloadZip();
      return;
    }
    let dir: any;
    try {
      dir = await (window as any).showDirectoryPicker({ id: "bailnotarie-dossiers", mode: "readwrite", startIn: "documents" });
    } catch (error: any) {
      if (error?.name !== "AbortError") toast.error("Le choix du dossier n'a pas pu s'ouvrir.");
      return;
    }

    let manifest: Manifest;
    try {
      const response = await fetch(`${base}/files`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      manifest = await response.json();
    } catch (error) {
      console.error("[dossier enregistrer]", error);
      toast.error("La liste des pièces n'a pas pu être lue. Réessayez.");
      return;
    }

    setSave({
      open: true,
      running: true,
      folder: dir.name,
      root: manifest.root,
      rows: [...manifest.files.map((f) => ({ path: f.path, state: "waiting" as FileState })), { path: PDF_NAME, state: "waiting" }],
    });

    let rootDir: any = null;
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

    try {
      rootDir = await dir.getDirectoryHandle(manifest.root, { create: true });
    } catch (error) {
      console.error("[dossier enregistrer]", error);
      toast.error("Impossible de créer le dossier à cet endroit. Choisissez un autre emplacement.");
      setSave((s) => ({ ...s, open: false, running: false }));
      return;
    }

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

  const done = save.rows.filter((r) => r.state === "done").length;
  const present = save.rows.filter((r) => r.state === "present").length;
  const failed = save.rows.filter((r) => r.state === "error").length;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="col-span-2 h-10 gap-2 sm:col-span-1" disabled={pdfBusy}>
            {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Télécharger le dossier
            <span className="font-normal opacity-80">
              · {documentCount} pièce{documentCount > 1 ? "s" : ""}
            </span>
            <ChevronDown className="size-4 opacity-80" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[340px]">
          <DropdownMenuLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Trois façons de récupérer le dossier
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800">Test</span>
          </DropdownMenuLabel>
          <DropdownMenuItem className="items-start gap-3 py-2.5" onSelect={() => void saveToFolder()}>
            <FolderDown className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Enregistrer le dossier</span>
              <span className="text-xs text-muted-foreground">
                Les pièces d'origine rangées par sous-dossier, et le PDF complet, directement dans le dossier de votre choix. Sans zip. Chrome ou Edge.
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem className="items-start gap-3 py-2.5" onSelect={() => void downloadPdf()}>
            <FileText className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Un seul PDF</span>
              <span className="text-xs text-muted-foreground">La fiche du dossier, un sommaire cliquable et toutes les pièces à la suite.</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="items-start gap-3 py-2.5" onSelect={downloadZip}>
            <FileArchive className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">Fichier .zip</span>
              <span className="text-xs text-muted-foreground">Le téléchargement habituel. Sous Windows, un double-clic l'ouvre comme un dossier.</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={save.open} onOpenChange={(open) => !save.running && setSave((s) => ({ ...s, open }))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{save.running ? "Enregistrement du dossier…" : failed ? "Dossier enregistré, avec des manques" : "Dossier enregistré"}</DialogTitle>
            <DialogDescription>
              Dans « {save.folder} » › « {save.root} »
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto rounded-lg border p-2 text-[13px]">
            {save.rows.map((row) => (
              <li key={row.path} className="flex items-center gap-2 rounded px-1.5 py-1">
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {row.state === "writing" && <Loader2 className="size-3.5 animate-spin text-primary" />}
                  {row.state === "done" && <Check className="size-3.5 text-emerald-600" />}
                  {row.state === "present" && <MinusCircle className="size-3.5 text-muted-foreground" />}
                  {row.state === "error" && <XCircle className="size-3.5 text-destructive" />}
                </span>
                <span className={cn("min-w-0 flex-1 truncate", row.state === "waiting" && "text-muted-foreground")} title={row.path}>
                  {row.path}
                </span>
                {(row.note || row.state === "present") && (
                  <span className="shrink-0 text-xs text-muted-foreground">{row.note ?? "déjà présent"}</span>
                )}
              </li>
            ))}
          </ul>
          {!save.running && (
            <p className="text-[13px] text-muted-foreground">
              {done} fichier{done > 1 ? "s" : ""} enregistré{done > 1 ? "s" : ""}
              {present > 0 && `, ${present} déjà présent${present > 1 ? "s" : ""}`}
              {failed > 0 && `, ${failed} non récupéré${failed > 1 ? "s" : ""} : téléchargez-les depuis la liste des pièces`}.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={save.running} onClick={() => setSave((s) => ({ ...s, open: false }))}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
