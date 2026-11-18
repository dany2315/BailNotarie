"use client";

import * as React from "react";

/*
 * Première page d'un PDF, dessinée dans le navigateur (pdf.js). Chargé seulement côté navigateur
 * (voir piece-thumb.tsx) : jamais dans les fonctions du serveur. Le lecteur est servi par le site
 * (public/pdfjs), même version que la bibliothèque.
 */
const WORKER_SRC = "/pdfjs/pdf.worker-6.4.299.min.mjs";
const cache = new Map<string, Promise<string>>();

async function render(url: string, width: number): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
  // Lecture par morceaux : seul le début du fichier est téléchargé pour la première page.
  const task = pdfjs.getDocument({ url, disableAutoFetch: true });
  const doc = await task.promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (width * 2) / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas");
    await page.render({ canvas, canvasContext: context, viewport } as any).promise;
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    void task.destroy();
  }
}

/** Miniature de la première page, ou rien (le parent affiche alors une icône). */
export default function PdfFirstPage({
  cacheKey,
  getUrl,
  width,
  className,
  onFail,
}: {
  cacheKey: string;
  getUrl: () => Promise<string>;
  width: number;
  className?: string;
  onFail: () => void;
}) {
  const [src, setSrc] = React.useState<string | null>(null);
  React.useEffect(() => {
    let cancelled = false;
    let pending = cache.get(cacheKey);
    if (!pending) {
      pending = getUrl().then((url) => render(url, width));
      cache.set(cacheKey, pending);
      pending.catch(() => cache.delete(cacheKey));
    }
    pending.then((data) => !cancelled && setSrc(data)).catch(() => !cancelled && onFail());
    return () => {
      cancelled = true;
    };
  }, [cacheKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!src) return <span className="block size-full animate-pulse bg-slate-200/70" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className={className} />;
}

/**
 * Lecture d'un PDF dans le panneau de la pièce : les pages sont dessinées à la largeur du panneau,
 * au fur et à mesure qu'elles deviennent visibles (un gros dossier de diagnostics reste fluide).
 */
export function PdfPages({ url, onFail }: { url: string; onFail: () => void }) {
  const [doc, setDoc] = React.useState<any>(null);
  React.useEffect(() => {
    let cancelled = false;
    let task: any = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        task = pdfjs.getDocument({ url, disableAutoFetch: true });
        const loaded = await task.promise;
        if (!cancelled) setDoc(loaded);
      } catch {
        if (!cancelled) onFail();
      }
    })();
    return () => {
      cancelled = true;
      void task?.destroy();
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!doc) return <span className="block h-[70vh] w-full animate-pulse rounded-md bg-slate-200/70" />;
  return (
    <div className="flex w-full flex-col items-center gap-3">
      {Array.from({ length: doc.numPages }, (_, i) => (
        <PdfPage key={i} doc={doc} number={i + 1} />
      ))}
      <p className="text-[12px] text-muted-foreground">
        {doc.numPages} page{doc.numPages > 1 ? "s" : ""}
      </p>
    </div>
  );
}

function PdfPage({ doc, number }: { doc: any; number: number }) {
  const holder = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = React.useState(number <= 2);
  const [ratio, setRatio] = React.useState(1.414);
  React.useEffect(() => {
    const el = holder.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { rootMargin: "600px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);
  React.useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    let renderTask: any = null;
    (async () => {
      const page = await doc.getPage(number);
      const base = page.getViewport({ scale: 1 });
      if (cancelled) return;
      setRatio(base.height / base.width);
      const width = holder.current?.clientWidth || 700;
      const viewport = page.getViewport({ scale: (width * (window.devicePixelRatio || 1)) / base.width });
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");
      if (!canvas || !context) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      renderTask = page.render({ canvas, canvasContext: context, viewport } as any);
      await renderTask.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel?.();
    };
  }, [visible, doc, number]);
  return (
    <div ref={holder} className="w-full overflow-hidden rounded-md bg-white shadow-sm" style={{ aspectRatio: `1 / ${ratio}` }}>
      <canvas ref={canvasRef} className="block size-full" aria-label={`Page ${number}`} />
    </div>
  );
}
