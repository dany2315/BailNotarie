import { NextRequest, NextResponse } from "next/server";
import { Zip, ZipPassThrough, strToU8 } from "fflate";
import { loadNotaireDossier } from "@/lib/notaire/dossier-view";
import { extractS3KeyFromUrl, generateSignedDownloadUrl } from "@/lib/utils/s3-client";
import { contentDisposition } from "@/lib/utils/document-filename";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Toutes les pièces du dossier en un seul zip, pour le notaire assigné (ou l'équipe) :
 * un dossier par personne, puis le bien et le bail, et la fiche du dossier en texte.
 * Le zip est envoyé au fur et à mesure : les fichiers ne sont jamais tous en mémoire.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const view = await loadNotaireDossier(id);
  if (!view) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) {
          controller.error(error);
          return;
        }
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const addText = (name: string, text: string) => {
        const file = new ZipPassThrough(name);
        zip.add(file);
        file.push(strToU8(text), true);
      };

      addText("Fiche du dossier.txt", view.text);
      const missing: string[] = [];
      for (const group of view.documents) {
        for (const doc of group.documents) {
          const path = `${group.folder}/${doc.zipName}`;
          try {
            const url = doc.fileKey.startsWith("http") && !doc.fileKey.includes("amazonaws.com")
              ? doc.fileKey
              : await generateSignedDownloadUrl(extractS3KeyFromUrl(doc.fileKey) || doc.fileKey, 600);
            const response = await fetch(url);
            if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
            const file = new ZipPassThrough(path);
            file.mtime = new Date(doc.createdAt);
            zip.add(file);
            const reader = response.body.getReader();
            for (;;) {
              const { done, value } = await reader.read();
              if (done) {
                file.push(new Uint8Array(0), true);
                break;
              }
              file.push(value);
            }
          } catch (error) {
            console.error("[notaire zip]", path, error);
            missing.push(`${path} (${doc.fileName})`);
          }
        }
      }
      if (missing.length > 0) {
        addText(
          "Fichiers non récupérés.txt",
          `Ces fichiers n'ont pas pu être ajoutés au zip. Téléchargez-les un par un depuis le dossier, ou écrivez-nous.\n\n${missing.join("\n")}\n`,
        );
      }
      zip.end();
    },
  });

  const name = `Dossier - ${view.address}.zip`.replace(/[\\/:*?"<>|]+/g, "-");
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": contentDisposition(name, "attachment"),
      "Cache-Control": "no-store",
    },
  });
}
