import { NextRequest, NextResponse } from "next/server";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { documentReadUrl, dossierFiles, dossierRootName } from "@/lib/notaire/dossier-files";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liste des fichiers pour « Enregistrer le dossier » : le navigateur du notaire les écrit lui-même
 * dans le dossier qu'il a choisi. Chaque fichier a une URL signée de 15 minutes, et une adresse de
 * secours qui passe par le serveur si le navigateur ne peut pas lire l'URL signée.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await loadNotaireDossier(id);
  if (!view) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const files = await Promise.all(
    dossierFiles(view).map(async ({ doc, path }) => ({
      id: doc.id,
      path,
      size: doc.size,
      url: await documentReadUrl(doc, 900).catch(() => null),
      fallbackUrl: `/api/notaire/dossiers/${id}/files/${doc.id}`,
    })),
  );
  return NextResponse.json(
    { root: dossierRootName(view), pdfUrl: `/api/notaire/dossiers/${id}/pdf`, files },
    { headers: { "Cache-Control": "no-store" } },
  );
}
