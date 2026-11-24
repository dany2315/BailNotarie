"use client";

import * as React from "react";

/**
 * Téléchargement d'une pièce avec sa progression (octets reçus sur le total), pour montrer
 * l'avancement pendant que la pièce arrive. Une fois reçue, la pièce est servie depuis la mémoire
 * du navigateur (adresse « blob: »), sans second téléchargement.
 * Si le téléchargement échoue (réseau, accès), l'état passe à « error » : l'appelant affiche alors
 * la pièce depuis son adresse d'origine, comme avant.
 */
export type FileProgress = {
  status: "idle" | "loading" | "done" | "error";
  loaded: number;
  /** Taille annoncée par le serveur, inconnue si absente. */
  total: number | null;
  objectUrl: string | null;
  blob: Blob | null;
};

const IDLE: FileProgress = { status: "idle", loaded: 0, total: null, objectUrl: null, blob: null };

/** `mimeType` : type connu de la pièce, prioritaire sur celui du serveur (souvent générique). */
export function useFileProgress(url: string | null, mimeType?: string | null): FileProgress {
  const [state, setState] = React.useState<FileProgress>(IDLE);

  React.useEffect(() => {
    if (!url) {
      setState(IDLE);
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    let objectUrl: string | null = null;
    setState({ status: "loading", loaded: 0, total: null, objectUrl: null, blob: null });

    (async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
        const total = Number(response.headers.get("content-length")) || null;
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        let lastPaint = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          loaded += value.length;
          // Une mise à jour toutes les 80 ms suffit à une barre fluide.
          const now = performance.now();
          if (now - lastPaint > 80 && !cancelled) {
            lastPaint = now;
            setState((s) => ({ ...s, loaded, total }));
          }
        }
        const blob = new Blob(chunks as BlobPart[], { type: mimeType || response.headers.get("content-type") || "" });
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setState({ status: "done", loaded, total: total ?? loaded, objectUrl, blob });
      } catch {
        if (!cancelled) setState((s) => ({ ...s, status: "error" }));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}
