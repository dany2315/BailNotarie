import { NextRequest, NextResponse } from "next/server";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { documentReadUrl, dossierFiles } from "@/lib/notaire/dossier-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Une pièce du dossier, relayée par le serveur : secours de « Enregistrer le dossier ». */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const view = await loadNotaireDossier(id);
  if (!view) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  const file = dossierFiles(view).find(({ doc }) => doc.id === docId);
  if (!file) return NextResponse.json({ error: "Pièce introuvable" }, { status: 404 });

  const response = await fetch(await documentReadUrl(file.doc));
  if (!response.ok || !response.body) return NextResponse.json({ error: "Fichier illisible" }, { status: 502 });
  return new Response(response.body, {
    headers: {
      "Content-Type": file.doc.mimeType || response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "no-store",
    },
  });
}
