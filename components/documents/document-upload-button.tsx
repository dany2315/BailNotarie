"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { attachDocumentAdmin, type DocumentTarget } from "@/lib/actions/admin-documents";
import { cn } from "@/lib/utils";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.heic,.webp,.doc,.docx";
const MAX_SIZE = 20 * 1024 * 1024;

/** Envoi direct vers S3 (URL signée), avec la progression. */
function putToS3(file: File, signedUrl: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Envoi refusé (${xhr.status})`)),
    );
    xhr.addEventListener("error", () => reject(new Error("Erreur réseau pendant l'envoi")));
    xhr.addEventListener("abort", () => reject(new Error("Envoi annulé")));
    xhr.open("PUT", signedUrl, true);
    xhr.send(file);
  });
}

/**
 * « Ajouter » une pièce manquante, ou « Remplacer » une pièce existante : la
 * nouvelle pièce est enregistrée, puis l'ancienne est supprimée (fichier
 * compris). En cas d'échec, l'ancienne reste en place.
 */
export function DocumentUploadButton({
  target,
  kind,
  replaceIds,
  label,
  className,
}: {
  target: DocumentTarget;
  kind: string;
  /** Pièces remplacées par le nouveau fichier. Vide = ajout. */
  replaceIds?: string[];
  label?: string;
  className?: string;
}) {
  const pathname = usePathname();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [progress, setProgress] = React.useState<number | null>(null);
  const replacing = !!replaceIds && replaceIds.length > 0;

  const onFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      toast.error("Fichier trop lourd (20 Mo maximum)");
      return;
    }
    setProgress(0);
    try {
      const tokenResponse = await fetch("/api/blob/generate-upload-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, fileName: file.name, contentType: file.type || "application/octet-stream", documentKind: kind }),
      });
      const tokenData = await tokenResponse.json().catch(() => ({}));
      if (!tokenResponse.ok || !tokenData.signedUrl) throw new Error(tokenData.error || "Impossible de préparer l'envoi");

      await putToS3(file, tokenData.signedUrl, setProgress);

      const result = await attachDocumentAdmin({
        target,
        kind,
        fileKey: tokenData.fileKey,
        fileName: file.name,
        mimeType: file.type || undefined,
        size: file.size,
        replaceIds: replacing ? replaceIds : undefined,
        revalidate: pathname,
      });
      if (!result.success) throw new Error(result.error);

      // Pas de router.refresh() : l'action revalide la page courante et sa réponse
      // la met déjà à jour (un refresh en plus, depuis un bouton qui disparaît avec
      // l'ancienne pièce, provoquait un rechargement complet).
      toast.success(replacing ? "Pièce remplacée" : "Pièce ajoutée");
    } catch (error: any) {
      toast.error(error?.message || "L'envoi a échoué");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const busy = progress !== null;
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn("h-9 gap-1.5", className)}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : replacing ? (
          <RefreshCw className="size-4" />
        ) : (
          <Plus className="size-4" />
        )}
        {busy ? `${progress} %` : label || (replacing ? "Remplacer" : "Ajouter")}
      </Button>
    </>
  );
}
