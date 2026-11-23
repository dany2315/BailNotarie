import { NextRequest, NextResponse } from "next/server";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { buildDossierPdf } from "@/lib/notaire/dossier-pdf";
import { dossierRootName } from "@/lib/notaire/dossier-files";
import { contentDisposition } from "@/lib/utils/document-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Tout le dossier en un seul PDF (fiche, sommaire, pièces), pour le notaire assigné ou l'équipe. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await loadNotaireDossier(id);
  if (!view) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  try {
    const bytes = await buildDossierPdf(view);
    const name = `${dossierRootName(view).replace(/^Dossier - /, "Dossier complet - ")}.pdf`;
    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDisposition(name, "attachment"),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[notaire pdf]", id, error);
    return NextResponse.json({ error: "Le PDF du dossier n'a pas pu être préparé." }, { status: 500 });
  }
}
