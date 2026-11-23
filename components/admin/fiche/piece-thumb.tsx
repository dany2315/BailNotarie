"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { FileText, ImageOff } from "lucide-react";
import { getS3PublicUrl } from "@/hooks/use-s3-public-url";
import type { ChecklistDocument } from "@/lib/utils/document-checklist";
import { cn } from "@/lib/utils";

// pdf.js seulement dans le navigateur : rien n'est ajouté aux fonctions du serveur.
const PdfFirstPage = dynamic(() => import("./pdf-first-page"), { ssr: false });

export type FileKind = "image" | "pdf" | "other";

export function fileKindOf(doc: Pick<ChecklistDocument, "mimeType" | "fileKey">): FileKind {
  const mime = doc.mimeType || "";
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  const ext = doc.fileKey.split(".").pop()?.toLowerCase() || "";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "other";
}

const urls = new Map<string, Promise<string>>();

/** Adresse signée d'un fichier (la même que « Voir »), gardée le temps de la page. */
export function signedUrl(fileKey: string): Promise<string> {
  let pending = urls.get(fileKey);
  if (!pending) {
    pending = fetch("/api/blob/get-signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileKey }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("url"))))
      .then((data) => data.signedUrl as string)
      .catch(() => getS3PublicUrl(fileKey) || fileKey);
    urls.set(fileKey, pending);
  }
  return pending;
}

/** Miniature d'une pièce : la photo, la première page du PDF, sinon une icône. Chargée quand elle devient visible. */
export function PieceThumb({ doc, width = 44, className }: { doc: ChecklistDocument; width?: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [failed, setFailed] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const kind = fileKindOf(doc);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  React.useEffect(() => {
    if (!visible || kind !== "image") return;
    let cancelled = false;
    signedUrl(doc.fileKey).then((url) => !cancelled && setImageUrl(url));
    return () => {
      cancelled = true;
    };
  }, [visible, kind, doc.fileKey]);

  return (
    <span ref={ref} className={cn("relative flex items-center justify-center overflow-hidden bg-slate-100", className)}>
      {failed || kind === "other" ? (
        kind === "image" ? <ImageOff className="size-5 text-slate-400" /> : <FileText className="size-5 text-slate-400" />
      ) : !visible ? null : kind === "image" ? (
        imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" onError={() => setFailed(true)} className="size-full object-cover" />
        ) : (
          <span className="block size-full animate-pulse bg-slate-200/70" />
        )
      ) : (
        <PdfFirstPage
          cacheKey={doc.fileKey}
          getUrl={() => signedUrl(doc.fileKey)}
          width={width}
          className="size-full object-cover object-top"
          onFail={() => setFailed(true)}
        />
      )}
    </span>
  );
}
